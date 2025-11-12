#!/usr/bin/env python3
"""
Material Icons SVG Sprite Generator - Robust XML Parser Version

This script processes all SVG files in the Material_Icons directory and creates
an optimized SVG sprite file for use with the NUI library.

Usage:
    python generate_icon_sprite.py

Features:
- Robust XML parsing with proper DOM manipulation
- Automatic coordinate system normalization
- Smart background element filtering
- Handles all SVG structures (path, rect, circle, polygon, etc.)
- Preserves transforms and applies coordinate scaling
- Creates optimized sprite with minimal size

Output:
- Creates NUI/assets/material-icons-sprite.svg
- Displays file size and icon count
"""

import os
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Tuple, Optional

def parse_viewbox(viewbox_str: str) -> Tuple[float, float, float, float]:
    """Parse viewBox string into x, y, width, height values."""
    try:
        values = [float(v) for v in viewbox_str.split()]
        if len(values) == 4:
            return tuple(values)
    except (ValueError, AttributeError):
        pass
    return (0, 0, 24, 24)  # Default fallback

def is_background_element(element: ET.Element, viewbox: Tuple[float, float, float, float]) -> bool:
    """Determine if an element is a background/invisible element that should be filtered out."""
    tag = element.tag.split('}')[-1] if '}' in element.tag else element.tag
    
    # Check for explicit fill="none"
    if element.get('fill') == 'none':
        return True
    
    # Check for common background patterns in path elements
    if tag == 'path':
        d_attr = element.get('d', '')
        vx, vy, vw, vh = viewbox
        
        # Common background patterns (covering entire viewBox)
        background_patterns = [
            f'M{vx} {vy}h{vw}v{vh}H{vx}z',
            f'M{vx} {vy}h{vw}v{vh}H{vx}V{vy}z',
            f'M{vx},{vy}h{vw}v{vh}H{vx}V{vy}z',
            f'M{vx} {vy}h{int(vw)}v{int(vh)}H{vx}z',
            f'M{vx} {vy}h{int(vw)}v{int(vh)}H{vx}V{vy}z',
            'M0 0h24v24H0z',
            'M0 0h24v24H0V0z',
            'M0,0h24v24H0V0z',
            'M.01 0h24v24h-24V0z'
        ]
        
        if any(d_attr.strip() == pattern for pattern in background_patterns):
            return True
    
    # Check for background rectangles (covering entire viewBox)
    if tag == 'rect':
        x = float(element.get('x', 0))
        y = float(element.get('y', 0))
        width = float(element.get('width', 0))
        height = float(element.get('height', 0))
        
        vx, vy, vw, vh = viewbox
        if x == vx and y == vy and width >= vw and height >= vh:
            return True
    
    return False

def normalize_element_to_24x24(element: ET.Element, source_viewbox: Tuple[float, float, float, float]) -> Optional[ET.Element]:
    """Normalize an SVG element from any coordinate system to 24x24."""
    vx, vy, vw, vh = source_viewbox
    
    # If already 24x24 system, return as-is
    if (vx, vy, vw, vh) == (0, 0, 24, 24):
        element.set('fill', 'currentColor')
        return element
    
    # Create transform for coordinate normalization
    scale_x = 24 / vw
    scale_y = 24 / vh
    translate_x = -vx * scale_x
    translate_y = -vy * scale_y
    
    # Build transform string
    transforms = []
    if translate_x != 0 or translate_y != 0:
        transforms.append(f'translate({translate_x},{translate_y})')
    if scale_x != 1 or scale_y != 1:
        transforms.append(f'scale({scale_x},{scale_y})')
    
    if transforms:
        # Combine with existing transform if present
        existing_transform = element.get('transform', '')
        new_transform = ' '.join(transforms)
        if existing_transform:
            element.set('transform', f'{existing_transform} {new_transform}')
        else:
            element.set('transform', new_transform)
    
    element.set('fill', 'currentColor')
    return element

def extract_icon_elements(svg_content: str) -> List[ET.Element]:
    """Extract meaningful SVG elements from content, excluding backgrounds."""
    try:
        # Parse SVG
        root = ET.fromstring(svg_content)
        
        # Get viewBox
        viewbox_str = root.get('viewBox', '0 0 24 24')
        viewbox = parse_viewbox(viewbox_str)
        
        # Find all drawable elements (recursively)
        drawable_elements = []
        drawable_tags = {'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon'}
        
        def collect_elements(parent):
            for element in parent:
                tag = element.tag.split('}')[-1] if '}' in element.tag else element.tag
                
                if tag in drawable_tags:
                    if not is_background_element(element, viewbox):
                        # Normalize to 24x24 coordinate system
                        normalized = normalize_element_to_24x24(element, viewbox)
                        if normalized is not None:
                            drawable_elements.append(normalized)
                else:
                    # Recurse into groups and other containers
                    collect_elements(element)
        
        collect_elements(root)
        return drawable_elements
        
    except ET.ParseError as e:
        print(f"   ❌ XML Parse Error: {e}")
        return []
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
        return []

def optimize_sprite_content(content):
    """Optimize sprite content by formatting and removing extra whitespace."""
    lines = content.split('\n')
    optimized_lines = []
    
    for line in lines:
        stripped = line.strip()
        if stripped:
            # Apply minimal indentation for readability
            if stripped.startswith('<symbol'):
                optimized_lines.append('  ' + stripped)
            elif stripped.startswith('<path'):
                optimized_lines.append('    ' + stripped)
            elif stripped.startswith('</symbol>'):
                optimized_lines.append('  ' + stripped)
            else:
                optimized_lines.append(stripped)
    
    return '\n'.join(optimized_lines)

def generate_sprite():
    """Main function to generate the SVG sprite."""
    # Paths
    icons_dir = Path(__file__).parent / 'Material_Icons'
    output_file = Path(__file__).parent.parent / 'NUI' / 'assets' / 'material-icons-sprite.svg'
    
    # Validate input directory
    if not icons_dir.exists():
        print(f"❌ Error: Icons directory not found: {icons_dir}")
        return
    
    svg_files = list(icons_dir.glob('*.svg'))
    if not svg_files:
        print(f"❌ Error: No SVG files found in {icons_dir}")
        return
    
    # Create output directory
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    # Start building sprite
    sprite_content = ['<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">']
    processed_count = 0
    
    print(f"🔄 Processing {len(svg_files)} SVG files...")
    
    # Process each SVG file
    for svg_file in sorted(svg_files):
        icon_name = svg_file.stem
        
        try:
            # Read SVG content
            with open(svg_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extract meaningful elements
            elements = extract_icon_elements(content)
            
            # Add symbol to sprite if elements found
            if elements:
                sprite_content.append(f'  <symbol id="{icon_name}" viewBox="0 0 24 24">')
                
                for element in elements:
                    # Convert element back to string
                    element_str = ET.tostring(element, encoding='unicode')
                    sprite_content.append(f'    {element_str}')
                
                sprite_content.append('  </symbol>')
                processed_count += 1
                print(f"   ✓ {icon_name}")
            else:
                print(f"   ⚠ Skipped {icon_name} (no valid elements found)")
                
        except Exception as e:
            print(f"   ❌ Error processing {icon_name}: {e}")
    
    # Close sprite
    sprite_content.append('</svg>')
    
    # Optimize content
    optimized_content = optimize_sprite_content('\n'.join(sprite_content))
    
    # Write output file
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(optimized_content)
        
        # Report results
        file_size = output_file.stat().st_size
        print(f"\n✅ Success!")
        print(f"   📁 Output: {output_file}")
        print(f"   📊 Icons: {processed_count}")
        print(f"   💾 Size: {file_size / 1024:.2f} KB")
        
        # Usage example
        print(f"\n📋 Usage example:")
        print(f'   <svg width="24" height="24">')
        print(f'     <use href="NUI/assets/material-icons-sprite.svg#menu"/>')
        print(f'   </svg>')
        
    except Exception as e:
        print(f"❌ Error writing output file: {e}")

if __name__ == "__main__":
    generate_sprite()
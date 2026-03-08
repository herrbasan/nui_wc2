# NUI Development Plan

This document outlines the prioritized roadmap for the next set of components to be built for the NUI library. 

These components have clear use cases, align with NUI's zero-dependency / simplicity philosophy, and are broken down into logical development phases.

---

## Phase 1: Core Enhancements (High Utility)

### Tooltip Component (`nui-tooltip`)
**Status:** Planned (Next up)
**Purpose:** Universal tooltip for any element - explains UI elements on hover/focus.
**Concept:**
- Lightweight positioning engine that attaches to any element
- Auto-positions to avoid screen edges
- Trigger on hover and focus (keyboard accessible)
- No JS scroll tracking (use anchored positioning or intersection observer)

### Badge Component (`nui-badge`)
**Purpose:** Small status indicators on buttons, icons, tabs, navigation items. 
**Concept:**
- Numeric counts or status dots
- Positions: top-right, top-left, bottom-right, bottom-left
- Extends the utility of existing container elements like `<nui-button>` and `<nui-icon>`

### Switch Component (`nui-switch`)
**Purpose:** On/off toggle - alternative to checkbox for boolean states.        
**Concept:**
- iOS/Android style toggle switch
- Clear on/off visual state
- Accessible (uses native `<input type="checkbox">` under the hood)

### Segmented Control Component (`nui-segmented`)
**Purpose:** iOS-style segmented buttons - compact alternative to radio buttons or tabs.                                                                        
**Concept:**
- Single-select button group
- Compact horizontal layout
- Lightweight state management

---

## Phase 2: Complex Core & Forms

### File Upload Button (`nui-file-upload` / Browse Type)
**Purpose:** File input button variant for selecting/adding files directly from the UI.
**Concept:**
- Clean wrapper around native `<input type="file">` functionality
- Consistent button styling with file input behavior
- Optional drag-and-drop overlay support
- Emits dedicated component events on file selection

### ~~Dual Sidebar Support (`nui-side-nav` Enhancement)~~
**Status:** Completed
**Purpose:** Support both left (navigation) and right (configuration/settings) sidebars in the app layout.                                                          
**Concept:**
- Enhance existing `nui-side-nav` with a `position="left|right"` attribute
- Does not require a new component; extends existing grid layout
- Independent breakpoint control and toggle methods for each sidebar

---

## Phase 3: Modules (Addons)

### Wizard Component (`nui-wizard`)
**Purpose:** Multi-step guided interface for forms and setups, reducing cognitive load.                                                                              
**Concept:**
- Standardized step-by-step UI (Next/Prev flow instead of random access like tabs)
- Visual step indicator (stepper) with highlighted current/completed steps
- Built as a standalone module due to sequential validation requirements

### Lightbox Component (`nui-lightbox`)
**Purpose:** Dedicated lightbox for image/media galleries.                                                              
**Concept:**
- Full-screen or near-full-screen media viewer
- Swipe/keyboard navigation between items
- Requires resolving the generalized modal positioning architecture first

---

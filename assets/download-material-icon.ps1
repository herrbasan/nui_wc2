#Requires -Version 5.1
<#
.SYNOPSIS
    Downloads Material Icons from Google Fonts and ensures black fill color.

.DESCRIPTION
    This script downloads SVG icons from Google Material Design Icons GitHub repository
    and modifies them to ensure the fill color is black. It can download a single icon 
    or multiple icons.

.PARAMETER IconName
    The name of the icon to download (e.g., "face", "settings", "home")

.PARAMETER Style
    The icon style: "outlined", "rounded", or "sharp" (default: "outlined")

.PARAMETER OutputFolder
    The folder where icons will be saved (default: "./Material_Icons")

.PARAMETER Size
    The icon size in pixels: 20, 24, 40, or 48 (default: 24)

.PARAMETER Filled
    Download the filled version of the icon (default: outlined/unfilled)

.EXAMPLE
    .\download-material-icon.ps1 -IconName "face"
    Downloads the "face" icon in outlined style

.EXAMPLE
    .\download-material-icon.ps1 -IconName "settings" -Style "rounded" -Filled
    Downloads the filled "settings" icon in rounded style

.EXAMPLE
    .\download-material-icon.ps1 -IconName "home", "menu", "close"
    Downloads multiple icons at once
#>

param(
    [Parameter(Mandatory = $true, HelpMessage = "Icon name(s) to download")]
    [string[]]$IconName,

    [Parameter(HelpMessage = "Icon style: outlined, rounded, or sharp")]
    [ValidateSet("outlined", "rounded", "sharp")]
    [string]$Style = "outlined",

    [Parameter(HelpMessage = "Output folder path")]
    [string]$OutputFolder = "./Material_Icons",

    [Parameter(HelpMessage = "Icon size: 20, 24, 40, or 48")]
    [ValidateSet(20, 24, 40, 48)]
    [int]$Size = 24,

    [Parameter(HelpMessage = "Download filled version")]
    [switch]$Filled
)

# Ensure output folder exists
$OutputPath = Resolve-Path -Path $OutputFolder -ErrorAction SilentlyContinue
if (-not $OutputPath) {
    Write-Host "Creating output folder: $OutputFolder" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $OutputFolder -Force | Out-Null
    $OutputPath = Resolve-Path -Path $OutputFolder
}

Write-Host "Output folder: $OutputPath" -ForegroundColor Cyan

# Function to download and process an icon
function Download-MaterialIcon {
    param(
        [string]$Name,
        [string]$IconStyle,
        [int]$IconSize,
        [bool]$IsFilled,
        [string]$Destination
    )

    $styleDisplay = if ($IsFilled) { "filled" } else { "outlined" }
    Write-Host "`nProcessing icon: $Name (style: $styleDisplay, size: ${IconSize}px)" -ForegroundColor Cyan

    # Construct the filename based on filled state
    $fileSuffix = if ($IsFilled) { "fill1" } else { "" }
    $fileName = "${Name}_${fileSuffix}_${IconSize}px.svg".Replace("__", "_")
    
    # Construct the download URL
    # Format: symbols/web/{icon}/materialsymbols{style}/{icon}_{fill}_{size}px.svg
    $styleFolder = "materialsymbols$IconStyle"
    $baseUrl = "https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web/$Name/$styleFolder"
    
    if ($IsFilled) {
        $githubUrl = "$baseUrl/${Name}_fill1_${IconSize}px.svg"
    } else {
        $githubUrl = "$baseUrl/${Name}_${IconSize}px.svg"
    }

    Write-Host "  Downloading from: $githubUrl" -ForegroundColor DarkGray

    try {
        # Download the SVG content
        $response = Invoke-WebRequest -Uri $githubUrl -UseBasicParsing -ErrorAction Stop
        $svgContent = $response.Content

        if (-not $svgContent -or $svgContent -notlike "*<svg*") {
            Write-Host "  Failed to download valid SVG for '$Name'" -ForegroundColor Red
            
            # If filled version failed, try without fill suffix as fallback
            if ($IsFilled) {
                Write-Host "  Trying non-filled version as fallback..." -ForegroundColor Yellow
                $fallbackUrl = "$baseUrl/${Name}_${IconSize}px.svg"
                try {
                    $response = Invoke-WebRequest -Uri $fallbackUrl -UseBasicParsing -ErrorAction Stop
                    $svgContent = $response.Content
                    if (-not $svgContent -or $svgContent -notlike "*<svg*") {
                        return $false
                    }
                } catch {
                    return $false
                }
            } else {
                return $false
            }
        }

        # Process the SVG to ensure black fill
        # Replace any existing fill attribute with black
        $svgContent = $svgContent -replace 'fill="[^"]*"', 'fill="black"'
        
        # Check if path elements have fill, if not add it
        # Match path tags that don't have fill="black" and add the attribute
        if ($svgContent -notmatch '<path[^>]*fill="black"') {
            # Add fill="black" to the opening svg tag as a default
            $svgContent = $svgContent -replace '(<svg[^>]*>)', '$1<g fill="black">'
            $svgContent = $svgContent -replace '</svg>', '</g></svg>'
        }

        # Save the file with just the icon name
        $outputFileName = "${Name}.svg"
        $filePath = Join-Path $Destination $outputFileName
        $svgContent | Out-File -FilePath $filePath -Encoding UTF8

        Write-Host "  Saved: $outputFileName" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "  Failed to download '$Name'" -ForegroundColor Red
        Write-Host "     Error: $_" -ForegroundColor DarkGray
        return $false
    }
}

# Handle both array and comma-separated string input
# If first element contains commas, split it
$iconList = if ($IconName.Count -eq 1 -and $IconName[0] -match ',') {
    $IconName[0] -split ',' | ForEach-Object { $_.Trim() }
} else {
    $IconName
}

# Process all icons
$successCount = 0
$failCount = 0

foreach ($icon in $iconList) {
    # Clean up icon name (remove spaces, lowercase)
    $cleanIcon = $icon.Trim().ToLower().Replace(" ", "_")

    $result = Download-MaterialIcon -Name $cleanIcon -IconStyle $Style -IconSize $Size -IsFilled $Filled -Destination $OutputPath

    if ($result) {
        $successCount++
    } else {
        $failCount++
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Download Summary:" -ForegroundColor Cyan
Write-Host "  Successful: $successCount" -ForegroundColor Green
Write-Host "  Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host "========================================" -ForegroundColor Cyan

if ($failCount -gt 0) {
    Write-Host "`nNote: Some icons may not exist or may have different names." -ForegroundColor Yellow
    Write-Host "You can search for icons at: https://fonts.google.com/icons" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "`nAll icons downloaded successfully to: $OutputPath" -ForegroundColor Green
    exit 0
}

# NUI Development Plan

This document outlines the prioritized roadmap for the next set of components to be built for the NUI library.
These components have clear use cases, align with NUI's zero-dependency / simplicity philosophy, and are broken down into logical development phases.

### Guiding Principles
> **Reuse Core Components:** When designing and building new components (especially larger modules or addons), prioritize composing them out of existing foundational elements (<nui-button>, <nui-icon>, <nui-input>, etc.) rather than reinventing the wheel. If an existing component can be cleanly extended or composed to handle a piece of the functionality, use it.
>
> **Core Philosophy:** Always remember that NUI aims for the **highest possible performance** and **built-in accessibility**, utilizing an architecture that is explicitly structured with **LLM maintenance** in mind.

---

## Phase 1: Modules (Addons)

### Wizard Component (ui-wizard)
**Status:** Planned  
**Purpose:** Multi-step guided interface for forms and setups, reducing cognitive load.  
**Concept:**
- Standardized step-by-step UI (Next/Prev flow instead of random access like tabs)
- Visual step indicator (stepper) with highlighted current/completed steps
- Built as a standalone module due to sequential validation requirements

### Notification History System (App Mode)
**Status:** Planned  
**Purpose:** Log and display a history of notifications built on <nui-banner>.  
**Concept:**
- Banners automatically log to a notification history.
- History accessible via icon in <nui-top-nav> (bell icon with unread count badge).
- Dropdown/panel shows recent notifications with timestamps.
- Clear all / mark as read functionality.

### Rich-Text Editor Component (ui-rich-text)
**Status:** Planned  
**Purpose:** Provide a robust, accessible WYSIWYG editing experience.  
**Concept:**
- Native execution of rich text commands without heavy framework dependencies.
- Simple, extensible toolbar utilizing standard `<nui-button>` and `<nui-icon>` elements.
- Clean and semantic HTML output.

### Code Editor Component (ui-code-editor)
**Status:** Planned  
**Purpose:** Syntax-highlighted code editing with essential development features.  
**Concept:**
- Built-in syntax highlighting using an optimized, lightweight engine.
- Essential editor features like tab support, automatic indentation, and line numbering.
- Low-footprint alternative to massive libraries like Monaco or CodeMirror.

### Media Player Component (ui-media-player)
**Status:** Planned  
**Purpose:** Accessible and customizable video and audio player controls.  
**Concept:**
- Ported and modernized from the original NUI library (`reference/nui/nui_media_player.js`).
- Custom, skinnable UI overlay built with `nui-button`, `nui-icon`, and `nui-slider` replacing native browser controls.
- Core features including captions, playback speed, timeline scrubbing, and fullscreen toggling.

### Gallery Component (ui-gallery)
**Status:** Planned  
**Purpose:** Responsive visual media display grid with expanded viewing capabilities.  
**Concept:**
- Ported and modernized from the original NUI library (`reference/nui/nui_gallery.js`).
- Flexible thumbnail grid respecting aspect ratios.
- Deep integration with the existing Lightbox addon for full-size viewing, swiping, and navigation natively.


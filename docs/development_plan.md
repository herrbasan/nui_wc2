# NUI Development Plan

This document outlines the prioritized roadmap for the next set of components to be built for the NUI library. 

These components have clear use cases, align with NUI's zero-dependency / simplicity philosophy, and are broken down into logical development phases.

### Guiding Principles
> **Reuse Core Components:** When designing and building new components (especially larger modules or addons), prioritize composing them out of existing foundational elements (<nui-button>, <nui-icon>, <nui-input>, etc.) rather than reinventing the wheel. If an existing component can be cleanly extended or composed to handle a piece of the functionality, use it.
> 
> **Core Philosophy:** Always remember that NUI aims for the **highest possible performance** and **built-in accessibility**, utilizing an architecture that is explicitly structured with **LLM maintenance** in mind.

---

## Phase 1: App Shell & Foundation Refactoring
*All base foundation refactoring is completed.*
- [x] **App Header Component (
ui-app-header)** - Completed. Semantic flex-container acting as application top bar with smart zones and zero-wire UI delegation.
- [x] **Sidebar Component Renaming (
ui-sidebar)** - Completed. Generalized structural component for navigation menus and configuration panes.

---

## Phase 2: Core Layout & Presentation
*All core layout & presentation enhancements are completed.*
- [x] **Card Component (
ui-card)** - Completed. Flexible structural container format for content, media, and actions.
- [x] **Tooltip Component (
ui-tooltip)** - Completed. Universal lightweight accessibility tooltip using auto-placement and native popover APIs.

---

## Phase 3: Form Enhancements & Actions

### Select Component Enhancement
**Status:** Planned
**Purpose:** Improve the baseline UX of the select component.
**Concept:**
- Make the "mobile-sheet" behavior the default behavior for the `<nui-select>` component, prioritizing a unified, touch-friendly UI pattern across all screen sizes.

### Switch Component (
ui-switch)
**Status:** Planned
**Purpose:** On/off toggle - alternative to checkbox for boolean states.        
**Concept:**
- iOS/Android style toggle switch
- Clear on/off visual state
- Accessible (uses native <input type="checkbox"> under the hood)

### Segmented Control Component (
ui-segmented)
**Status:** Planned
**Purpose:** iOS-style segmented buttons - compact alternative to radio buttons or tabs.
**Concept:**
- Single-select button group
- Compact horizontal layout
- Lightweight state management

### File Upload Button (
ui-file-upload / Browse Type)
**Status:** Planned
**Purpose:** File input button variant for selecting/adding files directly from the UI.
**Concept:**
- Clean wrapper around native <input type="file"> functionality
- Consistent button styling with file input behavior
- Optional drag-and-drop overlay support
- Emits dedicated component events on file selection

### Async / Loading Button State
**Status:** Planned
**Purpose:** Built-in busy indicator for buttons to show progress and prevent duplicate clicks during async tasks.
**Concept:**
- Integrated loading spinner/indicator within the existing `<nui-button>`.
- Temporarily disables the button (and pointer events) while the task is processing to prevent duplicate submissions.
- Can be controlled programmatically (e.g. `button.setLoading(true)`) or declaratively via an attribute (e.g., `loading`).

---

## Phase 4: Modules (Addons)

### Wizard Component (
ui-wizard)
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

### Lightbox Component (
ui-lightbox)
**Status:** Planned
**Purpose:** Dedicated lightbox for image/media galleries.                      
**Concept:**
- Full-screen or near-full-screen media viewer
- Swipe/keyboard navigation between items
- Requires resolving the generalized modal positioning architecture first

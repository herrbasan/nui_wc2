# Playground Component Quickstart for LLMs

This file is a fast index into the NUI Playground. It tells you which components are documented, what each one is for, and where to find the authoritative usage pattern in the Playground.

Notes:

- Routes open the SPA view in `Playground/index.html`.
- Fragment links open the underlying source file in `Playground/pages/...`.
- Some Playground pages document multiple components. Those components are listed separately below and point to the same page.
- A small number of components appear in the Playground shell or setup docs without a dedicated component page. Those are called out at the end.

## Read These First

| Topic | Why read it first | Playground route | Fragment |
| --- | --- | --- | --- |
| Getting Started | Setup, layout modes, SPA wiring, and the base shell structure. | [Open route](../Playground/index.html#page=documentation/getting-started) | [Playground/pages/documentation/getting-started.html](../Playground/pages/documentation/getting-started.html) |
| Architecture Patterns | Explains the supported SPA patterns and how the router/content loader works. | [Open route](../Playground/index.html#page=documentation/architecture-patterns) | [Playground/pages/documentation/architecture-patterns.html](../Playground/pages/documentation/architecture-patterns.html) |
| API Structure | Maps the three main surfaces: `nui`, `nui.components`, and `nui.util`. | [Open route](../Playground/index.html#page=documentation/api-structure) | [Playground/pages/documentation/api-structure.html](../Playground/pages/documentation/api-structure.html) |
| Declarative Actions | Shows the `data-action` pattern used across the Playground demos. | [Open route](../Playground/index.html#page=documentation/declarative-actions) | [Playground/pages/documentation/declarative-actions.html](../Playground/pages/documentation/declarative-actions.html) |
| Accessibility | Covers accessibility defaults and usage expectations for the component set. | [Open route](../Playground/index.html#page=documentation/accessibility) | [Playground/pages/documentation/accessibility.html](../Playground/pages/documentation/accessibility.html) |

## Core Components

### Layout and Structure

| Component | Short description | Playground docs |
| --- | --- | --- |
| `nui-app` | App shell that activates fixed app-mode layout with header, sidebar, content, and footer regions. | [Open route](../Playground/index.html#page=components/app-layout) and [Playground/pages/components/app-layout.html](../Playground/pages/components/app-layout.html) |
| `nui-app-header` | Standardized application top bar with semantic left, center, and right zones. | [Open route](../Playground/index.html#page=components/app-header) and [Playground/pages/components/app-header.html](../Playground/pages/components/app-header.html) |
| `nui-sidebar` | Side panel for navigation or secondary controls, with app-mode docking and collapsible behavior. | [Open route](../Playground/index.html#page=components/app-layout) and [Playground/pages/components/app-layout.html](../Playground/pages/components/app-layout.html) |
| `nui-content` | Main content wrapper that becomes the scrollable content region in app mode. | [Open route](../Playground/index.html#page=components/app-layout) and [Playground/pages/components/app-layout.html](../Playground/pages/components/app-layout.html) |
| `nui-app-footer` | Footer bar that docks in app mode and flows normally in page mode. | [Open route](../Playground/index.html#page=components/app-layout) and [Playground/pages/components/app-layout.html](../Playground/pages/components/app-layout.html) |
| `nui-layout` | Constrained responsive layout for equal-width grids and flow-style content arrangements. | [Open route](../Playground/index.html#page=components/layout) and [Playground/pages/components/layout.html](../Playground/pages/components/layout.html) |
| `nui-skip-links` | Keyboard-first skip navigation that auto-targets main content or custom anchors. | [Open route](../Playground/index.html#page=components/skip-links) and [Playground/pages/components/skip-links.html](../Playground/pages/components/skip-links.html) |
| `nui-column-flow` | Multi-column flow layout used for tree-mode navigation and grouped content blocks. | [Open route](../Playground/index.html#page=components/link-list) and [Playground/pages/components/link-list.html](../Playground/pages/components/link-list.html) |

### Forms and Inputs

| Component | Short description | Playground docs |
| --- | --- | --- |
| `nui-button` | Styled wrapper around native buttons, including icon buttons and variant styling. | [Open route](../Playground/index.html#page=components/button) and [Playground/pages/components/button.html](../Playground/pages/components/button.html) |
| `nui-button-container` | Layout helper for button groups, spacing, alignment, fill mode, and vertical stacks. | [Open route](../Playground/index.html#page=components/button) and [Playground/pages/components/button.html](../Playground/pages/components/button.html) |
| `nui-input-group` | Label and description wrapper for form controls that keeps grouped fields consistent. | [Open route](../Playground/index.html#page=components/inputs) and [Playground/pages/components/inputs.html](../Playground/pages/components/inputs.html) |
| `nui-input` | Single-line input wrapper with native validation, clearable mode, and search-friendly variants. | [Open route](../Playground/index.html#page=components/inputs) and [Playground/pages/components/inputs.html](../Playground/pages/components/inputs.html) |
| `nui-textarea` | Multi-line text input with optional auto-resize and character counting. | [Open route](../Playground/index.html#page=components/inputs) and [Playground/pages/components/inputs.html](../Playground/pages/components/inputs.html) |
| `nui-checkbox` | Custom-styled checkbox that preserves native input semantics and form behavior. | [Open route](../Playground/index.html#page=components/inputs) and [Playground/pages/components/inputs.html](../Playground/pages/components/inputs.html) |
| `nui-radio` | Custom-styled radio button that keeps the native selection model intact. | [Open route](../Playground/index.html#page=components/inputs) and [Playground/pages/components/inputs.html](../Playground/pages/components/inputs.html) |
| `nui-select` | Enhanced select with search, multi-select tags, and accessible custom UI. | [Open route](../Playground/index.html#page=components/select) and [Playground/pages/components/select.html](../Playground/pages/components/select.html) |
| `nui-tag-input` | Tag management control with keyboard navigation, editable mode, and hidden-input form support. | [Open route](../Playground/index.html#page=components/tag-input) and [Playground/pages/components/tag-input.html](../Playground/pages/components/tag-input.html) |
| `nui-slider` | Custom range slider built on native `<input type="range">` and drag utilities. | [Open route](../Playground/index.html#page=components/slider) and [Playground/pages/components/slider.html](../Playground/pages/components/slider.html) |

### Content and Display

| Component | Short description | Playground docs |
| --- | --- | --- |
| `nui-badge` | Inline badge for status, labels, counts, and compact visual indicators. | [Open route](../Playground/index.html#page=components/badge) and [Playground/pages/components/badge.html](../Playground/pages/components/badge.html) |
| `nui-card` | Flexible content container for text, media, and action-heavy layouts. | [Open route](../Playground/index.html#page=components/card) and [Playground/pages/components/card.html](../Playground/pages/components/card.html) |
| `nui-tabs` | Semantic tabbed interface that upgrades simple markup into accessible tab/panel behavior. | [Open route](../Playground/index.html#page=components/tabs) and [Playground/pages/components/tabs.html](../Playground/pages/components/tabs.html) |
| `nui-accordion` | Expandable content sections built on native `<details>` and `<summary>`. | [Open route](../Playground/index.html#page=components/accordion) and [Playground/pages/components/accordion.html](../Playground/pages/components/accordion.html) |
| `nui-table` | Responsive enhancement layer for standard HTML tables, including mobile-friendly presentation. | [Open route](../Playground/index.html#page=components/table) and [Playground/pages/components/table.html](../Playground/pages/components/table.html) |
| `nui-sortable` | Drag-and-drop reordering container using FLIP-style animation and keyboard-aware behavior. | [Open route](../Playground/index.html#page=components/sortable) and [Playground/pages/components/sortable.html](../Playground/pages/components/sortable.html) |
| `nui-sortable-item` | Individual draggable item used inside `nui-sortable`. | [Open route](../Playground/index.html#page=components/sortable) and [Playground/pages/components/sortable.html](../Playground/pages/components/sortable.html) |
| `nui-dialog` | Modal and non-modal dialog wrapper, plus system dialog flows like alert, confirm, and prompt. | [Open route](../Playground/index.html#page=components/dialog) and [Playground/pages/components/dialog.html](../Playground/pages/components/dialog.html) |
| `nui-overlay` | Raw overlay container for custom modals, busy states, media, and unstyled full-screen layers. | [Open route](../Playground/index.html#page=components/overlay) and [Playground/pages/components/overlay.html](../Playground/pages/components/overlay.html) |
| `nui-banner` | Edge-anchored notification surface for passive status and alert messages. | [Open route](../Playground/index.html#page=components/banner) and [Playground/pages/components/banner.html](../Playground/pages/components/banner.html) |
| `nui-progress` | Progress indicator for determinate, circular, and busy-state feedback. | [Open route](../Playground/index.html#page=components/progress) and [Playground/pages/components/progress.html](../Playground/pages/components/progress.html) |
| `nui-tooltip` | Popover-based tooltip for hover and focus annotations on arbitrary UI elements. | [Open route](../Playground/index.html#page=components/tooltip) and [Playground/pages/components/tooltip.html](../Playground/pages/components/tooltip.html) |

### Navigation, Icons, and Helper Surfaces

| Component or utility | Short description | Playground docs |
| --- | --- | --- |
| `nui-icon` | SVG sprite-based icon renderer for consistent, scalable interface icons. | [Open route](../Playground/index.html#page=components/icon) and [Playground/pages/components/icon.html](../Playground/pages/components/icon.html) |
| `nui-link-list` | Hierarchical navigation list with fold and tree modes plus programmatic data loading. | [Open route](../Playground/index.html#page=components/link-list) and [Playground/pages/components/link-list.html](../Playground/pages/components/link-list.html) |
| `nui-code` | Syntax-highlighted code wrapper used throughout the Playground for examples and snippets. | [Open route](../Playground/index.html#page=addons/code) and [Playground/pages/addons/code.html](../Playground/pages/addons/code.html) |
| `nui.util.storage` | Minimal cookie and localStorage helper with TTL support and simple string-based API. | [Open route](../Playground/index.html#page=components/storage) and [Playground/pages/components/storage.html](../Playground/pages/components/storage.html) |

### Compact `nui-icon` Inventory

Authoritative source: [NUI/assets/material-icons-sprite.svg](../NUI/assets/material-icons-sprite.svg). The current sprite exposes 84 icon names. For a searchable live preview, use [Open route](../Playground/index.html#page=components/icon) or [Playground/pages/components/icon.html](../Playground/pages/components/icon.html).

```text
add, add_circle, analytics, arrow, article, aspect_ratio, assessment, attach_money,
brightness, calendar, chat, check_circle, check_circle_filled, close, cognition,
content_copy, credit_card, database, delete, done, download, drag_handle,
drag_indicator, edit, edit_note, empty_dashboard, extension, eye_tracking, file_json,
filter_list, folder, fullscreen, grid_on, headphones, id_card, image, info,
install_desktop, invert_colors, key, keyboard, label, layers, lightbulb_2,
location_on, lock, logout, mail, media_folder, menu, monitor, more, mouse,
my_location, notifications, open_in_full, palette, pause, person, photo_camera,
play, print, public, rainy, rss_feed, save, search, security, send, settings,
sign_language, smart_display, sort, speaker, stadia_controller, star_rate,
sticky_note, sync, upload, visibility, volume, warning, work, wysiwyg
```

## Addon Components

| Component | Short description | Playground docs |
| --- | --- | --- |
| `nui-menu` | Application-style menubar with dropdowns, nested submenus, and full keyboard navigation. | [Open route](../Playground/index.html#page=addons/menu) and [Playground/pages/addons/menu.html](../Playground/pages/addons/menu.html) |
| `nui-list` | Virtualized list for large datasets. *Notice: Requires constrained parent `height` or `flex: 1` boundaries to render natively!* | [Open route](../Playground/index.html#page=addons/list) and [Playground/pages/addons/list.html](../Playground/pages/addons/list.html) |
| `nui-lightbox` | Image and media gallery lightbox that supports grouped declarative usage and programmatic opening. | [Open route](../Playground/index.html#page=addons/lightbox) and [Playground/pages/addons/lightbox.html](../Playground/pages/addons/lightbox.html) |

## Programmatic APIs and Patterns Documented in the Playground

| API or pattern | What it covers | Playground docs |
| --- | --- | --- |
| `data-action` | Declarative event delegation used across buttons, dialogs, overlays, banners, and page demos. | [Open route](../Playground/index.html#page=documentation/declarative-actions) and [Playground/pages/documentation/declarative-actions.html](../Playground/pages/documentation/declarative-actions.html) |
| `data-badge` | Zero-extra-markup badge pattern for unread dots and notification counts on existing elements. | [Open route](../Playground/index.html#page=components/badge) and [Playground/pages/components/badge.html](../Playground/pages/components/badge.html) |
| `nui.components.dialog.alert()` / `confirm()` / `prompt()` | System dialog factories for async UI flows. | [Open route](../Playground/index.html#page=components/dialog) and [Playground/pages/components/dialog.html](../Playground/pages/components/dialog.html) |
| `nui.components.banner.show()` | Factory for creating and controlling banners in async workflows. | [Open route](../Playground/index.html#page=components/banner) and [Playground/pages/components/banner.html](../Playground/pages/components/banner.html) |
| `nui.components.lightbox.show()` | Programmatic lightbox entry point for galleries assembled in JavaScript. | [Open route](../Playground/index.html#page=addons/lightbox) and [Playground/pages/addons/lightbox.html](../Playground/pages/addons/lightbox.html) |
| `nui.util.enableDrag()` | Low-level drag helper used by the slider and reusable for custom drag interactions. | [Open route](../Playground/index.html#page=components/slider) and [Playground/pages/components/slider.html](../Playground/pages/components/slider.html) |
| `nui-link-list.loadData()` | JSON-driven navigation loading used by the Playground sidebar and link-list demos. | [Open route](../Playground/index.html#page=components/link-list) and [Playground/pages/components/link-list.html](../Playground/pages/components/link-list.html) |

## Present in the Playground but Not Documented on a Dedicated Component Page

| Component | Where it shows up | Best available reference |
| --- | --- | --- |
| `nui-main` | The SPA content mount used by the Playground shell inside `nui-content`. | [Open route](../Playground/index.html#page=documentation/getting-started) and [Playground/pages/documentation/getting-started.html](../Playground/pages/documentation/getting-started.html) |
| `nui-loading` | The global loading bar used in the Playground shell and setup examples. | [Open route](../Playground/index.html#page=documentation/getting-started) and [Playground/pages/documentation/getting-started.html](../Playground/pages/documentation/getting-started.html) |

## Fast Lookup by Playground Page

If you want the shortest route from a component name to the right demo page, use this page index:

- `components/app-layout`: `nui-app`, `nui-sidebar`, `nui-content`, `nui-app-footer`
- `components/app-header`: `nui-app-header`
- `components/layout`: `nui-layout`
- `components/skip-links`: `nui-skip-links`
- `components/button`: `nui-button`, `nui-button-container`
- `components/inputs`: `nui-input-group`, `nui-input`, `nui-textarea`, `nui-checkbox`, `nui-radio`
- `components/select`: `nui-select`
- `components/tag-input`: `nui-tag-input`
- `components/slider`: `nui-slider`
- `components/badge`: `nui-badge`, `data-badge`
- `components/card`: `nui-card`
- `components/tabs`: `nui-tabs`
- `components/accordion`: `nui-accordion`
- `components/table`: `nui-table`
- `components/sortable`: `nui-sortable`, `nui-sortable-item`
- `components/dialog`: `nui-dialog`, `nui.components.dialog.*`
- `components/overlay`: `nui-overlay`
- `components/banner`: `nui-banner`, `nui.components.banner.show()`
- `components/progress`: `nui-progress`
- `components/tooltip`: `nui-tooltip`
- `components/link-list`: `nui-link-list`, `nui-column-flow`, `nui-link-list.loadData()`
- `components/icon`: `nui-icon`
- `components/storage`: `nui.util.storage`
- `addons/code`: `nui-code`
- `addons/menu`: `nui-menu`
- `addons/list`: `nui-list`
- `addons/lightbox`: `nui-lightbox`, `nui.components.lightbox.show()`
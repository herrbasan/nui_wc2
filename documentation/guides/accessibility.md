# NUI Accessibility Guide

## Philosophy

NUI follows a **DOM-first accessibility approach** with **intelligent context detection**: semantic HTML works without JavaScript, components automatically add missing ARIA attributes by analyzing their context, and progressive enhancement ensures full accessibility.

> **Shell structure lives in [`documentation/components/app.md`](../components/app.md).** That file is the single authority for the app shell. This guide covers *how* NUI applies accessibility — roles, labels, warnings, keyboard — and deliberately does not restate the shell, because two copies of it drifted apart once already.

## Core Principles

### 1. Semantic HTML Foundation
Components use standard HTML elements inside custom element containers:
```html
<nui-button>
	<button type="button" aria-label="Close dialog">
		<nui-icon name="close"></nui-icon>
	</button>
</nui-button>
```

### 2. Intelligent Accessibility Upgrades
Components automatically detect missing accessibility attributes and add them:

**Icon-only buttons get auto-generated labels:**
```html
<!-- Developer writes: -->
<nui-button>
	<button type="button">
		<nui-icon name="menu"></nui-icon>
	</button>
</nui-button>

<!-- Component upgrades to: -->
<button type="button" aria-label="Menu navigation">
	<nui-icon name="menu" aria-hidden="true"></nui-icon>
</button>
```

**The navigation link list brings its own roles:**
```html
<!-- Developer writes: -->
<nui-sidebar>
	<nui-link-list aria-label="Sidebar navigation">...</nui-link-list>
</nui-sidebar>

<!-- Rendered as: -->
<nui-sidebar>
	<nui-link-list role="tree" aria-label="Sidebar navigation">
		<ul role="group">
			<li role="none"><a role="treeitem">…</a></li>
		</ul>
	</nui-link-list>
</nui-sidebar>
```

`role="navigation"` is **not** added here. A hierarchical link list is the ARIA **Tree View Pattern** — `role="tree"` → `group` → `treeitem` — described under *Sidebar Navigation* at the end of this guide. If you also want a navigation landmark, author a `<nav>` around the list; the `role="navigation"` landmark NUI creates itself belongs to `<nui-skip-links>`.

**Main content gets its landmark role from `<nui-main>`:**
```html
<!-- Developer writes: -->
<nui-content>
	<nui-main>
		<h1>Welcome</h1>
	</nui-main>
</nui-content>

<!-- <nui-main> adds these itself when absent: -->
<nui-content>
	<nui-main role="main" id="main-content">
		<h1>Welcome</h1>
	</nui-main>
</nui-content>
```

The element carrying `role="main"` is **`<nui-main>`**, not a bare `<main>` inside `<nui-content>`. `nui-main` is also the app-mode scroll container, so it is the form to author in any case. Shell structure is defined in [`documentation/components/app.md`](../components/app.md) — that file is the single authority, and this guide does not restate it.

### 3. Developer Warnings
Components log helpful warnings when accessibility improvements are made:
```
⚠️ nui-button: Icon-only button missing aria-label. 
   Auto-generated: "Menu navigation". 
   Consider adding explicit aria-label for better UX.
```

This teaches best practices while ensuring the app remains accessible.

### 3. Progressive Enhancement
- **Without JavaScript**: Semantic HTML with proper structure
- **With JavaScript**: 
  - ARIA attributes added dynamically for state management
  - Missing accessibility attributes detected and added automatically
  - Context-aware labels generated from parent elements and icon names

### 4. Keyboard Navigation
All interactive elements support:
- **Tab**: Navigate between elements
- **Enter/Space**: Activate buttons and links
- **Arrow keys**: Navigate lists and trees (where applicable)
- **Escape**: Close dialogs and menus (where applicable)

### 5. Screen Reader Support
- Icons are marked `aria-hidden="true"` (decorative)
- Parent elements (buttons/links) have descriptive `aria-label`
- Dynamic state changes announced via ARIA attributes
- A `role="navigation"` landmark from `<nui-skip-links>`; hierarchical lists use the Tree View Pattern (`role="tree"`)

## Intelligent Accessibility System

### How It Works

NUI components run accessibility checks during initialization:

1. **Context Detection**
   - Analyze parent elements (nav, header, aside, main)
   - Check for existing ARIA attributes
   - Look for semantic HTML clues (headings, text content)

2. **Smart Label Generation**
   - Icon names converted to readable labels ("menu" → "Menu")
   - Context added based on parent ("Menu" in nav → "Menu navigation")
   - Existing attributes preserved (never overwrites developer's explicit labels)

3. **Developer Feedback**
   - Console warnings for auto-generated attributes
   - Suggests best practices
   - Helps developers learn accessibility patterns

### Auto-Upgrade Examples

**Example 1: Icon Button Labels**
```html
<!-- Input -->
<nui-app-header>
	<header>
		<nui-button>
			<button><nui-icon name="search"></nui-icon></button>
		</nui-button>
	</header>
</nui-app-header>

<!-- Upgraded to -->
<nui-app-header>
	<header role="banner">
		<nui-button>
			<button aria-label="Search navigation">
				<nui-icon name="search" aria-hidden="true"></nui-icon>
			</button>
		</nui-button>
	</header>
</nui-app-header>
```

**Example 2: Landmark Labels**

A landmark with no label and no heading inside gets the fallback label and a warning; one with a heading inside is labelled from it, silently.

```html
<!-- Input -->
<nui-sidebar>
	<nav>
		<h2>Settings</h2>
		<a href="#page=profile">Profile</a>
	</nav>
</nui-sidebar>

<!-- Upgraded to — the contained heading is used, so no warning -->
<nui-sidebar>
	<nav aria-labelledby="nav-7f3a91">
		<h2 id="nav-7f3a91">Settings</h2>
		<a href="#page=profile">Profile</a>
	</nav>
</nui-sidebar>
```

With no heading inside, the fallback is `aria-label="Navigation"` plus a Console warning. A `<nui-link-list>` is not affected by any of this — it renders `role="tree"` and is not a landmark (see *Sidebar Navigation* at the end of this guide).

**Example 3: Main Content Landmark**
```html
<!-- Input -->
<nui-content>
	<nui-main>
		<article>...</article>
	</nui-main>
</nui-content>

<!-- Upgraded to -->
<nui-content>
	<nui-main role="main" id="main-content">
		<article>...</article>
	</nui-main>
</nui-content>
```

`nui-main` supplies the landmark. A bare `<main>` inside `nui-content` is not upgraded — nothing looks for it, and it loses the scroll container the app layout expects.

### When Auto-Upgrade Happens

✅ **Upgrades are applied:**
- Icon-only buttons without aria-label
- Navigation elements without aria-label
- Main content without id (for skip links)
- Clickable divs/spans without role="button"
- Landmarks without proper roles

❌ **Upgrades are skipped:**
- Developer provided explicit aria-label
- Button has visible text content
- aria-labelledby is present
- title attribute exists

## Component Accessibility

### nui-button
```html
<!-- Always add aria-label to buttons with icon-only content -->
<nui-button>
	<button type="button" aria-label="Toggle navigation menu">
		<nui-icon name="menu"></nui-icon>
	</button>
</nui-button>

<!-- Text buttons don't need aria-label -->
<nui-button>
	<button type="button">Save Changes</button>
</nui-button>
```

**Keyboard Support:**
- Enter/Space to activate
- Tab to navigate

**Screen Reader:**
- Button role announced automatically
- aria-label provides context for icon buttons

### nui-icon
Icons are **decorative by default** and hidden from screen readers:
```html
<nui-icon name="menu" aria-hidden="true"></nui-icon>
```

Parent element should provide text alternative:
```html
<button aria-label="Settings">
	<nui-icon name="settings"></nui-icon>
</button>
```

### nui-link-list (Navigation)
Provides full ARIA tree navigation:

```html
<nui-link-list mode="tree" aria-label="Main navigation">
	<ul>
		<li class="group-header">
			<button type="button" class="group-toggle">
				<nui-icon name="folder"></nui-icon>
				<span>Components</span>
			</button>
		</li>
		<li><a href="#page=components/button">Button</a></li>
	</ul>
</nui-link-list>
```

**Automatic ARIA attributes added:**
- `role="tree"` on the `<nui-link-list>` container
- `role="group"` on each `<ul>`
- `role="treeitem"` on links and group-header buttons
- `role="none"` on the `<li>` wrappers
- `aria-expanded="true|false"` on group items
- `aria-selected="true"` on the parent `<li>` of the active link

**Keyboard Support:**
- Tab: Navigate between items (auto-expands collapsed groups on focus)
- Enter/Space: Activate item or toggle expansion
- Arrow Up/Down: Move focus between visible items; Home/End jump to first/last

**Auto-Expand on Focus:**
When a keyboard user tabs into a sub-item within a collapsed group, the group automatically expands. This ensures keyboard-only users can access all navigation items without requiring visual confirmation of group state.

```javascript
// Triggered when sub-item receives focus via Tab key
subItem.addEventListener('focus', () => {
	// Automatically expand parent group if collapsed
	// Ensures keyboard navigation reveals content
});
```

**Screen Reader:**
- Navigation landmark announced
- Expanded/collapsed state announced
- Current page indicator announced
- Item labels from `<span>` text content
- Focus events maintain synchronization with visual state

### nui-progress
```html
<nui-progress type="bar" value="45" max="100"></nui-progress>
```
**Automatic ARIA attributes added:**
- `role="progressbar"`
- `aria-valuenow="45"`
- `aria-valuemin="0"`
- `aria-valuemax="100"`

### nui-table
Uses a **responsive data-label pattern** to maintain context for screen readers in card-view (mobile):
```html
<nui-table>
	<table>
		<thead><tr><th>Name</th></tr></thead>
		<tbody><tr><td data-label="Name">Project A</td></tr></tbody>
	</table>
</nui-table>
```

### nui-slider
Leverages **Native Input Reuse** for zero-effort accessibility:
```html
<nui-slider>
	<input type="range" min="0" max="100" value="50">
</nui-slider>
```
The component hides the native input visually but retains it for keyboard interaction and screen reader announcements.

### nui-select
Implements a custom popup matching the **Native Select Pattern**:
- **Role**: Combobox/Listbox pattern.
- **Search**: Auto-focuses search input when opened for immediate filtering.
- **Keyboard**: Full Arrow key navigation, Enter to select, Escape to close, and Type-ahead support.
- **Mobile**: Transforms into a bottom sheet for better touch accessibility.

### nui-sortable
Implements **Keyboard Reordering** with live feedback:
- **Grabbing**: `Space` or `Enter` to "pick up" an item.
- **Moving**: `Arrow Keys` to reorder items within the list.
- **Announcements**: Every move is announced via `a11y.announce` (e.g., "Moved to position 3 of 10").
- **Dropping**: `Space` or `Enter` to commit the new position.
- **Cancelling**: `Escape` to return to the original position.
- **Interactive elements keep their keys**: `Space` and `Enter` are only claimed when the
  focused element is not itself interactive. A text field, button or rich-text editor inside
  a sortable item keeps both — the drag never hijacks typing.

### nui-dialog & nui-overlay
Built on the **Native `<dialog>` Element**:
- Manages focus trap automatically.
- `Escape` key support for closing.
- Backdrop click-to-close (unless marked `blocking`).

### Focus Management

**Visual Focus Indicators:**
- 2px outline in theme highlight color
- 2px offset for clarity
- Higher contrast in keyboard focus

**CSS:**
```css
/* Visible for keyboard navigation */
:focus-visible {
	outline: 2px solid var(--color-highlight);
	outline-offset: 2px;
}

/* Hidden for mouse clicks */
:focus:not(:focus-visible) {
	outline: none;
}
```

### Screen Reader Announcements (`a11y.announce`)

For dynamic content changes that aren't automatically picked up by screen readers (like reordering items in a list), use the global `a11y.announce` utility. This utility manages a hidden ARIA live region to speak messages to users.

```javascript
// Announce a message to screen readers
a11y.announce('Moved to position 3 of 10');

// Use assertive announcement for critical information
a11y.announce('Drag cancelled', true);
```

The system automatically manages the persistence and cleanup of the live region singleton.

## Motion Preferences

Respects `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
	* {
		animation-duration: 0.01ms !important;
		transition-duration: 0.01ms !important;
		scroll-behavior: auto !important;
	}
}
```

## Color Contrast

Theme uses CSS `light-dark()` function for automatic contrast:
- Light mode: Dark text on light backgrounds
- Dark mode: Light text on dark backgrounds
- Minimum 4.5:1 contrast ratio for body text
- Minimum 3:1 for large text and UI components

## Accessibility Testing Checklist

### Keyboard Navigation
- [ ] All interactive elements reachable via Tab
- [ ] Enter/Space activates buttons and links
- [ ] Focus visible with clear outline
- [ ] Tab order follows logical reading order
- [ ] No keyboard traps

### Screen Reader
- [ ] All images/icons have text alternatives
- [ ] Landmark regions defined (navigation, main, etc.)
- [ ] Headings create logical document structure
- [ ] ARIA states announce changes (expanded/collapsed)
- [ ] Form inputs have associated labels

### Visual
- [ ] Text contrast meets WCAG AA standards (4.5:1)
- [ ] Focus indicators clearly visible
- [ ] Color not used as only means of conveying information
- [ ] Text resizable to 200% without loss of functionality

### Motion
- [ ] Respects prefers-reduced-motion
- [ ] Animations can be disabled
- [ ] No auto-playing media

## Best Practices for Developers

### 1. Prefer Explicit Labels (But Auto-Generated Work)
```html
<!-- Best: Explicit label (clearest intent) -->
<button aria-label="Open settings menu">
	<nui-icon name="settings"></nui-icon>
</button>

<!-- Good: Auto-generated label (accessibility maintained) -->
<button>
	<nui-icon name="settings"></nui-icon>
</button>
<!-- Component adds: aria-label="Settings" -->

<!-- Better: Visible text (most accessible) -->
<button>
	<nui-icon name="settings"></nui-icon>
	Settings
</button>
```

**Philosophy:** Auto-generated labels ensure baseline accessibility while warning developers to add explicit labels for production code. This approach:
- Maintains accessibility during development
- Teaches best practices through console warnings
- Allows rapid prototyping without accessibility failures
- Encourages explicit labeling for production

### 2. Use Semantic HTML
```html
<!-- Bad: Div soup -->
<div onclick="...">Click me</div>

<!-- Good: Semantic button -->
<button type="button">Click me</button>

<!-- Auto-upgraded if needed: -->
<div onclick="..." role="button" tabindex="0">Click me</div>
```

### 3. Leverage Context Detection
```html
<!-- In navigation context, icons get contextual labels -->
<nui-app-header>
	<header>
		<button><nui-icon name="menu"></nui-icon></button>
		<!-- Auto-labeled: "Menu navigation" -->
	</header>
</nui-app-header>

<!-- Outside a nav/header/sidebar context, the same icon gets no suffix -->
<nui-main>
	<button><nui-icon name="menu"></nui-icon></button>
	<!-- Auto-labeled: "Menu" -->
</nui-main>
```

### 4. Trust But Verify
The system auto-upgrades, but check console for warnings:
```javascript
// Console output helps you improve:
⚠️ nui-button: Icon-only button missing aria-label.
   Auto-generated: "Close navigation". 
   Consider adding explicit aria-label for better UX.
```

Use warnings as learning opportunities to improve your code.
```html
<!-- Icons are decorative, button provides context -->
<button aria-label="Save changes">
	<nui-icon name="save" aria-hidden="true"></nui-icon>
	Save
</button>
```

### 5. Combine Icons with Text for Best UX
```html
<!-- Good: Icon only with label -->
<button aria-label="Save changes">
	<nui-icon name="save"></nui-icon>
</button>

<!-- Better: Visible text (universally understood) -->
<button>
	<nui-icon name="save"></nui-icon>
	Save
</button>
```

### 6. Test with Keyboard Only
Try using your app with:
- No mouse
- Only Tab, Enter, Space, Escape
- Screen reader active (NVDA, JAWS, VoiceOver)

### 7. Use Landmark Regions
```html
<nui-app>
	<nui-app-header>
		<header>
			<!-- Auto-upgraded: role="banner" -->
			<nav aria-label="Main menu">...</nav>
		</header>
	</nui-app-header>
	
	<nui-content>
		<nui-main>
			<!-- Gets role="main", id="main-content" -->
			<article>...</article>
		</nui-main>
	</nui-content>
	
	<nui-app-footer>
		<footer>
			<!-- Auto-upgraded: role="contentinfo" -->
		</footer>
	</nui-app-footer>
</nui-app>
```

## Console Warning Reference

NUI provides helpful warnings when it auto-upgrades accessibility:

### Warning Types

**Icon Button Label Generation** (message text is exact; the element is passed as the second console argument):
```
Icon-only button missing aria-label. Auto-generated: "Menu navigation". Consider adding explicit aria-label.
```
**Action:** Add an explicit `aria-label` to the inner `<button>` for production code.

**Landmark Label** — fired on a bare `<nav>` or `[role="navigation"]` with no label:
```
Landmark missing aria-label. Adding: "Navigation"
```
**Action:** Add an `aria-label`, or put a heading inside the landmark — a contained heading is used via `aria-labelledby` instead, and raises no warning.

**App Shell Structure** — fired by `<nui-app>`:
```
[NUI] <nui-app> is missing <nui-app-header>. The app shell requires: <nui-app-header>, <nui-sidebar>, <nui-content>.
[NUI] <nui-app> contains bare elements (e.g., <header>, <main>) outside layout wrappers. Each region must be wrapped: bare <header> → <nui-app-header><header>. Bare <main> → <nui-content><main>.
```
**Action:** Follow the structure in [`documentation/components/app.md`](../components/app.md).

**Non-Semantic Interactive Element:**
```
Non-semantic clickable element. Adding role="button".
```
**Action:** Use `<button>` or `<a>` instead of `<div onclick>`.

⚠️ Warnings are deduplicated per message — each is logged once per element-message pair, so a clean reload is the only reliable read. There is **no** warning for a bare `<main>` inside `<nui-content>`; that mistake is silent here and is caught by the `nui-debug` validator instead.

### Disabling Warnings

For production, you can suppress warnings (though not recommended):
```javascript
// Suppress specific warnings
console.warn = (function(originalWarn) {
	return function(message) {
		if (message.includes('nui-button')) return;
		originalWarn.apply(console, arguments);
	};
})(console.warn);
```

**Better approach:** Fix the warnings during development.
```html
<nui-app>
	<nui-app-header>
		<header>
			<nav aria-label="Main navigation">...</nav>
		</header>
	</nui-app-header>
	<nui-content>
		<nui-main>
			<article>...</article>
		</nui-main>
	</nui-content>
	<nui-app-footer>
		<footer>...</footer>
	</nui-app-footer>
</nui-app>
```

## Component Patterns & Decisions

### Sidebar Navigation (`nui-link-list`)

The sidebar navigation implements the **Tree View Pattern** (ARIA `role="tree"`), which is the standard for hierarchical navigation structures.

#### Structure & Roles
- **Container**: `role="tree"` - Identifies the root of the hierarchical list.
- **Groups**: `role="group"` - Identifies a sub-list of items.
- **Items**: `role="treeitem"` - Identifies individual links or group headers.
- **Presentation**: `role="presentation"` - Used on wrapper `<div>`s to hide them from the accessibility tree, ensuring the hierarchy remains flat and logical (Tree -> Group -> Treeitem).

#### Interaction Model
We implemented a **Hybrid Navigation Model** that balances standard web navigation with application-like behavior:

1.  **Tab Navigation**:
    *   Users can Tab through the list naturally.
    *   **Decision**: Unlike strict "roving tabindex" (where the whole tree is one tab stop), we allow tabbing to individual items. This is often more intuitive for web users who expect to tab through links.

2.  **Arrow Keys**:
    *   `Up/Down`: Move focus between visible items.
    *   `Home/End`: Jump to start/end of the list.
    *   **Decision**: This provides the efficiency of application menus without breaking the expected web tab flow.

3.  **Activation**:
    *   `Enter` or `Space`: Activates the link or toggles the group.
    *   **Decision**: Standardizing on both keys ensures users coming from different operating system backgrounds (Windows vs Mac) find the interaction predictable.

4.  **Auto-Expand on Focus (Fold Mode)**:
    *   When tabbing into a collapsed group header in "fold" mode, it automatically expands.
    *   **Why?**: This prevents keyboard users from getting "stuck" or having to manually expand every section to see if it contains what they need. It mimics the mouse "hover/click" discovery process but optimized for keyboard efficiency.

#### State Management
- **`aria-expanded`**: Clearly communicates whether a group is open or closed.
- **`aria-selected="true"`**: Applied to the *parent* `<li>` of the active link.
    *   **Why?**: Screen readers announce the state of the focused item. By placing it on the `treeitem` (the `li`), we ensure the user knows "This is the current page" when they navigate to it.

## Screen Reader Testing

### Windows (NVDA - Free)
1. Download from https://www.nvaccess.org/
2. Press Insert+Q to quit when done
3. Common commands:
   - Insert+Down: Read line
   - Insert+Up: Read from cursor
   - Tab: Next interactive element

### macOS (VoiceOver - Built-in)
1. Cmd+F5 to enable
2. Common commands:
   - VO+A: Read all
   - VO+Right/Left: Navigate
   - VO+Space: Activate

### Chrome DevTools
1. Open DevTools (F12)
2. Elements > Accessibility tab
3. View computed accessibility tree

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM Resources](https://webaim.org/resources/)

## Reporting Accessibility Issues

If you find an accessibility issue, please report it with:
- Component name
- Expected behavior
- Actual behavior
- Assistive technology used (screen reader, keyboard, etc.)
- Browser and version

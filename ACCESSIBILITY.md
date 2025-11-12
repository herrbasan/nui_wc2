# NUI Accessibility Guide

## Philosophy

NUI follows a **DOM-first accessibility approach** with **intelligent context detection**: semantic HTML works without JavaScript, components automatically add missing ARIA attributes by analyzing their context, and progressive enhancement ensures full accessibility.

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

**Navigation landmarks get context-aware labels:**
```html
<!-- Developer writes: -->
<nui-side-nav>
	<nui-link-list mode="tree">...</nui-link-list>
</nui-side-nav>

<!-- Component upgrades to: -->
<nui-side-nav>
	<nui-link-list mode="tree" role="navigation" aria-label="Sidebar navigation">
		...
	</nui-link-list>
</nui-side-nav>
```

**Main content gets landmark role:**
```html
<!-- Developer writes: -->
<nui-content>
	<main>
		<h1>Welcome</h1>
	</main>
</nui-content>

<!-- Component upgrades to: -->
<nui-content>
	<main role="main" id="main-content">
		<h1>Welcome</h1>
	</main>
</nui-content>
```

### 3. Developer Warnings
Components log helpful warnings when accessibility improvements are made:
```
⚠️ nui-button: Icon-only button missing aria-label. 
   Auto-generated: "Menu navigation". 
   Consider adding explicit aria-label for better UX.
```

This teaches best practices while ensuring the app remains accessible.

### 2. Progressive Enhancement
- **Without JavaScript**: Semantic HTML with proper structure
- **With JavaScript**: 
  - ARIA attributes added dynamically for state management
  - Missing accessibility attributes detected and added automatically
  - Context-aware labels generated from parent elements and icon names

### 3. Keyboard Navigation
All interactive elements support:
- **Tab**: Navigate between elements
- **Enter/Space**: Activate buttons and links
- **Arrow keys**: Navigate lists and trees (where applicable)
- **Escape**: Close dialogs and menus (where applicable)

### 4. Screen Reader Support
- Icons are marked `aria-hidden="true"` (decorative)
- Parent elements (buttons/links) have descriptive `aria-label`
- Dynamic state changes announced via ARIA attributes
- Navigation landmarks (`role="navigation"`)

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
<nui-top-nav>
	<header>
		<nui-button>
			<button><nui-icon name="search"></nui-icon></button>
		</nui-button>
	</header>
</nui-top-nav>

<!-- Upgraded to -->
<nui-top-nav>
	<header role="banner">
		<nui-button>
			<button aria-label="Search navigation">
				<nui-icon name="search" aria-hidden="true"></nui-icon>
			</button>
		</nui-button>
	</header>
</nui-top-nav>
```

**Example 2: Navigation Landmarks**
```html
<!-- Input -->
<nui-side-nav>
	<nui-link-list>
		<div class="nui-sidebar-item">
			<div class="item"><span>Home</span></div>
		</div>
	</nui-link-list>
</nui-side-nav>

<!-- Upgraded to -->
<nui-side-nav>
	<nui-link-list role="navigation" aria-label="Sidebar navigation">
		<div class="nui-sidebar-item">
			<div class="item" role="button" tabindex="0" aria-label="Home">
				<span>Home</span>
			</div>
		</div>
	</nui-link-list>
</nui-side-nav>
```

**Example 3: Main Content Landmark**
```html
<!-- Input -->
<nui-content>
	<main>
		<article>...</article>
	</main>
</nui-content>

<!-- Upgraded to -->
<nui-content>
	<main role="main" id="main-content">
		<article>...</article>
	</main>
</nui-content>
```

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
<nui-link-list mode="tree" accordion aria-label="Main navigation">
	<div class="nui-sidebar-item group">
		<div class="item">
			<nui-icon name="folder"></nui-icon>
			<span>Components</span>
		</div>
		<div class="sub">
			<div class="sub-item">
				<span>Buttons</span>
			</div>
		</div>
	</div>
</nui-link-list>
```

**Automatic ARIA attributes added:**
- `role="navigation"` on container
- `role="button"` on expandable items
- `aria-expanded="true|false"` on group items
- `aria-current="page"` on active item
- `role="list"` and `role="listitem"` on sub-items

**Keyboard Support:**
- Tab: Navigate between items (auto-expands collapsed groups on focus)
- Enter/Space: Activate item or toggle expansion
- Arrow keys: Navigate within list (future enhancement)

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
<nui-top-nav>
	<header>
		<button><nui-icon name="menu"></nui-icon></button>
		<!-- Auto-labeled: "Menu navigation" -->
	</header>
</nui-top-nav>

<!-- In main content, same icon gets different context -->
<main>
	<button><nui-icon name="menu"></nui-icon></button>
	<!-- Auto-labeled: "Menu" -->
</main>
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
	<nui-top-nav>
		<header>
			<!-- Auto-upgraded: role="banner" -->
			<nav aria-label="Main menu">...</nav>
		</header>
	</nui-top-nav>
	
	<nui-content>
		<main>
			<!-- Auto-upgraded: role="main", id="main-content" -->
			<article>...</article>
		</main>
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

**Icon Button Label Generation:**
```
⚠️ nui-button: Icon-only button missing aria-label.
   Auto-generated: "Menu navigation".
   Consider adding explicit aria-label for better UX.
```
**Action:** Add explicit `aria-label` to button for production code.

**Navigation Landmark Label:**
```
⚠️ nui-link-list: Navigation missing aria-label. Adding generic label.
```
**Action:** Add `aria-label` to `<nui-link-list>` describing its purpose.

**Main Content Recommendation:**
```
⚠️ nui-content: Consider wrapping content in <main> element for accessibility.
```
**Action:** Wrap primary content in `<main>` element.

**Non-Semantic Interactive Element:**
```
⚠️ Clickable element without semantic tag or role. Adding role="button".
```
**Action:** Use `<button>` or `<a>` instead of `<div onclick>`.

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
	<header>
		<nav aria-label="Main navigation">...</nav>
	</header>
	<main>
		<article>...</article>
	</main>
	<footer>...</footer>
</nui-app>
```

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

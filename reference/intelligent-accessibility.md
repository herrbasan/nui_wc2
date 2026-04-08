# Intelligent Accessibility System - Technical Overview

## Architecture

### Automatic Context Detection Engine

The `upgradeAccessibility()` function analyzes component context and automatically adds missing ARIA attributes:

```javascript
function upgradeAccessibility(element) {
	// 1. Button label detection
	ensureButtonLabel(button)
	
	// 2. Role enforcement for clickable elements
	ensureRole(element)
	
	// 3. Landmark labeling
	ensureLandmarkLabels(element)
}
```

## Label Generation Algorithm

### Icon Button Labels

**Detection Logic:**
```javascript
1. Check if button has aria-label, aria-labelledby, or title → Skip
2. Check for visible text content → Skip (already accessible)
3. Find nui-icon child → Extract icon name
4. Analyze parent context:
   - Inside <nui-top-nav>, <nav>, <header> → Add "navigation"
   - Inside <nui-side-nav>, <aside> → Add "sidebar"
   - Inside <main>, <article> → Generic label
5. Generate label: "Icon Name" + Context
6. Log warning to encourage explicit labels
7. Apply aria-label
```

**Examples:**
- `<nui-icon name="search">` in nav → "Search navigation"
- `<nui-icon name="close">` in main → "Close"
- `<nui-icon name="settings">` in header → "Settings navigation"

### Navigation Landmark Labels

**Detection Logic:**
```javascript
1. Find <nav> or [role="navigation"] elements
2. Check if has aria-label or aria-labelledby → Skip
3. Look for child heading (h1-h6):
   - Found → Use heading as labelledby reference
   - Not found → Check parent context:
     * Inside <nui-side-nav> → "Sidebar navigation"
     * Inside <nui-top-nav> → "Navigation"
     * Generic → "Navigation menu"
4. Apply appropriate label
5. Log warning if generic label used
```

### Main Content Landmarks

**Detection Logic:**
```javascript
1. Find <main> element
2. Ensure role="main" (redundant but explicit)
3. Add id="main-content" if missing (for skip links)
4. Run upgradeAccessibility() on children
```

## Component-Specific Behaviors

### nui-button
```javascript
registerComponent('nui-button', (element) => {
	const button = element.querySelector('button');
	upgradeAccessibility(element); // ← Automatic check
	// ... event handlers
});
```

**Checks:**
- Button has accessible name (text, aria-label, or title)
- If icon-only: Generates contextual label
- Logs warning if auto-generated

### nui-top-nav
```javascript
registerComponent('nui-top-nav', (element) => {
	const header = element.querySelector('header');
	
	// Check if main site header → Add role="banner"
	const isMainHeader = !header.closest('article, section, aside, main');
	if (isMainHeader) header.setAttribute('role', 'banner');
	
	upgradeAccessibility(header); // ← Check all children
});
```

**Checks:**
- Header gets role="banner" if main site header
- All buttons within header checked for labels
- Navigation elements get proper landmarks

### nui-side-nav
```javascript
registerComponent('nui-side-nav', (element) => {
	const nav = element.querySelector('nav, nui-link-list');
	
	// Ensure navigation landmark
	if (!nav.hasAttribute('role')) {
		nav.setAttribute('role', 'navigation');
	}
	
	// Context-aware label: "Sidebar navigation"
	if (!nav.hasAttribute('aria-label')) {
		nav.setAttribute('aria-label', 'Sidebar navigation');
	}
	
	upgradeAccessibility(nav);
});
```

### nui-link-list
```javascript
registerComponent('nui-link-list', (element) => {
	// Context detection hierarchy:
	// 1. Check for explicit aria-label → Keep it
	// 2. Look for heading to use as labelledby
	// 3. Check parent component (nui-side-nav, aside)
	// 4. Fall back to generic "Navigation menu"
	
	const isSidebar = element.closest('nui-side-nav, aside');
	const label = isSidebar ? 'Sidebar navigation' : 'Navigation menu';
	element.setAttribute('aria-label', label);
});
```

**Tree Mode Additions:**
- Group items: role="button", aria-expanded, aria-label from text
- Sub-items: role="listitem", tabindex="0", aria-label from text
- Sub container: role="list"
- Active items: aria-current="page"

### nui-content
```javascript
registerComponent('nui-content', (element) => {
	const main = element.querySelector('main');
	
	if (main) {
		main.setAttribute('role', 'main');
		main.setAttribute('id', 'main-content'); // For skip links
		upgradeAccessibility(main);
	} else {
		// Warn if no <main> element
		console.warn('Consider wrapping content in <main>');
	}
});
```

### nui-app-footer
```javascript
registerComponent('nui-app-footer', (element) => {
	const footer = element.querySelector('footer');
	
	// Only main site footer gets contentinfo role
	const isMainFooter = !footer.closest('article, section, aside, main');
	if (isMainFooter) {
		footer.setAttribute('role', 'contentinfo');
	}
});
```

## Priority System

### Never Overwrite
Components **never** overwrite explicit developer attributes:
- aria-label (explicit wins)
- aria-labelledby (explicit wins)
- title (explicit wins)
- role (explicit wins)

### Upgrade Priority
1. **Explicit attributes** (highest priority)
2. **Visible text content** (natural accessibility)
3. **Heading references** (aria-labelledby)
4. **Context inference** (parent analysis)
5. **Generic fallback** (last resort + warning)

## Performance Considerations

### Zero Overhead When Unused
- Checks only run during component initialization
- No MutationObservers watching for changes
- No runtime polling or checking
- One-time analysis per component

### Minimal DOM Queries
```javascript
// Efficient queries with early exits
if (!button.hasAttribute('aria-label') && 
    !button.hasAttribute('aria-labelledby') &&
    !button.getAttribute('title')) {
	// Only check if needed
}
```

### Cached Context
```javascript
const isSidebar = element.closest('nui-side-nav, aside');
// Single query, reused for label generation
```

## Debug Mode (Future Enhancement)

Potential addition for development:

```javascript
nui.configure({
	accessibility: {
		debug: true,  // Show all accessibility decisions
		strict: true, // Error instead of warn
		autoFix: false // Disable auto-upgrades (warn only)
	}
});
```

## Testing Strategy

### Unit Tests
- Test each label generation path
- Verify context detection logic
- Ensure explicit attributes preserved

### Integration Tests
- Test full component trees
- Verify nested context inheritance
- Test landmark detection

### Accessibility Audits
- Lighthouse accessibility score
- axe DevTools automated checks
- Manual screen reader testing

## Benefits

✅ **Developer Experience**
- Rapid prototyping without accessibility failures
- Console warnings teach best practices
- Progressive refinement from auto to explicit

✅ **Accessibility Guarantee**
- Baseline accessibility maintained automatically
- No completely inaccessible states
- Fails gracefully with generic labels

✅ **Teaching Tool**
- Warnings explain what's missing
- Suggests improvements
- Shows context-aware thinking

✅ **Production Ready**
- Works with or without explicit labels
- Scales to large applications
- Zero runtime overhead after init

## Future Enhancements

### Planned Features
1. **Smart heading detection** - Use nearby headings for labels
2. **Form context** - Detect form fields and generate labels
3. **Icon semantics** - Database of icon meanings (close→dismiss, trash→delete)
4. **Language support** - i18n for generated labels
5. **Focus management** - Auto-focus on dialog open, trap focus in modals
6. **Live region announcements** - Auto-add aria-live for dynamic content
7. **Skip link generation** - Auto-create skip navigation links

### Consideration: ML-Powered Labels
Train model on icon+context→label pairs to generate more natural labels:
- "menu in header" → "Open main menu"
- "search in sidebar" → "Search site content"
- "close in dialog" → "Close this dialog"

Status: Research phase, exploring feasibility.

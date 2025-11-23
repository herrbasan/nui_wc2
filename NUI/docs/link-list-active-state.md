# Link List Active State Management

## Overview

The `nui-link-list` component provides complete active item state management with automatic group expansion, Knower integration, and memory cleanup. When used within `nui-side-nav`, all methods are proxied for convenient access.

## API Methods

### `setActive(selector)`

Sets the active item and automatically expands parent groups to reveal it.

**Parameters:**
- `selector` (String|Element) - CSS selector string or DOM element reference

**Returns:**
- `Boolean` - `true` if item was found and set, `false` if not found

**Behavior:**
1. Removes `active` class from previous active `<li>` element
2. Adds `active` class to new `<li>` element
3. Expands all parent groups in the hierarchy
4. Updates Knower state with item data
5. Triggers state change notifications

**Examples:**
```javascript
const sideNav = document.querySelector('nui-side-nav');

// By selector
sideNav.setActive('a[href="#profile"]');
sideNav.setActive('[data-page="settings"]');

// By element reference
const link = document.querySelector('#my-link');
sideNav.setActive(link);

// Check if successful
if (sideNav.setActive('#missing')) {
	console.log('Item set as active');
} else {
	console.log('Item not found');
}
```

### `getActive()`

Returns the currently active `<li>` element.

**Returns:**
- `Element|null` - Active `<li>` element or `null` if none active

**Example:**
```javascript
const activeLi = sideNav.getActive();
if (activeLi) {
	const link = activeLi.querySelector('a');
	console.log('Active href:', link.getAttribute('href'));
}
```

### `getActiveData()`

Returns structured data about the active item.

**Returns:**
- `Object|null` - Active item data or `null` if none active
  - `element` (Element) - The active `<li>` element
  - `link` (Element) - The `<a>` element within the `<li>`
  - `href` (String) - The link's href attribute
  - `text` (String) - The link's visible text content

**Example:**
```javascript
const data = sideNav.getActiveData();
if (data) {
	console.log(`Active: ${data.text} → ${data.href}`);
	// Example output: "Active: Profile → #profile"
}
```

### `clearActive()`

Clears the active state completely.

**Behavior:**
1. Removes `active` class from current item
2. Sets internal state to `null`
3. Updates Knower with `null` state
4. Triggers state change notifications

**Example:**
```javascript
sideNav.clearActive();
console.log(sideNav.getActive()); // null
```

## Knower Integration

Each `nui-link-list` component maintains state in the Knower system using a namespaced key:

**State Key Pattern:** `{instanceId}:active`

**State Data Structure:**
```javascript
{
	element: <li>,          // DOM <li> element reference
	link: <a>,              // DOM <a> element reference
	href: "#profile",       // Link href attribute
	text: "Profile",        // Link text content
	timestamp: 1700000000   // Unix timestamp of activation
}
```

**Watching State Changes:**
```javascript
import { nui } from './NUI/nui.js';

const linkList = document.querySelector('nui-link-list');
const instanceId = linkList.getAttribute('nui-id');
const stateKey = `${instanceId}:active`;

const unwatch = nui.knower.watch(stateKey, (state, oldState) => {
	if (state) {
		console.log(`Activated: ${state.text} (${state.href})`);
	} else {
		console.log('Active state cleared');
	}
});

// Cleanup
unwatch();
```

## Usage Patterns

### Basic Navigation

```javascript
const sideNav = document.querySelector('nui-side-nav');

// Set initial active item
sideNav.setActive('[data-page="home"]');

// Handle navigation
document.querySelectorAll('nui-side-nav a').forEach(link => {
	link.addEventListener('click', (e) => {
		e.preventDefault();
		sideNav.setActive(link);
		
		// Navigate to page
		const page = link.getAttribute('href');
		loadPage(page);
	});
});
```

### Router Integration

```javascript
class Router {
	constructor(sideNav) {
		this.sideNav = sideNav;
		
		window.addEventListener('hashchange', () => {
			this.onRouteChange();
		});
		
		this.onRouteChange(); // Initial route
	}
	
	onRouteChange() {
		const hash = window.location.hash;
		const link = document.querySelector(`a[href="${hash}"]`);
		
		if (link) {
			this.sideNav.setActive(link);
		}
	}
}

// Usage
const router = new Router(document.querySelector('nui-side-nav'));
```

### Sync with External State

```javascript
import { nui } from './NUI/nui.js';

// Watch for changes and sync with app state
const linkList = document.querySelector('nui-link-list');
const instanceId = linkList.getAttribute('nui-id');

nui.knower.watch(`${instanceId}:active`, (state) => {
	if (state) {
		// Update app state
		appState.currentPage = state.href;
		appState.breadcrumbs = getBreadcrumbs(state.element);
		
		// Update URL without page reload
		history.pushState(null, '', state.href);
		
		// Analytics
		trackPageView(state.href, state.text);
	}
});
```

### Programmatic Navigation with Validation

```javascript
async function navigateToPage(pageId) {
	const sideNav = document.querySelector('nui-side-nav');
	const success = sideNav.setActive(`[data-page="${pageId}"]`);
	
	if (!success) {
		console.warn(`Page not found: ${pageId}`);
		// Fallback to home
		sideNav.setActive('[data-page="home"]');
		return false;
	}
	
	const data = sideNav.getActiveData();
	await loadPageContent(data.href);
	return true;
}
```

### Auto-Activation on Page Load

```javascript
document.addEventListener('DOMContentLoaded', () => {
	const sideNav = document.querySelector('nui-side-nav');
	const currentPath = window.location.pathname;
	
	// Try to match current URL
	let link = document.querySelector(`a[href="${currentPath}"]`);
	
	// Fallback to hash
	if (!link && window.location.hash) {
		link = document.querySelector(`a[href="${window.location.hash}"]`);
	}
	
	// Default to first link
	if (!link) {
		link = document.querySelector('nui-side-nav a');
	}
	
	if (link) {
		sideNav.setActive(link);
	}
});
```

## Automatic Group Expansion

When `setActive()` is called, the component automatically:

1. Finds all parent `<ul>` elements in the hierarchy
2. Locates group headers (`.group-header`) for each level
3. Calls `setGroupState(header, true)` to expand them
4. Uses smooth height transitions for visual feedback

**Example Hierarchy:**
```
Dashboard (collapsed)
├─ Overview
└─ Settings (collapsed)
   ├─ General
   └─ Account (collapsed)
      ├─ Profile ← setActive() called here
      └─ Preferences
```

**Result:** All three groups (Dashboard, Settings, Account) expand automatically.

## Memory Management

The component implements proper cleanup via the ID-based system:

**Cleanup on Disconnect:**
```javascript
registerComponent('nui-link-list', (element) => {
	const instanceId = ensureInstanceId(element, 'link-list');
	const stateKey = `${instanceId}:active`;
	
	// ... component logic ...
	
	return () => {
		knower.forget(stateKey); // Clean up Knower state
	};
});
```

**What Gets Cleaned:**
- Knower state entry removed
- All watchers unregistered
- Internal references cleared
- No memory leaks

## Complete Example

```html
<nui-side-nav>
	<nui-link-list mode="fold">
		<ul>
			<li class="group-header"><span>Navigation</span></li>
			<li><a href="#home" data-page="home">Home</a></li>
			<li><a href="#about" data-page="about">About</a></li>
		</ul>
	</nui-link-list>
</nui-side-nav>

<script type="module">
	import { nui } from './NUI/nui.js';
	
	const sideNav = document.querySelector('nui-side-nav');
	const linkList = document.querySelector('nui-link-list');
	
	// Set initial active
	sideNav.setActive('[data-page="home"]');
	
	// Handle clicks
	linkList.addEventListener('click', (e) => {
		const link = e.target.closest('a');
		if (link) {
			e.preventDefault();
			sideNav.setActive(link);
			loadPage(link.getAttribute('href'));
		}
	});
	
	// Watch state changes
	const instanceId = linkList.getAttribute('nui-id');
	nui.knower.watch(`${instanceId}:active`, (state) => {
		console.log('Navigation:', state?.text);
	});
	
	// Query state
	function showCurrentPage() {
		const data = sideNav.getActiveData();
		alert(`Current: ${data.text}`);
	}
</script>
```

## Testing

See `Playground/test-link-list.html` for a comprehensive test page demonstrating:
- All API methods
- Nested group expansion
- Knower integration
- State persistence
- Memory cleanup

## Browser Support

Works in all modern browsers supporting:
- Custom Elements v1
- ES6 Modules
- querySelector/closest
- classList API

# nui-tabs

## Design Philosophy

Tabs organize content into mutually exclusive views while keeping all content in the DOM. Unlike navigation that loads new pages, tabs switch between content that's already present.

The NUI tabs component follows the ARIA Tab Pattern closely, using semantic HTML as the foundation:
- `<nav>` for the tab list (role="tablist")
- `<button>` or `<a>` elements for tabs (role="tab")
- `<section>` or `<div>` elements for panels (role="tabpanel")

This structure works as plain HTML (all panels visible) and upgrades to interactive tabs when JavaScript loads.

## Declarative Usage

The component automatically upgrades semantic HTML structure. Use a list or container for tabs, and separate containers for panels.

```html
<nui-tabs>
	<nav>
		<button>Profile</button>
		<button>Settings</button>
	</nav>
	<section>Profile Content</section>
	<section hidden>Settings Content</section>
</nui-tabs>
```

Alternatively, use `aria-controls` or `href` to explicitly link tabs to panels:

```html
<nui-tabs>
	<nav>
		<button data-tab="profile" aria-controls="profile">Profile</button>
		<button data-tab="settings" aria-controls="settings">Settings</button>
	</nav>
	<section id="profile">Profile Content</section>
	<section id="settings" hidden>Settings Content</section>
</nui-tabs>
```

The `data-tab` attribute on buttons (in the Playground examples) links to panel IDs declaratively if custom page logic uses it. Internally, the component relies on DOM order or `aria-controls`/`href`. When a tab is activated:
1. The button gets `aria-selected="true"`
2. Its corresponding panel loses the `hidden` attribute (or gets `display: flex/block`)
3. All other panels get `hidden`
4. Tab height animates smoothly to fit the new content (unless disabled)

### Attributes

| Attribute | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `fill` | boolean | `false` | When present, sets the component and panels to `display: flex; flex-direction: column; flex: 1; height: 100%`, allowing the tabs to fill their parent container. Bypasses height animation. |
| `no-animation` | boolean | `false` | When present, disables smooth height transitions. |

## Progressive Enhancement

Without JavaScript, all panels are visible. The `hidden` attribute on inactive panels ensures content is accessible (and hidden) even before upgrade.

After upgrade:
- The initial tab (first with `aria-selected="true"`, or the first tab) is shown by default
- Keyboard navigation works (arrows, Home, End)
- ARIA attributes (`role`, `aria-selected`, `aria-controls`, `aria-labelledby`, `tabindex`) are managed automatically

## Programmatic Usage

### DOM Methods

Below are the JavaScript methods available on the `<nui-tabs>` element:

| Method | Parameters | Description |
|--------|------------|-------------|
| `selectTab(indexOrId)` | `index: number` or `id: string` | Programmatically selects a tab. Can be the 0-based index of the tab, the ID of the tab element, or the ID of the panel it controls. |

```javascript
const tabs = document.querySelector('nui-tabs');
tabs.selectTab(1); // Selects the second tab
tabs.selectTab('settings'); // Selects the tab that controls the 'settings' panel
```

### Events

| Event | Type | Description |
|-------|------|-------------|
| `nui-tab-change` | `CustomEvent` | Fired when the active tab changes. `detail` contains `{ tab: HTMLElement, panel: HTMLElement }`. Bubbles. |

```javascript
tabs.addEventListener('nui-tab-change', (e) => {
	console.log('Active tab:', e.detail.tab);
	console.log('Active panel:', e.detail.panel);
});
```

## Use Cases

Tabs work well for:
- Settings organized by category
- Content that doesn't need URL-addressable states
- Space-constrained layouts where showing all content at once would be overwhelming

Avoid tabs for:
- Content that users might want to link to directly (use pages)
- Sequential workflows (use step indicators)
- Large amounts of content per panel (consider pages or accordions)

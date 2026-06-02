# nui-details

## Overview

`<nui-details>` is a styled wrapper around the native `<details>` element with built-in support for lazy-loaded content from URLs. It replaces the repetitive `<details class="collapsible-section collapsible-section--spaced">` boilerplate used throughout the Playground with a single declarative element.

## Design Philosophy

The native `<details>` element is semantically correct and accessible out of the box. `nui-details` enhances it with NUI's visual design system and adds progressive loading capabilities — without changing how the element works.

## Usage

### Static Content

Without a `src` attribute, children render normally:

```html
<nui-details summary="System Requirements">
	<ul>
		<li>Node.js 18+</li>
		<li>Modern browser with ES modules</li>
	</ul>
</nui-details>
```

### Load from URL (Immediate)

With `src`, content is fetched on upgrade and rendered immediately:

```html
<nui-details summary="API Reference" src="/docs/api.md">
</nui-details>
```

### Lazy Load

Add `lazy` to defer fetching until the user opens the section:

```html
<nui-details summary="Changelog" src="/docs/changelog.md" lazy>
</nui-details>
```

Content is **cached** after the first fetch — subsequent opens are instant.

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `summary` | string | — | Text for the `<summary>` element. Wrapped in `<strong>`. |
| `src` | URL | — | URL to fetch content from. `.md` files render via `<nui-markdown>`. `.html` files are injected as HTML. Other types render as plain text. |
| `lazy` | boolean | `false` | When present, content is only fetched when the details are first opened. Cached thereafter. |

## DOM Structure

```html
<nui-details summary="Title" src="/path/to/content.md">
	<!-- Rendered by component -->
	<details>
		<summary><strong>Title</strong></summary>
		<div>
			<nui-markdown src="/path/to/content.md"></nui-markdown>
		</div>
	</details>
</nui-details>
```

## Events

None. The native `<details>` `toggle` event fires on the inner element.

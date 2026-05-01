# nui-page

## Design Philosophy

`nui-page` is the layout foundation for content loaded by NUI's router. It solves a common UX problem: long lines of text on wide screens are hard to read. By constraining content to a readable max-width (~56rem) while allowing selective full-width breakout sections, it provides a magazine-like reading experience without sacrificing layout flexibility.

The component is created automatically by the router when loading fragments, but can also be used statically in any page.

## Declarative Usage

```html
<nui-page>
    <section>
        <h1>Article Title</h1>
        <p>Content constrained to readable width.</p>
    </section>

    <div breakout>
        <nui-layout columns="3">Full-width grid</nui-layout>
    </div>

    <section>
        <p>Back to constrained width.</p>
    </section>
</nui-page>
```

## Attributes

The `breakout` attribute is the key feature. It is not specific to `nui-page` — it is a layout engine feature that works on any direct child element:

| Attribute | Element | Description |
|-----------|---------|-------------|
| `breakout` | Any direct child of `<nui-page>` | Expands the child to full container width, bypassing the max-width constraint. |

## How It Works

When content is loaded (via router or statically), `nui-page` automatically:

1. **Constrains width** — All direct children get `max-width: var(--space-page-maxwidth)` for readability.
2. **Adds padding** — Consistent horizontal padding via CSS variables.
3. **Enables breakout** — Any child with a `breakout` attribute spans full width.

### The Breakout Pattern

```html
<!-- Hero image spans full width -->
<img breakout src="hero.jpg" alt="Hero">

<!-- Callout with full-bleed background, readable text inside -->
<section breakout class="feature-callout">
    <div class="maxwidth-container">
        <h2>Headline</h2>
        <p>Text stays readable via maxwidth-container.</p>
    </div>
</section>
```

### `.maxwidth-container` Utility

When an element breaks out, its content loses the default max-width constraint. Use `.maxwidth-container` to re-apply it:

```html
<nui-layout breakout class="hero-banner">
    <!-- Full-bleed background -->
    <div class="maxwidth-container">
        <!-- Text stays readable -->
    </div>
</nui-layout>
```

## Router Integration

The router creates `<nui-page>` wrappers automatically when loading fragments. Each page gets a unique wrapper that is cached and reused:

1. User navigates to `#page=components/button`
2. Router fetches `pages/components/button.html`
3. Router creates `<nui-page class="content-page ...">` wrapper
4. Router injects HTML and upgrades custom elements
5. On subsequent visits, the cached wrapper is shown/hidden

You don't need to add `<nui-page>` to your fragments — the router provides it. If you want a fragment without the page wrapper behavior, your fragment can use a plain `<div>` as root instead.

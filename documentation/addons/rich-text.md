# nui-rich-text

## Setup

This is an addon module. Load both the JS and CSS before use:

```html
<link rel="stylesheet" href="NUI/css/modules/nui-rich-text.css">
<script type="module" src="NUI/lib/modules/nui-rich-text.js"></script>
```

## Design Philosophy

This component provides a lightweight WYSIWYG editing experience using native browser capabilities (`contenteditable` and `execCommand`). Rather than bundling a heavy editor like ProseMirror or CKEditor, it offers essential formatting tools with minimal overhead, making it suitable for simple content editing tasks.

### How It Works
The component builds a toolbar using NUI button components and manages a `contenteditable` region. It handles:

- **Basic formatting** - Bold, italic, headings, lists
- **Links** - Insert and edit hyperlinks
- **Tables** - Simple table creation and editing
- **Images** - Insert with extensible sourcing via events
- **Code blocks** - Using `nui-code` integration

The toolbar is auto-generated but can be customized. All editing operations use native browser commands for broad compatibility.

## Declarative Usage

```html
<nui-rich-text id="editor">
    <h2>Welcome</h2>
    <p>Start editing <strong>here</strong>.</p>
</nui-rich-text>
```

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `fill` | boolean | `false` | Fill mode: the component claims the free space of its parent and the editor scrolls internally, leaving the toolbar fixed. Without it the component sizes to its content. |

**Fill mode.** Put `<nui-rich-text fill>` inside a sized container and the toolbar stays put while the editor scrolls:

```html
<div id="editor-pane"><!-- any sized box -->
    <nui-rich-text fill placeholder="Write…"></nui-rich-text>
</div>
```

`fill` sets `flex: 1; min-height: 0` through the host → container → editor chain. The `min-height: 0` is the part worth not reimplementing by hand: a flex item defaults to `min-height: auto`, so content makes the box grow instead of scroll, and the toolbar rides away with it. If the parent is a flex container the component claims its free space; if not, give the parent an explicit height.

This exists so hosts never need to style the component's internal classes. Before the attribute, filling a pane required three rules on `.nui-rich-text-container` and `.nui-rich-text-editor`.

### Class Variants

None

## Programmatic Usage

Intercept the image insertion to provide a custom picker:

```javascript
const editor = document.querySelector('nui-rich-text');

editor.addEventListener('nui-image-request', (e) => {
    e.preventDefault(); // Stop default prompt
    
    // Open your custom image picker
    const url = await myImagePicker.open();
    
    // Insert the selected image
    e.target.insertImage(url, 'Description');
});
```

### Getting and Setting Content
```javascript
const editor = document.querySelector('nui-rich-text');

// Get HTML content
const html = editor.value;

// Get Markdown content
const markdown = editor.markdown;

// Set HTML content
editor.setValue('<p>New content</p>');

// Set Markdown content
editor.setMarkdown('# Hello\n\nParagraph');
```

### DOM Methods

| Signature | Description |
| --- | --- |
| value | Gets or sets the raw HTML content of the editor. |
| markdown | Gets the content formatted as Markdown, or sets the content by parsing Markdown into HTML. |
| getValue() | Standard method alias for getting the value (HTML). |
| setValue(html) | Standard method alias for setting the value (HTML). |
| getMarkdown() | Method alias for reading the markdown content. |
| setMarkdown(md) | Method alias for loading Markdown content into the editor. |
| insertImage(url, alt) | Programmatically inserts an image into the editor at the current cursor position. |
| getInlinedImages() | Returns an array of `{ src, alt, element }` objects for all images in the editor that use data:image/ or blob: URLs. Useful before saving content to a server. |

### Action Delegates

None

### Events

| Event Name | Description |
| --- | --- |
| nui-change | Fired whenever the content of the editor changes (like native input events). event.detail.value contains the updated HTML. |
| nui-image-request | Fired when the user clicks the "Insert Image" icon in the toolbar. Use `e.preventDefault()` to intercept this event and open your own custom media browser dialog. To complete the insertion, call target.insertImage(url, alt). |

```javascript
editor.addEventListener('nui-change', (e) => {
    console.log('Content changed:', e.detail.value);
});
```

## When to Use

- Simple content editing (comments, descriptions)
- Admin interfaces needing basic formatting
- Applications where heavy editors would be overkill
- Prototypes and internal tools

For complex document editing with collaborative features, consider dedicated editor libraries.

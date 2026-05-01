# nui-rich-text

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

None

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

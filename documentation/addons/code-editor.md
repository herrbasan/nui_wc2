# nui-code-editor

## Design Philosophy

This component provides an editable code input with real-time syntax highlighting. Unlike heavy editors like Monaco or CodeMirror, it uses a lightweight `contenteditable` approach with custom caret restoration, prioritizing fast load times and simplicity over advanced IDE features.

## Declarative Usage

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-lang` | string | `'js'` | Language for syntax highlighting. |
| `data-line-numbers` | boolean | `'true'` | Enables or disables the line numbers gutter. |
| `aria-label` | string | `'Code Editor'` | Accessibility label for the contenteditable area. |

### Class Variants

None

## Programmatic Usage

### DOM Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `value` (getter/setter) | `val: string` | Gets or sets the current code string and re-renders the block. |
| `insertText` | `text: string` | Inserts text at the current caret position seamlessly. |

### Action Delegates

- None

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `nui-change` | `{ value: string, lang: string }` | Fired when the code content is updated (typing or pasting). |


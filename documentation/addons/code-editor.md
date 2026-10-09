# nui-code-editor

## Setup

This is an addon module. Load both the JS and CSS before use:

```html
<link rel="stylesheet" href="NUI/css/modules/nui-code-editor.css">
<script type="module" src="NUI/lib/modules/nui-code-editor.js"></script>
```

## Design Philosophy

This component provides an editable code input with real-time syntax highlighting. Unlike heavy editors like Monaco or CodeMirror, it uses a lightweight `contenteditable` approach with custom caret restoration, prioritizing fast load times and simplicity over advanced IDE features.

## Declarative Usage

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-lang` | string | `'js'` | Language for syntax highlighting. **An attribute that is present but empty means no highlighting** — a document may fence code with no info string, and colouring that as JavaScript invents tokens. Only the attribute being *absent* falls back to `js`. |
| `data-line-numbers` | boolean | `'true'` | Enables or disables the line numbers gutter. |
| `placeholder` | string | — | Hint drawn while the field is empty, exactly like `nui-rich-text`'s. Drawn by CSS, never part of the value. |
| `aria-label` | string | `'Code Editor'` | Accessibility label for the contenteditable area. |

### Class Variants

None

## Programmatic Usage

### DOM Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `value` (getter/setter) | `val: string` | Gets or sets the current code string and re-renders the block. |
| `lang` (getter/setter) | `value: string` | Gets or sets the highlighting language; also writes `data-lang`. Setting it re-highlights in place, which replaces the highlighted DOM — so the caret goes to the end. That is inherent to re-highlighting, not a policy. |
| `insertText` | `text: string` | Inserts text at the current caret position seamlessly. |

### Initial content

The element's `textContent` **is** the code, verbatim. Earlier versions trimmed a
leading newline and a trailing newline-plus-indentation, to spare an author who
formatted the element across indented HTML lines from two phantom blank lines —
but a component that silently edits its own content cannot be a code editor: a
snippet that legitimately opens or closes with a blank line came back altered and
the caller never learned. Write the content flush instead:

```html
<!-- yes -->
<nui-code-editor data-lang="js">const a = 1;</nui-code-editor>

<!-- no — the newline after the tag and the indent before </…> become code -->
<nui-code-editor data-lang="js">
	const a = 1;
</nui-code-editor>
```

### Action Delegates

- None

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `nui-change` | `{ value: string, lang: string }` | Fired when the code content is updated (typing or pasting). |


# nui-tag-input

## Design Philosophy

The tag-input component provides a reusable pattern for managing lists of removable items. It serves as both a standalone tag manager and a composable building block for multi-select interfaces. The component maintains hidden form inputs automatically, ensuring native form submission compatibility.

## Declarative Usage

Tags are stored as hidden input elements internally, making form submission automatic. Each tag displays with a remove button and supports full keyboard navigation (arrow keys to navigate, Enter/Space to remove). The component offers two modes: display-only (pre-populated) and editable (with an input field for adding new tags).

### Pre-populated Tags
Initialize with existing tags using hidden inputs. The component will parse them during setup.

```html
<nui-tag-input name="filters">
    <input type="hidden" name="filters" value="active">
    <input type="hidden" name="filters" value="published">
</nui-tag-input>
```

### Editable Mode
Allow users to add tags dynamically by typing and pressing Enter.

```html
<nui-tag-input name="keywords" editable placeholder="Add keyword..."></nui-tag-input>
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | string | `""` | The `name` attribute applied to the hidden input fields generated for each tag. Essential for native form submissions. |
| `editable` | boolean | `false` | When present, renders a text input field allowing the user to type and add new tags. |
| `placeholder` | string | `"Add tag..."` | The placeholder text shown in the input field when `editable` is enabled. |

## Programmatic Usage

You can fully control the tags state through the element's DOM methods.

### DOM Methods

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `addTag(value, label)` | `value: string`, `label?: string` | `boolean` | Adds a new tag if it doesn't already exist. Returns `true` on success. |
| `removeTag(value)` | `value: string` | `boolean` | Removes a tag by its value. Returns `true` on success. |
| `hasTag(value)` | `value: string` | `boolean` | Returns `true` if a tag with the specified value exists. |
| `listTags()` | none | `Array<{value, label}>` | Returns a deep copy of the current tags array. |
| `getValues()` | none | `string[]` | Returns an array containing only the string values of the current tags. |
| `clear()` | none | `void` | Removes all tags from the component. |
| `focus()` | none | `void` | Shifts browser focus to the text input (if editable) or the tag container. |

### Events

| Event | Detail Payload | Description |
|-------|----------------|-------------|
| `nui-tag-add` | `{ value: string, label: string }` | Fired when a new tag is successfully added. |
| `nui-tag-remove` | `{ value: string, label: string }` | Fired when a tag is successfully removed. |
| `nui-change` | `{ values: string[], tags: {value, label}[] }` | Fired sequentially after any add or remove operation, containing the entire updated state. |

## Keyboard Navigation
The component provides full keyboard accessibility natively:
- **Left/Right arrows** — Navigate between tags
- **Home** — Jump to first tag
- **End** — Jump to last tag (or input in editable mode)
- **Enter/Space** on tag — Remove tag
- **Escape** — Clear focus
- **Backspace** on empty input (editable) — Focus last tag
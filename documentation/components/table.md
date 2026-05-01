# nui-table

## Design Philosophy

Tables present a challenge on mobile: wide tabular data doesn't fit narrow screens. NUI's table component solves this by transforming the display based on viewport size while preserving the semantic table markup for accessibility. 

Instead of wrapping a complicated framework around tables or using a custom data schema, you just provide a standard responsive HTML `<table/>` and NUI parses it to decorate it internally for responsive layouts. On small screens, rows stack as cards, and cells display their column headers as inline labels automatically.

## Declarative Usage

`<nui-table>` expects a standard HTML `<table>` as its single child element. The table must have a `<thead>` and a `<tbody>`.

```html
<nui-table>
    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Alice</td>
                <td>Developer</td>
                <td>Active</td>
            </tr>
            <tr>
                <td>Bob</td>
                <td>Designer</td>
                <td>Offline</td>
            </tr>
        </tbody>
    </table>
</nui-table>
```

When initialized, NUI will automatically calculate and apply `data-label` attributes to the `<td>` elements in the `<tbody>` so that CSS can display the column headers as labels when the screen collapses into a mobile "card" view.

## Responsive Behavior (Card Layout)

On narrow screens (mobile viewports), the standard tabular grid collapses:
- The `<thead>` is visually hidden.
- Each `<tr>` in the `<tbody>` renders as a block card.
- Each `<td>` renders as an inline-flex or block element, and CSS exposes the `data-label` attribute (injected by NUI from the `<th>` values) using a `::before` pseudo-element.
- Horizontal scrolling is completely avoided, ensuring a native vertical reading flow.

This transformation is handled entirely via CSS and preserves all table semantics for screen readers natively. 

## Data Annotations Injected

NUI automatically assigns several tracking attributes onto every `<td>` element in the table to allow for powerful custom nth-child or layout-specific styling:

| Attribute | Description |
|-----------|-------------|
| `data-label` | The text content of the corresponding `<th>` column header. |
| `data-row-cell-index` | The 1-based index of the cell within its own row (horizontal position). |
| `data-row-cell-total` | The total number of cells in that row. |
| `data-table-cell-index` | The 1-based index of the cell relative to *all* cells in the dataset (absolute position). |
| `data-table-cell-total` | The total number of cells across the entire dataset. |

## Alternatives for Massive Datasets

Use `<nui-table>` for:
- Small to medium datasets (under 100 rows).
- Static text-based content tables.
- Simple presentation.

For data-heavy operations with thousands of rows, consider using the `nui-list` addon component, which provides virtual DOM scrolling, built-in sorting and filtering, and customizable row templates.
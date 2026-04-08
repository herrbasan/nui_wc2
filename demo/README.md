# demo

Generated with NUI Create App.
## Included Components

- `button`


## Quick Start

1. Ensure the NUI library is at `./NUI` (copy or symlink from your NUI installation)
2. Serve with a local server:
   ```bash
   npx serve .
   # or
   python -m http.server 8080
   ```
3. Open http://localhost:3000 (or your server URL)

## Minimal Setup

```html
<link rel="stylesheet" href="NUI/css/nui-theme.css">
<script type="module" src="NUI/nui.js"></script>
```

## Project Structure

- `demo/`
  - `index.html` - App shell (extracted from Playground)
  - `css/app.css` - Your styles
  - `js/app.js` - App initialization
  - `pages/`
    - `home.html` - Dashboard
    - `settings.html` - Settings page
    - `components/` - Component demo pages (working examples)
  - `NUI/` - NUI library (copy from your NUI installation)

## Key Patterns

### Components wrap native elements
```html
<nui-button>
    <button type="button">Click</button>
</nui-button>
```

### SPA routing uses hash URLs
```html
<a href="#page=components/dialog">Dialog Demo</a>
```

### Page scripts
```html
<script type="nui/page">
function init(element) {
    // Page setup here
    element.show = () => console.log('visible');
    element.hide = () => console.log('hidden');
}
</script>
```

## Adapting Component Examples

Each component page in `pages/components/` is a working example extracted from the NUI Playground. To adapt them:

1. Remove sections you don't need
2. Modify the `<script type="nui/page">` for your logic
3. Keep the HTML structure - it follows NUI's patterns

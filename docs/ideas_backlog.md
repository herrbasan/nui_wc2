# Ideas Backlog

Future feature ideas to consider. These are not planned - just captured for later evaluation.

---

## Core Library

---

### Tooltip Component

**Purpose:** Universal tooltip for any element - explains UI elements on hover/focus.

**Concept:**
- Lightweight positioning engine that attaches to any element
- Auto-positions to avoid screen edges
- Trigger on hover and focus (keyboard accessible)
- Uses modern anchored positioning where available, fallback to calculated positioning

**API Sketch:**
```html
<!-- Method 1: By reference -->
<button aria-describedby="tip-save">Save</button>
<nui-tooltip id="tip-save">Save your changes to the cloud</nui-tooltip>

<!-- Method 2: Wrapped -->
<nui-tooltip text="Delete this file permanently">
  <button>Delete</button>
</nui-tooltip>
```

**Key Features:**
- Position: top, bottom, left, right, auto
- Delay before show (prevent flashing on quick passes)
- No JS scroll tracking (use anchored positioning or intersection observer)
- Accessible (uses aria-describedby automatically)

**Status:** Idea only - not planned

---

---

### Badge Component

**Purpose:** Small status indicators on buttons, icons, tabs, navigation items.

**Concept:**
- Numeric counts or status dots
- Positions: top-right, top-left, bottom-right, bottom-left
- Can be standalone or attached to other components

**API Sketch:**
```html
<!-- On button -->
<nui-button>
  <button>Messages <nui-badge>5</nui-badge></button>
</nui-button>

<!-- Dot only -->
<nui-icon name="notifications"><nui-badge dot></nui-badge></nui-icon>

<!-- Standalone -->
<span>New <nui-badge variant="success">New</nui-badge></span>
```

**Status:** Idea only - not planned

---

### Segmented Control Component

**Purpose:** iOS-style segmented buttons - compact alternative to radio buttons or tabs.

**Concept:**
- Single-select button group
- Compact horizontal layout
- Clear selection state

**API Sketch:**
```html
<nui-segmented>
  <button value="day" aria-selected="true">Day</button>
  <button value="week">Week</button>
  <button value="month">Month</button>
</nui-segmented>

<script>
segment.addEventListener('nui-change', (e) => {
  console.log('Selected:', e.detail.value); // 'day', 'week', or 'month'
});
</script>
```

**Status:** Idea only - not planned

---

### Switch Component

**Purpose:** On/off toggle - alternative to checkbox for boolean states.

**Concept:**
- iOS/Android style toggle switch
- Clear on/off visual state
- Accessible (uses checkbox under the hood)

**API Sketch:**
```html
<nui-switch>
  <input type="checkbox" id="airplane" checked>
  <label for="airplane">Airplane Mode</label>
</nui-switch>

<!-- Or -->
<nui-switch checked>
  <input type="checkbox" name="notifications">
  <label>Enable notifications</label>
</nui-switch>
```

**Features:**
- Works with native form submission
- Keyboard accessible (Space to toggle)
- Optional: labels for On/Off states

**Status:** Idea only - not planned

---

### ~~Dual Sidebar Support (nui-side-nav Enhancement)~~
**(Status: Implemented)**

**Purpose:** Support both left (navigation) and right (configuration/settings) sidebars in app layout.

**Concept:**
Enhance existing `nui-side-nav` with a `position` attribute to support dual sidebars - no new component needed.

**API Sketch:**
```html
<nui-app>
  <!-- Left sidebar: main navigation -->
  <nui-side-nav position="left">
    <nui-link-list>...</nui-link-list>
  </nui-side-nav>
  
  <!-- Right sidebar: configuration/settings panel -->
  <nui-side-nav position="right">
    <h3>Settings</h3>
    <nui-input-group>...</nui-input-group>
  </nui-side-nav>
  
  <nui-content>...</nui-content>
</nui-app>
```

**Behavior:**
- `position="left"` (default): Existing behavior, slides from left
- `position="right"`: Slides from right, mirrored behavior
- Content area sandwiches between them when both forced open
- Independent breakpoint control for each sidebar
- Independent toggle methods: `toggleSideNav('left')`, `toggleSideNav('right')`

**Mobile Behavior:**
- Left sidebar: slides in from left (existing)
- Right sidebar: slides in from right (mirror)
- Overlay backdrop covers content when either is open

**CSS Changes:**
- Position left/right variants
- Border adjustments (right sidebar gets `border-left`, not `border-right`)
- Content offset: `left: var(--side-nav-width)` when left forced, `right: var(--side-nav-width)` when right forced

**Open Questions:**
- Should right sidebar have independent breakpoint behavior?
- Config pane might always be collapsible (never forced) or have its own breakpoint

**Status:** Idea only - not planned

---

### Skeleton Loader Component (Needs Discussion)

**Purpose:** Placeholder UI while content loads.

**Concept:**
- Gray pulse/animate blocks representing text, images, buttons
- Gives perceived performance while actual content loads

**Discussion Points:**
> **Note:** This solves a problem that shouldn't exist. If content can't display quickly, the solution is making it display quickly - not showing placeholders.
> 
> Consider:
> - Can the data be pre-fetched?
> - Can the layout render incrementally?
> - Is the backend slow?

**Potential Anti-Pattern Indicators:**
- Skeleton for < 200ms loads = unnecessary
- Skeleton replacing entire page = architecture issue
- Skeleton for content that never changes = wasteful

**Valid Use Cases (rare):**
- Client-side rendered social feeds (unknown content shape)
- Third-party widgets with unpredictable load times
- Heavy computation that genuinely takes >1s

**Decision:** Needs evaluation - likely will NOT implement

**Status:** Under discussion

---

### Button Browse Type

**Purpose:** File input button variant for selecting/adding files.

**Concept:**
- A `nui-button` type/variant that triggers file selection
- Wraps native `<input type="file">` functionality
- Consistent button styling with file input behavior

**API Sketch:**
```html
<nui-button type="browse" accept=".jpg,.png" multiple>
  <button type="button">Add Images</button>
</nui-button>

<script>
document.querySelector('nui-button[type="browse"]')
  .addEventListener('nui-files-selected', (e) => {
    console.log(e.detail.files);
  });
</script>
```

**Features:**
- `accept` attribute for file type filtering
- `multiple` attribute support
- Drag-and-drop overlay option
- Consistent with other button variants

**Status:** Idea only - not planned

---

## Modules (Addons)

### Notification History System (App Mode)

**Context:** With the `<nui-banner>` component in place, there's an opportunity to add a notification history feature for app-mode applications.

**Concept:**
- In app-mode (with `<nui-app>`), banners could automatically log to a notification history
- History accessible via icon in `<nui-top-nav>` (bell icon with unread count badge)
- Dropdown/panel shows recent notifications with timestamps
- Clicking a notification could trigger associated action (if any)
- Clear all / mark as read functionality

**Key Questions:**
- Should this be opt-in or automatic in app-mode?
- How long should history persist? (session only vs localStorage)
- Should priority levels affect retention? (alerts kept longer than info?)
- What's the maximum history size before oldest are pruned?

**Implementation Considerations:**
- Could use storage system to persist notification history state
- Top-nav component would need optional notification bell slot
- Need to avoid feature creep - keep it simple

**Status:** Idea only - not planned

---

### Wizard Component (Step-by-Step Interface)

**Context:** Users often need to complete multi-step processes (forms, setups). A wizard interface guides them through this sequentially, reducing cognitive load.

**Concept:**
- Similar structure to `nui-tabs` (panels for content), but navigation is primarily sequential (Next/Prev).
- Visual indicator for steps (stepper):
    - Current step highlighted.
    - Completed steps marked with a check indicator.
    - Future steps disabled or dimmed.
- Navigation controls:
    - 'Next' button moves to the next step (possibly validating current step).
    - 'Prev' button moves to the previous step.
    - 'Finish' button on the last step.

**Key Questions:**
- Should it extend `nui-tabs` or be a standalone component? (Tabs usually implies random access, Wizard enforces sequence).
- How to handle validation before moving to the next step? (Event interception/pre-change hooks?)
- Should it support linear vs. non-linear flows (can user click step 3 if step 2 isn't done)?

**Implementation Considerations:**
- Could reuse `nui-tabs` logic for panel switching but override navigation controls.
- Needs a 'stepper' visual component (horizontal or vertical).
- State management for 'completed' steps is crucial.

**Decision:**
- **Standalone Component**: Will be implemented as `nui-wizard` (Addon Module), not part of Core.
- **Reasoning**: Sequential logic and validation requirements are fundamentally different from random-access Tabs. Keeping Core lightweight is priority.

**Status:** Idea only - not planned

---

### Lightbox Component

**Context:** Building on the Modal View component, a dedicated lightbox for image/media galleries.

**Concept:**
- Full-screen or near-full-screen media viewer
- Swipe/keyboard navigation between items
- Zoom/pan capabilities
- Caption support
- Thumbnail strip option

**Depends On:** Modal View component (Core)

**Reference:** `reference/nui/ui_gallery.js`

**Status:** Idea only - not planned

---

### Media Player Component

**Purpose:** Video/Audio player with consistent NUI styling and controls.

**Concept:**
- Wrapper around HTML5 `<video>` and `<audio>` elements
- Custom controls matching NUI theme
- Play/pause, volume, progress scrubbing, fullscreen
- Poster image support for video
- Keyboard shortcuts (space to play/pause, arrows for seek/volume)

**Features:**
- Consistent styling with other NUI components
- Accessible controls (ARIA labels, keyboard navigation)
- Minimal UI footprint
- Support for captions/subtitles

**Reference:** `reference/nui/ui_media_player.js`

**Status:** Idea only - not planned

---

---

---

### Rich Text Editor Component

**Purpose:** Lightweight WYSIWYG text editor.

**Concept:**
- Minimal, clean editing interface
- Basic formatting: bold, italic, links, lists, headings
- No bloated features - keep it simple
- Similar philosophy to Trumbowyg (https://alex-d.github.io/Trumbowyg/)
- Uses `contenteditable` with proper sanitization

**Features:**
- Toolbar with essential formatting buttons
- Clean HTML output (no inline styles)
- Placeholder support
- Character/word count option
- Accessible toolbar controls

**API Sketch:**
```html
<nui-editor placeholder="Write something...">
  <textarea><p>Initial content</p></textarea>
</nui-editor>
```

**Status:** Idea only - not planned

---

### Charts Component (Simple)

**Purpose:** Very simple data visualization - bar, line, pie charts.

**Concept:**
- SVG-based charts (no canvas - better accessibility)
- Minimal styling that matches NUI theme
- No interactivity by default (hover tooltips optional)
- Clean, readable at small sizes

**API Sketch:**
```html
<!-- Bar chart -->
<nui-chart type="bar" data='[{"label":"A","value":30},{"label":"B","value":50}]'></nui-chart>

<!-- Line chart -->
<nui-chart type="line" data='[10,20,15,30,25]' labels='["Mon","Tue","Wed","Thu","Fri"]'></nui-chart>

<!-- Pie chart -->
<nui-chart type="pie" data='[{"label":"Desktop","value":60},{"label":"Mobile","value":40}]'></nui-chart>
```

**Features:**
- Responsive (SVG scales)
- Theme-aware colors
- Basic aria-label for screen readers
- No animation bloat

**Status:** Idea only - not planned

---

### Image Upload/Cropper Component

**Purpose:** Upload images with client-side cropping capability.

**Concept:**
- File selection (drag-drop or click)
- Preview selected image
- Crop interface (drag to pan, zoom to scale)
- Aspect ratio constraints optional
- Output as canvas data or File object

**API Sketch:**
```html
<nui-image-upload
  accept="image/*"
  aspect-ratio="16/9"
  max-width="1920"
  max-height="1080">
  <button type="button">Select Image</button>
</nui-image-upload>

<script>
uploader.addEventListener('nui-image-ready', (e) => {
  const { file, canvas, cropData } = e.detail;
  // Upload file or canvas.toBlob()
});
</script>
```

**Reference Implementation:** https://github.com/herrbasan/imageUpload

**Status:** Idea only - not planned

---

### Code Editor Component (with Terminal)

**Purpose:** Lightweight code editor for dev tools, configuration, scripting interfaces.

**Concept:**
- Not Monaco (too heavy) - custom lightweight solution
- Textarea-based with enhanced rendering overlay
- Syntax highlighting for common languages
- Line numbers
- Basic auto-indent
- Optional integrated terminal/console output below

**Key Challenge:** Must be fast at rendering text

**API Sketch:**
```html
<nui-code-editor language="javascript" line-numbers>
  <textarea>function hello() {
  return 'world';
}</textarea>
</nui-code-editor>

<!-- With terminal -->
<nui-code-editor with-terminal>
  <textarea>console.log('test');</textarea>
  <div slot="terminal">Output: test</div>
</nui-code-editor>
```

**Status:** Idea only - not planned (needs performance validation)

---

### Presentation/Slides Component

**Purpose:** Web-based slide deck for presentations, tutorials, onboarding.

**Concept:**
- Full-screen slide container
- Keyboard navigation (arrows, space)
- Slide transitions (simple, not PowerPoint-effects)
- Progress indicator
- Speaker notes (optional)
- Export to PDF support

**API Sketch:**
```html
<nui-slides>
  <nui-slide>
    <h1>Title Slide</h1>
    <p>Subtitle here</p>
  </nui-slide>
  <nui-slide>
    <h2>Content Slide</h2>
    <ul>
      <li>Point 1</li>
      <li>Point 2</li>
    </ul>
  </nui-slide>
</nui-slides>
```

**Status:** Idea only - not planned

---

### Split Pane Component (Needs Examples)

**Purpose:** Resizable panes like code editors, file explorers.

**Concept:**
- Horizontal or vertical split
- Draggable divider between panes
- Minimum/maximum size constraints
- Collapsible panes

**Need Examples For:**
- What specific layouts need this?
- Is this better solved with CSS Grid + `fr` units?
- When does the draggable divider matter vs auto-layout?

**Status:** Needs use case examples

---

### Resizable Panel Component (Needs Examples)

**Purpose:** Make any element resizable with drag handles.

**Concept:**
- Resize handles on corners/edges
- Constraint options (min/max width/height)
- Preserve aspect ratio option

**Need Examples For:**
- What components need user-resizable dimensions?
- Is this a common enough pattern to warrant a component?
- Could this be CSS `resize` property instead?

**Status:** Needs use case examples

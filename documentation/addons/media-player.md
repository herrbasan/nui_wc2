# nui-media-player

## Setup

This is an addon module. Load both the JS and CSS before use:

```html
<link rel="stylesheet" href="NUI/css/modules/nui-media-player.css">
<script type="module" src="NUI/lib/modules/nui-media-player.js"></script>
```

## Design Philosophy

This component wraps native `<video>` and `<audio>` elements with a customizable, skinnable UI. Rather than replacing the browser's media capabilities, it enhances them with consistent controls while preserving all native functionality like streaming, subtitles, and format support.

### How It Works
The component builds a custom control interface over native media elements:

- **Custom controls** - Play/pause, progress, volume, fullscreen
- **Native backend** - All media handling uses browser-native APIs
- **Auto-pause** - Optional `pause-others` prevents multiple players playing simultaneously
- **Poster support** - Video thumbnails via the native `poster` attribute

## Declarative Usage

### Video Player
```html
<nui-media-player pause-others>
    <video src="video.mp4" poster="poster.jpg"></video>
</nui-media-player>
```

### Audio Player
```html
<nui-media-player pause-others>
    <audio src="audio.mp3"></audio>
</nui-media-player>
```

### Attributes

| Attribute | Description |
| --- | --- |
| `type` | `"video"` (default) or `"audio"`. Only used when no inner media element is authored — the component creates one. Otherwise set automatically from the inner element's tag. |
| `src` | Media source URL for the created element. Ignored when an inner `<video>`/`<audio>` is authored. |
| `pause-others` | Boolean. When present, starting playback pauses every other `nui-media-player` on the page. |

Authoring an inner `<video>`/`<audio>` with native attributes (`poster`, `loop`, `crossorigin`, …) is the full-fidelity declarative form; the `type`/`src` shorthand exists for attribute-driven creation.

### Class Variants

None

## Programmatic Usage

```javascript
nui.components.mediaPlayer.create('#container', {
    url: 'https://example.com/video.mp4',
    type: 'video', // or 'audio'
    poster: 'https://example.com/poster.jpg',
    pauseOthers: true,
    attributes: {
        loop: true,
        crossorigin: 'anonymous'
    }
});
```

#### Factory Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `url` | string | — | Media source URL. |
| `type` | string | `'video'` | `'video'` or `'audio'`. |
| `poster` | string | — | Poster image URL (video). |
| `pauseOthers` | boolean | `true` | Pause other players when this one plays. Applied as the `pause-others` attribute. |
| `attributes` | Object | `{}` | Attributes set on the native `<video>`/`<audio>` element (e.g. `{ loop: true, crossorigin: 'anonymous' }`). |
| `playerAttributes` | Object | `{}` | Attributes set on the `<nui-media-player>` wrapper element. |

### DOM Methods

| Method | Description |
| --- | --- |
| nui.components.mediaPlayer.create(target, options) | Creates a media player and injects it into the target element. Returns the player instance. |

### Action Delegates

None

### Events

The component dispatches its own events alongside the native media events:

| Event | Detail | Description |
| --- | --- | --- |
| `nui-media-play` | `{}` | Playback started. |
| `nui-media-pause` | `{}` | Playback paused. |
| `nui-media-volume` | `{ value }` | Volume changed via the player's volume slider. |
| `nui-media-event` | `{ type, originalEvent }` | Re-dispatch of native media events from the inner element. |

Since the component wraps native media elements, all standard media events work as well:

```javascript
const player = document.querySelector('nui-media-player');
const video = player.querySelector('video');

video.addEventListener('ended', () => {
    console.log('Playback finished');
});

video.addEventListener('timeupdate', () => {
    console.log('Current time:', video.currentTime);
});
```

## When to Use

- Video tutorials or documentation
- Audio playback for music or podcasts
- Media galleries where consistent controls matter
- Applications needing coordinated media playback (via `pause-others`)

As an experimental component, the API may evolve based on usage feedback.

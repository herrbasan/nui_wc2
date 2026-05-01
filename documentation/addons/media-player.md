# nui-media-player

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

| Option | Description |
| --- | --- |
| url | The media source URL. |
| type | Media type: "video" or "audio". |
| poster | Poster image URL for video players. |
| pauseOthers | When true (default), automatically pauses other players when this one plays. |
| attributes | Object with attributes to set on the native <video> or <audio> element (e.g., { loop: true, crossorigin: 'anonymous' }). |
| playerAttributes | Object with attributes to set on the <nui-media-player> wrapper element. |

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

### DOM Methods

| Method | Description |
| --- | --- |
| nui.components.mediaPlayer.create(target, options) | Creates a media player and injects it into the target element. Returns the player instance. |

### Action Delegates

None

### Events

Since the component wraps native media elements, all standard media events work:

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

# Notifications (nui-notification-log)

Store-backed notification log with badge sync and a popover panel view. Notifications are **data first**: a single in-memory store owns the record, and banners, header badges and the log are three views of it.

## Design Philosophy

Banners are a transient *signal*; they cannot be a *record* — they auto-close, stack singleton-per-placement, and vanish. The notification store separates the two: every notification is appended to the store, and the banner becomes an optional, transient echo. The log gives the user somewhere to look when they saw something flash by or deliberately ignored it.

The store is transport-agnostic: a demo page calls `notify()` from a button, a real app calls it from an SSE/WebSocket handler or a polling loop. A caller-provided `id` makes a server feed idempotent — same id **replaces**, never duplicates — and lets the source update or retract an entry it already pushed.

## Programmatic API (nui.notify / nui.components.notifications)

```javascript
// Log-only — no intrusion, the badge increments
nui.notify({ content: 'Report exported to /exports/report.pdf' });

// Log + transient banner echo
nui.notify({ content: 'Settings saved', banner: true, autoClose: 3000 });

// Server-fed entry: stable id replaces in place, timestamp from the source
nui.notify({ id: 'srv-42', content: 'Build finished', timestamp: msg.ts });

// Retract an entry the source pushed earlier
nui.components.notifications.remove('srv-42');

// Read state and contents
nui.components.notifications.list();   // array copy, newest first
nui.components.notifications.unread(); // number
nui.components.notifications.markAllRead();
nui.components.notifications.clear();
```

### notify() Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `content` | String/HTML | **required** | The notification content. Rendered as HTML — same trust level as banner content. Throws when missing/empty. |
| `id` | String | `null` | Caller-provided id. Same id replaces the existing entry in place; server feeds use this for idempotency. |
| `priority` | String | `'info'` | `'info'` or `'alert'` — mirrors banner priority; alert entries get the alert accent in the log. |
| `timestamp` | Date/String/Number | `Date.now()` | Entry time. Throws if not parseable. |
| `action` | String | `null` | A `data-action` string (`name[:param][@selector]`). The log renders this entry as a button that fires the action on click. |
| `banner` | Boolean | `false` | Also show a transient banner echo (via the banner factory, with `log: false` to avoid double logging). |
| `autoClose` | Number | `4000` | Banner echo timeout in ms (only with `banner: true`). |
| `placement` | String | `'bottom'` | Banner echo placement (only with `banner: true`). |

## Banner factory integration

`nui.components.banner.show()` **logs to the store by default** — every banner becomes recoverable. Two options control this:

| Option | Default | Description |
|--------|---------|-------------|
| `log` | `true` | Set `log: false` for pure UI feedback that carries no information (progress hints, drag state). |
| `id` | — | Forwarded to the store; repeated banners with the same id replace one log entry instead of flooding it. |

## Badge sync (data-notify-badge)

Any element with the `data-notify-badge` attribute is kept in sync with the store's unread count automatically — it receives the CSS-driven `data-badge` attribute while `unread > 0`, and loses it at zero. No JavaScript glue needed:

```html
<nui-button variant="icon" data-notify-badge>
	<button type="button" aria-label="Notifications">
		<nui-icon name="notifications"></nui-icon>
	</button>
</nui-button>
```

## The log view (nui-notification-log)

A core component that renders the store's contents as a live list. The panel chrome — bubble surface, anchoring, light dismiss, Escape — is entirely `nui-popover`'s; the log is authored *inside* one:

```html
<nui-button variant="icon" data-notify-badge>
	<button type="button" aria-label="Notifications">
		<nui-icon name="notifications"></nui-icon>
	</button>
</nui-button>
<nui-popover aria-label="Notifications" placement="bottom">
	<nui-notification-log></nui-notification-log>
</nui-popover>
```

- The list is `role="log"` (`aria-live="polite"`) — appended entries are announced without stealing focus.
- Unread entries carry a highlight accent; `priority="alert"` entries carry the alert accent.
- Each row has a per-item dismiss button; the header has a disabled-when-empty *Clear all*.
- When hosted inside an `nui-popover`, **opening the panel marks all entries read** — the badge is an unread counter, and looking at the list is the act of reading.
- Embedded outside a popover (directly in a page) it renders the store live without the mark-on-open behavior.

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `nui-notify-change` | `{ type, entry, count, unread }` | Fired on `document` on every store mutation. `type` is `'add'`, `'replace'`, `'remove'`, `'read'` or `'clear'`; `entry` is null for `'read'`/`'clear'`. Bubbles not needed — dispatched on document for any number of views to observe. |

## Storage limits and scope

The store holds at most **50 entries** (oldest dropped, unread accounting adjusted accordingly) and is session-only in memory. Persistence, cross-tab sync, server-side read receipts and transport auth are the app's responsibility, deliberately.

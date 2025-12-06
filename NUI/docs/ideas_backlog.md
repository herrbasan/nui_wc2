# Ideas Backlog

Future feature ideas to consider. These are not planned - just captured for later evaluation.

---

## Notification History System (App Mode)

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
- Could use Knower to store notification history state
- Top-nav component would need optional notification bell slot
- Need to avoid feature creep - keep it simple

**Status:** Idea only - not planned

---

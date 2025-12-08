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

## Wizard Component (Step-by-Step Interface)

**Context:** Users often need to complete multi-step processes (forms, setups). A wizard interface guides them through this sequentially, reducing cognitive load.

**Concept:**
- Similar structure to \
ui-tabs\ (panels for content), but navigation is primarily sequential (Next/Prev).
- Visual indicator for steps (stepper):
    - Current step highlighted.
    - Completed steps marked with a check indicator.
    - Future steps disabled or dimmed.
- Navigation controls:
    - 'Next' button moves to the next step (possibly validating current step).
    - 'Prev' button moves to the previous step.
    - 'Finish' button on the last step.

**Key Questions:**
- Should it extend \
ui-tabs\ or be a standalone component? (Tabs usually implies random access, Wizard enforces sequence).
- How to handle validation before moving to the next step? (Event interception/pre-change hooks?).
- Should it support linear vs. non-linear flows (can user click step 3 if step 2 isn't done)?

**Implementation Considerations:**
- Could reuse \`nui-tabs\` logic for panel switching but override navigation controls.
- Needs a 'stepper' visual component (horizontal or vertical).
- State management for 'completed' steps is crucial.

**Decision:**
- **Standalone Component**: Will be implemented as `nui-wizard` (Addon Module), not part of Core.
- **Reasoning**: Sequential logic and validation requirements are fundamentally different from random-access Tabs. Keeping Core lightweight is priority.

**Status:** Idea only - not planned


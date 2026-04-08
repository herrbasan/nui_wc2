# Notes & Future Ideas

## User Notes

### State Machine Enhancements for Declarative Actions
- Opportunity to offer more in terms of "state machine" capabilities
- The declarative action system could be extended to track state transitions
- Keep the current simplicity as the default, but allow opt-in state management

### Wizard Component
- Multi-step form/dialog pattern with next/prev navigation
- Display like "1 of 3" step indicator
- Busy state per step (for async validation/saving)
- Mode option: `mode="required"` for sequential completion vs free navigation
- Should be a proper NUI component (not just for the generator)

---

## AI Notes (Suggested Revisits)

### Documentation Structure
- Consider adding a "Design Philosophy" section to capture reasoning behind patterns
- Interview-style documentation of why simplicity matters to the project
- Document the "state is in the HTML" philosophy explicitly
- ~~**AX (AI Experience)** — Added concise intro to README with Core Principles table~~ ✓

### Declarative Actions Potential Enhancements
- Consider action groups/scoping (e.g., `data-action="form:submit@#my-form"`)
- Action history/undo support?
- Conditional actions based on state (without becoming a full state machine)

### Generator Improvements
- Web UI could use the wizard pattern when built
- Add component dependency tracking (e.g., selecting dialog includes overlay)
- Option to generate with examples vs clean templates

### Component Architecture
- Review the addon vs core distinction periodically as library grows
- Consider a "common combinations" preset in generator

### Accessibility
- Audit all components for consistent ARIA patterns
- Document keyboard navigation for each component explicitly

---

## Core Insights

### TypeScript & Abstraction Stack
TypeScript, React, webpack — they're part of the same abstraction stack that optimizes for developer experience but creates distance from the platform. Each layer (build step, type checker, bundler, framework runtime) adds indirection. You can't see what the browser is actually doing. And if you can't see it, you can't optimize it.

Vanilla JS *forces* you to understand the platform. That "cost" is also the unlock — for both human understanding and LLM reasoning. Lean into the platform, get the best possible performance.

### The Shift: DX → AX
TypeScript is entirely about Developer Experience (DX). But as AI becomes a primary agent in codebases — reading, writing, refactoring — the value proposition shifts. Heavy DX tooling becomes less relevant when your "developer" is an LLM that reasons better about clear, platform-close code than about abstraction stacks.

**AX > DX.** Optimize for the AI experience, and the human experience improves as a side effect. The inverse is not true.

*Meta: Yes, "AX > DX" joins the family alongside "Deterministic Mind" and "Virtue Driven Development." Every project needs a buzzword to cut through the noise. The trick is having the substance to back it up. (We do.)*

## Meta-Insights: LLM Collaboration Patterns

### Compliance vs. Collab Mode
LLMs have distinct "modes" of operation:
- **Compliance mode** (default): Task-oriented, risk-averse, literal execution. Taps limited potential.
- **Collab mode** (activated via theory/framing): Reasoning engaged, connections formed, creative solutions emerge.

**Activation technique:** Present ideas as theories/questions rather than instructions. The philosophy docs (DETERMINISTIC_MIND, VDD, DOM_FIRST) were co-written with LLMs *because* they were framed as explorations, not tasks.

### The 90% Rule (VDD Applied to Scope)
"We optimize for the 90% case" — a sharp virtue that rules out edge-case abstractions. React tries to handle 100%; NUI says the 10% costs too much in bloat and performance loss.

### TypeScript as AX Trade-off
`.d.ts` files added despite author not finding them personally useful — deliberate AX optimization for LLM collaborators. Type theater risk acknowledged, but trade-off accepted because it serves the AI experience.

### The Provenance Story
NUI is the proof-of-concept: human + LLMs co-developed a philosophy about how humans and LLMs should work together, then built a library embodying it. The README's first line targets AI assistants because that's who it's *for*.

**Implication for documentation/marketing:** Frame NUI as the *result* of a collaboration methodology, not just a component library. The "how we built this" is as important as "what we built."

## Completed This Session

### Sidebar API Refactor (2026-04-08)
Unified sidebar behavior system with hierarchical breakpoints:

**New `behavior` attribute:**
- `behavior="primary"` - Auto-opens first when contentMin + primaryWidth fits
- `behavior="secondary"` - Auto-opens second when contentMin + primaryWidth + secondaryWidth fits
- `behavior="manual"` - Never auto-opens, toggle only
- Default: left becomes primary if none specified

**Key insight:** Sidebars now have proper hierarchy - primary opens first, secondary waits for more space. Prevents content from being squished.

**Implementation details:**
- CSS classes renamed: `sidenav-*` → `sidebar-*`
- Method renamed: `toggleSideNav()` → `toggleSidebar()` (backward compat kept)
- Legacy `favored` attribute still works as alias for `behavior="primary"`
- `content-min-width` on `<nui-app>` sets minimum content area

---

## Session Context
Created: 2026-04-08
Last Updated: 2026-04-08

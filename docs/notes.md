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

## Session Context
Created: 2026-04-08
Last Updated: 2026-04-08

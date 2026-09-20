# Architecture Note: AX and the "Statistical Gravity" Problem

**Date:** April 25, 2026
**Topic:** Why AI Experience (AX) frameworks fail during LLM code generation, and how to fix it.

## The Premise
NUI is built on a visionary premise: AI Experience (AX) should discard Developer Experience (DX) abstractions (like Virtual DOMs and complex event delegation) because LLMs do not share human cognitive limitations. LLMs prefer raw, unabstracted, declarative Vanilla JS and Light DOM structures (e.g., `<nui-button><button>Click</button></nui-button>`).

Logically, this architecture is correct. 
*Statistically*, it fights the entire internet.

## The "Statistical Gravity" Problem

LLMs are probability engines. Their neural weights are forged on billions of lines of React, Vue, Angular, and jQuery. In 99.9% of an LLM's training data, a custom tag like `<my-button>` is a fully encapsulated component where events are bound *directly* to the wrapper wrapper (e.g., `element.addEventListener('click')`).

Even when NUI's rules dictate that the event must be attached to the *inner* semantic tag, the LLM's "autopilot" will almost always default back to the DX patterns it was trained on. This causes code generation to consistently fail at basic tasks, like attaching a working click event.

### Why Documentation Isn't Enough
NUI's documentation brilliantly explains AX to *humans*. However, for an AI to act on these rules, the rules must be actively overriding its statistical autopilot at the exact moment of generation.
1. **Context Starvation:** Unless an LLM explicitly reads the component documentation moments before writing the script, the rule "attach to the inner button" falls out of context. The LLM violently reverts to its training.
2. **Invisible Intent:** A vanilla `<nui-button><button></button></nui-button>` leaves no structural breadcrumbs in an external `.js` file to remind the LLM of the framework's unique constraints.

## How to Armor the Framework against Statistical Gravity

To realize the AX vision, the framework must build "guardrails"—not abstractions—that catch the LLM when its statistical training misleads it. 

### 1. Aggressive Native Emulation (Catch the Mistake)
If LLMs constantly try to attach `click` events to the wrapper (`<nui-button>`), the component should anticipate and correct it internally.
```javascript
// Inside the NUIButton custom element class:
this.addEventListener('click', (e) => {
    // If the LLM attached a click to the wrapper instead of the inner button,
    // ensure the click still resolves correctly (e.g., event delegation/forwarding).
});
```
Make the framework forgiving to the LLM's most likely statistical mistake.

### 2. Prioritize Declarative Patterns (`data-action`)
LLMs hallucinate less with declarative, HTMX-style HTML attributes because it keeps the logic coupled directly to the markup, bypassing manual JS event binding entirely. Lean heavily into NUI's global `data-action` routing. LLMs easily understand:
`<nui-button data-action="loadPreset"><button>Load</button></nui-button>`

### 3. Just-in-Time Prompt Injection
Human-readable documentation should be supplemented by strict system prompts (e.g., `.agent.md` or `.prompt.md`). These guardrails must force the agent to load the exact rules *before* writing code. For example:
> *"NEVER write JS for NUI without running the `mcp_orchestrator_nui_get_component` tool on the target element first."*

---

**Conclusion:** 
The AX philosophy is ahead of the current LLM training curve. The friction arises from the gap between NUI's logical architecture and the LLM's statistical muscle memory. By building components that either forgive or circumvent standard training regressions, NUI can achieve true AI-native development.
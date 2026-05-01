# LLM Guide: Declarative Actions Pattern

## The Design Philosophy

Declarative actions in NUI solve a specific problem: **how do we connect HTML elements to JavaScript behavior without tight coupling?** The answer is event delegation with semantic syntax.

The browser already has a perfect event system - bubbling. Instead of attaching listeners to individual elements, we use a single delegated listener on a parent container. The `data-action` attribute provides the "routing" information within that container.

## Syntax as Intent

```
data-action="name:param@target"
```

This syntax encodes three pieces of information:
- **name** - What happened (the semantic action)
- **param** - Context data for the action (optional)
- **target** - Which element to operate on (optional, defaults to trigger)

This is not configuration - it's **intent declaration**. The HTML says "when clicked, the intent is to save a draft" or "the intent is to delete item #123." How that's handled is up to JavaScript.

## The Event Flow

1. **Click occurs** on an element with `data-action`
2. **NUI intercepts** at the document level
3. **Attribute is parsed** into `{ name, param, target }`
4. **CustomEvent dispatched** with these details
5. **Your code listens** and responds appropriately

The key insight: the dispatcher doesn't know what actions exist. It just parses and fires events. This decouples HTML (which declares intent) from JavaScript (which implements behavior).

## Scoping and Containment

Actions bubble like all DOM events. This enables natural component boundaries:

```javascript
// Component-level handling
card.addEventListener('nui-action', (e) => {
	e.stopPropagation(); // Keep it in the component
	handleCardAction(e.detail.name);
});

// Document-level handling (catches unscoped actions)
document.addEventListener('nui-action', (e) => {
	if (e.detail.name === 'navigate') {
		router.go(e.detail.param);
	}
});
```

This hierarchy means:
- Components can be self-contained
- Common actions (navigation) bubble up
- No explicit parent-child registration needed

## When to Use (And Not Use)

**Use declarative actions when:**
- You have lists of items with similar actions
- Elements are dynamically added/removed
- Actions are simple and contextual
- You want HTML to be readable

**Use standard event listeners when:**
- The interaction is complex (drag and drop, gestures)
- You need access to the raw event object
- The action is truly one-off

## Comparison with Framework Patterns

Unlike framework event binding (React's `onClick`, Vue's `@click`), NUI's actions don't require:
- Build step transformation
- Component re-renders
- Virtual DOM reconciliation

The browser's event system *is* the framework. NUI just adds a parsing layer and standardized event structure.

## Programmatic Registration

Sometimes you want centralized action handling without scattered listeners. `nui.registerAction()` provides this:

```javascript
nui.registerAction('save', (target, element, event, param) => {
	// Handle all 'save' actions globally
	return true; // Stop propagation
});
```

This is useful when:
- An action should behave consistently everywhere
- You want to avoid event listener setup
- Actions might come from dynamically created content

## The Simplicity Principle

The declarative actions system is intentionally minimal. It doesn't provide:
- JSON payloads in attributes (complexity in HTML)
- Action chaining (use JavaScript)
- Async action handling (listen for the event)

These limitations are features. They keep the boundary clear: HTML declares intent, JavaScript implements behavior. Neither leaks into the other's concerns.

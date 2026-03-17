# Rich-Text Editor (`nui-rich-text`) Development Plan

### Guiding Principles
> **Reuse Core Components:** When designing and building new components (especially larger modules or addons), prioritize composing them out of existing foundational elements (`<nui-button>`, `<nui-icon>`, `<nui-input>`, etc.) rather than reinventing the wheel. If an existing component can be cleanly extended or composed to handle a piece of the functionality, use it.
>
> **Core Philosophy:** Always remember that NUI aims for the **highest possible performance** and **built-in accessibility**, utilizing an architecture that is explicitly structured with **LLM maintenance** in mind.

## 1. Core Architecture & Structure (Lightweight & Native)
*   **Custom Element:** Create a `<nui-rich-text>` component that wraps a `contenteditable="true"` container.
*   **Component Composition:** Build the toolbar using existing NUI components (`<nui-button>`, `<nui-icon>`) inside a `role="toolbar"`.
*   **No Heavy Dependencies:** Rely on native browser APIs (Selection, Range, and standard formatting routines) rather than loading heavy engines like ProseMirror or Quill.

## 2. Formatting & Commands
*   **Toolbar Actions:** Implement essential formatting tools: Bold, Italic, Underline, Strikethrough, Ordered/Unordered Lists, blockquotes, and headings.
*   **State Tracking:** Listen to `selectionchange` events to detect the active styles at the current cursor position and toggle the active states of the toolbar buttons accordingly.
*   **Clean Output:** Instead of messy nested `<span>` tags commonly produced by native `execCommand`, we will attempt to generate semantic HTML (`<strong>`, `<em>`, `<ul>`, etc.) where possible.

## 3. Data Handling & Sanitization
*   **Paste Interception:** Add robust handling for the `paste` event to strip out unwanted styles, classes, and generic tags from external sources (like Word or web copies), ensuring only clean, allowed formatting goes in.
*   **Data Export:** Provide standard properties/methods (like `value` or `getHTML()`) to easily retrieve the sanitized HTML content for form submissions.

## 4. Accessibility (A11y)
*   Ensure the toolbar manages focus correctly (roving tabindex if necessary, or intuitive tab-order).
*   Add proper `aria-labels` and keyboard support for all toolbar buttons.
*   Ensure the editable area announces itself properly to screen readers (e.g., `role="textbox"`, `aria-multiline="true"`).

## 5. Playground Integration
*   Create a demo page at `Playground/pages/addons/rich-text.html` demonstrating basic usage, getting/setting content, and form integration.

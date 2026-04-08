# Rich-Text Editor (`nui-rich-text`) Development Plan

### Guiding Principles
> **Reuse Core Components:** When designing and building new components (especially larger modules or addons), prioritize composing them out of existing foundational elements (`<nui-button>`, `<nui-icon>`, `<nui-input>`, etc.) rather than reinventing the wheel. If an existing component can be cleanly extended or composed to handle a piece of the functionality, use it.
>
> **Core Philosophy:** Always remember that NUI aims for the **highest possible performance** and **built-in accessibility**, utilizing an architecture that is explicitly structured with **LLM maintenance** in mind.
> 
> **Lean Philosophy:** Zero dependencies. Use minimal DOM abstractions over native `contenteditable` capabilities instead of shipping massive virtual DOMs or parsing libraries.

## 1. Completed Core Implementation
* [x] **Core Architecture:** Custom `<nui-rich-text>` component wrapping a `contenteditable="true"` container.
* [x] **Toolbar Composition:** Minimal toolbar using existing NUI `<nui-button>` and `<nui-icon>` components.
* [x] **Standard Commands:** Bold, Italic, Underline, Strikethrough, Lists, Blockquotes, Links, and Headings.
* [x] **State Tracking:** Live toolbar updating via `selectionchange` events.
* [x] **Paste Sanitization:** Deep unwrapping and sanitizing of pasted HTML to maintain structural integrity while stripping inline styles and bad tags.
* [x] **Data Export:** Standard properties/methods (`value` accessor) to easily retrieve HTML content.
* [x] **Playground Integration:** Interactive demo page in the addon section.

## 2. Advanced Editor Stability
* [x] **Enter Key Normalization:** Intercept the `Enter` key to guarantee consistent HTML block generation (`<p>`, `<div>`) across browsers, and `Shift+Enter` for `<br>`.
* [x] **Undo / Redo Safety:** Implement a lightweight, memory-efficient history stack for manual undo/redo. Native `execCommand('undo')` breaks rapidly when combining native commands with custom DOM paste formatting.
* [x] **Toolbar Accessibility (ARIA):** Improve the toolbar with a roving `tabindex`. Keyboard users must be able to use `Alt+F10` (or `Shift+Tab`) into the toolbar and use arrow keys to navigate buttons.
* [x] **Contextual Link Editor:** Show a fast, tiny embedded UI near the cursor when inside a link (`<a>`) to edit or remove it cleanly.

## 3. Markdown Support
* [x] **Auto-Formatting on Type:** Listen to text expansion (typing `Space` or `Enter`) to convert basic Markdown syntax on the fly (e.g., typing `# ` converts to `H1`, `* ` to a bullet list).
* [x] **Markdown Paste Interpretation:** Optionally intercept standard copied Markdown plain text and render the equivalent HTML (`**bold**` -> `<b>`, etc.) before dropping it into `contenteditable`.
* [x] **Markdown Copy (Optional):** Offer a lightweight parse out when the user copies NUI content as plain text, injecting Markdown into their system clipboard instead of just stripped string text.

## 4. Tables and Media
* [x] **Table Insertion:** Add a toolbar button to call an NUI dialog (Rows/Columns) and insert a semantic `<table class="nui-table">`.
* [x] **Contextual Table Editing:** Provide simple native DOM operations (Add Row, Add Column, Delete) when the user places the cursor inside a `<td>`. *(Note: Needs more work to handle edge cases and advanced selections, but sufficient for current beta).*
* [x] **Image Insertion via Dialog:** Insert an image via a URL prompt.
* [x] **Image Drop/Paste Eventing:** Intercept pasted/dropped image files. Crucially, don't insert Base64! Emit a `nui-image-upload` CustomEvent, passing the `File`, letting the host application resolve a real server URL.
* [ ] **Image Alignment:** (Decided to omit) Click an image to set an `active` state and expose simple toolbar options to toggle alignment classes (`.align-left`, `.align-center`, etc.) using CSS rather than JS resizing mechanics.

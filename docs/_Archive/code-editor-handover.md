# NUI Code Editor - Session Handover

## The Situation
We attempted to build a zero-dependency, high-performance `<nui-code-editor>` capable of handling 5000+ lines. 

**Initial Strategy:** A transparent `<textarea>` accurately overlaying a syntax-highlighted `<pre><code>` block, leveraging chunked DOM virtualization on scroll to maintain 60fps.

**The Boss-Level Failure:** While scrolling was optimized, a hard platform limitation struck. Due to High-DPI screens and OS-level text rounding, the OS text engine (used for `<textarea>`) and the HTML layout engine (used for `<pre>`) experience a floating-point vertical drift. By line ~300, the native cursor and text-selection visual completely misaligns from the underlying syntax-highlighted code. Fixed pixel heights couldn't save us from the sub-pixel rendering engine differences.

## The Pivot (For the Next Session)
We are scrapping the `<textarea>` overlay grid and the virtualized scroll chunking.

We are pivoting to a **`contenteditable="true"`** approach, taking inspiration from the lean **CodeJar** library. The goal remains: zero dependencies, tiny footprint, and native Web APIs.

## Implementation Guide for Next Control Agent:
1. **Clean Slate:** Strip out the `textarea`, the `ResizeObserver`, and the massive `syncScroll()` offset virtualization math in `NUI/lib/modules/nui-code-editor.js` and `NUI/css/modules/nui-code-editor.css`.
2. **Content Editable:** Convert the main `<pre><code>` structure into a `contenteditable="true"` block with `spellcheck="false"`.
3. **The Caret Engine (Priority 1):** You must implement a Caret Save/Restore module using `window.getSelection()`. When a user types:
    * Save their exact character index offset.
    * Read the `textContent` of the editor block.
    * Run it through our `highlight()` function.
    * Smash the result back into `innerHTML`.
    * **Restore** the caret to the correct text node deep inside the new nested `<span>` hierarchy. 
4. **Keystroke Interception:** Rework the existing Tab, Bracket-matching, and Enter key intercepts from `handleKeydown`. Since there is no `selectionStart`, you will need to map these to the Selection API and `document.execCommand('insertText')` or pure text-node manipulation.
5. **Line Numbers:** Revert to a much simpler line number generator that just counts `\n` splits and adjusts a sidebar height.

## Key Files to Touch
* `NUI/lib/modules/nui-code-editor.js` - Complete architecture rewrite.
* `NUI/css/modules/nui-code-editor.css` - Strip the absolute layout layers, simplify flex spacing.
* `NUI/lib/modules/nui-syntax-highlight.js` - *DO NOT TOUCH.* Already heavy-optimized previously to avoid regex engine collapse.
* `Playground/pages/addons/code-editor.html` - The testbed.

## NUI Philosophy Reminder
Focus on pure web platform APIs. Keep it simple and readable. Avoid massive custom Selection-range polyfills if a simpler traversal loop works. Good luck!
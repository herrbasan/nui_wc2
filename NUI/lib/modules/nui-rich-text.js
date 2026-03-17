import { nui } from '../../nui.js';

/**
 * NuiRichText
 * A lightweight, dependency-free rich text editor utilizing native browser APIs.
 */
class NuiRichText extends HTMLElement {
    constructor() {
        super();
        this._value = '';
        this._isUpdatingToolbar = false;
        this._savedRange = null;
        this._history = [];
        this._historyIndex = -1;
        this._historyTimeout = null;
    }

    connectedCallback() {
        if (this.hasAttribute('data-initialized')) return;
        this.setAttribute('data-initialized', 'true');

        // Extract initial HTML content
        this._value = this.innerHTML.trim();
        this.innerHTML = '';

        this._render();
        this._attachEvents();
        this._saveHistory(); // Save initial baseline state
    }

    _render() {
        this._container = document.createElement('div');
        this._container.className = 'nui-rich-text-container';

        // Build Toolbar
        this._toolbar = document.createElement('div');
        this._toolbar.className = 'nui-rich-text-toolbar';
        this._toolbar.setAttribute('role', 'toolbar');
        this._toolbar.setAttribute('aria-label', 'Text formatting');

        const tools = [
            { select: 'formatBlock' },
            { separator: true },
            { icon: 'format_bold', command: 'bold', label: 'Bold (Ctrl+B)' },
            { icon: 'format_italic', command: 'italic', label: 'Italic (Ctrl+I)' },
            { icon: 'format_underlined', command: 'underline', label: 'Underline (Ctrl+U)' },
            { icon: 'strikethrough_s', command: 'strikeThrough', label: 'Strikethrough' },
            { separator: true },
            { icon: 'format_quote', command: 'formatBlock', arg: 'BLOCKQUOTE', label: 'Quote' },
            { separator: true },
            { icon: 'format_list_bulleted', command: 'insertUnorderedList', label: 'Bullet List' },
            { icon: 'format_list_numbered', command: 'insertOrderedList', label: 'Numbered List' },
            { separator: true },
            { icon: 'table_view', command: 'insertTable', label: 'Insert Table' },
            { icon: 'image', command: 'insertImage', label: 'Insert Image' },
            { separator: true },
            { icon: 'link', command: 'createLink', label: 'Insert Link' },
            { icon: 'link_off', command: 'unlink', label: 'Remove Link' },
            { separator: true },
            { icon: 'format_clear', command: 'removeFormat', label: 'Clear Formatting' },
            { separator: true },
            { icon: 'undo', command: 'undo', label: 'Undo (Ctrl+Z)' },
            { icon: 'redo', command: 'redo', label: 'Redo (Ctrl+Y)' }
        ];

        tools.forEach(tool => {
            if (tool.separator) {
                const sep = document.createElement('div');
                sep.className = 'nui-rich-text-separator';
                this._toolbar.appendChild(sep);
                return;
            }

            if (tool.select === 'formatBlock') {
                const selectWrap = document.createElement('nui-select');
                selectWrap.innerHTML = `
                    <select tabindex="-1">
                        <option value="DIV">Normal</option>
                        <option value="H1">Heading 1</option>
                        <option value="H2">Heading 2</option>
                        <option value="H3">Heading 3</option>
                        <option value="H4">Heading 4</option>
                        <option value="H5">Heading 5</option>
                        <option value="H6">Heading 6</option>
                        <option value="PRE">Code Block</option>
                    </select>
                `;
                selectWrap.addEventListener('nui-change', (e) => {
                    if (this._isUpdatingToolbar) return; // Ignore programmatic changes bubbling up
                    const val = (e.detail?.values && e.detail.values[0]) || selectWrap.querySelector('select').value;
                    
                    // Most modern browsers treat H1 or <H1> the same but some need <>
                    const arg = val === 'DIV' || val === 'P' ? val : val;
                    this._execCommand('formatBlock', arg); 
                });
                
                // Keep cursor in editor right after selection closes, wait for NUI select to finish its own internal click handlers
                selectWrap.addEventListener('nui-close', () => { setTimeout(() => this._editor.focus(), 10); });
                
                this._formatSelect = selectWrap;
                this._toolbar.appendChild(selectWrap);
                return;
            }

            const wrapper = document.createElement('nui-button');
            wrapper.setAttribute('variant', 'ghost');
            wrapper.dataset.command = tool.command;
            if (tool.arg) wrapper.dataset.arg = tool.arg;

            const btn = document.createElement('button');
            btn.setAttribute('type', 'button');
            btn.setAttribute('aria-label', tool.label);
            btn.setAttribute('title', tool.label);
            btn.setAttribute('tabindex', '-1'); // Prevent focus steal for now
            
            // If it's a styling tool, expose it as a toggle button to screen readers
            if (!['undo', 'redo', 'createLink', 'unlink', 'removeFormat', 'insertImage', 'insertTable'].includes(tool.command)) {
                btn.setAttribute('aria-pressed', 'false');
            }

            const icon = document.createElement('nui-icon');
            icon.setAttribute('name', tool.icon);
            
            btn.appendChild(icon);
            wrapper.appendChild(btn);

            this._toolbar.appendChild(wrapper);
        });

        // Setup Initial Roving TabIndex
        const firstAction = this._toolbar.querySelector('button, select');
        if (firstAction) firstAction.setAttribute('tabindex', '0');

        // Build Editor Area
        this._editor = document.createElement('div');
        this._editor.className = 'nui-rich-text-editor';
        this._editor.setAttribute('contenteditable', 'true');
        this._editor.setAttribute('role', 'textbox');
        this._editor.setAttribute('aria-multiline', 'true');
        this._editor.innerHTML = this._value;

        this._container.appendChild(this._toolbar);
        this._container.appendChild(this._editor);
        this.appendChild(this._container);
    }

    _attachEvents() {
        // Prevent toolbar clicks from taking focus away from editor
        this._toolbar.addEventListener('mousedown', (e) => {
            const btn = e.target.closest('nui-button');
            if (btn) {
                e.preventDefault(); // Keep focus in the editor
            }
        });

        // ARIA Toolbar Setup: Roving TabIndex and Keyboard Navigation
        this._toolbar.addEventListener('keydown', this._handleToolbarKeyDown.bind(this));

        // Toolbar actions
        this._toolbar.addEventListener('click', async (e) => {
            const btn = e.target.closest('nui-button');
            if (!btn) return;
            
            const command = btn.dataset.command;
            const arg = btn.dataset.arg || null;

            if (command === 'createLink') {
                // Try to find if we're currently on an existing link to pre-fill the URL
                let existingUrl = '';
                const sel = window.getSelection();
                if (sel.rangeCount > 0) {
                    let node = sel.anchorNode;
                    let element = node && node.nodeType === 3 ? node.parentNode : node;
                    let anchor = element ? element.closest('a') : null;
                    if (anchor) {
                        existingUrl = anchor.getAttribute('href') || '';
                    }
                }

                const result = await nui.components.dialog.prompt('Insert Link', null, {
                    fields: [
                        { id: 'url', label: 'Web Address (URL)', type: 'url', value: existingUrl }
                    ]
                });

                if (result && result.url) {
                    // NUI prompt resolves immediately when the button is clicked,
                    // but the native <dialog> is still technically open during its closing transition.
                    // If we try to focus now, the inert state fails it. We wait until it clears.
                    const applyLink = () => {
                        if (document.querySelector('dialog[open]')) {
                            requestAnimationFrame(applyLink);
                        } else {
                            setTimeout(() => this._execCommand('createLink', result.url), 10);
                        }
                    };
                    applyLink();
                }
            } else if (command === 'insertImage') {
                const result = await nui.components.dialog.prompt('Insert Image', null, {
                    fields: [
                        { id: 'url', label: 'Image URL', type: 'url', value: '' },
                        { id: 'alt', label: 'Alternative Text', type: 'text', value: '' }
                    ]
                });

                if (result && result.url) {
                    const applyImage = () => {
                        if (document.querySelector('dialog[open]')) {
                            requestAnimationFrame(applyImage);
                        } else {
                            setTimeout(() => {
                                // Instead of native insertImage we use insertHTML to easily add the alt attribute and classes
                                const imgHtml = `<img src="${result.url}" alt="${result.alt || ''}" class="nui-rich-text-image" />`;
                                this._execCommand('insertHTML', imgHtml);
                            }, 10);
                        }
                    };
                    applyImage();
                }
            } else if (command === 'insertTable') {
                const result = await nui.components.dialog.prompt('Insert Table', null, {
                    fields: [
                        { id: 'cols', label: 'Columns', type: 'number', value: '3', min: 1, max: 20 },
                        { id: 'rows', label: 'Rows', type: 'number', value: '3', min: 1, max: 50 }
                    ]
                });

                if (result && result.cols && result.rows) {
                    const applyTable = () => {
                        if (document.querySelector('dialog[open]')) {
                            requestAnimationFrame(applyTable);
                        } else {
                            setTimeout(() => {
                                let tableHtml = '<table class="nui-table"><tbody>';
                                for (let r = 0; r < result.rows; r++) {
                                    tableHtml += '<tr>';
                                    for (let c = 0; c < result.cols; c++) {
                                        tableHtml += '<td><br></td>'; // Empty cells need a <br> to be selectable in some browsers
                                    }
                                    tableHtml += '</tr>';
                                }
                                tableHtml += '</tbody></table><p><br></p>';
                                this._execCommand('insertHTML', tableHtml);
                            }, 10);
                        }
                    };
                    applyTable();
                }
            } else {
                this._execCommand(command, arg);
            }
        });

        // Update toolbar state on selection change
        document.addEventListener('selectionchange', () => this._updateToolbarState());
        this._editor.addEventListener('keydown', this._handleKeyDown.bind(this));
        this._editor.addEventListener('keyup', this._handleKeyUp.bind(this));
        this._editor.addEventListener('mouseup', () => this._updateToolbarState());

        // Set default block separator to DIV recursively on focus
        this._editor.addEventListener('focus', () => {
            try { document.execCommand('defaultParagraphSeparator', false, 'DIV'); } catch(e) {}
        });
        
        // Debounce structural input for history
        this._editor.addEventListener('input', () => {
            clearTimeout(this._historyTimeout);
            this._historyTimeout = setTimeout(() => this._saveHistory(), 500);
            this._emitChange(false);
        });

        // Handle Paste (strip complex formatting)
        this._editor.addEventListener('paste', this._handlePaste.bind(this));
    }

    _handleKeyDown(e) {
        // Accessibility Jump to Toolbar
        if (e.key === 'F10' && e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            const activeTool = this._toolbar.querySelector('[tabindex="0"]') || this._toolbar.querySelector('button, select');
            // Timeout escapes the native OS/Browser Alt-Menu trap on Windows
            if (activeTool) setTimeout(() => activeTool.focus(), 10);
            return;
        }

        // Custom Undo/Redo Shortcuts
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) this._redo();
                else this._undo();
                return;
            }
            if (e.key === 'y') {
                e.preventDefault();
                this._redo();
                return;
            }
        }

        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Force a <br> explicitly to avoid breaking into a new paragraph/div
                e.preventDefault();
                document.execCommand('insertLineBreak');
            } else {
                // Structural normalization for Enter key on block elements
                const sel = window.getSelection();
                if (!sel.rangeCount) return;
                
                const node = sel.anchorNode;
                const elem = node.nodeType === 3 ? node.parentNode : node;
                
                // Pre formatting: standard enter should just be a newline
                if (elem.closest('PRE')) {
                    e.preventDefault();
                    document.execCommand('insertText', false, '\n');
                    return;
                }

                // Blockquote handling (Double Enter to break out)
                const activeBlock = elem.closest('BLOCKQUOTE');
                if (activeBlock) {
                    // Identify the innermost block element of the blockquote the cursor is resting in
                    let currentLine = elem;
                    while (currentLine && currentLine.parentNode !== activeBlock && currentLine !== activeBlock) {
                        currentLine = currentLine.parentNode;
                    }
                    
                    // If the current line is effectively empty (e.g. they hit enter twice)
                    if (currentLine && currentLine.textContent.trim() === '') {
                        e.preventDefault(); // Stop standard browser action (cloning quote framework)
                        
                        // Remove the empty line from inside the blockquote
                        if (currentLine !== activeBlock) {
                            currentLine.remove();
                        }
                        
                        // Create a clean DIV to escape into
                        const newDiv = document.createElement('div');
                        newDiv.innerHTML = '<br>';
                        
                        // Insert safely outside the blockquote
                        if (activeBlock.parentNode) {
                            activeBlock.parentNode.insertBefore(newDiv, activeBlock.nextSibling);
                        } else {
                            this._editor.appendChild(newDiv);
                        }

                        // Cleanup old shell if blockquote is entirely barren
                        if (activeBlock.textContent.trim() === '') {
                            activeBlock.remove();
                        }
                        
                        // Definitively move cursor into the new clean container
                        const newRange = document.createRange();
                        newRange.selectNodeContents(newDiv);
                        newRange.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(newRange);

                        this._saveHistory();
                        this._emitChange(false);
                        return;
                    }
                }
            }
        }

        // Empty Trap Evader (Fix for unbreakable empty containers)
        if (e.key === 'Backspace' || e.key === 'Delete') {
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                const node = sel.anchorNode;
                const elem = node.nodeType === 3 ? node.parentNode : node;
                const stuckBlock = elem.closest('BLOCKQUOTE, PRE, H1, H2, H3, H4, H5, H6');
                
                // If they try to backspace but are stuck in an empty formatting block
                if (stuckBlock && stuckBlock.textContent.trim() === '') {
                    e.preventDefault();
                    const newDiv = document.createElement('div');
                    newDiv.innerHTML = '<br>';
                    stuckBlock.parentNode.insertBefore(newDiv, stuckBlock);
                    stuckBlock.remove();
                    
                    const newRange = document.createRange();
                    newRange.selectNodeContents(newDiv);
                    newRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(newRange);
                    return;
                }
            }
        }
    }

    _handleKeyUp(e) {
        this._updateToolbarState();

        if (e.key === ' ' || e.code === 'Space') {
            this._handleMarkdownShortcuts();
        }
    }

    _handleMarkdownShortcuts() {
        const sel = window.getSelection();
        if (sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        
        if (range.startContainer.nodeType !== Node.TEXT_NODE) return;
        
        const textNode = range.startContainer;
        const text = textNode.textContent.substring(0, range.startOffset);
        
        // Match standard markdown triggers: headings, bullets, ordered list, blockquote
        const match = text.match(/^(#{1,6}|\*|-|1\.|>)\s$/);
        if (!match) return;

        // Ensure we are not already inside an incompatible block (like a code block)
        let parent = textNode.parentNode;
        while (parent && parent !== this._editor) {
            if (['PRE', 'CODE'].includes(parent.tagName)) return;
            parent = parent.parentNode;
        }

        // Delete the markdown trigger text
        const prefixLen = match[0].length;
        range.setStart(textNode, range.startOffset - prefixLen);
        range.deleteContents();
        
        // Execute corresponding command natively to avoid stealing/replacing the live range
        const trigger = match[1];
        if (trigger.startsWith('#')) {
            document.execCommand('formatBlock', false, `H${trigger.length}`);
        } else if (trigger === '*' || trigger === '-') {
            document.execCommand('insertUnorderedList', false, null);
        } else if (trigger === '1.') {
            document.execCommand('insertOrderedList', false, null);
        } else if (trigger === '>') {
            document.execCommand('formatBlock', false, 'BLOCKQUOTE');
        }

        this._saveHistory();
        this._updateToolbarState();
        this._emitChange();
    }

    _handleToolbarKeyDown(e) {
        const items = Array.from(this._toolbar.querySelectorAll('button:not([disabled]), select:not([disabled])'));
        if (!items.length) return;

        let currentIndex = items.indexOf(document.activeElement);
        // Fallback if focus is on a wrapper element
        if (currentIndex === -1) {
            currentIndex = items.findIndex(item => item.contains(document.activeElement));
        }
        if (currentIndex === -1) return;

        let nextIndex = currentIndex;
        
        switch (e.key) {
            case 'ArrowRight':
                nextIndex = (currentIndex + 1) % items.length;
                e.preventDefault();
                break;
            case 'ArrowLeft':
                nextIndex = (currentIndex - 1 + items.length) % items.length;
                e.preventDefault();
                break;
            case 'Home':
                nextIndex = 0;
                e.preventDefault();
                break;
            case 'End':
                nextIndex = items.length - 1;
                e.preventDefault();
                break;
            default:
                return; // Let space/enter act naturally
        }

        // Apply Roving TabIndex
        items[currentIndex].setAttribute('tabindex', '-1');
        items[nextIndex].setAttribute('tabindex', '0');
        items[nextIndex].focus();
    }

    _saveSelection() {
        if (!this._editor || document.activeElement !== this._editor) return;
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            if (this._editor.contains(range.commonAncestorContainer)) {
                this._savedRange = range.cloneRange();
            }
        }
    }

    _restoreSelection() {
        if (!this._savedRange) return;
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(this._savedRange);
    }

    _saveHistory() {
        const currentHTML = this.value;
        if (this._historyIndex >= 0 && this._history[this._historyIndex] === currentHTML) return;
        
        // Truncate future history if we are overwriting from a past Undo state
        this._history = this._history.slice(0, this._historyIndex + 1);
        this._history.push(currentHTML);
        
        // Keep memory footprint small (max 50 states)
        if (this._history.length > 50) this._history.shift(); 
        else this._historyIndex++;
    }

    _undo() {
        if (this._historyIndex > 0) {
            this._historyIndex--;
            this._editor.innerHTML = this._history[this._historyIndex];
            this._updateToolbarState();
            this._emitChange();
        }
    }

    _redo() {
        if (this._historyIndex < this._history.length - 1) {
            this._historyIndex++;
            this._editor.innerHTML = this._history[this._historyIndex];
            this._updateToolbarState();
            this._emitChange();
        }
    }

    _execCommand(command, arg = null) {
        // Track where the command originated so we don't accidentally rip keyboard users out of the toolbar
        const activeEl = document.activeElement;
        const wasInToolbar = this._toolbar.contains(activeEl);

        this._editor.focus();
        this._restoreSelection();
        
        // Route undo/redo through custom history
        if (command === 'undo') {
            this._undo();
            if (wasInToolbar) activeEl.focus();
            return;
        }
        if (command === 'redo') {
            this._redo();
            if (wasInToolbar) activeEl.focus();
            return;
        }

        if (command === 'removeFormat') {
            // clear inline formats safely
            document.execCommand('removeFormat', false, null);

            // Check if lists are involved in the selection
            let hasLists = document.queryCommandState('insertUnorderedList') || document.queryCommandState('insertOrderedList');
            const sel = window.getSelection();
            if (!hasLists && sel.rangeCount > 0) {
                // If queryCommandState missed it (e.g. mixed selection), manually check for selected LIs
                hasLists = Array.from(this._editor.querySelectorAll('li')).some(li => sel.containsNode(li, true));
            }

            if (hasLists) {
                // Native outdent breaks list items out into normal blocks.
                // We loop to escape deeply nested lists.
                for (let i = 0; i < 5; i++) {
                    document.execCommand('outdent', false, null);
                }
            }

            // Un-wrap PRE blocks if they intersect with selection
            if (sel.rangeCount > 0) {
                Array.from(this._editor.querySelectorAll('pre')).forEach(pre => {
                    if (sel.containsNode(pre, true)) {
                        while (pre.firstChild) {
                            pre.parentNode.insertBefore(pre.firstChild, pre);
                        }
                        pre.parentNode.removeChild(pre);
                    }
                });
            }

            // clear block formats by resetting to default block
            document.execCommand('formatBlock', false, 'DIV');
        } else if (command === 'formatBlock' && arg === 'BLOCKQUOTE') {
            // Check if we are already in a blockquote to toggle it
            let currentFormat = document.queryCommandValue('formatBlock') || '';
            currentFormat = currentFormat.replace(/<|>/g, '').toUpperCase();
            if (currentFormat === 'BLOCKQUOTE') {
                document.execCommand('formatBlock', false, 'DIV');
            } else {
                document.execCommand('formatBlock', false, 'BLOCKQUOTE');
            }
        } else {
            document.execCommand(command, false, arg);
        }
        
        this._saveHistory();
        this._updateToolbarState();
        this._emitChange();

        // Restore focus to the exact toolbar button if it was triggered via keyboard
        // This allows chaining (e.g. hitting space on Bold, Right Arrow, hit space on Italic, then Tab back to text)
        if (wasInToolbar && activeEl && activeEl !== this._editor) {
            activeEl.focus();
        }
    }

    _updateToolbarState() {
        if (!this._editor || document.activeElement !== this._editor) return;
        this._saveSelection();
        
        if (this._isUpdatingToolbar) return;

        this._isUpdatingToolbar = true;

        // Update standard formatting buttons
        const wrappers = this._toolbar.querySelectorAll('nui-button[data-command]');
        wrappers.forEach(wrapper => {
            const command = wrapper.dataset.command;
            let isActive = false;
            
            if (command === 'formatBlock') {
                const format = document.queryCommandValue('formatBlock');
                isActive = format && format.toLowerCase() === wrapper.dataset.arg.toLowerCase();
            } else {
                try {
                    isActive = document.queryCommandState(command);
                } catch (e) {
                    // Some commands don't support queryCommandState
                }
            }
            
            if (isActive) {
                wrapper.setAttribute('state', 'active');
                wrapper.setAttribute('variant', 'primary'); // Fallback visual change
            } else {
                wrapper.removeAttribute('state');
                wrapper.setAttribute('variant', 'ghost');
            }

            // Sync ARIA pressed state for screen readers
            const btn = wrapper.querySelector('button');
            if (btn && btn.hasAttribute('aria-pressed')) {
                btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            }
        });

        // Update heading select
        if (this._formatSelect) {
            let format = document.queryCommandValue('formatBlock') || '';
            format = format.replace(/<|>/g, '').toUpperCase();
            
            // Modern browsers might return 'P', 'DIV', 'H1', etc. 
            // If empty or non-standard heading, default to 'DIV' (Normal string match)
            if (!['H1','H2','H3','H4','H5','H6','PRE'].includes(format)) {
                format = 'DIV'; 
            }
            
            if (typeof this._formatSelect.setValue === 'function') {
                this._formatSelect.setValue(format);
            } else {
                const nativeSelect = this._formatSelect.querySelector('select');
                if (nativeSelect) {
                    nativeSelect.value = format;
                    // Dont dispatch change if not upgraded, or it might bubble?
                }
            }
        }
        
        this._isUpdatingToolbar = false;
    }

    _handlePaste(e) {
        e.preventDefault();
        
        let html = e.clipboardData.getData('text/html');
        if (html) {
            // Strip wrapper HTML to just the explicit fragment that was copied
            const fragmentMatch = html.match(/<!--StartFragment-->([\s\S]*?)<!--EndFragment-->/i);
            if (fragmentMatch) {
                html = fragmentMatch[1];
            }

            const temp = document.createElement('div');
            temp.innerHTML = html;
            
            // Core allowed tags for NUI Rich Text
            const allowedTags = ['B', 'I', 'U', 'S', 'STRONG', 'EM', 'MARK', 'A', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BR', 'BLOCKQUOTE', 'PRE', 'DIV', 'SPAN'];
            
            // 1. Hard remove unsecure and style elements entirely (including their contents)
            temp.querySelectorAll('script, style, meta, iframe, link, object, embed, base').forEach(el => el.remove());
            
            // 2. Safely unwrap custom elements, unrecognized tags, and clean attributes
            // We use Array.from and reverse() to process bottom-up, making unwrapping safe.
            Array.from(temp.querySelectorAll('*')).reverse().forEach(el => {
                if (!allowedTags.includes(el.tagName)) {
                    // Unwrap element (remove element but keep its children)
                    const parent = el.parentNode;
                    while (el.firstChild) {
                        parent.insertBefore(el.firstChild, el);
                    }
                    if (parent) parent.removeChild(el);
                } else {
                    // Remove dangerous/unwanted attributes but keep semantic ones (href, style)
                    const attrsToRemove = [];
                    for (let i = 0; i < el.attributes.length; i++) {
                        const attrName = el.attributes[i].name.toLowerCase();
                        if (attrName === 'id' || attrName === 'class' || attrName.startsWith('on') || attrName.startsWith('data-')) {
                            attrsToRemove.push(attrName);
                        }
                    }
                    attrsToRemove.forEach(attr => el.removeAttribute(attr));
                }
            });
            
            document.execCommand('insertHTML', false, temp.innerHTML);
            this._saveHistory();
        } else {
            // Fallback for plain text
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
            this._saveHistory();
        }
    }

    _emitChange(saveHistory = true) {
        if (saveHistory) this._saveHistory();
        this.dispatchEvent(new CustomEvent('nui-change', {
            detail: { value: this.innerHTML },
            bubbles: true
        }));
    }

    get value() {
        return this._editor.innerHTML;
    }

    set value(html) {
        if (this._editor) {
            this._editor.innerHTML = html;
        } else {
            this._value = html;
        }
    }
}

if (!customElements.get('nui-rich-text')) {
    customElements.define('nui-rich-text', NuiRichText);
}

export { NuiRichText };
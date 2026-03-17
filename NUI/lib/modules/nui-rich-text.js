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

        // Build Contextual Menu
        this._contextMenu = document.createElement('div');
        this._contextMenu.className = 'nui-rich-text-context-menu';
        
        // Prevent context menu clicks from stealing focus
        this._contextMenu.addEventListener('mousedown', (e) => {
            const btn = e.target.closest('button, nui-button');
            if (btn) e.preventDefault(); 
        });
        
        this._contextMenu.addEventListener('click', (e) => {
            const btn = e.target.closest('nui-button[data-action]');
            if (!btn) return;
            this._handleContextAction(btn.dataset.action);
        });

        // Build Image Resizer Overlay
        this._imageResizer = document.createElement('div');
        this._imageResizer.className = 'nui-rich-text-image-resizer';
        this._imageResizer.innerHTML = `
            <div class="nui-rich-text-image-resizer-handle nw" data-corner="nw"></div>
            <div class="nui-rich-text-image-resizer-handle ne" data-corner="ne"></div>
            <div class="nui-rich-text-image-resizer-handle sw" data-corner="sw"></div>
            <div class="nui-rich-text-image-resizer-handle se" data-corner="se"></div>
        `;
        this._activeImage = null;

        this._container.appendChild(this._toolbar);
        this._container.appendChild(this._editor);
        this._container.appendChild(this._contextMenu);
        this._container.appendChild(this._imageResizer);
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
                const event = new CustomEvent('nui-image-request', {
                    bubbles: true,
                    cancelable: true
                });
                
                if (!this.dispatchEvent(event)) {
                    // Prevented by host application, assume they will handle insertion via insertImage()
                    return;
                }

                const result = await nui.components.dialog.prompt('Insert Image', null, {
                    fields: [
                        { id: 'url', label: 'Image URL', type: 'url', value: '' },
                        { id: 'alt', label: 'Alternative Text', type: 'text', value: '' }
                    ]
                });

                if (result && result.url) {
                    this.insertImage(result.url, result.alt);
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

        // Image Selection and Resizing Hook
        this._editor.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') {
                this._selectImage(e.target);
            } else {
                this._hideImageResizer();
            }
        });

        // Image Drag & Drop Logic
        this._draggedImageWrapper = null;

        this._editor.addEventListener('dragstart', (e) => {
            if (e.target.tagName === 'IMG') {
                const wrapper = e.target.closest('div[contenteditable="false"]');
                if (wrapper) {
                    this._hideContextMenu();
                    this._hideImageResizer();
                    
                    this._draggedImageWrapper = wrapper;
                    e.dataTransfer.effectAllowed = 'move';
                    
                    // Clone the wrapper and clean up active states for the drag transfer
                    const clone = wrapper.cloneNode(true);
                    const innerImg = clone.querySelector('img');
                    if (innerImg) innerImg.classList.remove('nui-image-selected');
                    
                    e.dataTransfer.setData('text/html', clone.outerHTML);
                    e.dataTransfer.setData('text/plain', innerImg ? innerImg.alt || 'Image' : 'Image');
                }
            }
        });

        this._editor.addEventListener('dragover', (e) => {
            if (this._draggedImageWrapper) {
                e.preventDefault(); // Allows drop
                e.dataTransfer.dropEffect = 'move';

                // Provide a native caret indicator while dragging over text
                let range = null;
                if (document.caretRangeFromPoint) {
                    range = document.caretRangeFromPoint(e.clientX, e.clientY);
                } else if (document.caretPositionFromPoint) {
                    const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
                    if (pos) {
                        range = document.createRange();
                        range.setStart(pos.offsetNode, pos.offset);
                        range.collapse(true);
                    }
                }

                if (range) {
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        });

        this._editor.addEventListener('drop', (e) => {
            if (this._draggedImageWrapper) {
                e.preventDefault(); // Stop native HTML/image split drop

                // Find cross-browser caret range
                let range = null;
                if (document.caretRangeFromPoint) {
                    range = document.caretRangeFromPoint(e.clientX, e.clientY);
                } else if (document.caretPositionFromPoint) {
                    const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
                    if (pos) {
                        range = document.createRange();
                        range.setStart(pos.offsetNode, pos.offset);
                        range.collapse(true);
                    }
                } else if (e.rangeParent) {
                    range = document.createRange();
                    range.setStart(e.rangeParent, e.rangeOffset);
                    range.collapse(true);
                }

                if (range) {
                    // Remove from old position
                    this._draggedImageWrapper.remove();
                    
                    // Natively insert node cleanly
                    range.insertNode(this._draggedImageWrapper);

                    // Add an empty paragraph immediately after if needed to ensure typing isn't trapped
                    const br = document.createElement('p');
                    br.innerHTML = '<br>';
                    this._draggedImageWrapper.after(br);
                    
                    // Reset ranges
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    
                    this._saveHistory();
                    this._emitChange();
                }
                
                this._draggedImageWrapper = null;
            }
        });

        this._editor.addEventListener('dragend', (e) => {
            if (this._draggedImageWrapper) {
                // Browsers natively move the exact target (the img tag) to the new location and strip the datatransfer HTML wrapper 
                // in rich text editors sometimes. 
                // We'll clean up the entire source wrapper just in case.
                if (e.dataTransfer.dropEffect === 'move') {
                    this._draggedImageWrapper.remove();
                }
                this._draggedImageWrapper = null;
                
                // Let's enforce structural integrity in case it got dropped weirdly
                setTimeout(() => {
                    this._saveHistory();
                    this._emitChange();
                }, 10);
            }
        });

        this._imageResizer.addEventListener('mousedown', this._onImageResizeStart.bind(this));

        // Editor scrolling (to update absolute overlays attached to container)
        this._editor.addEventListener('scroll', () => {
            if (this._activeContextElement) {
                this._positionContextMenu(this._activeContextElement);
            }
            if (this._activeImage) {
                this._positionImageResizer();
            }
        }, { passive: true });

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
        this._updateContextualMenu();
    }

    _updateContextualMenu() {
        // Determine if focus is still here
        if (!this._editor || document.activeElement !== this._editor) {
            this._hideContextMenu();
            this._hideImageResizer();
            return;
        }

        // Hide overlay if the active image was deleted
        if (this._activeImage && !this._editor.contains(this._activeImage)) {
            this._hideImageResizer();
        }

        const sel = window.getSelection();
        if (sel.rangeCount === 0 || !sel.anchorNode) {
            this._hideContextMenu();
            return;
        }

        // Check if our active image is still within the current selection
        if (this._activeImage && this._editor.contains(this._activeImage)) {
            const range = sel.getRangeAt(0);
            const targetNode = this._activeImage.closest('div[contenteditable="false"]') || this._activeImage;
            
            if (range.intersectsNode(targetNode)) {
                // The selection still includes our image, keep the image context menu
                if (this._contextType !== 'image' || this._activeContextElement !== this._activeImage) {
                    this._showImageContext(this._activeImage);
                } else {
                    this._positionContextMenu(this._activeImage);
                }
                return;
            } else {
                // Selection moved away from the image via keyboard/mouse tracking
                this._hideImageResizer();
            }
        }

        let node = sel.anchorNode;
        let elem = node.nodeType === 3 ? node.parentNode : node;

        const anchor = elem.closest('a');
        const td = elem.closest('td, th');
        const table = elem.closest('table');

        if (anchor && this._editor.contains(anchor)) {
            this._showLinkContext(anchor);
        } else if (td && table && this._editor.contains(table)) {
            this._showTableContext(td, table);
        } else {
            this._hideContextMenu();
        }
    }

    _showLinkContext(anchor) {
        this._activeContextElement = anchor;
        this._contextType = 'link';
        this._contextMenu.innerHTML = `
            <div class="nui-rich-text-context-group">
                <nui-button variant="ghost" data-action="editLink" aria-label="Edit Link" title="Edit Link">
                    <button type="button" tabindex="-1"><nui-icon name="edit"></nui-icon></button>
                </nui-button>
                <nui-button variant="ghost" data-action="openLink" aria-label="Open Link" title="Open Link">
                    <button type="button" tabindex="-1"><nui-icon name="public"></nui-icon></button>
                </nui-button>
                <div class="nui-rich-text-separator"></div>
                <nui-button variant="ghost" data-action="removeLink" aria-label="Remove Link" title="Remove Link">
                    <button type="button" tabindex="-1"><nui-icon name="link_off"></nui-icon></button>
                </nui-button>
            </div>
        `;
        this._positionContextMenu(anchor);
    }

    _showTableContext(td, table) {
        this._activeContextElement = { td, table };
        this._contextType = 'table';
        this._contextMenu.innerHTML = `
            <div class="nui-rich-text-context-group">
                <nui-button variant="ghost" data-action="addRow" aria-label="Insert Row" title="Insert Row">
                    <button type="button" tabindex="-1"><nui-icon name="table_rows"></nui-icon></button>
                </nui-button>
                <nui-button variant="ghost" data-action="addCol" aria-label="Insert Column" title="Insert Column">
                    <button type="button" tabindex="-1"><nui-icon name="view_column"></nui-icon></button>
                </nui-button>
                <div class="nui-rich-text-separator"></div>
                <nui-button variant="ghost" data-action="delRow" aria-label="Delete Row" title="Delete Row">
                    <button type="button" tabindex="-1"><nui-icon name="horizontal_rule"></nui-icon></button>
                </nui-button>
                <nui-button variant="ghost" data-action="delCol" aria-label="Delete Column" title="Delete Column">
                    <button type="button" tabindex="-1"><nui-icon name="vertical_align_center"></nui-icon></button>
                </nui-button>
                <div class="nui-rich-text-separator"></div>
                <nui-button variant="ghost" data-action="delTable" aria-label="Delete Table" title="Delete Table">
                    <button type="button" tabindex="-1"><nui-icon name="delete"></nui-icon></button>
                </nui-button>
            </div>
        `;
        this._positionContextMenu(td);
    }

    _showImageContext(img) {
        this._activeContextElement = img;
        this._contextType = 'image';
        this._contextMenu.innerHTML = `
            <div class="nui-rich-text-context-group">
                <nui-button variant="ghost" data-action="imgSize100" aria-label="100% Width" title="100% Width">
                    <button type="button" tabindex="-1" style="font-weight: 600; font-size: 0.8rem; padding: 0 0.5rem;">100%</button>
                </nui-button>
                <nui-button variant="ghost" data-action="imgSize50" aria-label="50% Width" title="50% Width">
                    <button type="button" tabindex="-1" style="font-weight: 600; font-size: 0.8rem; padding: 0 0.5rem;">50%</button>
                </nui-button>
                <nui-button variant="ghost" data-action="imgSize25" aria-label="25% Width" title="25% Width">
                    <button type="button" tabindex="-1" style="font-weight: 600; font-size: 0.8rem; padding: 0 0.5rem;">25%</button>
                </nui-button>
                <div class="nui-rich-text-separator"></div>
                <nui-button variant="ghost" data-action="editImage" aria-label="Edit Source" title="Edit Source">
                    <button type="button" tabindex="-1"><nui-icon name="edit"></nui-icon></button>
                </nui-button>
                <div class="nui-rich-text-separator"></div>
                <nui-button variant="ghost" data-action="removeImage" aria-label="Remove Image" title="Remove Image">
                    <button type="button" tabindex="-1"><nui-icon name="delete"></nui-icon></button>
                </nui-button>
            </div>
        `;
        this._positionContextMenu(img);
    }

    _positionContextMenu(targetEl) {
        this._contextMenu.classList.add('visible');
        
        // Use container as bounding box
        const containerRect = this._container.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        
        // Position roughly centered below the element
        let top = (targetRect.bottom - containerRect.top) + 8;
        let left = (targetRect.left - containerRect.left) + (targetRect.width / 2);

        this._contextMenu.style.top = `${top}px`;
        this._contextMenu.style.left = `${left}px`;
        this._contextMenu.style.transform = 'translateX(-50%)';
    }

    _hideContextMenu() {
        this._contextMenu.classList.remove('visible');
        this._activeContextElement = null;
        this._contextType = null;
    }

    _selectImage(img) {
        this._showImageContext(img);
        this._activeImage = img;
        this._imageResizer.classList.add('visible');
        img.classList.add('nui-image-selected');
        this._positionImageResizer();

        // Force native selection specifically around the wrapper block
        const containerDiv = img.closest('div[contenteditable="false"]');
        const range = document.createRange();
        range.selectNode(containerDiv || img);
        
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    _hideImageResizer() {
        if (!this._activeImage) return;
        this._imageResizer.classList.remove('visible');
        this._activeImage.classList.remove('nui-image-selected');
        this._activeImage = null;
    }

    _positionImageResizer() {
        if (!this._activeImage || !this._imageResizer.classList.contains('visible')) return;
        
        const containerRect = this._container.getBoundingClientRect();
        const imgRect = this._activeImage.getBoundingClientRect();

        // Target position in the container
        let top = (imgRect.top - containerRect.top);
        let left = (imgRect.left - containerRect.left);

        this._imageResizer.style.top = `${top}px`;
        this._imageResizer.style.left = `${left}px`;
        this._imageResizer.style.width = `${imgRect.width}px`;
        this._imageResizer.style.height = `${imgRect.height}px`;
    }

    _onImageResizeStart(e) {
        if (!e.target.classList.contains('nui-rich-text-image-resizer-handle')) return;

        e.preventDefault();
        e.stopPropagation();

        if (!this._activeImage) return;

        const isLeftCorner = e.target.classList.contains('nw') || e.target.classList.contains('sw');

        const startX = e.clientX;
        const startWidth = this._activeImage.offsetWidth;
        const startHeight = this._activeImage.offsetHeight;
        const ratio = startWidth / startHeight;

        const onMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            // Left corners expand by dragging left (negative dx), right corners expand by dragging right (positive dx)
            const adjustedDx = isLeftCorner ? -dx : dx;

            // Always calculate width directly and auto-set height to keep ratio via CSS
            const newWidth = Math.max(50, startWidth + adjustedDx);
            this._activeImage.style.width = `${newWidth}px`;
            this._activeImage.style.height = 'auto'; // ensure native browser scaling

            // Re-sync resizer bounds immediately
            this._positionImageResizer();
            // Also re-position the context menu to keep it affixed to the scaling image
            this._positionContextMenu(this._activeImage);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            this._emitChange(true); // Treat resize as a structural change to store in history
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    async _handleContextAction(action) {
        if (!this._activeContextElement) return;

        // Restore focus to editor first to keep native cursor location alive if possible
        this._editor.focus();
        
        if (this._contextType === 'link') {
            const anchor = this._activeContextElement;
            if (action === 'editLink') {
                const result = await nui.components.dialog.prompt('Edit Link', null, {
                    fields: [
                        { id: 'url', label: 'Web Address (URL)', type: 'url', value: anchor.getAttribute('href') || '' }
                    ]
                });
                if (result && result.url) {
                    anchor.setAttribute('href', result.url);
                    this._saveHistory();
                    this._emitChange();
                }
            } else if (action === 'openLink') {
                let url = (anchor.getAttribute('href') || '').trim();
                // Ensure the URL is treated as absolute if it doesn't have a protocol or explicitly starts with / or #
                if (url && !/^https?:\/\//i.test(url) && !/^(mailto|tel|sms):/i.test(url) && !url.startsWith('/') && !url.startsWith('#')) {
                    url = 'https://' + url;
                }
                window.open(url, '_blank');
            } else if (action === 'removeLink') {
                const text = document.createTextNode(anchor.textContent);
                anchor.parentNode.replaceChild(text, anchor);
                
                // Select the text cleanly after removing link
                const range = document.createRange();
                range.selectNode(text);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                
                this._saveHistory();
                this._emitChange();
            }
        } else if (this._contextType === 'table') {
            const { td, table } = this._activeContextElement;
            const tr = td.parentNode;
            const tbody = tr.parentNode;
            
            // Get index of current cell to know where to insert columns
            const cellIndex = Array.from(tr.children).indexOf(td);

            if (action === 'addRow') {
                const newRow = document.createElement('tr');
                Array.from(tr.children).forEach(() => {
                    const newCell = document.createElement('td');
                    newCell.innerHTML = '<br>';
                    newRow.appendChild(newCell);
                });
                tr.parentNode.insertBefore(newRow, tr.nextSibling);
            } else if (action === 'addCol') {
                Array.from(tbody.children).forEach(row => {
                    const newCell = document.createElement('td');
                    newCell.innerHTML = '<br>';
                    // insert after current cell index
                    if (row.children.length > cellIndex) {
                        row.insertBefore(newCell, row.children[cellIndex].nextSibling);
                    } else {
                        row.appendChild(newCell);
                    }
                });
            } else if (action === 'delRow') {
                tr.remove();
                if (tbody.children.length === 0) table.remove();
            } else if (action === 'delCol') {
                Array.from(tbody.children).forEach(row => {
                    if (row.children.length > cellIndex) {
                        row.children[cellIndex].remove();
                    }
                });
                // If table has no columns left, delete table
                if (tbody.children.length > 0 && tbody.children[0].children.length === 0) {
                    table.remove();
                }
            } else if (action === 'delTable') {
                table.remove();
            }
            
            this._saveHistory();
            this._emitChange();
        } else if (this._contextType === 'image') {
            const img = this._activeContextElement;
            const containerDiv = img.closest('div[contenteditable="false"]');
            
            if (action === 'imgSize100' || action === 'imgSize50' || action === 'imgSize25') {
                const map = { 'imgSize100': '100%', 'imgSize50': '50%', 'imgSize25': '25%' };
                img.style.width = map[action];
                img.style.height = 'auto'; // Reset arbitrary dragging heights
                this._positionImageResizer();
                this._positionContextMenu(img);
                this._saveHistory();
                this._emitChange();
            } else if (action === 'editImage') {
                const result = await nui.components.dialog.prompt('Edit Image', null, {
                    fields: [
                        { id: 'url', label: 'Image URL', type: 'url', value: img.getAttribute('src') || '' },
                        { id: 'alt', label: 'Alt Text', type: 'text', value: img.getAttribute('alt') || '' }
                    ]
                });
                if (result && result.url) {
                    img.setAttribute('src', result.url);
                    img.setAttribute('alt', result.alt || '');
                    
                    // Wait for image to load to reposition resizer
                    img.onload = () => {
                        this._positionImageResizer();
                        this._positionContextMenu(img);
                    };
                    
                    this._saveHistory();
                    this._emitChange();
                }
            } else if (action === 'removeImage') {
                if (containerDiv) {
                    containerDiv.remove();
                } else {
                    img.remove();
                }
                this._hideContextMenu();
                this._hideImageResizer();
                this._saveHistory();
                this._emitChange();
            }
        }

        this._updateContextualMenu();
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

    /**
     * Public method to insert an image into the editor at the current selection
     */
    insertImage(url, alt = '') {
        const applyImage = () => {
            if (document.querySelector('dialog[open]')) {
                requestAnimationFrame(applyImage);
            } else {
                setTimeout(() => {
                    // Wrap image inside a DIV to force block layout separation natively
                    // rather than injecting it inline into existing paragraphs
                    const imgHtml = `<div contenteditable="false" style="display: block; width: fit-content; max-width: 100%;"><img src="${url}" alt="${alt}" class="nui-rich-text-image" style="width: 300px;" /></div><p><br></p>`;
                    this._execCommand('insertHTML', imgHtml);
                }, 10);
            }
        };
        applyImage();
    }

    get value() {
        if (!this._editor) return this._value;
        // Clean up temporary internal states
        return this._editor.innerHTML.replace(/ nui-image-selected|nui-image-selected/g, '').trim();
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
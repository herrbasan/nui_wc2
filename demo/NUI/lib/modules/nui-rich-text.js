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
        this._value = this.innerHTML.trim();
        this.innerHTML = '';

        this._render();
        this._attachEvents();
        this._saveHistory(); 
    }

    _render() {
        this._container = document.createElement('div');
        this._container.className = 'nui-rich-text-container';
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
                    if (this._isUpdatingToolbar) return; 
                    const val = (e.detail?.values && e.detail.values[0]) || selectWrap.querySelector('select').value;
                    const arg = val === 'DIV' || val === 'P' ? val : val;
                    this._execCommand('formatBlock', arg); 
                });
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
            btn.setAttribute('tabindex', '-1'); 
            if (!['undo', 'redo', 'createLink', 'unlink', 'removeFormat', 'insertImage', 'insertTable'].includes(tool.command)) {
                btn.setAttribute('aria-pressed', 'false');
            }

            const icon = document.createElement('nui-icon');
            icon.setAttribute('name', tool.icon);
            
            btn.appendChild(icon);
            wrapper.appendChild(btn);

            this._toolbar.appendChild(wrapper);
        });
        const firstAction = this._toolbar.querySelector('button, select');
        if (firstAction) firstAction.setAttribute('tabindex', '0');
        this._editor = document.createElement('div');
        this._editor.className = 'nui-rich-text-editor';
        this._editor.setAttribute('contenteditable', 'true');
        this._editor.setAttribute('role', 'textbox');
        this._editor.setAttribute('aria-multiline', 'true');
        if (this.hasAttribute('placeholder')) {
            this._editor.setAttribute('data-placeholder', this.getAttribute('placeholder'));
        }
        this._editor.innerHTML = this._value;
        this._contextMenu = document.createElement('div');
        this._contextMenu.className = 'nui-rich-text-context-menu';
        this._contextMenu.addEventListener('mousedown', (e) => {
            const btn = e.target.closest('button, nui-button');
            if (btn) e.preventDefault(); 
        });
        
        this._contextMenu.addEventListener('click', (e) => {
            const btn = e.target.closest('nui-button[data-action]');
            if (!btn) return;
            this._handleContextAction(btn.dataset.action);
        });
        this._imageResizer = document.createElement('div');
        this._imageResizer.className = 'nui-rich-text-image-resizer';
        this._imageResizer.innerHTML = `
            <div class="nui-rich-text-image-resizer-handle nw" data-corner="nw"></div>
            <div class="nui-rich-text-image-resizer-handle ne" data-corner="ne"></div>
            <div class="nui-rich-text-image-resizer-handle sw" data-corner="sw"></div>
            <div class="nui-rich-text-image-resizer-handle se" data-corner="se"></div>
        `;
        this._activeImage = null;

        if (!this.hasAttribute('no-toolbar')) {
            this._container.appendChild(this._toolbar);
        }
        this._container.appendChild(this._editor);
        this._container.appendChild(this._contextMenu);
        this._container.appendChild(this._imageResizer);
        this.appendChild(this._container);
    }

    _attachEvents() {
        this._toolbar.addEventListener('mousedown', (e) => {
            const btn = e.target.closest('nui-button');
            if (btn) {
                e.preventDefault(); 
            }
        });
        this._toolbar.addEventListener('keydown', this._handleToolbarKeyDown.bind(this));
        this._toolbar.addEventListener('click', async (e) => {
            const btn = e.target.closest('nui-button');
            if (!btn) return;
            
            const command = btn.dataset.command;
            const arg = btn.dataset.arg || null;

            if (command === 'createLink') {
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
                    const applyLink = () => {
                        const blockerDialog = Array.from(document.querySelectorAll('dialog[open]')).find(d => !d.contains(this));
                        if (blockerDialog) {
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
                        const blockerDialog = Array.from(document.querySelectorAll('dialog[open]')).find(d => !d.contains(this));
                        if (blockerDialog) {
                            requestAnimationFrame(applyTable);
                        } else {
                            setTimeout(() => {
                                let tableHtml = '<table class="nui-table"><tbody>';
                                for (let r = 0; r < result.rows; r++) {
                                    tableHtml += '<tr>';
                                    for (let c = 0; c < result.cols; c++) {
                                        tableHtml += '<td><br></td>'; 
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
        this._editor.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') {
                this._selectImage(e.target);
            } else {
                this._hideImageResizer();
            }
        });
        this._draggedImageWrapper = null;

        this._editor.addEventListener('dragstart', (e) => {
            if (e.target.tagName === 'IMG') {
                const wrapper = e.target.closest('div[contenteditable="false"]');
                if (wrapper) {
                    this._hideContextMenu();
                    this._hideImageResizer();
                    
                    this._draggedImageWrapper = wrapper;
                    e.dataTransfer.effectAllowed = 'move';
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
                e.preventDefault(); 
                e.dataTransfer.dropEffect = 'move';
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
            let hasImage = false;
            
            if (e.dataTransfer) {
                const items = e.dataTransfer.items;
                if (items) {
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
                            const file = items[i].getAsFile();
                            if (file) {
                                hasImage = true;
                                this.dispatchEvent(new CustomEvent('nui-image-upload', {
                                    detail: { file: file, clientX: e.clientX, clientY: e.clientY },
                                    bubbles: true
                                }));
                            }
                        }
                    }
                } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    for (let i = 0; i < e.dataTransfer.files.length; i++) {
                        const file = e.dataTransfer.files[i];
                        if (file.type.startsWith('image/')) {
                            hasImage = true;
                            this.dispatchEvent(new CustomEvent('nui-image-upload', {
                                detail: { file: file, clientX: e.clientX, clientY: e.clientY },
                                bubbles: true
                            }));
                        }
                    }
                }
            }
            
            if (hasImage) {
                e.preventDefault();
                return;
            }

            if (this._draggedImageWrapper) {
                e.preventDefault(); 
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
                    this._draggedImageWrapper.remove();
                    range.insertNode(this._draggedImageWrapper);
                    const br = document.createElement('p');
                    br.innerHTML = '<br>';
                    this._draggedImageWrapper.after(br);
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
                if (e.dataTransfer.dropEffect === 'move') {
                    this._draggedImageWrapper.remove();
                }
                this._draggedImageWrapper = null;
                setTimeout(() => {
                    this._saveHistory();
                    this._emitChange();
                }, 10);
            }
        });

        this._imageResizer.addEventListener('mousedown', this._onImageResizeStart.bind(this));
        this._editor.addEventListener('scroll', () => {
            if (this._activeContextElement) {
                this._positionContextMenu(this._activeContextElement);
            }
            if (this._activeImage) {
                this._positionImageResizer();
            }
        }, { passive: true });
        document.addEventListener('selectionchange', () => this._updateToolbarState());
        this._editor.addEventListener('keydown', this._handleKeyDown.bind(this));
        this._editor.addEventListener('keyup', this._handleKeyUp.bind(this));
        this._editor.addEventListener('mouseup', () => this._updateToolbarState());
        this._editor.addEventListener('focus', () => {
            try { document.execCommand('defaultParagraphSeparator', false, 'DIV'); } catch(e) {}
        });
        this._editor.addEventListener('input', () => {
            clearTimeout(this._historyTimeout);
            this._historyTimeout = setTimeout(() => this._saveHistory(), 500);
            this._emitChange(false);
        });
        this._editor.addEventListener('paste', this._handlePaste.bind(this));
    }

    _handleKeyDown(e) {
        if (e.key === 'F10' && e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            const activeTool = this._toolbar.querySelector('[tabindex="0"]') || this._toolbar.querySelector('button, select');
            if (activeTool) setTimeout(() => activeTool.focus(), 10);
            return;
        }
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
                e.preventDefault();
                document.execCommand('insertLineBreak');
            } else {
                const sel = window.getSelection();
                if (!sel.rangeCount) return;
                
                const node = sel.anchorNode;
                const elem = node.nodeType === 3 ? node.parentNode : node;
                if (elem.closest('PRE')) {
                    e.preventDefault();
                    document.execCommand('insertText', false, '\n');
                    return;
                }
                const activeBlock = elem.closest('BLOCKQUOTE');
                if (activeBlock) {
                    let currentLine = elem;
                    while (currentLine && currentLine.parentNode !== activeBlock && currentLine !== activeBlock) {
                        currentLine = currentLine.parentNode;
                    }
                    if (currentLine && currentLine.textContent.trim() === '') {
                        e.preventDefault(); 
                        if (currentLine !== activeBlock) {
                            currentLine.remove();
                        }
                        const newDiv = document.createElement('div');
                        newDiv.innerHTML = '<br>';
                        if (activeBlock.parentNode) {
                            activeBlock.parentNode.insertBefore(newDiv, activeBlock.nextSibling);
                        } else {
                            this._editor.appendChild(newDiv);
                        }
                        if (activeBlock.textContent.trim() === '') {
                            activeBlock.remove();
                        }
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
        if (e.key === 'Backspace' || e.key === 'Delete') {
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                const node = sel.anchorNode;
                const elem = node.nodeType === 3 ? node.parentNode : node;
                const stuckBlock = elem.closest('BLOCKQUOTE, PRE, H1, H2, H3, H4, H5, H6');
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
        const match = text.match(/^(#{1,6}|\*|-|1\.|>)\s$/);
        if (!match) return;
        let parent = textNode.parentNode;
        while (parent && parent !== this._editor) {
            if (['PRE', 'CODE'].includes(parent.tagName)) return;
            parent = parent.parentNode;
        }
        const prefixLen = match[0].length;
        range.setStart(textNode, range.startOffset - prefixLen);
        range.deleteContents();
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
                return; 
        }
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
        this._history = this._history.slice(0, this._historyIndex + 1);
        this._history.push(currentHTML);
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

    _expandSelectionToWord(sel) {
        if (!sel.isCollapsed || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        const node = range.startContainer;
        if (node.nodeType !== Node.TEXT_NODE) return;
        
        const text = node.textContent;
        let start = range.startOffset;
        let end = range.endOffset;
        
        // Find word boundaries (letters, numbers, and common word characters)
        const isWordChar = (char) => /[\p{L}\p{N}_\-]/u.test(char);

        // If we are at the end of a word, we might want to look backwards
        if (start > 0 && !isWordChar(text[start]) && isWordChar(text[start - 1])) {
            start--;
            end--;
        }

        while (start > 0 && isWordChar(text[start - 1])) {
            start--;
        }
        
        while (end < text.length && isWordChar(text[end])) {
            end++;
        }
        
        if (start < end) {
            range.setStart(node, start);
            range.setEnd(node, end);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }

    _execCommand(command, arg = null) {
        const activeEl = document.activeElement;
        const wasInToolbar = this._toolbar.contains(activeEl);

        this._editor.focus();
        this._restoreSelection();

        const sel = window.getSelection();
        const inlineStyles = ['bold', 'italic', 'underline', 'strikeThrough', 'removeFormat'];
        if (sel && sel.isCollapsed && inlineStyles.includes(command)) {
            this._expandSelectionToWord(sel);
        }

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
            document.execCommand('removeFormat', false, null);
            let hasLists = document.queryCommandState('insertUnorderedList') || document.queryCommandState('insertOrderedList');
            const sel = window.getSelection();
            if (!hasLists && sel.rangeCount > 0) {
                hasLists = Array.from(this._editor.querySelectorAll('li')).some(li => sel.containsNode(li, true));
            }

            if (hasLists) {
                for (let i = 0; i < 5; i++) {
                    document.execCommand('outdent', false, null);
                }
            }
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
            document.execCommand('formatBlock', false, 'DIV');
        } else if (command === 'formatBlock' && arg === 'BLOCKQUOTE') {
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
        if (wasInToolbar && activeEl && activeEl !== this._editor) {
            activeEl.focus();
        }
    }

    _updateToolbarState() {
        if (!this._editor || document.activeElement !== this._editor) return;
        this._saveSelection();
        
        if (this._isUpdatingToolbar) return;

        this._isUpdatingToolbar = true;
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
                }
            }
            
            if (isActive) {
                wrapper.setAttribute('state', 'active');
                wrapper.setAttribute('variant', 'primary'); 
            } else {
                wrapper.removeAttribute('state');
                wrapper.setAttribute('variant', 'ghost');
            }
            const btn = wrapper.querySelector('button');
            if (btn && btn.hasAttribute('aria-pressed')) {
                btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            }
        });
        if (this._formatSelect) {
            let format = document.queryCommandValue('formatBlock') || '';
            format = format.replace(/<|>/g, '').toUpperCase();
            if (!['H1','H2','H3','H4','H5','H6','PRE'].includes(format)) {
                format = 'DIV'; 
            }
            
            if (typeof this._formatSelect.setValue === 'function') {
                this._formatSelect.setValue(format);
            } else {
                const nativeSelect = this._formatSelect.querySelector('select');
                if (nativeSelect) {
                    nativeSelect.value = format;
                }
            }
        }
        
        this._isUpdatingToolbar = false;
        this._updateContextualMenu();
    }

    _updateContextualMenu() {
        if (!this._editor || document.activeElement !== this._editor) {
            this._hideContextMenu();
            this._hideImageResizer();
            return;
        }
        if (this._activeImage && !this._editor.contains(this._activeImage)) {
            this._hideImageResizer();
        }

        const sel = window.getSelection();
        if (sel.rangeCount === 0 || !sel.anchorNode) {
            this._hideContextMenu();
            return;
        }
        if (this._activeImage && this._editor.contains(this._activeImage)) {
            const range = sel.getRangeAt(0);
            const targetNode = this._activeImage.closest('div[contenteditable="false"]') || this._activeImage;
            
            if (range.intersectsNode(targetNode)) {
                if (this._contextType !== 'image' || this._activeContextElement !== this._activeImage) {
                    this._showImageContext(this._activeImage);
                } else {
                    this._positionContextMenu(this._activeImage);
                }
                return;
            } else {
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

    _renderContextMenu(items, targetEl) {
        let html = '<div class="nui-rich-text-context-group">';
        for (const item of items) {
            if (item === 'separator') {
                html += '<div class="nui-rich-text-separator"></div>';
            } else {
                html += `
                <nui-button variant="ghost" data-action="${item.action}" aria-label="${item.label}" title="${item.label}">
                    <button type="button" tabindex="-1">${item.icon ? `<nui-icon name="${item.icon}"></nui-icon>` : `<span style="font-weight: 600; font-size: 0.8rem; padding: 0 0.5rem;">${item.text}</span>`}</button>
                </nui-button>`;
            }
        }
        html += '</div>';

        this._contextMenu.innerHTML = html;
        this._positionContextMenu(targetEl);
    }

    _showLinkContext(anchor) {
        this._activeContextElement = anchor;
        this._contextType = 'link';
        this._renderContextMenu([
            { action: 'editLink', label: 'Edit Link', icon: 'edit' },
            { action: 'openLink', label: 'Open Link', icon: 'public' },
            'separator',
            { action: 'removeLink', label: 'Remove Link', icon: 'link_off' }
        ], anchor);
    }

    _showTableContext(td, table) {
        this._activeContextElement = { td, table };
        this._contextType = 'table';
        this._renderContextMenu([
            { action: 'addRowAbove', label: 'Insert Row Above', icon: 'add_row_above' },
            { action: 'addRowBelow', label: 'Insert Row Below', icon: 'add_row_below' },
            'separator',
            { action: 'addColLeft', label: 'Insert Column Left', icon: 'add_column_left' },
            { action: 'addColRight', label: 'Insert Column Right', icon: 'add_column_right' },
            'separator',
            { action: 'delRow', label: 'Delete Row', icon: 'playlist_remove' },
            { action: 'delCol', label: 'Delete Column', icon: 'variable_remove' },
            'separator',
            { action: 'delTable', label: 'Delete Table', icon: 'delete' }
        ], td);
    }

    _showImageContext(img) {
        this._activeContextElement = img;
        this._contextType = 'image';
        this._renderContextMenu([
            // { action: 'alignNone', label: 'Default Block', icon: 'format_image_break_left' },
            // { action: 'alignLeft', label: 'Align Left', icon: 'format_image_left' },
            // { action: 'alignCenter', label: 'Align Center', icon: 'format_image_front' },
            // { action: 'alignRight', label: 'Align Right', icon: 'format_image_right' },
            // 'separator',
            { action: 'imgSize100', label: '100% Width', text: '100%' },
            { action: 'imgSize50', label: '50% Width', text: '50%' },
            { action: 'imgSize25', label: '25% Width', text: '25%' },
            'separator',
            { action: 'editImage', label: 'Edit Source', icon: 'edit' },
            'separator',
            { action: 'removeImage', label: 'Remove Image', icon: 'delete' }
        ], img);
    }

    _positionContextMenu(targetEl) {
        this._contextMenu.classList.add('visible');
        const containerRect = this._container.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
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
            const adjustedDx = isLeftCorner ? -dx : dx;
            const newWidth = Math.max(50, startWidth + adjustedDx);
            this._activeImage.style.width = `${newWidth}px`;
            this._activeImage.style.height = 'auto'; 
            this._positionImageResizer();
            this._positionContextMenu(this._activeImage);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            this._emitChange(true); 
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    async _handleContextAction(action) {
        if (!this._activeContextElement) return;
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
                if (url && !/^https?:\/\//i.test(url)) {
                    url = 'https://' + url;
                }
                window.open(url, '_blank');
            } else if (action === 'removeLink') {
                const text = document.createTextNode(anchor.textContent);
                anchor.parentNode.replaceChild(text, anchor);
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
            const cellIndex = Array.from(tr.children).indexOf(td);

            if (action === 'addRowAbove') {
                const newRow = document.createElement('tr');
                Array.from(tr.children).forEach(() => {
                    const newCell = document.createElement('td');
                    newCell.innerHTML = '<br>';
                    newRow.appendChild(newCell);
                });
                tr.parentNode.insertBefore(newRow, tr);
            } else if (action === 'addRowBelow') {
                const newRow = document.createElement('tr');
                Array.from(tr.children).forEach(() => {
                    const newCell = document.createElement('td');
                    newCell.innerHTML = '<br>';
                    newRow.appendChild(newCell);
                });
                tr.parentNode.insertBefore(newRow, tr.nextSibling);
            } else if (action === 'addColLeft') {
                Array.from(tbody.children).forEach(row => {
                    const newCell = document.createElement('td');
                    newCell.innerHTML = '<br>';
                    row.insertBefore(newCell, row.children[cellIndex]);
                });
            } else if (action === 'addColRight') {
                Array.from(tbody.children).forEach(row => {
                    const newCell = document.createElement('td');
                    newCell.innerHTML = '<br>';
                    if (row.children.length > cellIndex + 1) {
                        row.insertBefore(newCell, row.children[cellIndex + 1]);
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

            /*
            if (action === 'alignLeft' || action === 'alignCenter' || action === 'alignRight' || action === 'alignNone') {
                const target = containerDiv || img;
                target.classList.remove('align-left', 'align-center', 'align-right');
                if (action !== 'alignNone') {
                    const map = { 'alignLeft': 'align-left', 'alignCenter': 'align-center', 'alignRight': 'align-right' };
                    target.classList.add(map[action]);
                }
                this._positionImageResizer();
                this._positionContextMenu(img);
                this._saveHistory();
                this._emitChange();
            } else
            */
            if (action === 'imgSize100' || action === 'imgSize50' || action === 'imgSize25') {
                img.classList.remove('rte_100', 'rte_50', 'rte_25');
                const map = { 'imgSize100': 'rte_100', 'imgSize50': 'rte_50', 'imgSize25': 'rte_25' };
                img.classList.add(map[action]);
                img.style.width = '';
                img.style.height = ''; 
                if (!img.getAttribute('style')) img.removeAttribute('style');
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
        let hasImage = false;
        if (e.clipboardData) {
            const items = e.clipboardData.items;
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.startsWith('image/')) {
                        const file = items[i].getAsFile();
                        if (file) {
                            hasImage = true;
                            this.dispatchEvent(new CustomEvent('nui-image-upload', {
                                detail: { file: file },
                                bubbles: true
                            }));
                        }
                    }
                }
            } else if (e.clipboardData.files && e.clipboardData.files.length > 0) {
                for (let i = 0; i < e.clipboardData.files.length; i++) {
                    const file = e.clipboardData.files[i];
                    if (file.type.startsWith('image/')) {
                        hasImage = true;
                        this.dispatchEvent(new CustomEvent('nui-image-upload', {
                            detail: { file: file },
                            bubbles: true
                        }));
                    }
                }
            }
        }
        
        if (hasImage) {
            e.preventDefault();
            return;
        }

        e.preventDefault();

        const types = e.clipboardData.types ? Array.from(e.clipboardData.types) : [];
        let html = e.clipboardData.getData('text/html');
        let text = e.clipboardData.getData('text/plain');

        const isLikelyMarkdown = text && /(^#{1,6}\s|\[.+\]\(.+\)|(\*\*|__)[^\s].+[^\s]\2|^\s*[\*\-]\s|^\s*\d+\.\s|^\s*>|^\|.+\|\s*$|```)/m.test(text);
        const isFromCodeEditor = types.includes('vscode-editor-data') || types.includes('text/x-moz-mac-specific');
        // Also check if HTML is just a pre/code block wrapped
        const isCodeBlockHTML = html && (html.includes('<pre') || html.includes('font-family: Consolas') || html.includes('font-family: monospace'));

        if (text && isLikelyMarkdown && (!html || isFromCodeEditor || isCodeBlockHTML)) {
            const parsedHtml = this._parseMarkdown(text);
            document.execCommand('insertHTML', false, parsedHtml);
            this._saveHistory();
            return;
        }

        if (html) {
            const fragmentMatch = html.match(/<!--StartFragment-->([\s\S]*?)<!--EndFragment-->/i);
            if (fragmentMatch) {
                html = fragmentMatch[1];
            }

            const temp = document.createElement('div');
            temp.innerHTML = html;
            const allowedTags = ['B', 'I', 'U', 'S', 'STRONG', 'EM', 'MARK', 'A', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BR', 'BLOCKQUOTE', 'PRE', 'DIV', 'SPAN', 'CODE', 'NUI-CODE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD'];
            temp.querySelectorAll('script, style, meta, iframe, link, object, embed, base').forEach(el => el.remove());
            Array.from(temp.querySelectorAll('*')).reverse().forEach(el => {
                if (!allowedTags.includes(el.tagName)) {
                    const parent = el.parentNode;
                    while (el.firstChild) {
                        parent.insertBefore(el.firstChild, el);
                    }
                    if (parent) parent.removeChild(el);
                } else {
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
        } else if (text) {
            document.execCommand('insertText', false, text);
            this._saveHistory();
        }
    }

    _parseMarkdown(md) {
		// Delegate to core utility (deduplicated)
		const util = window.nui?.util || (typeof nui !== 'undefined' ? nui.util : null);
		if (util && util.markdownToHtml) {
			return util.markdownToHtml(md);
		}
		// Fallback for standalone use
		return md;
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
            const blockerDialog = Array.from(document.querySelectorAll('dialog[open]')).find(d => !d.contains(this));
            if (blockerDialog) {
                requestAnimationFrame(applyImage);
            } else {
                setTimeout(() => {
                    const imgHtml = `<div contenteditable="false" class="nui-rich-text-image-wrapper"><img src="${url}" alt="${alt}" class="nui-rich-text-image rte_50" /></div><p><br></p>`;
                    this._execCommand('insertHTML', imgHtml);
                }, 10);
            }
        };
        applyImage();
    }

    get value() {
        if (!this._editor) return this._value;
        return this._editor.innerHTML.replace(/ nui-image-selected|nui-image-selected/g, '').trim();
    }

    set value(html) {
        if (this._editor) {
            this._editor.innerHTML = html;
        } else {
            this._value = html;
        }
    }

    /**
     * Standard NUI programmatic getter
     * @returns {string} The current HTML value
     */
    getValue() {
        return this.value;
    }

    /**
     * Standard NUI programmatic setter
     * @param {string} val The HTML value to set
     */
    setValue(val) {
        this.value = val;
    }

    get markdown() {
        return this._htmlToMarkdown(this.value);
    }

    set markdown(md) {
        this.value = this._parseMarkdown(md);
    }

    /**
     * Set content from Markdown programmatically
     * @param {string} md The Markdown text
     */
    setMarkdown(md) {
        this.markdown = md;
    }

    /**
     * Get content as Markdown programmatically
     * @returns {string} Markdown representation of the content
     */
    getMarkdown() {
        return this.markdown;
    }

    /**
     * Get all inlined images (data:image/ or blob:) from the editor.
     * @returns {Array<{src: string, alt: string, element: HTMLImageElement}>}
     */
    getInlinedImages() {
        if (!this._editor) return [];
        const images = Array.from(this._editor.querySelectorAll('img'));
        return images
            .filter(img => img.src && (img.src.startsWith('data:image/') || img.src.startsWith('blob:')))
            .map(img => ({
                src: img.src,
                alt: img.getAttribute('alt') || '',
                element: img
            }));
    }

    _htmlToMarkdown(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;

        function renderText(text) {
            return text.replace(/\s+/g, ' '); 
        }

        function walk(node, inPre = false) {
            let md = '';
            for (const child of node.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {
                    md += inPre ? child.textContent : renderText(child.textContent);
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    const tag = child.tagName.toLowerCase();
                    const inner = walk(child, inPre || tag === 'pre');
                    
                    switch (tag) {
                        case 'b':
                        case 'strong': md += `**${inner}**`; break;
                        case 'i':
                        case 'em': md += `*${inner}*`; break;
                        case 'u': md += `<u>${inner}</u>`; break; 
                        case 's':
                        case 'strike': md += `~~${inner}~~`; break;
                        case 'code': 
                            if (child.parentNode && child.parentNode.tagName === 'PRE') {
                                md += inner; // Don't add backticks for code blocks, pre handles it
                            } else {
                                md += `\`${inner}\``; 
                            }
                            break;
                        case 'pre': {
                            let lang = '';
                            const codeNode = child.querySelector('code');
                            if (codeNode) {
                                lang = codeNode.getAttribute('data-lang') || '';
                            }
                            // Only trim trailing whitespace to preserve indentation, 
                            // replace any leftover copy buttons or icons that might have sneaked in
                            let cleanInner = inner.trimEnd();
                            md += `\n\`\`\`${lang}\n${cleanInner}\n\`\`\`\n`; 
                            break;
                        }
                        case 'nui-code': {
                            // Handle nui-code wrapper - extract code content and convert to markdown
                            const preNode = child.querySelector('pre');
                            const codeNode = child.querySelector('code');
                            let lang = '';
                            let codeText = '';
                            if (codeNode) {
                                lang = codeNode.getAttribute('data-lang') || '';
                                codeText = codeNode.textContent;
                            } else if (preNode) {
                                codeText = preNode.textContent;
                            } else {
                                codeText = child.textContent;
                            }
                            md += `\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`; 
                            break;
                        }
                        case 'a': {
                            const href = child.getAttribute('href') || '';
                            const resolvedHref = href ? new URL(href, window.location.href).href : '';
                            md += `[${inner}](${resolvedHref})`; 
                            break;
                        }
                        case 'button':
                            if (child.classList.contains('nui-code-copy')) break;
                            md += inner;
                            break;
                        case 'img': {
                            const src = child.getAttribute('src') || '';
                            const resolvedSrc = src ? new URL(src, window.location.href).href : '';
                            md += `![${child.getAttribute('alt') || ''}](${resolvedSrc})`; 
                            break;
                        }
                        case 'h1': md += `\n# ${inner}\n\n`; break;
                        case 'h2': md += `\n## ${inner}\n\n`; break;
                        case 'h3': md += `\n### ${inner}\n\n`; break;
                        case 'h4': md += `\n#### ${inner}\n\n`; break;
                        case 'h5': md += `\n##### ${inner}\n\n`; break;
                        case 'h6': md += `\n###### ${inner}\n\n`; break;
                        case 'p':
                        case 'div': 
                            if (inner.trim() === '') md += '\n'; // keep intentional empty lines
                            else md += `${inner}\n\n`; 
                            break;
                        case 'br': md += `\n`; break;
                        case 'hr': md += `\n---\n\n`; break;
                        case 'blockquote': md += `\n> ${inner.trim().replace(/\n/g, '\n> ')}\n\n`; break;
                        case 'ul': 
                        case 'ol': md += `\n${inner}\n`; break;
                        case 'li': {
                            const isOrdered = child.parentNode && child.parentNode.tagName === 'OL';
                            const index = isOrdered ? Array.from(child.parentNode.children).indexOf(child) + 1 : '-';
                            const marker = isOrdered ? `${index}.` : '-';
                            md += `${marker} ${inner.trim()}\n`;
                            break;
                        }
                        case 'table': {
                            md += '\n';
                            const rows = Array.from(child.querySelectorAll('tr'));
                            rows.forEach((row, i) => {
                                const cells = Array.from(row.children);
                                md += '| ' + cells.map(c => walk(c).replace(/\|/g, '\\|').trim()).join(' | ') + ' |\n';
                                if (i === 0 && row.parentNode.tagName === 'THEAD' || (i === 0 && rows.length > 1 && !child.querySelector('thead'))) {
                                    md += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
                                }
                            });
                            md += '\n';
                            break;
                        }
                        default:
                            md += inner;
                    }
                }
            }
            return md;
        }

        return walk(temp).trim().replace(/\n{3,}/g, '\n\n'); 
    }
}

if (!customElements.get('nui-rich-text')) {
    customElements.define('nui-rich-text', NuiRichText);
}

export { NuiRichText };
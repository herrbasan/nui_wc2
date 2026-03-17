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
    }

    connectedCallback() {
        if (this.hasAttribute('data-initialized')) return;
        this.setAttribute('data-initialized', 'true');

        // Extract initial HTML content
        this._value = this.innerHTML.trim();
        this.innerHTML = '';

        this._render();
        this._attachEvents();
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

            const icon = document.createElement('nui-icon');
            icon.setAttribute('name', tool.icon);
            
            btn.appendChild(icon);
            wrapper.appendChild(btn);

            this._toolbar.appendChild(wrapper);
        });

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

        // Toolbar actions
        this._toolbar.addEventListener('click', async (e) => {
            const btn = e.target.closest('nui-button');
            if (!btn) return;
            
            const command = btn.dataset.command;
            const arg = btn.dataset.arg || null;

            if (command === 'createLink') {
                const result = await nui.dialog.prompt('Insert Link', null, {
                    fields: [
                        { id: 'url', label: 'Web Address (URL)', type: 'url' }
                    ]
                });

                if (result && result.url) {
                    this._execCommand('createLink', result.url);
                }
            } else {
                this._execCommand(command, arg);
            }
        });

        // Update toolbar state on selection change
        document.addEventListener('selectionchange', () => this._updateToolbarState());
        this._editor.addEventListener('keyup', () => this._updateToolbarState());
        this._editor.addEventListener('mouseup', () => this._updateToolbarState());

        // Handle Paste (strip complex formatting)
        this._editor.addEventListener('paste', this._handlePaste.bind(this));
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

    _execCommand(command, arg = null) {
        this._editor.focus();
        this._restoreSelection();
        
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
        
        this._updateToolbarState();
        this._emitChange();
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
        } else {
            // Fallback for plain text
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        }
    }

    _emitChange() {
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
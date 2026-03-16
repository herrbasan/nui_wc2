import { nui } from '../../nui.js';
import { highlight } from './nui-syntax-highlight.js';

class NuiCodeEditor extends HTMLElement {
    constructor() {
        super();
        this._value = '';
    }

    connectedCallback() {
        if (this.hasAttribute('data-initialized')) return;
        this.setAttribute('data-initialized', 'true');

        const initialText = this.textContent.trim();
        this.innerHTML = '';

        this._lang = this.getAttribute('data-lang') || 'js';
        this._showLines = this.getAttribute('data-line-numbers') !== 'false';

        // Container
        this._container = document.createElement('div');
        this._container.className = 'nui-code-editor-container';

        // Line Numbers
        this._lines = document.createElement('div');
        this._lines.className = 'nui-code-editor-lines';
        this._lines.setAttribute('aria-hidden', 'true');
        if (!this._showLines) this._lines.style.display = 'none';

        // Textarea (Input)
        this._textarea = document.createElement('textarea');
        this._textarea.className = 'nui-code-editor-input';
        this._textarea.value = initialText;
        this._textarea.setAttribute('spellcheck', 'false');
        this._textarea.setAttribute('autocorrect', 'off');
        this._textarea.setAttribute('autocapitalize', 'off');
        this._textarea.setAttribute('translate', 'no');
        this._textarea.setAttribute('aria-label', this.getAttribute('aria-label') || 'Code Editor');

        // Syntax Highlight Display
        this._display = document.createElement('pre');
        this._display.className = 'nui-code-editor-display';
        this._display.setAttribute('aria-hidden', 'true');
        
        this._code = document.createElement('code');
        this._display.appendChild(this._code);

        this._container.appendChild(this._lines);
        this._container.appendChild(this._display);
        this._container.appendChild(this._textarea);
        this.appendChild(this._container);

        // Binding events
        this._textarea.addEventListener('input', () => this.updateDisplay());
        this._textarea.addEventListener('scroll', () => this.syncScroll());
        this._textarea.addEventListener('keydown', (e) => this.handleKeydown(e));

        this.updateDisplay();
    }

    get value() {
        return this._textarea ? this._textarea.value : this.textContent;
    }

    set value(val) {
        if (this._textarea) {
            this._textarea.value = val;
            this.updateDisplay();
        } else {
            this.textContent = val;
        }
    }

    updateDisplay() {
        const val = this._textarea.value;
        let highlighted = highlight(val, this._lang, true);
        
        if (val.endsWith('\n')) {
            highlighted += ' ';
        }
        
        this._code.innerHTML = highlighted;

        if (this._showLines) {
            const lineCount = val.split('\n').length;
            if (this._lineCount !== lineCount) {
                // optimized string building for lines
                let linesHtml = '';
                for(let i = 1; i <= lineCount; i++) {
                    linesHtml += `<div>${i}</div>`;
                }
                this._lines.innerHTML = linesHtml;
                this._lineCount = lineCount;
            }
        }

        this.dispatchEvent(new CustomEvent('nui-change', {
            bubbles: true,
            detail: { value: val, lang: this._lang }
        }));
    }

    syncScroll() {
        requestAnimationFrame(() => {
            this._display.scrollTop = this._textarea.scrollTop;
            this._display.scrollLeft = this._textarea.scrollLeft;
            this._lines.scrollTop = this._textarea.scrollTop;
        });
    }

    handleKeydown(e) {
        const ta = this._textarea;
        
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const indent = '    '; // Default to 4 spaces
            
            ta.value = ta.value.substring(0, start) + indent + ta.value.substring(end);
            ta.selectionStart = ta.selectionEnd = start + indent.length;
            this.updateDisplay();
        }
        else if (e.key === 'Enter') {
            const start = ta.selectionStart;
            const val = ta.value;
            const lineStart = val.lastIndexOf('\n', start - 1) + 1;
            const line = val.substring(lineStart, start);
            const match = line.match(/^(\s*)/);
            const indent = match ? match[1] : '';

            if (indent) {
                e.preventDefault();
                ta.value = val.substring(0, start) + '\n' + indent + val.substring(ta.selectionEnd);
                ta.selectionStart = ta.selectionEnd = start + 1 + indent.length;
                this.updateDisplay();
            }
        }
        else if (['(', '[', '{', '"', "'", '`'].includes(e.key)) {
            const map = {
                '(': ')',
                '[': ']',
                '{': '}',
                '"': '"',
                "'": "'",
                '`': '`'
            };
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            
            // Prevent auto-wrap if typing normally next to a word
            const nextChar = ta.value.charAt(start);
            if (ta.selectionStart === ta.selectionEnd && nextChar && nextChar.match(/[\w]/)) {
                return;
            }

            e.preventDefault();
            const wrapOpen = e.key;
            const wrapClose = map[e.key];
            
            if (start !== end) {
                const selected = ta.value.substring(start, end);
                ta.value = ta.value.substring(0, start) + wrapOpen + selected + wrapClose + ta.value.substring(end);
                ta.selectionStart = start + 1;
                ta.selectionEnd = end + 1;
            } else {
                ta.value = ta.value.substring(0, start) + wrapOpen + wrapClose + ta.value.substring(end);
                ta.selectionStart = ta.selectionEnd = start + 1;
            }
            this.updateDisplay();
        }
    }
}

if (!customElements.get('nui-code-editor')) {
    customElements.define('nui-code-editor', NuiCodeEditor);
}

export { NuiCodeEditor };
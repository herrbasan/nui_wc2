import { nui } from '../../nui.js';
import { highlight } from './nui-syntax-highlight.js';

class NuiCodeEditor extends HTMLElement {
    constructor() {
        super();
        this._value = '';
        this._lineHeight = 0;
        this._renderStart = -1;
        this._renderEnd = -1;
        this._lastScrollTop = -1;
        this._lastScrollLeft = -1;
        this._lineCount = -1;
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

        // Line Numbers Virtualization Array
        this._lines = document.createElement('div');
        this._lines.className = 'nui-code-editor-lines';
        this._lines.setAttribute('aria-hidden', 'true');
        
        this._linesSpacer = document.createElement('div');
        this._linesSpacer.className = 'nui-code-editor-spacer';
        
        this._linesLayer = document.createElement('div');
        this._linesLayer.className = 'nui-code-editor-layer';
        
        this._linesSpacer.appendChild(this._linesLayer);
        this._lines.appendChild(this._linesSpacer);

        if (!this._showLines) this._lines.style.display = 'none';

        // Syntax Highlight Display Virtualization Array
        this._display = document.createElement('pre');
        this._display.className = 'nui-code-editor-display';
        this._display.setAttribute('aria-hidden', 'true');

        this._codeSpacer = document.createElement('div');
        this._codeSpacer.className = 'nui-code-editor-spacer';
        
        this._codeLayer = document.createElement('code');
        this._codeLayer.className = 'nui-code-editor-layer';
        
        this._codeSpacer.appendChild(this._codeLayer);
        this._display.appendChild(this._codeSpacer);

        // Textarea (Input)
        this._textarea = document.createElement('textarea');
        this._textarea.className = 'nui-code-editor-input';
        this._textarea.value = initialText;
        this._textarea.setAttribute('spellcheck', 'false');
        this._textarea.setAttribute('autocorrect', 'off');
        this._textarea.setAttribute('autocapitalize', 'off');
        this._textarea.setAttribute('translate', 'no');
        this._textarea.setAttribute('aria-label', this.getAttribute('aria-label') || 'Code Editor');

        this._container.appendChild(this._lines);
        this._container.appendChild(this._display);
        this._container.appendChild(this._textarea);
        this.appendChild(this._container);

        // Dimensions Observer to handle window resizing properly
        const ro = new ResizeObserver(() => this.measureDimensions(true));
        ro.observe(this._container);

        // Binding events
        this._textarea.addEventListener('input', () => {
            this.render(true);
            this.dispatchEvent(new CustomEvent('nui-change', {
                bubbles: true,
                detail: { value: this._textarea.value, lang: this._lang }
            }));
        });
        
        this._textarea.addEventListener('scroll', () => {
            requestAnimationFrame(() => this.syncScroll());
        });
        
        this._textarea.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Wait a frame to ensure CSS styles are attached before measuring
        requestAnimationFrame(() => {
            this.measureDimensions();
            this.render(true);
        });
    }

    measureDimensions(forceRender = false) {
        const style = window.getComputedStyle(this._textarea);
        this._paddingTop = parseFloat(style.paddingTop) || 0;
        
        // Use a dummy element to measure the exact font-specific pixel line-height
        const dummy = document.createElement('div');
        dummy.style.opacity = '0';
        dummy.style.position = 'absolute';
        dummy.style.fontFamily = style.fontFamily;
        dummy.style.fontSize = style.fontSize;
        dummy.style.lineHeight = style.lineHeight;
        dummy.style.letterSpacing = style.letterSpacing;
        dummy.style.whiteSpace = 'pre';
        dummy.style.padding = '0';
        dummy.style.margin = '0';
        dummy.textContent = 'X';
        
        this.appendChild(dummy);
        this._lineHeight = dummy.getBoundingClientRect().height || 21; // fallback ~1.5 * 14px
        this.removeChild(dummy);

        if (forceRender) this.render(true);
    }

    syncScroll() {
        const st = this._textarea.scrollTop;
        const sl = this._textarea.scrollLeft;

        let needsRender = false;
        if (this._lineHeight > 0) {
            const startLine = Math.max(0, Math.floor((st - this._paddingTop) / this._lineHeight));
            const endLine = Math.ceil((st + this._textarea.clientHeight - this._paddingTop) / this._lineHeight);
            
            // If the user scrolls outside our overscan boundary, trigger a redraw slice
            if (startLine < this._renderStart || endLine > this._renderEnd) {
                needsRender = true;
            }
        }

        if (needsRender) {
            this.render();
        }

        // Always smoothly sync the scrollbar visual tracking layers regardless of render state
        if (this._lastScrollTop !== st) {
            this._display.scrollTop = st;
            if (this._showLines) this._lines.scrollTop = st;
            this._lastScrollTop = st;
        }
        
        if (this._lastScrollLeft !== sl) {
            this._display.scrollLeft = sl;
            this._lastScrollLeft = sl;
        }
    }

    render(force = false) {
        if (!this._lineHeight) return;

        const val = this._textarea.value;
        const lines = val.split('\n');
        const totalLines = lines.length;

        const st = this._textarea.scrollTop;
        const ch = this._textarea.clientHeight;
        
        const startLine = Math.max(0, Math.floor(Math.max(0, st - this._paddingTop) / this._lineHeight));
        const endLine = Math.ceil(Math.max(0, st + ch - this._paddingTop) / this._lineHeight);

        // Render buffer overscans viewport by 15 lines visually off-screen to avoid scroll-stutter
        const OVERSCAN = 15;
        const renderStart = Math.max(0, startLine - OVERSCAN);
        const renderEnd = Math.min(totalLines, endLine + OVERSCAN);

        const needsRender = force || 
                            totalLines !== this._lineCount || 
                            renderStart < this._renderStart || 
                            renderEnd > this._renderEnd;

        // Ensure vertical scrollbars match exact sizes without needing identical DOM depths
        if (totalLines !== this._lineCount) {
            const totalTextHeight = totalLines * this._lineHeight;
            this._codeSpacer.style.minHeight = `${totalTextHeight}px`;
            if (this._showLines) {
                this._linesSpacer.style.minHeight = `${totalTextHeight}px`;
            }
            this._lineCount = totalLines;
        }

        if (needsRender) {
            const slice = lines.slice(renderStart, renderEnd);
            let textSlice = slice.join('\n');
            
            // Textarea trailing newlines need a hidden space boundary match occasionally
            if (textSlice.endsWith('\n')) textSlice += ' ';

            // Highlight ONLY the 50 visible lines sliced directly from viewport frame
            let highlighted = highlight(textSlice, this._lang, true);
            
            const topOffset = renderStart * this._lineHeight;
            
            this._codeLayer.innerHTML = highlighted;
            this._codeLayer.style.top = `${topOffset}px`;

            this._renderStart = renderStart;
            this._renderEnd = renderEnd;

            if (this._showLines) {
                let linesHtml = '';
                for (let i = renderStart + 1; i <= renderEnd; i++) {
                    linesHtml += `<div>${i}</div>`;
                }
                this._linesLayer.innerHTML = linesHtml;
                this._linesLayer.style.top = `${topOffset}px`;
            }
        }
    }

    get value() {
        return this._textarea ? this._textarea.value : this.textContent;
    }

    set value(val) {
        if (this._textarea) {
            this._textarea.value = val;
            this.render(true);
        } else {
            this.textContent = val;
        }
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
            this.render(true);
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
                this.render(true);
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
            this.render(true);
        }
    }
}

if (!customElements.get('nui-code-editor')) {
    customElements.define('nui-code-editor', NuiCodeEditor);
}

export { NuiCodeEditor };
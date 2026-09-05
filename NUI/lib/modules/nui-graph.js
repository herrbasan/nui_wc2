/**
 * nui-graph.js - High-performance canvas sparkline & telemetry graph addon
 * 
 * Performance & Low-Power Philosophy:
 * - Direct 2D Canvas blits, bypasses DOM thrashing.
 * - HiDPI Retina subpixel scaling (sized to clientWidth * pixelRatio * 2 and scaled down via CSS transform).
 * - Fast path for live telemetry: .draw(ringBuffer) and .push(value).
 * - Low-power optimization: only paints on change, respects document visibility, zero background rAF loops.
 * - Adaptive Hybrid Scaling: 1-2-5 ladder quantization + floor-max prevents noise magnification.
 * - Optional Time Scrubbing: inspect historical spikes with zero overhead when idle.
 * - Single-path drawing: one stroke, optional bottom-fill.
 */

'use strict';

// Standard 1-2-5 "nice numbers" quantization sequence
const NICE_STEPS = [1, 2, 2.5, 5];

function computeNiceCeiling(val, floorMax = 0) {
    const raw = Math.max(val, floorMax);
    if (raw <= 0) return floorMax || 1;
    
    const exponent = Math.floor(Math.log10(raw));
    const fraction = raw / Math.pow(10, exponent);
    
    let niceFraction = 10;
    for (let i = 0; i < NICE_STEPS.length; i++) {
        if (fraction <= NICE_STEPS[i]) {
            niceFraction = NICE_STEPS[i];
            break;
        }
    }
    return niceFraction * Math.pow(10, exponent);
}

function formatTimeAgo(ms) {
    const sec = Math.round(ms / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    const remSec = sec % 60;
    if (min < 60) return remSec > 0 ? `${min}m ${remSec}s ago` : `${min}m ago`;
    const hrs = Math.floor(min / 60);
    const remMin = min % 60;
    return `${hrs}h ${remMin}m ago`;
}

class NuiGraph extends HTMLElement {
    static get observedAttributes() {
        return [
            'stroke', 'fill', 'min', 'max', 'line-width', 'data', 'reverse',
            'capacity', 'scale', 'floor-max', 'interval', 'interactive', 'unit',
            'decimals', 'time-format', 'label', 'label-position'
        ];
    }

    constructor() {
        super();
        this._wrap = null;
        this._canvas = null;
        this._ctx = null;
        this._tooltip = null;
        this._labelEl = null;
        this._resizeObserver = null;

        // Internal data ring buffer
        this._capacity = 240;
        this._data = [];
        this._timestamps = null; // optional aligned timestamp ring

        // Interactive hover state
        this._hoverIndex = -1;
        this._hoverX = -1;

        // Custom programmatic tooltip formatter hook: fn({ value, unit, timeStr, index, timestamp, samplesFromNow })
        this.formatTooltip = null;

        // Adaptive scale state
        this._currentCeiling = 0;

        // Performance & state flags
        this._needsRedraw = false;
        this._width = 0;
        this._height = 0;
        this._dpr = window.devicePixelRatio || 1;
        this._connected = false;

        // Bind event listeners
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseLeave = this._onMouseLeave.bind(this);
    }

    connectedCallback() {
        this._connected = true;
        this._initDOM();
        this._readAttributes();
        this._setupResizeObserver();
        this._setupInteractivity();
        this._scheduleDraw();
    }

    disconnectedCallback() {
        this._connected = false;
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        this._teardownInteractivity();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (!this._connected || oldValue === newValue) return;
        this._readAttributes();
        this._setupInteractivity();
        this._scheduleDraw();
    }

    _initDOM() {
        if (this._wrap) return;

        // Structure: nui-graph > .graph-canvas-wrap > canvas + .graph-tooltip (light DOM)
        let wrap = this.querySelector('.graph-canvas-wrap');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'graph-canvas-wrap';
            this.appendChild(wrap);
        }
        this._wrap = wrap;

        let canvas = wrap.querySelector('canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            wrap.appendChild(canvas);
        }
        this._canvas = canvas;
        this._ctx = canvas.getContext('2d', { alpha: true });
    }

    _readAttributes() {
        this._stroke = this.getAttribute('stroke') || 'rgb(76, 132, 229)';
        this._fill = this.getAttribute('fill') || null;
        this._minAttr = this.hasAttribute('min') ? parseFloat(this.getAttribute('min')) : null;
        this._maxAttr = this.hasAttribute('max') ? parseFloat(this.getAttribute('max')) : null;
        this._lineWidth = this.hasAttribute('line-width') ? parseFloat(this.getAttribute('line-width')) : 2;
        this._reverse = this.hasAttribute('reverse');
        this._scaleMode = this.getAttribute('scale') || 'fixed'; // 'fixed' | 'adaptive'
        this._floorMax = this.hasAttribute('floor-max') ? parseFloat(this.getAttribute('floor-max')) : 0;
        this._interval = this.hasAttribute('interval') ? parseInt(this.getAttribute('interval'), 10) : 1000;
        this._isInteractive = this.hasAttribute('interactive');
        this._unit = this.getAttribute('unit') || '';
        this._decimals = this.hasAttribute('decimals') ? parseInt(this.getAttribute('decimals'), 10) : null;
        this._timeFormat = this.getAttribute('time-format') || 'relative'; // 'relative' | 'clock' | 'both' | 'none'
        this._label = this.getAttribute('label') || null;

        this._syncLabel();

        if (this.hasAttribute('capacity')) {
            const cap = parseInt(this.getAttribute('capacity'), 10);
            if (!isNaN(cap) && cap > 0) this._capacity = cap;
        }

        if (this.hasAttribute('data')) {
            try {
                const raw = JSON.parse(this.getAttribute('data'));
                if (Array.isArray(raw)) {
                    this._data = raw.slice(-this._capacity);
                }
            } catch (e) {
                // Ignore parse errors from partially typed attributes
            }
        }
    }

    _syncLabel() {
        if (this._label) {
            if (!this._labelEl) {
                this._labelEl = document.createElement('div');
                this._labelEl.className = 'graph-label';
                this.appendChild(this._labelEl);
            }
            this._labelEl.textContent = this._label;
        } else if (this._labelEl) {
            this._labelEl.remove();
            this._labelEl = null;
        }
    }

    get label() {
        return this._label;
    }

    set label(val) {
        if (val) {
            this.setAttribute('label', val);
        } else {
            this.removeAttribute('label');
        }
    }

    get labelPosition() {
        return this.getAttribute('label-position') || 'top-left';
    }

    set labelPosition(val) {
        if (val) {
            this.setAttribute('label-position', val);
        } else {
            this.removeAttribute('label-position');
        }
    }

    _setupResizeObserver() {
        if (typeof ResizeObserver === 'undefined') return;
        this._resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const cr = entry.contentRect;
                if (cr.width > 0 && cr.height > 0) {
                    if (this._width !== cr.width || this._height !== cr.height) {
                        this._width = cr.width;
                        this._height = cr.height;
                        this._syncCanvasResolution();
                        this._scheduleDraw();
                    }
                }
            }
        });
        this._resizeObserver.observe(this);
    }

    _setupInteractivity() {
        if (!this._wrap) return;

        if (this._isInteractive) {
            if (!this._tooltip) {
                this._tooltip = document.createElement('div');
                this._tooltip.className = 'graph-tooltip';
                this.appendChild(this._tooltip);
            }
            this._wrap.style.pointerEvents = 'auto';
            this._wrap.style.cursor = 'crosshair';
            this._wrap.removeEventListener('mousemove', this._onMouseMove);
            this._wrap.removeEventListener('mouseleave', this._onMouseLeave);
            this._wrap.addEventListener('mousemove', this._onMouseMove, { passive: true });
            this._wrap.addEventListener('mouseleave', this._onMouseLeave, { passive: true });
        } else {
            this._teardownInteractivity();
        }
    }

    _teardownInteractivity() {
        if (this._wrap) {
            this._wrap.style.pointerEvents = 'none';
            this._wrap.style.cursor = 'default';
            this._wrap.removeEventListener('mousemove', this._onMouseMove);
            this._wrap.removeEventListener('mouseleave', this._onMouseLeave);
        }
        if (this._tooltip) {
            this._tooltip.remove();
            this._tooltip = null;
        }
        this._hoverIndex = -1;
        this._hoverX = -1;
    }

    _onMouseMove(e) {
        if (!this._isInteractive || !this._data || this._data.length < 2) return;
        const rect = this._wrap.getBoundingClientRect();
        this._hoverCursorX = e.clientX - rect.left;
        const step = rect.width / (this._data.length - 1);
        let index = Math.round(this._hoverCursorX / step);
        index = Math.max(0, Math.min(this._data.length - 1, index));

        this._hoverIndex = index;
        this._hoverX = index * step;
        this._updateTooltip(rect);
        this._scheduleDraw();
    }

    _onMouseLeave() {
        if (!this._isInteractive) return;
        this._hoverCursorX = -1;
        this._hoverIndex = -1;
        this._hoverX = -1;
        if (this._tooltip) {
            this._tooltip.classList.remove('visible');
        }
        this._scheduleDraw();
    }

    _updateTooltip(rect) {
        if (!this._tooltip || this._hoverIndex === -1) return;
        const val = this._data[this._hoverIndex];
        
        // Format value with decimals
        let displayVal;
        if (typeof val === 'number') {
            if (this._decimals !== null) {
                displayVal = val.toFixed(this._decimals);
            } else {
                displayVal = Number.isInteger(val) ? val : val.toFixed(1);
            }
        } else {
            displayVal = val;
        }
        
        // Calculate historical time offset & clock time
        const samplesFromNow = (this._data.length - 1) - this._hoverIndex;
        let ts = this._timestamps && this._timestamps[this._hoverIndex] ? this._timestamps[this._hoverIndex] : null;
        let diffMs = 0;
        if (samplesFromNow > 0) {
            if (ts) {
                diffMs = Date.now() - ts;
            } else {
                diffMs = samplesFromNow * this._interval;
                ts = Date.now() - diffMs;
            }
        } else {
            ts = Date.now();
        }

        let relTimeStr = samplesFromNow === 0 ? 'Now' : `-${formatTimeAgo(diffMs)}`;
        let clockTimeStr = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        let timeStr = '';
        if (this._timeFormat === 'relative') {
            timeStr = relTimeStr;
        } else if (this._timeFormat === 'clock') {
            timeStr = clockTimeStr;
        } else if (this._timeFormat === 'both') {
            timeStr = samplesFromNow === 0 ? `Now (${clockTimeStr})` : `${relTimeStr} (${clockTimeStr})`;
        } else if (this._timeFormat === 'none') {
            timeStr = '';
        }

        // Custom programmatic formatter hook if provided
        if (typeof this.formatTooltip === 'function') {
            const customContent = this.formatTooltip({
                value: val,
                displayValue: displayVal,
                unit: this._unit,
                timeStr,
                relativeTime: relTimeStr,
                clockTime: clockTimeStr,
                index: this._hoverIndex,
                timestamp: ts,
                samplesFromNow
            });
            if (typeof customContent === 'string') {
                this._tooltip.innerHTML = customContent;
            } else if (customContent instanceof Node) {
                this._tooltip.innerHTML = '';
                this._tooltip.appendChild(customContent);
            }
        } else {
            const timeSpan = timeStr ? `<span class="time">${timeStr}</span>` : '';
            this._tooltip.innerHTML = `<span class="val">${displayVal}${this._unit ? ' ' + this._unit : ''}</span>${timeSpan}`;
        }
        
        // Measure tooltip for boundary positioning
        const tipWidth = this._tooltip.offsetWidth || 100;
        const tipHeight = this._tooltip.offsetHeight || 22;

        // Position horizontally centered over hover point, clamped inside container
        const halfWidth = tipWidth / 2;
        let leftPos = this._hoverX - halfWidth;
        if (leftPos < 2) leftPos = 2;
        if (leftPos + tipWidth > rect.width - 2) leftPos = rect.width - tipWidth - 2;

        // Position vertically: prefer above hover pip; if too close to top, flip below
        const pipY = this._hoverPipY !== undefined ? this._hoverPipY : 20;
        let topPos = pipY - tipHeight - 6;
        if (topPos < -tipHeight) {
            // Flip below pip
            topPos = pipY + 8;
        }

        this._tooltip.style.left = `${Math.round(leftPos)}px`;
        this._tooltip.style.top = `${Math.round(topPos)}px`;
        this._tooltip.classList.add('visible');

        // Dispatch custom event for linked dashboards
        this.dispatchEvent(new CustomEvent('nui-graph-scrub', {
            bubbles: true,
            composed: true,
            detail: {
                index: this._hoverIndex,
                value: val,
                timeStr,
                samplesFromNow
            }
        }));
    }

    _syncCanvasResolution() {
        if (!this._wrap || !this._canvas) return;
        const width = this._width || this._wrap.offsetWidth || 100;
        const height = this._height || this._wrap.offsetHeight || 30;
        const dpr = window.devicePixelRatio || 1;
        this._dpr = dpr;

        // HiDPI Oversample Trick: canvas internal resolution is 2x DPR
        // Scaled down via CSS transform matrix for razor-sharp paths without blurry anti-aliasing
        const pixelScale = dpr * 2;
        const targetWidth = Math.round(width * pixelScale);
        const targetHeight = Math.round(height * pixelScale);

        if (this._canvas.width !== targetWidth || this._canvas.height !== targetHeight) {
            this._canvas.width = targetWidth;
            this._canvas.height = targetHeight;
            const cssScale = width / targetWidth;
            this._canvas.style.transform = `scale(${cssScale}, ${cssScale})`;
        }
    }

    /**
     * Fast-path streaming: push a single value into the internal ring buffer and paint.
     * @param {number} value
     * @param {number} [timestamp] Optional Unix timestamp in ms
     */
    push(value, timestamp) {
        if (typeof value !== 'number' || isNaN(value)) value = 0;
        this._data.push(value);
        if (timestamp) {
            if (!this._timestamps) this._timestamps = [];
            this._timestamps.push(timestamp);
            if (this._timestamps.length > this._capacity) {
                this._timestamps.shift();
            }
        }
        if (this._data.length > this._capacity) {
            this._data.shift();
        }
        this._scheduleDraw();
    }

    /**
     * Fast-path batch update: directly set buffer data without DOM serialization.
     * @param {Array<number>} array
     * @param {Array<number>} [timestamps] Optional aligned timestamp array
     */
    draw(array, timestamps) {
        if (Array.isArray(array)) {
            this._data = array;
        }
        if (Array.isArray(timestamps)) {
            this._timestamps = timestamps;
        }
        this._scheduleDraw();
    }

    /**
     * Low-power paint scheduler: batches multiple rapid updates into the next animation frame.
     * Skips drawing if tab/window is hidden.
     */
    _scheduleDraw() {
        if (this._needsRedraw) return;
        if (document.hidden) {
            this._needsRedraw = true;
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && this._needsRedraw) {
                    this._needsRedraw = false;
                    this._render();
                }
            }, { once: true });
            return;
        }

        this._needsRedraw = true;
        requestAnimationFrame(() => {
            this._needsRedraw = false;
            this._render();
        });
    }

    _render() {
        if (!this._ctx || !this._canvas) return;
        const canvas = this._canvas;
        const ctx = this._ctx;
        const data = this._data;

        if (canvas.width === 0 || canvas.height === 0) {
            this._syncCanvasResolution();
        }

        const width = canvas.width;
        const height = canvas.height;
        if (width === 0 || height === 0) return;

        ctx.clearRect(0, 0, width, height);
        if (!data || data.length < 2) return;

        // In a live ticking stream, re-anchor hover if mouse is stationary
        if (this._isInteractive && this._hoverCursorX >= 0 && this._wrap) {
            const wrapWidth = this._wrap.offsetWidth || (width / (this._dpr * 2));
            const step = wrapWidth / (data.length - 1);
            let idx = Math.round(this._hoverCursorX / step);
            this._hoverIndex = Math.max(0, Math.min(data.length - 1, idx));
            this._hoverX = this._hoverIndex * step;
            this._updateTooltip(this._wrap.getBoundingClientRect());
        }

        // Range calculation
        let min = this._minAttr !== null ? this._minAttr : 0;
        let max = this._maxAttr !== null ? this._maxAttr : 0;

        if (this._scaleMode === 'adaptive' || this._maxAttr === null || max === 0) {
            let peak = 0;
            for (let i = 0; i < data.length; i++) {
                const v = data[i] || 0;
                if (v > peak) peak = v;
                if (this._minAttr === null && v < min) min = v;
            }

            if (this._scaleMode === 'adaptive') {
                // Adaptive hybrid scale: 10% headroom + floorMax + 1-2-5 quantization ladder
                const withHeadroom = peak * 1.1;
                max = computeNiceCeiling(withHeadroom, this._floorMax);
            } else {
                max = peak;
            }
            if (max <= min) max = min + 1;
        }

        this._currentCeiling = max;

        const range = max - min || 1;
        const stepX = width / (data.length - 1);
        const strokeWidth = this._lineWidth * (this._dpr * 2);

        // Store logical pip Y for interactive tooltip
        if (this._hoverIndex >= 0 && this._hoverIndex < data.length) {
            const hoverVal = data[this._hoverIndex] !== undefined ? data[this._hoverIndex] : min;
            const normH = Math.max(0, Math.min(1, (hoverVal - min) / range));
            const logicalH = height / (this._dpr * 2);
            this._hoverPipY = this._reverse ? normH * logicalH : (1 - normH) * logicalH;
        } else {
            this._hoverPipY = undefined;
        }

        ctx.save();
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = this._stroke;
        ctx.lineJoin = 'miter';
        ctx.lineCap = 'round';

        // Draw waveform path
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
            const rawVal = data[i] !== undefined && data[i] !== null ? data[i] : min;
            const norm = Math.max(0, Math.min(1, (rawVal - min) / range));
            
            const y = this._reverse 
                ? norm * (height - strokeWidth) + (strokeWidth / 2)
                : (1 - norm) * (height - strokeWidth) + (strokeWidth / 2);
            const x = i * stepX;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Optional bottom-anchored fill
        if (this._fill) {
            ctx.fillStyle = this._fill;
            const bottomY = this._reverse ? strokeWidth / 2 : height;
            ctx.lineTo(width, bottomY);
            ctx.lineTo(0, bottomY);
            ctx.closePath();
            ctx.fill();
        }

        // Draw interactive crosshair if scrubbing
        if (this._isInteractive && this._hoverIndex >= 0 && this._hoverIndex < data.length) {
            const rawVal = data[this._hoverIndex] || min;
            const norm = Math.max(0, Math.min(1, (rawVal - min) / range));
            const ptY = this._reverse 
                ? norm * (height - strokeWidth) + (strokeWidth / 2)
                : (1 - norm) * (height - strokeWidth) + (strokeWidth / 2);
            const ptX = this._hoverIndex * stepX;

            // Subtle vertical guideline
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1 * this._dpr;
            ctx.setLineDash([4 * this._dpr, 4 * this._dpr]);
            ctx.moveTo(ptX, 0);
            ctx.lineTo(ptX, height);
            ctx.stroke();
            ctx.setLineDash([]);

            // Circular target pip on the waveform curve
            ctx.beginPath();
            ctx.arc(ptX, ptY, 4 * this._dpr, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = this._stroke;
            ctx.lineWidth = 2 * this._dpr;
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Get current computed scale ceiling (useful for UI indicators or legends)
     */
    get ceiling() {
        return this._currentCeiling;
    }

    /**
     * Clear graph data and canvas.
     */
    clear() {
        this._data = [];
        this._timestamps = null;
        if (this._ctx && this._canvas) {
            this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        }
    }
}

if (!customElements.get('nui-graph')) {
    customElements.define('nui-graph', NuiGraph);
}

export { NuiGraph };

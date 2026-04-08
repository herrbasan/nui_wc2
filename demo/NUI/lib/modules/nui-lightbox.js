// nui-lightbox.js - Dedicated lightbox for image/media galleries.
// Provides both declarative (<nui-lightbox>) and programmatic (nui.components.lightbox.show) patterns.
// Supports touch swiping, keyboard navigation, and built-in accessibility.

import { nui } from '../../nui.js';

class NuiLightbox extends HTMLElement {
    constructor() {
        super();
        this.items = [];
        this.currentIndex = 0;
        this.touchStartX = 0;
        this.currentX = 0;
        this.dragStartTime = 0;
        this.isDragging = false;
        this.isAnimating = false;
    }

    connectedCallback() {
        // Build the internal DOM if not present
        if (!this.querySelector('dialog')) {
            this.insertAdjacentHTML('beforeend', `
                <dialog class="nui-lightbox-dialog">
                    <div class="nui-lightbox-toolbar">
                        <div class="nui-lightbox-counter" aria-live="polite"></div>
                        <button class="nui-lightbox-close" aria-label="Close dialog" data-action="lightbox:close">
                            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    <div class="nui-lightbox-body">
                        <button class="nui-lightbox-nav prev" aria-label="Previous image" data-action="lightbox:prev">
                            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M15 18l-6-6 6-6"></path></svg>
                        </button>
                        <div class="nui-lightbox-view">
                            <div class="nui-lightbox-track">
                                <div class="nui-lightbox-slide" data-pos="-1"></div>
                                <div class="nui-lightbox-slide" data-pos="0"></div>
                                <div class="nui-lightbox-slide" data-pos="1"></div>
                            </div>
                        </div>
                        <button class="nui-lightbox-nav next" aria-label="Next image" data-action="lightbox:next">
                            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M9 18l6-6-6-6"></path></svg>
                        </button>
                    </div>
                    <div class="nui-lightbox-caption" aria-live="polite"></div>
                </dialog>
            `);
        }

        this.dialog = this.querySelector('dialog');
        this.view = this.querySelector('.nui-lightbox-view');
        this.counter = this.querySelector('.nui-lightbox-counter');
        this.caption = this.querySelector('.nui-lightbox-caption');

        this.setupEvents();
    }

    disconnectedCallback() {
        this.removeEvents();
    }

    setupEvents() {
        this.handleAction = (e) => {
            const action = e.target.closest('[data-action]');
            if (!action) return;
            const act = action.getAttribute('data-action');
            if (act === 'lightbox:close') this.close();
            else if (act === 'lightbox:prev') this.navigate(-1);
            else if (act === 'lightbox:next') this.navigate(1);
        };
        
        this.handleKeydown = (e) => {
            if (!this.dialog.open) return;
            if (e.key === 'ArrowLeft') { e.preventDefault(); this.navigate(-1); }
            if (e.key === 'ArrowRight') { e.preventDefault(); this.navigate(1); }
            if (e.key === 'Escape') { e.preventDefault(); this.close(); }
        };

        this.handlePointerDown = (e) => {
            if (this.items.length <= 1 || this.isAnimating) return;
            if (!e.isPrimary) return;
            this.isDragging = true;
            this.touchStartX = e.clientX;
            this.currentX = e.clientX;
            this.dragStartTime = Date.now();
            
            // Stop any ongoing animations
            if (this.track.getAnimations) {
                this.track.getAnimations().forEach(a => a.cancel());
            }
            this.track.style.transform = `translate3d(0, 0, 0)`;
            
            this.view.setPointerCapture(e.pointerId);
        };

        this.handlePointerMove = (e) => {
            if (!this.isDragging || !e.isPrimary) return;
            this.currentX = e.clientX;
            const delta = this.currentX - this.touchStartX;
            
            let offset = delta;
            const loop = this.hasAttribute('loop');
            if (!loop) {
                if ((this.currentIndex === 0 && delta > 0) || (this.currentIndex === this.items.length - 1 && delta < 0)) {
                    offset = delta * 0.3; // resistance
                }
            }
            this.track.style.transform = `translate3d(${offset}px, 0, 0)`;
        };

        this.handlePointerUp = (e) => {
            if (!this.isDragging || !e.isPrimary) return;
            this.isDragging = false;
            this.view.releasePointerCapture(e.pointerId);
            
            if (this.scheduledRAF) {
                cancelAnimationFrame(this.scheduledRAF);
                this.scheduledRAF = null;
            }
            
            const delta = this.currentX - this.touchStartX;
            const timeDelta = Date.now() - this.dragStartTime;
            
            // Calculate if it's a throw (high velocity) or past half width
            const viewWidth = this.view.offsetWidth || window.innerWidth;
            const velocity = Math.abs(delta) / Math.max(timeDelta, 1);
            const isThrow = velocity > 0.5 && Math.abs(delta) > 20;
            const isPastHalf = Math.abs(delta) > viewWidth / 2;
            
            const loop = this.hasAttribute('loop');
            let dir = 0;
            
            if (isThrow || isPastHalf) {
                if (delta > 0 && (loop || this.currentIndex > 0)) {
                    dir = -1; // swipe right, go prev
                } else if (delta < 0 && (loop || this.currentIndex < this.items.length - 1)) {
                    dir = 1; // swipe left, go next
                }
            }
            
            let currentOffset = delta;
            if (!loop) {
                if ((this.currentIndex === 0 && delta > 0) || (this.currentIndex === this.items.length - 1 && delta < 0)) {
                    currentOffset = delta * 0.3; // resistance
                }
            }
            
            if (dir !== 0) {
                this.navigate(dir, currentOffset);
            } else {
                // Snap back
                this.isAnimating = true;
                
                const animation = this.track.animate([
                    { transform: `translate3d(${currentOffset}px, 0, 0)` },
                    { transform: 'translate3d(0, 0, 0)' }
                ], {
                    duration: 250,
                    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                });
                
                // Keep it in place during animation
                this.track.style.transform = 'translate3d(0, 0, 0)';
                
                animation.onfinish = () => {
                    this.isAnimating = false;
                };
            }
        };

        this.addEventListener('click', this.handleAction);
        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) this.close(); // Backdrop click
        });
        document.addEventListener('keydown', this.handleKeydown);
        
        this.track = this.querySelector('.nui-lightbox-track');
        this.slides = Array.from(this.querySelectorAll('.nui-lightbox-slide'));
        
        this.view.addEventListener('pointerdown', this.handlePointerDown);
        this.view.addEventListener('pointermove', this.handlePointerMove);
        this.view.addEventListener('pointerup', this.handlePointerUp);
        this.view.addEventListener('pointercancel', this.handlePointerUp);
    }

    removeEvents() {
        this.removeEventListener('click', this.handleAction);
        document.removeEventListener('keydown', this.handleKeydown);
        if (this.view) {
            this.view.removeEventListener('pointerdown', this.handlePointerDown);
            this.view.removeEventListener('pointermove', this.handlePointerMove);
            this.view.removeEventListener('pointerup', this.handlePointerUp);
            this.view.removeEventListener('pointercancel', this.handlePointerUp);
        }
    }

    navigate(dir, startOffset = 0) {
        if (this.items.length <= 1 || this.isAnimating) return;
        this.isAnimating = true;
        
        const viewWidth = this.view.offsetWidth || window.innerWidth;
        const targetX = dir > 0 ? -viewWidth : viewWidth;

        if (this.track.getAnimations) {
            this.track.getAnimations().forEach(a => a.cancel());
        }

        const animation = this.track.animate([
            { transform: `translate3d(${startOffset}px, 0, 0)` },
            { transform: `translate3d(${targetX}px, 0, 0)` }
        ], {
            duration: 300,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });
        
        this.track.style.transform = `translate3d(0, 0, 0)`; // instantly reset for after finish

        animation.onfinish = () => {
            if (dir === 1 || dir === -1) {
                const sMinus1 = this.slides.find(s => s.getAttribute('data-pos') === '-1');
                const s0 = this.slides.find(s => s.getAttribute('data-pos') === '0');
                const s1 = this.slides.find(s => s.getAttribute('data-pos') === '1');
                
                if (dir === 1) { // swiped left, move rightwards track to center
                    if (sMinus1) sMinus1.setAttribute('data-pos', '1');
                    if (s0) s0.setAttribute('data-pos', '-1');
                    if (s1) s1.setAttribute('data-pos', '0');
                } else if (dir === -1) { // swiped right, move leftwards track to center
                    if (s1) s1.setAttribute('data-pos', '-1');
                    if (s0) s0.setAttribute('data-pos', '1');
                    if (sMinus1) sMinus1.setAttribute('data-pos', '0');
                }
            }

            this.currentIndex = (this.currentIndex + dir + this.items.length) % this.items.length;
            this.renderCurrent();
            this.isAnimating = false;
            
            // NUI a11y announcement
            if (nui && nui.util && nui.util.a11y) {
               nui.util.a11y.announce(`Image ${this.currentIndex + 1} of ${this.items.length}`);
            }
        };
    }

    renderCurrent() {
        if (!this.items.length) return;
        
        const loop = this.hasAttribute('loop');
        const len = this.items.length;
        const currItem = this.items[this.currentIndex];
        
        let prevIdx = this.currentIndex - 1;
        let nextIdx = this.currentIndex + 1;
        
        if (loop) {
            prevIdx = (prevIdx + len) % len;
            nextIdx = (nextIdx + len) % len;
        }
        
        const setSlide = (pos, idx) => {
            const slide = this.slides.find(s => s.getAttribute('data-pos') === pos);
            if (!slide) return;
            if (idx >= 0 && idx < len) {
                const item = this.items[idx];
                let img = slide.querySelector('img');
                if (!img) {
                    img = document.createElement('img');
                    img.draggable = false;
                    slide.appendChild(img);
                }
                if (img.getAttribute('src') !== item.src) {
                    img.setAttribute('src', item.src);
                }
                img.alt = item.alt || item.title || '';
            } else {
                slide.innerHTML = '';
            }
        };

        setSlide('-1', prevIdx);
        setSlide('0', this.currentIndex);
        setSlide('1', nextIdx);
        
        this.counter.textContent = `${this.currentIndex + 1} / ${this.items.length}`;
        this.caption.textContent = currItem.title || currItem.alt || '';

        // Update nav state
        const prevBtn = this.querySelector('.prev');
        const nextBtn = this.querySelector('.next');
        
        if (!loop && this.items.length > 1) {
            prevBtn.disabled = this.currentIndex === 0;
            nextBtn.disabled = this.currentIndex === this.items.length - 1;
        } else {
            prevBtn.disabled = false;
            nextBtn.disabled = false;
        }

        if (this.items.length <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        } else {
            prevBtn.style.display = '';
            nextBtn.style.display = '';
        }
    }

    open(items = [], index = 0) {
        if (items.length) {
            this.items = items;
        } else {
            // Declarative fallback: Look for nested elements with data-src or imgs
            this.items = Array.from(this.querySelectorAll('img[data-lightbox], [data-lightbox-src]')).map(el => ({
                src: el.getAttribute('data-lightbox-src') || el.src,
                alt: el.getAttribute('alt') || '',
                title: el.getAttribute('title') || el.getAttribute('data-caption') || ''
            }));
            
            // If they just passed index, update start point
            if (typeof items === 'number') index = items;
        }

        if (!this.items.length) return;
        this.currentIndex = index >= 0 && index < this.items.length ? index : 0;
        this.isAnimating = false;
        if (this.track) {
            if (this.track.getAnimations) {
                this.track.getAnimations().forEach(a => a.cancel());
            }
            this.track.style.transform = `translate3d(0, 0, 0)`;
        }
        this.renderCurrent();
        this.dialog.showModal();
        this.dispatchEvent(new CustomEvent('nui-lightbox-open', { bubbles: true }));
    }

    close() {
        if (!this.dialog.open || this.dialog.classList.contains('closing')) return;
        
        this.dialog.classList.add('closing');
        this.dialog.addEventListener('transitionend', () => {
            this.dialog.classList.remove('closing');
            this.dialog.close();
            this.dispatchEvent(new CustomEvent('nui-lightbox-close', { bubbles: true }));
        }, { once: true });
    }
}

customElements.define('nui-lightbox', NuiLightbox);

// Expose programmatic API to global NUI scope if applicable
if (nui) {
    nui.components = nui.components || {};
    nui.components.lightbox = {
        show(items, index = 0) {
            let lb = document.querySelector('nui-lightbox#nui-global-lightbox');
            if (!lb) {
                lb = document.createElement('nui-lightbox');
                lb.id = 'nui-global-lightbox';
                document.body.appendChild(lb);
            }
            lb.open(items, index);
            return lb;
        }
    };
}

export { NuiLightbox };

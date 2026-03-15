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
        this.touchEndX = 0;
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
                        <div class="nui-lightbox-view"></div>
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

        this.handleTouchStart = (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        };

        this.handleTouchEnd = (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        };

        this.addEventListener('click', this.handleAction);
        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) this.close(); // Backdrop click
        });
        document.addEventListener('keydown', this.handleKeydown);
        this.view.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        this.view.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    }

    removeEvents() {
        this.removeEventListener('click', this.handleAction);
        document.removeEventListener('keydown', this.handleKeydown);
        if (this.view) {
            this.view.removeEventListener('touchstart', this.handleTouchStart);
            this.view.removeEventListener('touchend', this.handleTouchEnd);
        }
    }

    handleSwipe() {
        const threshold = 50;
        if (this.touchEndX < this.touchStartX - threshold) this.navigate(1);
        else if (this.touchEndX > this.touchStartX + threshold) this.navigate(-1);
    }

    navigate(dir) {
        if (this.items.length <= 1) return;
        this.currentIndex = (this.currentIndex + dir + this.items.length) % this.items.length;
        this.renderCurrent();
        // NUI a11y announcement
        if (nui && nui.util && nui.util.a11y) {
           nui.util.a11y.announce(`Image ${this.currentIndex + 1} of ${this.items.length}`);
        }
    }

    renderCurrent() {
        if (!this.items.length) return;
        const item = this.items[this.currentIndex];
        
        this.view.innerHTML = `<img src="${item.src}" alt="${item.alt || item.title || ''}" />`;
        this.counter.textContent = `${this.currentIndex + 1} / ${this.items.length}`;
        this.caption.textContent = item.title || item.alt || '';

        // Update nav state
        const prev = this.querySelector('.prev');
        const next = this.querySelector('.next');
        const loop = this.hasAttribute('loop');
        
        if (!loop && this.items.length > 1) {
            prev.disabled = this.currentIndex === 0;
            next.disabled = this.currentIndex === this.items.length - 1;
        } else {
            prev.disabled = false;
            next.disabled = false;
        }

        if (this.items.length <= 1) {
            prev.style.display = 'none';
            next.style.display = 'none';
        } else {
            prev.style.display = '';
            next.style.display = '';
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
        this.renderCurrent();
        this.dialog.showModal();
        this.dispatchEvent(new CustomEvent('nui-lightbox-open', { bubbles: true }));
    }

    close() {
        this.dialog.close();
        this.dispatchEvent(new CustomEvent('nui-lightbox-close', { bubbles: true }));
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

import { nui } from '../../nui.js';

class NuiWizardStep extends HTMLElement {
	connectedCallback() {
		if (!this.hasAttribute('active')) {
			this.setAttribute('hidden', '');
		}
	}
}

class NuiWizard extends HTMLElement {
	connectedCallback() {
		if (this.hasAttribute('data-initialized')) return;
		this.setAttribute('data-initialized', 'true');
        
        this.mode = this.getAttribute('mode') || 'required';
        this.currentIndex = 0;
        
        this.steps = Array.from(this.querySelectorAll('nui-wizard-step'));
        if (this.steps.length === 0) return;
        
        const existingHeader = this.querySelector('header');
        if (existingHeader) {
            this.header = existingHeader;
        } else {
            this.header = document.createElement('header');
            this.insertBefore(this.header, this.firstChild);
        }
        
        this.header.classList.add('nui-wizard-header');
        
        this.buildProgressNav();
        
        this.main = document.createElement('main');
        this.main.className = 'nui-wizard-content';
        this.steps.forEach(step => this.main.appendChild(step));
        this.insertBefore(this.main, this.header.nextSibling);

        this.buildFooter();

        this.addEventListener('nui-click', this.handleClicks.bind(this));
        
        // Listen to native clicks for navigation items
        this.header.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (btn) {
                const action = btn.getAttribute('data-action');
                if (action && action.startsWith('wizard:goto:')) {
                    const idx = parseInt(action.split(':')[2], 10);
                    this.goTo(idx);
                }
            }
        });

        this.goTo(0);
	}

    buildProgressNav() {
        const nav = document.createElement('nav');
        nav.className = 'nui-wizard-nav';
        
        this.steps.forEach((step, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'nui-wizard-nav-step';
            
            const title = step.getAttribute('data-title') || `Step ${index + 1}`;
            btn.innerHTML = `<span class="nui-wizard-nav-number">${index + 1}</span><span class="nui-wizard-nav-title">${title}</span>`;
            
            if (this.mode === 'free') {
                btn.setAttribute('data-action', `wizard:goto:${index}`);
            } else {
                btn.disabled = true;
            }
            
            nav.appendChild(btn);
        });

        this.header.appendChild(nav);
        this.navButtons = Array.from(nav.querySelectorAll('.nui-wizard-nav-step'));
    }

    buildFooter() {
        this.footer = document.createElement('footer');
        this.footer.className = 'nui-wizard-footer';
        
        this.footer.innerHTML = `
            <div class="nui-wizard-footer-left">
                <nui-button variant="ghost"><button type="button" data-action="wizard:cancel">Cancel</button></nui-button>
            </div>
            <div class="nui-wizard-footer-right">
                <nui-button-container>
                    <nui-button variant="outline" class="btn-back"><button type="button" data-action="wizard:prev">Back</button></nui-button>
                    <nui-button variant="primary" class="btn-next"><button type="button" data-action="wizard:next">Next</button></nui-button>
                    <nui-button variant="primary" class="btn-complete" hidden><button type="button" data-action="wizard:complete">Complete</button></nui-button>
                </nui-button-container>
            </div>
        `;
        
        this.appendChild(this.footer);
    }

    handleClicks(e) {
        let action = null;
        let target = e.detail && e.detail.source ? e.detail.source.querySelector('button') : null;
        
        if (target) {
            action = target.getAttribute('data-action');
        }

        if (!action) return;

        if (action === 'wizard:cancel') this.cancel();
        if (action === 'wizard:prev') this.prev();
        if (action === 'wizard:next') this.next();
        if (action === 'wizard:complete') this.complete();
    }

    async next() {
        if (this.mode === 'required') {
            const currentStep = this.steps[this.currentIndex];
            const form = currentStep.querySelector('form');
            if (form) {
                const isValid = form.reportValidity();
                if (!isValid) return;
            }
        }

        const event = new CustomEvent('nui-wizard-before-next', {
            bubbles: true,
            cancelable: true,
            detail: { from: this.currentIndex, to: this.currentIndex + 1 }
        });
        
        this.dispatchEvent(event);
        if (event.defaultPrevented) return;

        this.goTo(this.currentIndex + 1);
    }

    prev() {
        if (this.currentIndex > 0) {
            this.goTo(this.currentIndex - 1);
        }
    }

    goTo(index) {
        if (index < 0 || index >= this.steps.length) return;

        this.steps.forEach((step, i) => {
            if (i === index) {
                step.removeAttribute('hidden');
                step.setAttribute('active', '');
            } else {
                step.setAttribute('hidden', '');
                step.removeAttribute('active');
            }
        });

        this.navButtons.forEach((btn, i) => {
            btn.classList.remove('active', 'completed');
            if (i === index) {
                btn.classList.add('active');
                btn.disabled = false;
            } else if (i < index) {
                btn.classList.add('completed');
                btn.disabled = false;
                if (!btn.hasAttribute('data-action')) {
                    btn.setAttribute('data-action', `wizard:goto:${i}`); 
                }
            } else {
                btn.disabled = (this.mode === 'required'); 
            }
        });

        this.currentIndex = index;
        this.updateFooter();

        const newStep = this.steps[index];
        const firstInput = newStep.querySelector('input:not([type=hidden]), select, textarea, button');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 10);
        }
        
        this.dispatchEvent(new CustomEvent('nui-wizard-step-change', {
            bubbles: true,
            detail: { current: this.currentIndex }
        }));
    }

    updateFooter() {
        const isFirst = this.currentIndex === 0;
        const isLast = this.currentIndex === this.steps.length - 1;

        const btnBack = this.footer.querySelector('.btn-back');
        const btnNext = this.footer.querySelector('.btn-next');
        const btnComplete = this.footer.querySelector('.btn-complete');

        if (isFirst) {
            btnBack.setAttribute('hidden', '');
        } else {
            btnBack.removeAttribute('hidden');
        }

        if (isLast) {
            btnNext.setAttribute('hidden', '');
            btnComplete.removeAttribute('hidden');
        } else {
            btnNext.removeAttribute('hidden');
            btnComplete.setAttribute('hidden', '');
        }
    }

    cancel() {
        this.dispatchEvent(new CustomEvent('nui-wizard-cancel', { bubbles: true }));
    }

    complete() {
        if (this.mode === 'required') {
            const currentStep = this.steps[this.currentIndex];
            const form = currentStep.querySelector('form');
            if (form) {
                if (!form.reportValidity()) return;
            }
        }
    
        const event = new CustomEvent('nui-wizard-complete', { bubbles: true, cancelable: true });
        this.dispatchEvent(event);
    }
    
    setBusy(isBusy) {
        if (isBusy) {
            this.setAttribute('busy', '');
            this.footer.querySelectorAll('button').forEach(b => b.disabled = true);
            this.navButtons.forEach(b => b.disabled = true);
        } else {
            this.removeAttribute('busy');
            this.footer.querySelectorAll('button').forEach(b => b.disabled = false);
            this.updateFooter(); 
            this.goTo(this.currentIndex); 
        }
    }
}

if (!customElements.get('nui-wizard-step')) customElements.define('nui-wizard-step', NuiWizardStep);
if (!customElements.get('nui-wizard')) customElements.define('nui-wizard', NuiWizard);

export { NuiWizard, NuiWizardStep };

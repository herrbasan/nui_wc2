import { nui } from '../../nui.js';

class NuiWizardStep extends HTMLElement {
	connectedCallback() {
		if (!this.hasAttribute('active')) {
			this.setAttribute('hidden', '');
		}
	}

	setStatus(status, message) {
		const validStatuses = ['valid', 'invalid', 'warning', 'pending', ''];
		if (!validStatuses.includes(status)) return;
		if (status) {
			this.setAttribute('status', status);
		} else {
			this.removeAttribute('status');
		}
		if (message !== undefined) {
			if (message) {
				this.setAttribute('data-status-message', message);
			} else {
				this.removeAttribute('data-status-message');
			}
		}
		const wizard = this.closest('nui-wizard');
		if (wizard) wizard.syncNavState();
	}

	getStatus() {
		return this.getAttribute('status') || '';
	}

	clearStatus() {
		this.removeAttribute('status');
		this.removeAttribute('data-status-message');
		const wizard = this.closest('nui-wizard');
		if (wizard) wizard.syncNavState();
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

		const circlesRow = document.createElement('div');
		circlesRow.className = 'nui-wizard-nav-row-circles';

		const labelsRow = document.createElement('div');
		labelsRow.className = 'nui-wizard-nav-row-labels';

		this.steps.forEach((step, index) => {
			if (index > 0) {
				const line = document.createElement('div');
				line.className = 'nui-wizard-nav-line';
				line.dataset.from = index - 1;
				circlesRow.appendChild(line);
			}

			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'nui-wizard-nav-step';

			const title = step.getAttribute('data-title') || `Step ${index + 1}`;
			btn.innerHTML = `<span class="nui-wizard-nav-number">${index + 1}</span>`;

			if (this.mode === 'free') {
				btn.setAttribute('data-action', `wizard:goto:${index}`);
			} else {
				btn.disabled = true;
			}

			circlesRow.appendChild(btn);

			const label = document.createElement('span');
			label.className = 'nui-wizard-nav-title';
			label.textContent = title;
			label.style.gridColumn = (index * 2 + 1).toString();
			labelsRow.appendChild(label);
		});

		nav.appendChild(circlesRow);
		nav.appendChild(labelsRow);

		const colCount = this.steps.length * 2 - 1;
		nav.style.gridTemplateColumns = `repeat(${colCount}, 3rem)`;
		nav.style.gridTemplateRows = 'auto auto';
		nav.style.width = 'fit-content';
		nav.style.justifyContent = 'start';

		this.header.appendChild(nav);
		this.navButtons = Array.from(nav.querySelectorAll('.nui-wizard-nav-step'));
		this.navLines = Array.from(nav.querySelectorAll('.nui-wizard-nav-line'));
	}

	buildFooter() {
		this.footer = document.createElement('footer');
		this.footer.className = 'nui-wizard-footer';

		this.footer.innerHTML = `
			<div class="nui-wizard-footer-left">
				<nui-button variant="outline"><button type="button" data-action="wizard:cancel">Cancel</button></nui-button>
			</div>
			<div class="nui-wizard-footer-center">
				<span class="nui-wizard-step-indicator"></span>
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
		const event = new CustomEvent('nui-wizard-before-next', {
			bubbles: true,
			cancelable: true,
			detail: { from: this.currentIndex, to: this.currentIndex + 1 }
		});

		this.dispatchEvent(event);
		if (event.defaultPrevented) return;

		if (typeof event.detail.promise === 'object' && event.detail.promise !== null && typeof event.detail.promise.then === 'function') {
			this.setBusy(true);
			try {
				const result = await event.detail.promise;
				if (result === false) {
					this.setBusy(false);
					return;
				}
				this.setBusy(false);
				this.goTo(this.currentIndex + 1);
			} catch (err) {
				this.setBusy(false);
				this.dispatchValidationError(this.currentIndex, err.message || 'Validation failed');
				return;
			}
			return;
		}

		if (!event.detail.handled) {
			if (this.mode === 'required') {
				const currentStep = this.steps[this.currentIndex];
				const form = currentStep.querySelector('form');
				if (form && !form.reportValidity()) return;
			}
		}

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

		this.updateNavState(index);
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

	updateNavState(index) {
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

		if (this.navLines) {
			this.navLines.forEach(line => {
				const fromIdx = parseInt(line.dataset.from, 10);
				line.classList.toggle('completed', fromIdx < index);
			});
		}

		const navTitles = this.header.querySelectorAll('.nui-wizard-nav-title');
		navTitles.forEach((title, i) => {
			title.classList.remove('active', 'completed');
			if (i === index) {
				title.classList.add('active');
			} else if (i < index) {
				title.classList.add('completed');
			}
		});
	}

	syncNavState() {
		this.steps.forEach((step, i) => {
			const btn = this.navButtons[i];
			if (!btn) return;
			const status = step.getAttribute('status');
			const numberEl = btn.querySelector('.nui-wizard-nav-number');
			btn.classList.remove('status-valid', 'status-invalid', 'status-warning', 'status-pending');
			btn.removeAttribute('data-status-message');
			if (numberEl) {
				numberEl.classList.remove('status-valid', 'status-invalid', 'status-warning', 'status-pending');
			}
			if (status) {
				btn.classList.add(`status-${status}`);
				if (numberEl) numberEl.classList.add(`status-${status}`);
				const msg = step.getAttribute('data-status-message');
				if (msg) {
					btn.setAttribute('data-status-message', msg);
					btn.setAttribute('title', msg);
				} else {
					btn.removeAttribute('title');
				}
			}
		});
	}

	validateStep(index) {
		if (index < 0 || index >= this.steps.length) return true;
		const step = this.steps[index];

		const form = step.querySelector('form');
		if (form && !form.reportValidity()) {
			step.setStatus('invalid', form.querySelector(':invalid')?.validationMessage || 'Validation failed');
			return false;
		}

		step.setStatus('valid');
		return true;
	}

	validateAllSteps() {
		let allValid = true;
		this.steps.forEach((step, i) => {
			if (!this.validateStep(i)) allValid = false;
		});
		return allValid;
	}

	dispatchValidationError(index, message) {
		this.dispatchEvent(new CustomEvent('nui-wizard-validation-error', {
			bubbles: true,
			detail: { step: index, message }
		}));
	}

	updateFooter() {
		const isFirst = this.currentIndex === 0;
		const isLast = this.currentIndex === this.steps.length - 1;

		const btnBack = this.footer.querySelector('.btn-back');
		const btnNext = this.footer.querySelector('.btn-next');
		const btnComplete = this.footer.querySelector('.btn-complete');
		const stepIndicator = this.footer.querySelector('.nui-wizard-step-indicator');
		stepIndicator.textContent = `${this.currentIndex + 1} of ${this.steps.length}`;

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
			this.updateNavState(this.currentIndex);
		}
	}

	reset() {
		this.steps.forEach(step => {
			step.clearStatus();
		});
		this.goTo(0);
	}
}

if (!customElements.get('nui-wizard-step')) customElements.define('nui-wizard-step', NuiWizardStep);
if (!customElements.get('nui-wizard')) customElements.define('nui-wizard', NuiWizard);

export { NuiWizard, NuiWizardStep };

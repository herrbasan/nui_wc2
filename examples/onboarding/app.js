// Vantage Account Setup — example app.
//
// The wizard-driven side of the library: a four-step form where each step
// validates before the next one opens, plus a review step that reads the
// values back out of the earlier steps.

import { nui } from '../../NUI/nui.js';
import '../../NUI/lib/modules/nui-wizard.js';

const wizard = document.getElementById('setup-wizard');
const progress = document.getElementById('setup-progress');
const stepLabel = document.getElementById('setup-step');

const stepCount = wizard.steps.length;

function readValue(id) {
	const el = document.getElementById(id);
	if (!el) return '';
	if (el.tagName === 'NUI-SELECT') return el.getValue();
	return el.value;
}

function fillReview() {
	const region = document.getElementById('setup-region');
	const budget = document.getElementById('setup-budget');
	const tags = document.getElementById('setup-team');
	const range = document.getElementById('setup-start');

	const role = document.querySelector('input[name="role"]:checked');
	const notify = [];
	if (document.getElementById('setup-email').checked) notify.push('Build results');
	if (document.getElementById('setup-warn').checked) notify.push('Budget warnings');

	const rangeValue = range.getValue();

	document.getElementById('review-name').textContent = readValue('setup-name') || '—';
	document.getElementById('review-company').textContent = readValue('setup-company') || '—';
	document.getElementById('review-role').textContent = role ? role.value : '—';
	document.getElementById('review-region').textContent = region.getValue() || 'Not chosen';
	document.getElementById('review-start').textContent = rangeValue.from
		? `${rangeValue.from} → ${rangeValue.to || 'open'}`
		: 'Not set';
	document.getElementById('review-budget').textContent = `€${budget.getValue()}`;
	document.getElementById('review-team').textContent = tags.getValues().join(', ') || 'Nobody yet';
	document.getElementById('review-notify').textContent = notify.join(', ') || 'Nothing';
}

function updateChrome(current) {
	const pct = Math.round(((current + 1) / stepCount) * 100);
	progress.setAttribute('value', String(pct));
	stepLabel.textContent = `Step ${current + 1} of ${stepCount}`;
}

wizard.addEventListener('nui-wizard-step-change', (e) => {
	const current = e.detail.current;
	updateChrome(current);
	if (current === stepCount - 1) fillReview();
});

wizard.addEventListener('nui-wizard-complete', (e) => {
	e.preventDefault();
	nui.components.banner.show({
		content: 'Your workspace is ready. Nothing is charged until the first invoice.',
		placement: 'bottom',
		priority: 'info',
		autoClose: 8000
	});
	nui.notify({ content: 'Account setup completed.', banner: false });
});

document.getElementById('setup-budget').addEventListener('change', () => {
	fillReview();
});

// ---- The domain check --------------------------------------------------
//
// The one genuinely slow thing in this flow, and the reason the overlay
// exists: a blocking overlay with a busy indicator, a message and a way out.
// An overlay with no trigger is dead state — nothing can ever open it, so it
// reads as a stray dialog rather than a step.

const company = document.getElementById('setup-company');
const verifyOverlay = document.getElementById('verify-overlay');
const verifyStatus = document.getElementById('verify-status');
let verifyTimer = null;

company.addEventListener('change', () => {
	const domain = company.value.trim();
	if (!domain) return;
	verifyStatus.textContent = '';
	verifyOverlay.showModal();
	verifyTimer = setTimeout(() => {
		verifyTimer = null;
		verifyOverlay.close('checked');
		// The spinner going away is not an answer. The outcome is announced in a
		// polite live region, so a screen-reader user hears the result too.
		verifyStatus.textContent = `${domain}.example is available.`;
	}, 1400);
});

// Cancelling closes the overlay early — and the pending check must not close
// it a second time when its timer lands.
verifyOverlay.addEventListener('nui-overlay-close', () => {
	if (verifyTimer) {
		clearTimeout(verifyTimer);
		verifyTimer = null;
		verifyStatus.textContent = 'Domain check cancelled.';
	}
});

document.getElementById('setup-start').addEventListener('nui-date-range-change', () => {
	fillReview();
});

document.getElementById('setup-team').addEventListener('nui-change', () => {
	fillReview();
});

/* Lumen Knowledge Base — example app.
   Covers the document/reading side of the library: markdown rendering, slides,
   sortable collections, virtual scrolling and the menu bar.
*/

import { nui } from '../../NUI/nui.js';
import { bindSectionNav } from '../shared/nav.js';
import '../../NUI/lib/modules/nui-menu.js';
import '../../NUI/lib/modules/nui-slides.js';
import '../../NUI/lib/modules/nui-notepad.js';

const nav = document.getElementById('kb-nav');
nav.loadData([
	{ label: 'Handbook', href: '#handbook', icon: 'auto_stories' },
	{ label: 'Getting started', href: '#getting-started', icon: 'lightbulb_2' },
	{ label: 'Review board', href: '#review-board', icon: 'sticky_note' },
	{ label: 'Reading queue', href: '#reading-queue', icon: 'playlist_remove' },
	{ label: 'Glossary', href: '#glossary', icon: 'description' },
	{ label: 'Reference', href: '#reference', icon: 'code' },
	{ label: 'Walkthrough', href: '#walkthrough', icon: 'smart_display' }
]);

bindSectionNav(nav, { indicator: document.querySelector('[data-current-route]') });

// ---- The menu bar -----------------------------------------------------

document.querySelectorAll('[data-action^="kb-menu:"]').forEach(btn => {
	btn.addEventListener('click', () => {
		const action = btn.getAttribute('data-action').split(':')[1];
		nui.notify({ content: `Menu action: ${action}` });
	});
});

// ---- Virtualised feed --------------------------------------------------

const vscroll = document.getElementById('kb-vscroll');
const feedCount = document.getElementById('kb-count');

const entries = [
	{ title: 'How we name things', body: 'Every object in the system carries a name that survives a refactor. If you cannot name it, you do not understand it yet.' },
	{ title: 'Writing a runbook', body: 'A runbook is a script a stranger can follow at 3am without asking anyone. Start with the symptom, not the system.' },
	{ title: 'The cost of a page load', body: 'Every dependency is a promise to a third party. Count them before you add one.' },
	{ title: 'Reviewing code', body: 'Review the change, not the author. Say what is wrong with the code, not what is wrong with the person.' },
	{ title: 'Incident reports', body: 'Blameless does not mean causeless. It means the cause is a system, and systems can be fixed.' },
	{ title: 'Choosing a database', body: 'Start with the query you cannot make fast. The schema follows the access pattern.' },
	{ title: 'Release notes', body: 'Write them for the person upgrading, not the person shipping.' },
	{ title: 'On call', body: 'The on-call engineer is a user of the monitoring system, not its operator.' },
	{ title: 'Feature flags', body: 'A flag is a promise to delete code. If nobody will delete it, do not add it.' },
	{ title: 'Estimating', body: 'An estimate is a prediction with a confidence interval, not a promise.' },
	{ title: 'Documentation', body: 'Documentation that is wrong is worse than documentation that is missing, because it is trusted.' },
	{ title: 'Deprecations', body: 'A deprecation without a migration path is a break with extra steps.' }
];

function buildFeed() {
	entries.forEach((entry, i) => {
		const card = document.createElement('article');
		card.className = 'ex-feed-card';

		const h = document.createElement('h3');
		h.textContent = entry.title;

		const p = document.createElement('p');
		p.textContent = entry.body;

		const meta = document.createElement('span');
		meta.className = 'ex-stat__delta';
		meta.textContent = `#${i + 1} · ${entry.title.length * 7} min read`;

		card.append(h, p, meta);
		vscroll.appendItem(card);
	});
	feedCount.textContent = `${entries.length} recently changed pages`;
}

buildFeed();

// ---- The review board --------------------------------------------------

document.getElementById('kb-board').load({
	today: '2026-11-15',
	dueSoonDays: 7,
	contexts: ['handbook', 'runbooks', 'glossary'],
	overdue: [],
	dueSoon: [
		{ id: 1, type: 'task', title: 'Review the paging chapter', owner: 'david', context: 'handbook', due: '2026-11-17', stepsTotal: 2, stepsDone: 1, nextStep: 'Check the diagrams still match the code' }
	],
	openTasks: [
		{ id: 2, type: 'task', title: 'Rewrite the caching glossary entry', owner: 'machine', context: 'glossary', due: null, steps: [{ done: false, text: 'Ask whether invalidation belongs here' }] },
		{ id: 3, type: 'task', title: 'Add a runbook for the paging failure', owner: 'david', context: 'runbooks', due: null, steps: [{ done: false, text: 'Collect the last three incidents' }] }
	],
	upcoming: [],
	recentIdeas: [
		{ id: 4, type: 'idea', title: 'A page about pages', owner: 'machine', context: 'handbook', createdAt: 1763000000 }
	],
	stalePins: []
});

// ---- Sortable collection ----------------------------------------------

const sortable = document.getElementById('kb-sortable');

sortable.addEventListener('nui-sortable-change', (e) => {
	const order = e.detail.order.join(' → ');
	document.getElementById('kb-order').textContent = order;
});

// ---- Glossary search ---------------------------------------------------

const glossaryInput = document.getElementById('kb-glossary-search');
const glossaryBody = document.getElementById('kb-glossary-body');

const glossary = [
	['Blast radius', 'The set of users a failure can touch. Smaller is better; measure it before you change it.'],
	['Cache', 'A copy of data kept somewhere faster so it can be read instead of recomputed. Its lifetime is a correctness decision.'],
	['Debounce', 'Wait until a burst of events has stopped before acting. The opposite of throttle.'],
	['Idempotent', 'Safe to run twice. The second run changes nothing, which is what makes retries safe.'],
	['Pagination', 'Reading a set in slices. Offset pagination drifts under concurrent writes; keyset pagination does not.'],
	['Race condition', 'Two operations whose order decides the outcome. Fixed by ordering them, not by hoping.']
];

function renderGlossary(term = '') {
	glossaryBody.textContent = '';
	const hits = glossary.filter(([name, def]) =>
		!term || name.toLowerCase().includes(term) || def.toLowerCase().includes(term)
	);

	if (hits.length === 0) {
		const empty = document.createElement('p');
		empty.className = 'ex-stat__delta';
		empty.textContent = `No entry matches "${term}".`;
		glossaryBody.appendChild(empty);
		return;
	}

	for (const [name, def] of hits) {
		const dt = document.createElement('dt');
		dt.textContent = name;
		const dd = document.createElement('dd');
		dd.textContent = def;
		glossaryBody.append(dt, dd);
	}
}

renderGlossary();

glossaryInput.addEventListener('nui-input', (e) => {
	renderGlossary((e.detail?.value ?? '').toLowerCase());
});

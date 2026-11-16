// Halcyon Support Triage — example app.
//
// Shows the conversation side of the library: a virtualised ticket queue, a
// triage dialog, tabs over saved views, and a rich-text reply template.

import { nui } from '../../NUI/nui.js';
import { bindSectionNav } from '../shared/nav.js';
import '../../NUI/lib/modules/nui-list.js';
import '../../NUI/lib/modules/nui-rich-text.js';

const nav = document.getElementById('ticket-nav');
nav.loadData([
	{ label: 'Queue', href: '#queue', icon: 'format_list_numbered' },
	{ label: 'Saved views', href: '#views', icon: 'filter_list' },
	{ label: 'Reply template', href: '#reply', icon: 'mail' },
	{ label: 'Escalation policy', href: '#policy', icon: 'warning' },
	{ label: 'Service status', href: '#status', icon: 'monitor' }
]);

bindSectionNav(nav, { indicator: document.querySelector('[data-current-route]') });

// ---- The queue --------------------------------------------------------

const tickets = [
	{ id: 'TK-4471', subject: 'Charged twice for the March invoice', queue: 'billing', waiting: '14m', sla: '46m', priority: 'normal', tags: ['invoice'], untriaged: false },
	{ id: 'TK-4468', subject: 'Webhook deliveries stopped at 09:00', queue: 'technical', waiting: '52m', sla: '8m', priority: 'high', tags: ['webhooks', 'outage'], untriaged: false },
	{ id: 'TK-4465', subject: 'Cannot reset my password', queue: 'accounts', waiting: '1h 12m', sla: '0m', priority: 'normal', tags: [], untriaged: false },
	{ id: 'TK-4463', subject: 'Where is my order 8812?', queue: 'general', waiting: '2h', sla: '3h 10m', priority: 'low', tags: ['shipping'], untriaged: true },
	{ id: 'TK-4460', subject: 'Export to CSV drops the last column', queue: 'technical', waiting: '3h 05m', sla: '1h 20m', priority: 'normal', tags: ['export'], untriaged: true },
	{ id: 'TK-4458', subject: 'Upgrade plan quote for 40 seats', queue: 'billing', waiting: '4h', sla: '2h', priority: 'low', tags: ['sales'], untriaged: false },
	{ id: 'TK-4455', subject: 'SSO login loops back to the sign-in page', queue: 'accounts', waiting: '5h 30m', sla: '30m', priority: 'high', tags: ['sso'], untriaged: true },
	{ id: 'TK-4451', subject: 'Feature request: scheduled exports', queue: 'general', waiting: '6h', sla: '5h', priority: 'low', tags: ['feature'], untriaged: false }
];

let searchTerm = '';
let activeTicket = null;

function visibleTickets() {
	const term = searchTerm.trim().toLowerCase();
	if (!term) return tickets;
	return tickets.filter(t =>
		t.id.toLowerCase().includes(term)
		|| t.subject.toLowerCase().includes(term)
		|| t.queue.includes(term)
		|| t.tags.some(tag => tag.includes(term))
	);
}

function slaMinutes(value) {
	const hours = value.match(/(\d+)h/);
	const minutes = value.match(/(\d+)m/);
	return (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
}

function renderTicket(item) {
	const row = document.createElement('div');
	row.className = 'ex-row';

	const main = document.createElement('div');
	main.className = 'ex-row__main';

	const title = document.createElement('span');
	title.className = 'ex-row__title';
	title.textContent = `${item.id} · ${item.subject}`;

	const meta = document.createElement('span');
	meta.className = 'ex-row__meta';
	meta.textContent = `${item.queue} · waiting ${item.waiting}`;

	main.append(title, meta);

	const sla = document.createElement('nui-badge');
	const minutes = slaMinutes(item.sla);
	sla.setAttribute('variant', minutes < 30 ? 'danger' : minutes < 60 ? 'warning' : 'success');
	sla.textContent = minutes < 60 ? `${item.sla} left` : 'On track';

	row.append(main, sla);
	return row;
}

const list = document.getElementById('ticket-list');
list.loadData({
	data: tickets,
	render: renderTicket,
	sort: [
		{ label: 'Ticket', prop: 'id' },
		{ label: 'Queue', prop: 'queue' }
	],
	footer: {
		buttons_left: [
			{
				label: 'Escalate',
				type: 'danger',
				fnc: () => {
					const selected = list.getSelection(true);
					if (!selected.length) {
						nui.notify({ content: 'Select a ticket to escalate.', priority: 'warning' });
						return;
					}
					nui.notify({ content: `Escalated ${selected.length} ticket(s).`, banner: true });
				}
			}
		],
		buttons_right: [
			{ label: 'Assign to me', type: 'outline', fnc: () => nui.notify({ content: 'Assigned to you.' }) }
		]
	},
	events: (e) => {
		if (e.type === 'selection') {
			const selected = list.getSelection(true)[0];
			if (selected) openTicket(selected.data);
		}
	}
});

const search = document.getElementById('ticket-search');
search.addEventListener('nui-input', (e) => {
	searchTerm = e.detail?.value ?? '';
	list.updateData(visibleTickets());
	document.getElementById('queue-count').textContent = `${visibleTickets().length} of ${tickets.length} tickets`;
});
document.getElementById('queue-count').textContent = `${tickets.length} of ${tickets.length} tickets`;

// ---- The triage dialog -------------------------------------------------

const dialog = document.getElementById('ticket-dialog');

function openTicket(ticket) {
	if (!ticket) return;
	activeTicket = ticket;
	document.getElementById('ticket-title').textContent = ticket.subject;
	document.getElementById('ticket-summary').textContent = `${ticket.id} · ${ticket.queue} queue · waiting ${ticket.waiting}`;

	const queue = document.getElementById('ticket-queue');
	const priority = document.getElementById('ticket-priority');
	queue.setValue(ticket.queue);
	priority.setValue(ticket.priority);

	const tags = document.getElementById('ticket-tags');
	tags.clear();
	ticket.tags.forEach(tag => tags.addTag(tag));

	dialog.showModal();
}

document.addEventListener('click', (e) => {
	const actionEl = e.target.closest('[data-action="ticket-save"]');
	if (!actionEl) return;
	if (!activeTicket) return;

	activeTicket.queue = document.getElementById('ticket-queue').getValue();
	activeTicket.priority = document.getElementById('ticket-priority').getValue();
	activeTicket.tags = document.getElementById('ticket-tags').getValues();

	list.update(true);
	nui.notify({ content: `Triaged ${activeTicket.id}.`, banner: true });
});

// ---- Saved views ------------------------------------------------------

function fillRows(tbody, rows, columns) {
	tbody.textContent = '';
	for (const t of rows) {
		const tr = document.createElement('tr');
		for (const value of columns(t)) {
			const td = document.createElement('td');
			td.textContent = value;
			tr.appendChild(td);
		}
		tbody.appendChild(tr);
	}
}

const slaRows = document.getElementById('sla-rows');
const riskRows = document.getElementById('risk-rows');
const newRows = document.getElementById('new-rows');

fillRows(slaRows, tickets, t => [t.id, t.subject, t.queue, t.waiting, t.sla]);
fillRows(riskRows, tickets.filter(t => slaMinutes(t.sla) < 60), t => [t.id, t.subject, t.waiting, t.sla]);
fillRows(newRows, tickets.filter(t => t.untriaged), t => [t.id, t.subject, t.waiting]);

// ---- Reply template ---------------------------------------------------

const template = document.getElementById('reply-template');
template.addEventListener('nui-change', () => {
	nui.notify({ content: 'Reply template updated.', banner: true });
});

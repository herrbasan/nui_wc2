// Meridian Fleet Operations — example app.
//
// Shows the core shell plus the data components: a filtered/sorted list, a
// sparkline, a table, filters and a notification log.

import { nui } from '../../NUI/nui.js';
import { bindSectionNav } from '../shared/nav.js';
import '../../NUI/lib/modules/nui-list.js';
import '../../NUI/lib/modules/nui-graph.js';

const nav = document.getElementById('fleet-nav');
nav.loadData([
	{ label: 'Overview', href: '#overview', icon: 'analytics' },
	{ label: 'Exceptions', href: '#exceptions', icon: 'warning' },
	{
		label: 'Fleet',
		icon: 'layers',
		// The group header toggles the group; the sibling action jumps straight to
		// the section, so a collapsed group is never a dead end.
		rowAction: { action: 'goto:motion', icon: 'arrow', label: 'Jump to vehicles in motion' },
		items: [
			{ label: 'In motion', href: '#motion' }
		]
	},
	{
		label: 'Reports',
		icon: 'assessment',
		rowAction: { action: 'goto:utilisation', icon: 'arrow', label: 'Jump to the speedometer' },
		items: [
			{ label: 'Utilisation', href: '#utilisation' }
		]
	}
]);

// A custom data-action: NUI dispatches `nui-action-goto` for any action it does
// not handle itself, so the group action needs no library support.
document.addEventListener('nui-action-goto', (e) => {
	nav.querySelector(`a[href="#${e.detail.param}"]`)?.click();
});

// The current section, shown next to the app title whenever the sidebar is
// collapsed. On a phone the sidebar is off canvas, so without this the user
// has no way to see where they are.
bindSectionNav(nav, { indicator: document.querySelector('[data-current-route]') });

const vehicles = [
	{ id: 'MRD-4417', driver: 'A. Okafor', route: 'R-88 North', status: 'moving', speed: 88, eta: '14:40', tags: ['reefer', 'priority'] },
	{ id: 'MRD-2209', driver: 'L. Bianchi', route: 'R-12 East', status: 'moving', speed: 74, eta: '15:05', tags: ['coupling'] },
	{ id: 'MRD-5560', driver: 'M. Haddad', route: 'R-19 Central', status: 'loading', speed: 0, eta: '16:20', tags: ['depot'] },
	{ id: 'MRD-7731', driver: 'S. Nowak', route: 'R-04 Harbour', status: 'idle', speed: 0, eta: '14:25', tags: ['early'] },
	{ id: 'MRD-1902', driver: 'J. Mbeki', route: 'R-31 West', status: 'moving', speed: 91, eta: '17:10', tags: ['break-due'] },
	{ id: 'MRD-3346', driver: 'R. Silva', route: 'R-23 South', status: 'moving', speed: 66, eta: '16:55', tags: [] },
	{ id: 'MRD-6088', driver: 'T. Andersen', route: 'R-07 Ring', status: 'offline', speed: 0, eta: '—', tags: ['no-signal'] },
	{ id: 'MRD-8514', driver: 'C. Duarte', route: 'R-15 Metro', status: 'moving', speed: 52, eta: '15:50', tags: ['urban'] },
	{ id: 'MRD-1290', driver: 'P. Novak', route: 'R-41 Hills', status: 'idle', speed: 0, eta: '18:30', tags: [] },
	{ id: 'MRD-4725', driver: 'G. Petrov', route: 'R-22 Industrial', status: 'moving', speed: 79, eta: '17:35', tags: ['industrial'] },
	{ id: 'MRD-9053', driver: 'N. Fatima', route: 'R-02 Airport', status: 'loading', speed: 0, eta: '19:10', tags: ['airside'] },
	{ id: 'MRD-6311', driver: 'D. Wright', route: 'R-36 Coast', status: 'moving', speed: 84, eta: '18:05', tags: [] }
];

const statusLabels = {
	moving: 'Moving',
	idle: 'Idle',
	loading: 'Loading',
	offline: 'Offline'
};

function renderVehicle(item) {
	const row = document.createElement('div');
	row.className = 'ex-row';

	const main = document.createElement('div');
	main.className = 'ex-row__main';

	const title = document.createElement('span');
	title.className = 'ex-row__title';
	title.textContent = `${item.id} · ${item.driver}`;

	const meta = document.createElement('span');
	meta.className = 'ex-row__meta';
	meta.textContent = `${item.route} · ETA ${item.eta}`;

	main.append(title, meta);

	const badge = document.createElement('nui-badge');
	badge.setAttribute('variant', item.status === 'offline' ? 'danger' : item.status === 'idle' ? 'warning' : 'success');
	badge.textContent = statusLabels[item.status];

	const speed = document.createElement('span');
	speed.className = 'ex-token';
	speed.textContent = `${item.speed} km/h`;

	row.append(main, badge, speed);
	return row;
}

const list = document.getElementById('vehicle-list');
list.loadData({
	data: vehicles,
	render: renderVehicle,
	sort: [
		{ label: 'Vehicle', prop: 'id' },
		{ label: 'Speed (slowest first)', prop: 'speed', numeric: true },
		{ label: 'Speed (fastest first)', prop: 'speed', numeric: true, dir: 'desc' }
	],
	footer: {
		buttons_left: [
			{
				label: 'Assign',
				type: 'primary',
				fnc: () => {
					const selected = list.getSelection(true);
					if (!selected.length) {
						nui.notify({ content: 'Select at least one vehicle first.', priority: 'warning' });
						return;
					}
					nui.notify({
						content: `Assigned ${selected.length} vehicle${selected.length === 1 ? '' : 's'} to the current route.`,
						banner: true
					});
				}
			}
		],
		buttons_right: [
			{ label: 'Export', type: 'outline', fnc: () => nui.notify({ content: 'Export queued.' }) }
		]
	}
});

// One control per dimension. The status filter and the search term both live
// outside the list — the list's own header would otherwise carry a second
// search box next to the header's, and its header does not fit a phone
// screen once it does.
const statusSelect = document.getElementById('fleet-status');
const search = document.getElementById('fleet-search');

let statusFilter = '';
let searchTerm = '';
let tagFilters = [];

function applyFilters() {
	const term = searchTerm.trim().toLowerCase();
	const filtered = vehicles.filter(v => {
		if (statusFilter && v.status !== statusFilter) return false;
		if (!tagFilters.every(tag => v.tags.includes(tag))) return false;
		if (!term) return true;
		return v.id.toLowerCase().includes(term)
			|| v.driver.toLowerCase().includes(term)
			|| v.route.toLowerCase().includes(term);
	});
	list.updateData(filtered);
}

statusSelect.addEventListener('nui-change', (e) => {
	statusFilter = e.detail?.values?.[0] ?? '';
	applyFilters();
});

search.addEventListener('nui-input', (e) => {
	searchTerm = e.detail?.value ?? '';
	applyFilters();
});

document.getElementById('fleet-tags').addEventListener('nui-change', (e) => {
	tagFilters = (e.detail?.values ?? []).map(tag => tag.toLowerCase());
	applyFilters();
});

const graph = document.getElementById('speed-graph');
let speedSample = 72;
setInterval(() => {
	speedSample = Math.max(30, Math.min(105, speedSample + (Math.random() * 14 - 7)));
	graph.push(Math.round(speedSample));
}, 2000);

// A stable id: the banner factory replaces the message instead of stacking a
// new one, so a repeated sync never leaves a wall of identical banners.
nui.notify({
	id: 'fleet-sync',
	content: 'Fleet sync complete — 128 vehicles reporting.',
	banner: true,
	autoClose: 5000
});

document.addEventListener('click', (e) => {
	const actionEl = e.target.closest('[data-action="toggle-theme"]');
	if (!actionEl) return;
	const current = document.documentElement.style.colorScheme || 'light';
	document.documentElement.style.colorScheme = current === 'dark' ? 'light' : 'dark';
});

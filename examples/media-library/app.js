// Aperture Media Library — example app.
//
// Shows the file-and-asset side of the library: a folder tree, an upload
// list, an asset grid, a details panel and a metadata sidecar editor.

import { nui } from '../../NUI/nui.js';
import { bindSectionNav } from '../shared/nav.js';
import '../../NUI/lib/modules/nui-file-tree.js';
import '../../NUI/lib/modules/nui-file-list.js';
import '../../NUI/lib/modules/nui-lightbox.js';
import '../../NUI/lib/modules/nui-code-editor.js';
import '../../NUI/lib/modules/nui-context-menu.js';

// A nav label and the heading it leads to say the same words. "Uploads" leading
// to "Recent uploads" is a small mismatch the reader has to resolve alone.
const nav = document.getElementById('asset-nav');
nav.loadData([
	{ label: 'Workspace', href: '#workspace', icon: 'folder_open' },
	{ label: 'Recent uploads', href: '#uploads', icon: 'upload' },
	{ label: 'Drop new assets', href: '#dropzone', icon: 'file_json' },
	{ label: 'Preview', href: '#preview', icon: 'visibility' },
	{ label: 'Assets', href: '#assets', icon: 'image' },
	{ label: 'Metadata', href: '#metadata', icon: 'table_view' }
]);

bindSectionNav(nav, { indicator: document.querySelector('[data-current-route]') });

// ---- The folder tree ---------------------------------------------------

const tree = document.getElementById('asset-tree');
tree.loadData({
	name: 'workspace',
	kind: 'dir',
	children: [
		{
			name: 'photography',
			kind: 'dir',
			children: [
				{ name: 'campaign-2026', kind: 'dir', children: [
					{ name: 'hero-dawn.jpg', kind: 'file' },
					{ name: 'hero-dusk.jpg', kind: 'file' }
				] },
				{ name: 'editorial', kind: 'dir', children: [
					{ name: 'portrait-01.jpg', kind: 'file' }
				] }
			]
		},
		{
			name: 'footage',
			kind: 'dir',
			children: [
				{ name: 'aerial-coast.mp4', kind: 'file' },
				{ name: 'timelapse-market.mp4', kind: 'file' }
			]
		},
		{
			name: 'audio',
			kind: 'dir',
			children: [
				{ name: 'theme-bed.wav', kind: 'file' },
				{ name: 'sting-short.wav', kind: 'file' }
			]
		}
	]
});

// ---- The assets --------------------------------------------------------

const assets = [
	{ id: 'ast_2291', name: 'hero-dawn.jpg', kind: 'photo', size: '4.2 MB', licence: 'Editorial', used: 'Homepage hero', folder: 'photography', accent: '#c98a4b' },
	{ id: 'ast_2292', name: 'hero-dusk.jpg', kind: 'photo', size: '3.9 MB', licence: 'Editorial', used: 'Campaign page', folder: 'photography', accent: '#5b6ac9' },
	{ id: 'ast_2293', name: 'portrait-01.jpg', kind: 'photo', size: '2.1 MB', licence: 'Restricted', used: 'Press kit', folder: 'photography', accent: '#4b9c78' },
	{ id: 'ast_3140', name: 'aerial-coast.mp4', kind: 'video', size: '218 MB', licence: 'Commercial', used: 'Launch film', folder: 'footage', accent: '#3f7fb5' },
	{ id: 'ast_3141', name: 'timelapse-market.mp4', kind: 'video', size: '164 MB', licence: 'Commercial', used: 'Social cutdowns', folder: 'footage', accent: '#a4553f' },
	{ id: 'ast_4102', name: 'theme-bed.wav', kind: 'audio', size: '8.7 MB', licence: 'Owned', used: 'End card', folder: 'audio', accent: '#6b4b9c' },
	{ id: 'ast_4103', name: 'sting-short.wav', kind: 'audio', size: '1.2 MB', licence: 'Owned', used: 'Notification', folder: 'audio', accent: '#9c7a4b' }
];

let searchTerm = '';
let selectedFolder = '';
let sortMode = 'name';

const grid = document.getElementById('asset-grid');
const empty = document.getElementById('asset-empty');
const count = document.getElementById('asset-count');

function renderAssets() {
	const term = searchTerm.trim().toLowerCase();
	const visible = assets.filter(a => {
		if (selectedFolder && a.folder !== selectedFolder) return false;
		if (!term) return true;
		return a.name.toLowerCase().includes(term) || a.kind.includes(term) || a.licence.toLowerCase().includes(term);
	});
	visible.sort((a, b) => {
		if (sortMode === 'size') return parseFloat(b.size) - parseFloat(a.size);
		if (sortMode === 'date') return assets.indexOf(a) - assets.indexOf(b);
		return a.name.localeCompare(b.name);
	});

	grid.textContent = '';
	for (const asset of visible) {
		const card = document.createElement('button');
		card.type = 'button';
		card.className = 'ex-asset';

		const thumb = document.createElement('span');
		thumb.className = 'ex-asset__thumb';
		thumb.setAttribute('aria-hidden', 'true');
		thumb.style.background = asset.accent;

		const name = document.createElement('span');
		name.className = 'ex-asset__name';
		name.textContent = asset.name;

		const meta = document.createElement('span');
		meta.className = 'ex-row__meta';
		meta.textContent = `${asset.kind} · ${asset.size}`;

		const licence = document.createElement('nui-badge');
		licence.setAttribute('variant', asset.licence === 'Restricted' ? 'warning' : 'info');
		licence.textContent = asset.licence;

		card.append(thumb, name, meta, licence);
		card.addEventListener('click', () => showDetails(asset));
		grid.appendChild(card);
	}

	empty.hidden = visible.length > 0;
	count.textContent = `${visible.length} of ${assets.length} assets`;
}

function showDetails(asset) {
	document.getElementById('detail-name').textContent = asset.name;
	document.getElementById('detail-type').textContent = asset.kind;
	document.getElementById('detail-size').textContent = asset.size;
	document.getElementById('detail-licence').textContent = asset.licence;
	document.getElementById('detail-used').textContent = asset.used;
}

const search = document.getElementById('asset-search');
search.addEventListener('nui-input', (e) => {
	searchTerm = e.detail?.value ?? '';
	renderAssets();
});

tree.addEventListener('nui-file-select', (e) => {
	const entry = e.detail?.entry;
	// Only a folder narrows the grid; selecting a file shows its details.
	selectedFolder = entry?.kind === 'dir' ? entry.name : '';
	if (entry?.kind === 'file') {
		const asset = assets.find(a => a.name === entry.name);
		if (asset) showDetails(asset);
	}
	renderAssets();
});

document.getElementById('view-density').addEventListener('nui-change', (e) => {
	grid.dataset.density = e.detail?.values?.[0] || 'comfortable';
});

document.getElementById('view-sort').addEventListener('nui-change', (e) => {
	sortMode = e.detail?.values?.[0] || 'name';
	renderAssets();
});

renderAssets();

// ---- Recent uploads ----------------------------------------------------

document.getElementById('upload-list').loadData([
	{ name: 'hero-dawn.jpg', size: 4416000, status: 'uploaded', detail: 'campaign-2026' },
	{ name: 'aerial-coast.mp4', size: 228589568, status: 'uploading', detail: 'footage' },
	{ name: 'sting-short.wav', size: 1258291, status: 'done', detail: 'audio' },
	{ name: 'hero-dusk-alt.jpg', size: 4096000, status: 'failed', detail: 'campaign-2026' }
], { actions: ['download', 'remove'] });

// ---- Context menu on an asset ------------------------------------------

const { contextMenu } = await import('../../NUI/lib/modules/nui-context-menu.js');
const menu = contextMenu([
	{ label: 'Open', action: 'open', icon: 'open_in_full' },
	{ label: 'Copy link', action: 'copy', shortcut: 'Ctrl+C', icon: 'link' },
	{ label: 'Rename', action: 'rename', icon: 'edit' },
	{ type: 'separator' },
	{ label: 'Move to collection', action: 'move', icon: 'folder' },
	{ label: 'Archive', action: 'archive', icon: 'archive' },
	{ label: 'Delete', action: 'delete', icon: 'delete' }
], {
	onAction: (action) => {
		nui.notify({ content: `Asset action: ${action}`, banner: true });
	}
});

grid.addEventListener('contextmenu', (e) => {
	e.preventDefault();
	menu.show(e.clientX, e.clientY);
});

document.addEventListener('click', (e) => {
	const actionEl = e.target.closest('[data-action="upload"]');
	if (!actionEl) return;
	nui.notify({ content: 'Upload dialog would open here.', banner: true });
});

// ---- Dropzone ----------------------------------------------------------

document.getElementById('asset-dropzone').addEventListener('nui-dropzone-drop', (e) => {
	const zone = e.detail?.zone;
	const count = e.detail?.dataTransfer?.files?.length ?? 0;
	nui.notify({
		content: count > 0
			? `${count} file(s) dropped on "${zone}".`
			: `Files dropped on "${zone}".`,
		banner: true
	});
});

// nui-file-tree.js - Lazy-loading file explorer tree component.
//
// The component is filesystem-agnostic: the host supplies a readdir
// provider `(path) => Promise<entries>` and the tree handles expansion,
// selection, keyboard navigation (ARIA treeview), and filtering.
// Static trees without a provider are supported via loadData().

import { nui } from '../../nui.js';

// Extension → icon name (Material sprite). Dirs and unmatched files
// have their own fallbacks.
const EXT_ICONS = {
	'.md': 'article', '.markdown': 'article', '.txt': 'description',
	'.js': 'code', '.mjs': 'code', '.ts': 'code', '.jsx': 'code', '.tsx': 'code',
	'.html': 'code', '.css': 'code', '.json': 'data_object', '.py': 'code',
	'.rs': 'code', '.go': 'code', '.c': 'code', '.cpp': 'code', '.h': 'code',
	'.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.gif': 'image',
	'.webp': 'image', '.svg': 'image', '.ico': 'image',
	'.mp3': 'audio_file', '.wav': 'audio_file', '.ogg': 'audio_file', '.flac': 'audio_file',
	'.mp4': 'video_file', '.webm': 'video_file', '.mkv': 'video_file',
	'.pdf': 'picture_as_pdf',
	'.zip': 'folder_zip', '.tar': 'folder_zip', '.gz': 'folder_zip', '.7z': 'folder_zip'
};

const FILE_ICON = 'draft';
const DIR_ICON = 'folder';

function extOf(name) {
	const i = name.lastIndexOf('.');
	return i > 0 ? name.slice(i).toLowerCase() : '';
}

class NuiFileTree extends HTMLElement {
	constructor() {
		super();
		this._provider = null;
		this._root = null;
		this._staticData = null; // retained source for static-mode refresh
		this._nodes = new Map();   // path → { entry, row, group, expanded, loaded, state }
		this._filter = null;       // fn(entry) | string[] extensions | null
		this._sortFn = null;       // fn(a, b) | null → default dirs-first alpha
		this._selected = null;     // selected row element
		this._focused = null;      // roving tabindex row
		this._generation = 0;      // stale-response guard for async loads
	}

	static get observedAttributes() { return ['selectable', 'filter-ext']; }

	get selectable() { return this.getAttribute('selectable') || 'all'; }

	connectedCallback() {
		if (this.hasAttribute('data-initialized')) return;
		this.setAttribute('data-initialized', 'true');

		// Native inner element per NUI convention (auto-created in dev)
		this._nav = this.querySelector('nav');
		if (!this._nav) {
			this._nav = document.createElement('nav');
			this.appendChild(this._nav);
			console.info('nui-file-tree: auto-created inner <nav>. Include it explicitly for production.');
		}
		if (!this._nav.hasAttribute('aria-label')) {
			this._nav.setAttribute('aria-label', this.getAttribute('aria-label') || 'File explorer');
		}

		this._treeEl = document.createElement('div');
		this._treeEl.className = 'nui-file-tree';
		this._treeEl.setAttribute('role', 'tree');
		this._nav.appendChild(this._treeEl);

		this.addEventListener('keydown', (e) => this._onKey(e));
	}

	// ################################# PUBLIC API

	/**
	 * Set the directory provider: (path) => Promise<[{ name, path, kind: 'dir'|'file' }]>.
	 * Required before setRoot() unless loadData() is used.
	 */
	setProvider(fn) {
		if (typeof fn !== 'function') throw new Error('nui-file-tree: setProvider expects a function (path) => Promise<entries>');
		this._provider = fn;
	}

	/**
	 * Filter entries. fn(entry) → boolean receives every entry (dirs included).
	 * An array of extensions (['.md']) filters FILES only — dirs always pass,
	 * otherwise the tree becomes unnavigable. null shows everything (default).
	 */
	set filter(v) {
		if (v !== null && typeof v !== 'function' && !Array.isArray(v)) {
			throw new Error('nui-file-tree: filter must be a function, an array of extensions, or null');
		}
		this._filter = v;
		if (this._root) this.refresh();
	}
	get filter() { return this._filter; }

	/** Custom comparator (a, b) on entries. null → dirs first, natural alpha. */
	set sort(fn) {
		if (fn !== null && typeof fn !== 'function') throw new Error('nui-file-tree: sort must be a function or null');
		this._sortFn = fn;
		if (this._root) this.refresh();
	}
	get sort() { return this._sortFn; }

	/** Open a dynamic root: { name, path }. Requires a provider. */
	async setRoot(root) {
		if (!root || typeof root.path !== 'string') throw new Error('nui-file-tree: setRoot expects { name, path }');
		if (!this._provider) throw new Error('nui-file-tree: no provider — call setProvider() first');
		this._staticData = null;
		this._reset(root);
		await this._loadChildren(this._rootRec());
	}

	/** Render a static nested tree: { name, path?, kind: 'dir'|'file', children?: [] }. No provider needed. */
	loadData(rootNode) {
		if (!rootNode || rootNode.kind !== 'dir') throw new Error('nui-file-tree: loadData expects a root of kind "dir"');
		if (!this._treeEl) this.connectedCallback();
		this._staticData = rootNode;
		this._generation++;
		this._nodes.clear();
		this._selected = null;
		this._focused = null;
		this._root = { name: rootNode.name, path: rootNode.path || rootNode.name };
		this._treeEl.replaceChildren();
		this._buildStatic(rootNode, this._rootRec().group, 1, this._root.path);
		this._rootRec().loaded = true;
	}

	/** Re-fetch the whole tree (or one directory), preserving expansion state. */
	async refresh(path) {
		if (!this._root) return;
		const expanded = [...this._nodes.values()].filter(n => n.expanded).map(n => n.entry.path);
		if (this._staticData) {
			// Static mode: rebuild from the retained source data
			this.loadData(this._staticData);
		} else if (!path || path === this._root.path) {
			this._generation++;
			this._nodes.clear();
			this._selected = null;
			this._treeEl.replaceChildren();
			await this._loadChildren(this._rootRec());
		} else {
			const rec = this._nodes.get(path);
			if (!rec) throw new Error(`nui-file-tree: refresh target not loaded: ${path}`);
			rec.loaded = false;
			rec.group.replaceChildren();
			await this._loadChildren(rec);
		}
		for (const p of expanded) {
			const rec = this._nodes.get(p);
			if (rec && !rec.expanded) await this._expand(rec);
		}
	}

	expand(path) { const r = this._get(path); return this._expand(r); }
	collapse(path) { const r = this._get(path); this._collapse(r); }
	toggle(path) { const r = this._get(path); return r.expanded ? this._collapse(r) : this._expand(r); }

	/** Programmatic selection. Path must be loaded (expand ancestors first). */
	select(path) {
		const rec = this._get(path);
		if (rec.entry.kind === 'dir' && this.selectable === 'files') {
			throw new Error('nui-file-tree: dirs are not selectable (selectable="files")');
		}
		this._applySelection(rec);
	}

	/** Currently selected entry { name, path, kind } or null. */
	getSelected() {
		return this._selected ? this._nodes.get(this._selected.dataset.path)?.entry ?? null : null;
	}

	// ################################# INTERNALS

	_get(path) {
		const rec = this._nodes.get(path);
		if (!rec) throw new Error(`nui-file-tree: path not loaded: ${path}`);
		return rec;
	}

	_reset(root) {
		if (!this._treeEl) this.connectedCallback();
		this._generation++;
		this._nodes.clear();
		this._selected = null;
		this._focused = null;
		this._root = root;
		this._treeEl.replaceChildren();
	}

	// Creates (once) the record + DOM for a node and registers it.
	_makeNode(entry, parentGroup, level) {
		const rec = { entry, row: null, group: null, expanded: false, loaded: false, state: 'idle' };

		const row = document.createElement('div');
		row.className = 'nui-file-tree-row';
		row.setAttribute('role', 'treeitem');
		row.setAttribute('aria-level', String(level));
		row.style.setProperty('--nft-level', String(level - 1));
		row.dataset.path = entry.path;
		row.tabIndex = -1;

		let caret;
		if (entry.kind === 'dir') {
			caret = document.createElement('nui-icon');
			caret.className = 'nui-file-tree-caret';
			caret.setAttribute('decorative', '');
			caret.setAttribute('name', 'chevron_right');
			row.setAttribute('aria-expanded', 'false');
		} else {
			// Spacer keeps the icon column aligned without a nameless nui-icon
			caret = document.createElement('span');
			caret.className = 'nui-file-tree-caret';
			caret.setAttribute('aria-hidden', 'true');
			row.classList.add('nui-file-tree-leaf');
		}

		const icon = document.createElement('nui-icon');
		icon.className = 'nui-file-tree-icon';
		icon.setAttribute('decorative', '');
		icon.setAttribute('name', entry.kind === 'dir' ? DIR_ICON : (EXT_ICONS[extOf(entry.name)] || FILE_ICON));

		const name = document.createElement('span');
		name.className = 'nui-file-tree-name';
		name.textContent = entry.name;

		row.append(caret, icon, name);
		parentGroup.appendChild(row);

		rec.row = row;
		if (entry.kind === 'dir') {
			const group = document.createElement('div');
			group.className = 'nui-file-tree-group';
			group.setAttribute('role', 'group');
			group.hidden = true;
			parentGroup.appendChild(group);
			rec.group = group;
		}

		row.addEventListener('click', () => {
			this._focusRow(row);
			if (entry.kind === 'dir') {
				if (this.selectable !== 'files') this._applySelection(rec);
				this._toggle(rec);
			} else {
				if (this.selectable !== 'dirs') this._applySelection(rec);
			}
		});
		row.addEventListener('dblclick', () => {
			if (entry.kind === 'file') this._emit('nui-file-activate', { entry });
		});
		row.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			this._focusRow(row);
			this._emit('nui-file-context', { entry, x: e.clientX, y: e.clientY });
		});
		row.addEventListener('focus', () => this._focusRow(row));

		this._nodes.set(entry.path, rec);
		return rec;
	}

	_rootRec() {
		// The root itself is a virtual node: no row, children live in _treeEl.
		let rec = this._nodes.get(this._root.path);
		if (!rec) {
			rec = { entry: { name: this._root.name, path: this._root.path, kind: 'dir' }, row: null, group: this._treeEl, expanded: true, loaded: false, state: 'idle' };
			this._nodes.set(this._root.path, rec);
		}
		return rec;
	}

	async _loadChildren(rec) {
		if (!this._provider) throw new Error('nui-file-tree: no provider set');
		rec.state = 'loading';
		if (rec.row) rec.row.classList.add('nui-file-tree-loading');
		const gen = this._generation;
		try {
			const entries = await this._provider(rec.entry.path);
			if (gen !== this._generation) return; // root changed meanwhile — discard stale response
			rec.group.replaceChildren();
			const level = rec.row ? Number(rec.row.getAttribute('aria-level')) + 1 : 1;
			this._buildEntries(entries, rec.group, level);
			rec.loaded = true;
			rec.state = 'loaded';
		} catch (err) {
			rec.state = 'error';
			rec.loaded = false;
			console.error(`nui-file-tree: provider failed for ${rec.entry.path}`, err);
			this._emit('nui-tree-error', { entry: rec.entry, error: err.message });
			const msg = document.createElement('div');
			msg.className = 'nui-file-tree-note nui-file-tree-error';
			msg.textContent = 'Failed to load';
			rec.group.replaceChildren(msg);
		} finally {
			if (rec.row) rec.row.classList.remove('nui-file-tree-loading');
		}
	}

	_buildEntries(entries, group, level) {
		const visible = this._applyFilter(entries).sort(this._sortFn || defaultSort);
		if (!visible.length) {
			const empty = document.createElement('div');
			empty.className = 'nui-file-tree-note';
			empty.textContent = '(empty)';
			group.appendChild(empty);
			return;
		}
		for (const entry of visible) {
			if (typeof entry.name !== 'string' || typeof entry.path !== 'string' || (entry.kind !== 'dir' && entry.kind !== 'file')) {
				throw new Error(`nui-file-tree: provider returned malformed entry — expected { name, path, kind: 'dir'|'file' }, got ${JSON.stringify(entry)}`);
			}
			this._makeNode(entry, group, level);
		}
	}

	_buildStatic(node, group, level, parentPath) {
		const children = this._applyFilter(node.children || []);
		for (const child of children) {
			const path = child.path || `${parentPath}/${child.name}`;
			const entry = { name: child.name, path, kind: child.kind };
			const rec = this._makeNode(entry, group, level);
			if (child.kind === 'dir') {
				rec.loaded = true;
				if (child.children?.length) {
					this._buildStatic(child, rec.group, level + 1, path);
				}
				if (!rec.group.childNodes.length) {
					const empty = document.createElement('div');
					empty.className = 'nui-file-tree-note';
					empty.textContent = '(empty)';
					rec.group.appendChild(empty);
				}
			}
		}
	}

	_applyFilter(entries) {
		if (!this._filter) return entries;
		if (Array.isArray(this._filter)) {
			const exts = this._filter.map(e => e.toLowerCase());
			return entries.filter(e => e.kind === 'dir' || exts.includes(extOf(e.name)));
		}
		return entries.filter(e => this._filter(e));
	}

	async _expand(rec) {
		if (rec.entry.kind !== 'dir' || rec.expanded) return;
		rec.expanded = true;
		rec.row.setAttribute('aria-expanded', 'true');
		rec.row.classList.add('nui-file-tree-open');
		rec.group.hidden = false;
		if (!rec.loaded) await this._loadChildren(rec);
	}

	_collapse(rec) {
		if (rec.entry.kind !== 'dir' || !rec.expanded) return;
		rec.expanded = false;
		rec.row.setAttribute('aria-expanded', 'false');
		rec.row.classList.remove('nui-file-tree-open');
		rec.group.hidden = true;
	}

	_toggle(rec) {
		return rec.expanded ? this._collapse(rec) : this._expand(rec);
	}

	_applySelection(rec) {
		if (this._selected) {
			this._selected.classList.remove('nui-file-tree-selected');
			this._selected.removeAttribute('aria-selected');
		}
		this._selected = rec.row;
		rec.row.classList.add('nui-file-tree-selected');
		rec.row.setAttribute('aria-selected', 'true');
		this._emit('nui-file-select', { entry: rec.entry });
	}

	_focusRow(row) {
		if (this._focused === row) return;
		if (this._focused) this._focused.tabIndex = -1;
		this._focused = row;
		row.tabIndex = 0;
		if (document.activeElement !== row) row.focus();
	}

	_visibleRows() {
		return [...this._treeEl.querySelectorAll('.nui-file-tree-row')].filter(r => r.offsetParent !== null);
	}

	_onKey(e) {
		const row = e.target.closest?.('.nui-file-tree-row');
		if (!row) return;
		const rec = this._nodes.get(row.dataset.path);
		if (!rec) return;
		const rows = this._visibleRows();
		const idx = rows.indexOf(row);
		const isDir = rec.entry.kind === 'dir';

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				if (rows[idx + 1]) this._focusRow(rows[idx + 1]);
				break;
			case 'ArrowUp':
				e.preventDefault();
				if (rows[idx - 1]) this._focusRow(rows[idx - 1]);
				break;
			case 'ArrowRight':
				e.preventDefault();
				if (isDir && !rec.expanded) this._expand(rec);
				else if (isDir) {
					const first = rec.group.querySelector('.nui-file-tree-row');
					if (first) this._focusRow(first);
				}
				break;
			case 'ArrowLeft':
				e.preventDefault();
				if (isDir && rec.expanded) this._collapse(rec);
				else {
					const parentRow = row.parentElement.closest('.nui-file-tree-group')?.parentElement?.querySelector(':scope > .nui-file-tree-row');
					if (parentRow) this._focusRow(parentRow);
				}
				break;
			case 'Enter':
			case ' ':
				e.preventDefault();
				if (isDir) {
					if (this.selectable !== 'files') this._applySelection(rec);
					this._toggle(rec);
				} else if (this.selectable !== 'dirs') {
					this._applySelection(rec);
					this._emit('nui-file-activate', { entry: rec.entry });
				}
				break;
			case 'Home':
				e.preventDefault();
				if (rows.length) this._focusRow(rows[0]);
				break;
			case 'End':
				e.preventDefault();
				if (rows.length) this._focusRow(rows[rows.length - 1]);
				break;
		}
	}

	_emit(name, detail) {
		this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
	}
}

function defaultSort(a, b) {
	if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
	return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
}

customElements.define('nui-file-tree', NuiFileTree);

nui.components = nui.components || {};
nui.components.fileTree = {
	create(target, options = {}) {
		const el = document.createElement('nui-file-tree');
		if (options.selectable) el.setAttribute('selectable', options.selectable);
		if (options.filter) el.filter = options.filter;
		if (options.sort) el.sort = options.sort;
		(typeof target === 'string' ? document.querySelector(target) : target).appendChild(el);
		if (options.provider) el.setProvider(options.provider);
		if (options.root) {
			if (options.provider) return el.setRoot(options.root).then(() => el);
			el.loadData(options.root);
		}
		return el;
	}
};

export default nui.components.fileTree;

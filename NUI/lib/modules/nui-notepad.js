// NUI Notepad Addon — <nui-notepad>
// Spatial UX Prototype & Interactive Component for workshop.notepad
// Supports 3 non-list spatial paradigms so the user can sample & compare feel live:
//   1. "bento"     — Spatial Desk & Pin Wall (Index cards with punch-lists + sticky notes + calendar pad)
//   2. "swimlanes" — Project Context Worlds (Horizon radar bar + project columns grouping tasks & pins together)
//   3. "focus"     — Focus Workbench ("Right Now" stage card + compact post-it matrix)

import { nui } from '../../nui.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TYPE_ICONS = {
	task: 'task_alt',
	idea: 'keep',
	date: 'calendar',
	contact: 'id_card'
};

const CONTEXT_HUES = {
	personal: 342,
	arena: 206,
	infrastructure: 186,
	nspeech: 152,
	blog: 36,
	teaching: 268,
	research: 232,
	raum: 115,
	materna: 198,
	'materna-bav': 198,
	'materna-dok-tools': 198,
	'materna-tremonia': 198
};

const HUE_PALETTE = [206, 36, 152, 268, 342, 186, 232, 115];

function parseDayDiff(todayStr, dueStr) {
	if (!todayStr || !dueStr) return null;
	const t = Date.parse(todayStr + 'T00:00:00Z');
	const d = Date.parse(dueStr + 'T00:00:00Z');
	if (Number.isNaN(t) || Number.isNaN(d)) return null;
	return Math.round((d - t) / 86400000);
}

function formatDueBadge(todayStr, dueStr) {
	if (!dueStr) return null;
	const diff = parseDayDiff(todayStr, dueStr);
	if (diff === null) return { text: dueStr, tone: 'normal' };
	if (diff < 0) return { text: `${Math.abs(diff)}d late`, tone: 'overdue' };
	if (diff === 0) return { text: 'Today', tone: 'overdue' };
	if (diff === 1) return { text: 'Tomorrow', tone: 'soon' };
	if (diff <= 7) return { text: `in ${diff}d`, tone: 'soon' };
	const [, m, day] = dueStr.split('-');
	return { text: `${MONTHS[Number(m) - 1] || m} ${Number(day)}`, tone: 'normal' };
}

// "today" / "tomorrow" / "in Nd" — never a second copy of the date itself.
function formatDateRelative(daysUntil) {
	if (typeof daysUntil !== 'number' || Number.isNaN(daysUntil)) return null;
	if (daysUntil === 0) return 'today';
	if (daysUntil === 1) return 'tomorrow';
	return `in ${daysUntil}d`;
}

function el(tag, className, text) {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined && text !== null) node.textContent = text;
	return node;
}

class NuiNotepad extends HTMLElement {
	connectedCallback() {
		if (this._initialized) return;
		this._initialized = true;

		this._mode = this.getAttribute('mode') || 'swimlanes'; // 'swimlanes' | 'bento' | 'focus' | 'list'
		this._ownerFilter = this.getAttribute('owner') || 'david'; // 'david' | 'both' | 'machine'
		this._selectedId = null;
		this._spotlightId = null;
		this._composerCtx = null; // which lane/zone has its '+' composer open
		this._composerType = 'idea';

		// List-view filter / sort / search state (persists across card edits)
		this._listSearch = '';
		this._listTypeFilter = '__all__';
		this._listContextFilter = '__all__';
		this._listStatusFilter = '__all__';
		this._listSort = 'urgency'; // 'urgency' | 'title' | 'context' | 'recent'
		this._listSortDir = 'up';   // 'up' | 'down'
		this._listViewDOM = null;

		this._snapshot = null;
		this._itemsById = new Map();
		this._itemResolver = null;
		this._activeEditable = null;

		this._onDocPointerDown = (e) => {
			// Commit the focused in-place editor before any re-render detaches it —
			// a detached contenteditable never fires blur, which would silently drop the edit.
			this._flushActiveEdit();
			if (!this.contains(e.target)) {
				if (this._selectedId !== null || this._composerCtx !== null) {
					this._selectedId = null;
					this._composerCtx = null;
					this._render();
				}
				return;
			}
			// Clicking inside nui-notepad but outside the selected card or active composer dismisses them
			if (this._selectedId !== null && !e.target.closest('.np-Card[data-selected="true"]')) {
				this._selectedId = null;
				this._render();
			}
			if (this._composerCtx !== null && !e.target.closest('.np-InlineComposer') && !e.target.closest('.np-AddIconBtn')) {
				this._composerCtx = null;
				this._render();
			}
		};
		document.addEventListener('pointerdown', this._onDocPointerDown, true);

		this._onWinResize = () => {
			if (this._mode === 'list') this._fitListViewport();
		};
		window.addEventListener('resize', this._onWinResize);

		this._renderShell();
	}

	disconnectedCallback() {
		if (this._onDocPointerDown) {
			document.removeEventListener('pointerdown', this._onDocPointerDown, true);
		}
		if (this._onWinResize) {
			window.removeEventListener('resize', this._onWinResize);
		}
	}

	setItemResolver(fn) {
		this._itemResolver = fn;
	}

	_flushActiveEdit() {
		const node = this._activeEditable;
		this._activeEditable = null;
		if (node && node.isConnected) node.blur();
	}

	_cleanStepsPayload(item) {
		return (item.steps || []).filter(s => s.text && s.text.trim()).map(s => ({ done: Boolean(s.done), text: s.text.trim() }));
	}

	_syncStepCounts(item) {
		const steps = item.steps || [];
		item.stepsTotal = steps.length;
		item.stepsDone = steps.filter(s => s.done).length;
		const next = steps.find(s => !s.done && s.text);
		item.nextStep = next ? next.text : null;
		this._syncSnapshotItem(item);
	}

	_syncSnapshotItem(item) {
		const snap = this._snapshot;
		if (!snap || !item) return;
		for (const key of ['contextOpen', 'overdue', 'dueSoon', 'openTasks', 'upcoming', 'recentIdeas', 'stalePins']) {
			const rows = snap[key];
			if (!Array.isArray(rows)) continue;
			for (const row of rows) {
				if (String(row.id) !== String(item.id)) continue;
				for (const field of ['title', 'notes', 'body', 'context', 'due', 'status', 'when', 'recur', 'stepsTotal', 'stepsDone', 'nextStep', '_stale']) {
					if (item[field] !== undefined) row[field] = item[field];
				}
			}
		}
	}

	load(snapshot, fullItems = []) {
		const prevById = new Map(this._itemsById);
		this._snapshot = structuredClone(snapshot);
		this._itemsById.clear();
		this._prevById = prevById;

		const staleIds = new Set((snapshot.stalePins || []).map(p => p.id));

		for (const item of fullItems) {
			const cloned = structuredClone(item);
			if (Array.isArray(cloned.steps)) cloned._detailLoaded = true;
			// Full rows still need derivation (daysUntil, step counts) — going straight
			// into the map is why date pills rendered "Dec 8 · Dec 8".
			this._ingest(cloned);
		}

		for (const t of snapshot.overdue || []) this._ingest(t, 'task');
		for (const t of snapshot.dueSoon || []) this._ingest(t, 'task');
		for (const t of snapshot.openTasks || []) this._ingest(t, 'task');
		for (const d of snapshot.upcoming || []) this._ingest(d, 'date');
		for (const p of snapshot.recentIdeas || []) this._ingest(p, 'idea');
		for (const p of snapshot.stalePins || []) this._ingest(p, 'idea');
		this._prevById = null;

		// fullItems merge over the summary rows — re-assert the stale flag last.
		for (const id of staleIds) {
			const item = this._itemsById.get(id);
			if (item) item._stale = true;
		}

		if (!this._spotlightId) {
			const firstTask = this._getFilteredTasks()[0];
			if (firstTask) this._spotlightId = firstTask.id;
		}

		this._render();
	}

	_computeDaysUntil(whenStr, recur, todayStr) {
		if (!whenStr) return null;
		const [wy, wm, wd] = String(whenStr).split('-').map(Number);
		if (!wy || !wm || !wd) return null;
		const today = String(todayStr || this._snapshot?.today || new Date().toISOString().slice(0, 10));
		const [ty, tm, td] = today.split('-').map(Number);
		const todayUtc = Date.UTC(ty, tm - 1, td);
		if (Number.isNaN(todayUtc)) return null;
		let year = wy;
		if (recur === 'yearly') {
			year = ty;
			let targetUtc = Date.UTC(year, wm - 1, wd);
			if (targetUtc < todayUtc) targetUtc = Date.UTC(year + 1, wm - 1, wd);
			return Math.round((targetUtc - todayUtc) / 86400000);
		}
		const targetUtc = Date.UTC(year, wm - 1, wd);
		return Math.round((targetUtc - todayUtc) / 86400000);
	}

	_ingest(raw, fallbackType) {
		const existing = this._itemsById.get(raw.id) || {};
		const merged = {
			...existing,
			...raw,
			type: raw.type || fallbackType || existing.type || 'idea',
			status: raw.status || existing.status || 'open',
			owner: raw.owner || existing.owner || 'david',
			context: raw.context ?? existing.context ?? null,
			notes: raw.notes ?? existing.notes ?? null,
			body: raw.body ?? existing.body ?? null,
			ref: raw.ref ?? existing.ref ?? [],
			attachments: raw.attachments || existing.attachments || [],
			when: raw.when || existing.when || null,
			recur: raw.recur || existing.recur || null,
			daysUntil: raw.daysUntil ?? existing.daysUntil ?? null,
			promotedTo: raw.promotedTo ?? existing.promotedTo ?? null,
			phone: raw.phone || existing.phone || null,
			email: raw.email || existing.email || null,
			address: raw.address || existing.address || null,
			_stale: raw._stale !== undefined ? Boolean(raw._stale) : Boolean(existing._stale)
		};
		if ((merged.type === 'date' || merged.when) && merged.daysUntil == null && merged.when) {
			merged.daysUntil = this._computeDaysUntil(merged.when, merged.recur, this._snapshot?.today);
		}

		if (merged.type === 'task' && !Array.isArray(raw.steps)) {
			const prev = this._prevById ? this._prevById.get(raw.id) : null;
			// fullItems are ingested before the snapshot rows, so `existing` is often
			// the resolved item — a later summary row must not degrade it back to
			// nextStep-only.
			const resolved = [existing, prev].find((src) => (
				src &&
				!src._stepsPartial &&
				(src._detailLoaded || (Array.isArray(src.steps) && src.steps.length > 0)) &&
				(!merged.stepsTotal || !src.stepsTotal || src.stepsTotal === merged.stepsTotal) &&
				(merged.stepsDone == null || src.stepsDone == null || src.stepsDone === merged.stepsDone) &&
				((src.nextStep || null) === (merged.nextStep || null))
			));
			if (resolved) {
				merged.steps = resolved.steps;
				merged._steps = resolved._steps || resolved.steps;
				merged._stepsPartial = false;
				merged._detailLoaded = Boolean(resolved._detailLoaded);
				if (merged.body == null) merged.body = resolved.body ?? null;
			} else if (merged.nextStep) {
				// Summary-only row: show the one step we actually know about. Never invent
				// "Step 2…N" labels — the count comes from stepsDone/stepsTotal.
				merged.steps = [{ done: false, text: merged.nextStep }];
				merged._steps = merged.steps;
				merged._stepsPartial = true;
			} else {
				merged.steps = [];
				merged._steps = [];
				merged._stepsPartial = true;
			}
		}
		if (merged.type === 'task') {
			if (Array.isArray(merged.steps) && !merged._stepsPartial) {
				merged._steps = merged.steps;
				merged.stepsTotal = merged.steps.length;
				merged.stepsDone = merged.steps.filter(s => s.done).length;
				if (Array.isArray(existing.steps)) merged._detailLoaded = true;
			}
		}
		this._itemsById.set(merged.id, merged);
		return merged;
	}

	reconcileItem(tempId, serverItem) {
		if (serverItem?.id == null) return null;
		let existing = null;
		for (const [key, item] of this._itemsById) {
			if (String(key) === String(tempId)) {
				existing = item;
				this._itemsById.delete(key);
				break;
			}
		}
		const merged = this._ingest({ ...(existing || {}), ...serverItem, id: serverItem.id }, existing?.type);
		if (String(this._selectedId) === String(tempId)) this._selectedId = serverItem.id;
		if (String(this._spotlightId) === String(tempId)) this._spotlightId = serverItem.id;
		this._render();
		return merged;
	}

	// Host-view lifecycle hooks — the component owns no paint loop, so these
	// only exist so hosts can activate/deactivate it uniformly with other views.
	activate() {
		if (this._mode === 'list') {
			requestAnimationFrame(() => this._fitListViewport());
		}
	}

	deactivate() {}

	_fitListViewport() {
		const dom = this._listViewDOM;
		if (!dom || !dom.panel.isConnected || this._mode !== 'list') return;
		const top = dom.panel.getBoundingClientRect().top;
		if (top <= 0) return;
		const avail = Math.max(360, Math.floor(window.innerHeight - top - 24));
		dom.panel.style.setProperty('--np-list-panel-h', `${avail}px`);
		dom.scroller.wake?.();
	}

	_matchesFilter(item) {
		if (!item || item.status === 'cancelled' || item.status === 'promoted') return false;
		if (this._ownerFilter === 'david' && item.owner !== 'david') return false;
		if (this._ownerFilter === 'machine' && item.owner !== 'machine') return false;
		return true;
	}

	_getFilteredTasks() {
		const today = this._snapshot?.today || '2026-10-12';
		const tasks = [];
		for (const item of this._itemsById.values()) {
			if (item.type === 'task' && this._matchesFilter(item)) {
				tasks.push(item);
			}
		}
		tasks.sort((a, b) => {
			if ((a.status === 'done') !== (b.status === 'done')) {
				return a.status === 'done' ? 1 : -1;
			}
			const da = a.due ? parseDayDiff(today, a.due) : 9999;
			const db = b.due ? parseDayDiff(today, b.due) : 9999;
			return da - db;
		});
		return tasks;
	}

	_getFilteredPins() {
		const pins = [];
		for (const item of this._itemsById.values()) {
			if (item.type === 'idea' && this._matchesFilter(item)) {
				pins.push(item);
			}
		}
		return pins;
	}

	_getFilteredDates() {
		const dates = [];
		for (const item of this._itemsById.values()) {
			if (item.type !== 'date' || !this._matchesFilter(item)) continue;
			// Past one-off dates are history, not "upcoming" — keep them out of the strip.
			if (item.daysUntil == null || item.daysUntil < 0) continue;
			dates.push(item);
		}
		dates.sort((a, b) => a.daysUntil - b.daysUntil);
		return dates;
	}

	async _ensureDetail(id) {
		const item = this._itemsById.get(id);
		if (!item) return null;
		if (!item._detailLoaded && this._itemResolver) {
			const detail = await this._itemResolver(id);
			if (detail) {
				Object.assign(item, detail, { _detailLoaded: true });
				if (item.type === 'task' && Array.isArray(item.steps)) {
					item._steps = item.steps;
					item._stepsPartial = false;
					item.stepsTotal = item.steps.length;
					item.stepsDone = item.steps.filter(s => s.done).length;
					const next = item.steps.find(s => !s.done && s.text);
					item.nextStep = next ? next.text : null;
				}
			}
		}
		return item;
	}

	_toggleStep(task, stepIndex) {
		const steps = task.steps || [];
		if (!steps[stepIndex]) return;
		// Summary-only rows carry just the known next step, whose real index is stepsDone.
		const base = task._stepsPartial ? (task.stepsDone || 0) : 0;
		const realIndex = base + stepIndex;
		steps[stepIndex].done = !steps[stepIndex].done;
		const nowDone = steps[stepIndex].done;
		if (task._stepsPartial) {
			task.stepsDone = Math.max(0, Math.min(task.stepsTotal || 0, (task.stepsDone || 0) + (nowDone ? 1 : -1)));
			task.nextStep = nowDone ? null : steps[stepIndex].text;
		} else {
			task.stepsDone = steps.filter(s => s.done).length;
			task.stepsTotal = steps.length;
			const next = steps.find(s => !s.done);
			task.nextStep = next ? next.text : null;
		}
		this._syncSnapshotItem(task);
		this._emitMutate('step-toggle', {
			id: task.id,
			stepIndex: realIndex,
			done: nowDone,
			partialSteps: Boolean(task._stepsPartial),
			steps: task._stepsPartial ? null : this._cleanStepsPayload(task),
			status: task.status
		});
		this._render();
	}

	_promotePin(pin) {
		pin.type = 'task';
		pin.steps = [];
		pin.stepsDone = 0;
		pin.stepsTotal = 0;
		this._selectedId = pin.id;
		this._spotlightId = pin.id;
		this._emitMutate('promote', { id: pin.id });
		this._render();
	}

	_quickAdd(title, type, context) {
		const clean = title.trim();
		if (!clean) return;
		const id = Date.now();
		const owner = this._ownerFilter === 'machine' ? 'machine' : 'david';
		const ctx = context || 'general';
		const today = this._snapshot?.today || '2026-10-12';

		const newItem = {
			id,
			type,
			title: clean,
			owner,
			context: ctx,
			status: 'open',
			createdAt: new Date().toISOString(),
			notes: null,
			body: null,
			ref: []
		};
		if (type === 'task') {
			newItem.due = null;
			newItem.steps = [];
			newItem.stepsDone = 0;
			newItem.stepsTotal = 0;
		} else if (type === 'date') {
			newItem.when = today;
			newItem.daysUntil = 0;
			newItem.recur = 'none';
		}
		this._itemsById.set(id, newItem);
		this._composerCtx = null;
		this._emitMutate('add', newItem);
		this._render();
	}

	_emitMutate(action, detail) {
		this.dispatchEvent(new CustomEvent('nui-notepad-mutate', {
			bubbles: true,
			detail: { action, ...detail }
		}));
	}

	_renderShell() {
		this.innerHTML = '';
		const shell = el('div', 'np-shell');
		this._topBarEl = el('div', 'np-TopBar');
		this._stageEl = el('div', 'np-Stage');
		shell.append(this._topBarEl, this._stageEl);
		this.appendChild(shell);
	}

	_render() {
		if (!this._snapshot) return;
		this._renderTopBar();
		this._renderStage();
	}

	_renderTopBar() {
		this._topBarEl.innerHTML = '';

		const leftControls = el('div', 'np-TopControls');

		// 1. View Switcher (Swimlanes / Desk / Focus / List) in a tonal well
		const tabs = el('div', 'np-Seg');
		for (const m of [
			{ id: 'swimlanes', label: 'Swimlanes' },
			{ id: 'bento', label: 'Desk' },
			{ id: 'focus', label: 'Focus' },
			{ id: 'list', label: 'List' }
		]) {
			const btn = el('button', 'np-SegBtn', m.label);
			btn.type = 'button';
			btn.setAttribute('aria-pressed', String(this._mode === m.id));
			btn.addEventListener('click', () => {
				this._mode = m.id;
				this._render();
			});
			tabs.appendChild(btn);
		}

		// 2. Owner Switcher (David / All / Machine)
		const owners = el('div', 'np-Seg');
		for (const o of [
			{ id: 'david', label: 'David' },
			{ id: 'both', label: 'All' },
			{ id: 'machine', label: 'Machine' }
		]) {
			const b = el('button', 'np-SegBtn', o.label);
			b.type = 'button';
			b.setAttribute('aria-pressed', String(this._ownerFilter === o.id));
			b.addEventListener('click', () => {
				this._ownerFilter = o.id;
				this._render();
			});
			owners.appendChild(b);
		}

		leftControls.append(tabs, owners);

		// Right: Upcoming Calendar Dates ONLY (no duplicate tasks!)
		const datesStrip = el('div', 'np-DatesStrip');
		const dates = this._getFilteredDates();
		for (const d of dates) {
			const pill = el('button', 'np-DatePill');
			pill.type = 'button';
			const [, m, day] = (d.when || '').split('-');
			const dateStr = (m && day) ? `${MONTHS[Number(m) - 1]} ${Number(day)}` : d.when;
			const relText = formatDateRelative(d.daysUntil);
			const whenText = relText && relText !== dateStr ? `${dateStr} · ${relText}` : dateStr;
			const calIcon = document.createElement('nui-icon');
			calIcon.setAttribute('name', 'calendar');
			pill.append(
				calIcon,
				el('span', null, this._cleanTitle(d.title)),
				el('span', 'np-DateWhen', whenText)
			);
			pill.addEventListener('click', () => {
				this._selectedId = this._selectedId === d.id ? null : d.id;
				this._render();
			});
			datesStrip.appendChild(pill);
		}

		this._topBarEl.append(leftControls, datesStrip);
	}

	_renderStage() {
		if (this._mode === 'list') {
			this._renderListMode(this._stageEl);
			return;
		}
		if (this._listViewDOM) {
			this._listViewDOM = null;
		}
		this._stageEl.innerHTML = '';
		if (this._mode === 'bento') {
			this._renderBentoMode(this._stageEl);
		} else if (this._mode === 'swimlanes') {
			this._renderSwimlanesMode(this._stageEl);
		} else {
			this._renderFocusMode(this._stageEl);
		}
	}

	// ── Minimalist Add Strip (Exact nui-blocks-editor add_circle button) ──────

	_buildAddStrip(ctxKey, defaultType = 'idea') {
		const wrap = el('div', 'np-AddStrip');

		if (this._composerCtx === ctxKey) {
			const comp = el('form', 'np-InlineComposer');
			const inp = el('input', 'np-ComposerInput');
			inp.type = 'text';
			inp.placeholder = this._composerType === 'task' ? 'New task…' : 'New pin…';

			const bar = el('div', 'np-ComposerBar');
			const seg = el('div', 'np-Seg');
			for (const [tId, tLabel] of [['idea', 'Pin'], ['task', 'Task']]) {
				const b = el('button', 'np-SegBtn', tLabel);
				b.type = 'button';
				b.dataset.type = tId;
				const segIcon = document.createElement('nui-icon');
				segIcon.setAttribute('name', this._typeIconName(tId));
				b.prepend(segIcon);
				b.setAttribute('aria-pressed', String(this._composerType === tId));
				b.addEventListener('click', () => {
					this._composerType = tId;
					inp.placeholder = tId === 'task' ? 'New task…' : 'New pin…';
					for (const child of seg.children) {
						child.setAttribute('aria-pressed', String(child === b));
					}
					inp.focus();
				});
				seg.appendChild(b);
			}

			const hint = el('span', 'np-DateWhen', 'Enter ↵');
			bar.append(seg, hint);
			comp.append(inp, bar);

			comp.addEventListener('submit', (e) => {
				e.preventDefault();
				if (inp.value.trim()) {
					this._quickAdd(inp.value, this._composerType, ctxKey);
				} else {
					this._composerCtx = null;
					this._render();
				}
			});
			inp.addEventListener('keydown', (e) => {
				if (e.key === 'Escape') {
					e.stopPropagation();
					this._composerCtx = null;
					this._render();
				}
			});

			wrap.appendChild(comp);
			requestAnimationFrame(() => inp.focus());
			return wrap;
		}

		const btn = el('button', 'np-AddIconBtn');
		btn.type = 'button';
		btn.title = `Add to ${ctxKey}`;
		btn.setAttribute('aria-label', `Add to ${ctxKey}`);
		const icon = document.createElement('nui-icon');
		icon.setAttribute('name', 'add_circle');
		btn.appendChild(icon);
		btn.addEventListener('click', () => {
			this._composerCtx = ctxKey;
			this._composerType = defaultType;
			this._selectedId = null;
			this._render();
		});
		wrap.appendChild(btn);
		return wrap;
	}

	// ── Cards: Zero Chrome at Rest, 0px Size Change on Select ─────────────────

	_cleanTitle(raw) {
		return (raw || '').replace(/^DEMO:\s*/i, '').replace(/^pin\s*[—–-]\s*/i, '');
	}

	_typeIconName(type) {
		return TYPE_ICONS[type] || 'label';
	}

	_contextHue(ctx) {
		const key = String(ctx ?? '');
		if (Object.hasOwn(CONTEXT_HUES, key)) return CONTEXT_HUES[key];
		if (!key) return HUE_PALETTE[0];
		let hash = 0;
		for (let i = 0; i < key.length; i++) {
			hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
		}
		return HUE_PALETTE[hash % HUE_PALETTE.length];
	}

	_wakeVirtualScroll(el) {
		el.closest('nui-virtual-scroll')?.wake?.();
	}

	_buildCard(item, { showContext = false } = {}) {
		const isSelected = this._selectedId === item.id;
		const today = this._snapshot?.today || '2026-10-12';
		const dueInfo = item.type === 'task' ? formatDueBadge(today, item.due) : null;

		const card = el('article', 'np-Card');
		card.dataset.type = item.type;
		if (item.context) {
			card.style.setProperty('--ctx-hue', String(this._contextHue(item.context)));
		}
		if (dueInfo?.tone && item.status !== 'done') {
			card.dataset.tone = dueInfo.tone;
		}
		if (item.status === 'done') {
			card.dataset.done = 'true';
		}
		if (isSelected) {
			card.dataset.selected = 'true';
			const zone = this._buildContextZone(item);
			card.appendChild(zone);
			requestAnimationFrame(() => {
				const scroller = card.closest('nui-virtual-scroll');
				if (scroller) {
					const cRect = card.getBoundingClientRect();
					const sRect = scroller.getBoundingClientRect();
					if (cRect.top - sRect.top < 44) {
						zone.dataset.flip = 'below';
					}
				}
			});
		}

		// Header row: Exact same <h3> whether selected or not -> 0px layout shift!
		const headRow = el('div', 'np-CardHeadRow');

		const typeIcon = el('span', 'np-TypeIcon');
		typeIcon.dataset.type = item.type;
		typeIcon.title = item.type === 'idea' ? 'Pin' : item.type;
		const typeIconGlyph = document.createElement('nui-icon');
		typeIconGlyph.setAttribute('name', this._typeIconName(item.type));
		typeIcon.appendChild(typeIconGlyph);

		const titleEl = el('h3', 'np-CardTitle', this._cleanTitle(item.title));
		if (isSelected) {
			titleEl.dataset.editTitle = item.id;
			titleEl.setAttribute('contenteditable', 'plaintext-only');
			titleEl.setAttribute('spellcheck', 'false');
			titleEl.addEventListener('input', () => {
				this._wakeVirtualScroll(card);
			});
			titleEl.addEventListener('focus', () => {
				this._activeEditable = titleEl;
			});
			titleEl.addEventListener('blur', () => {
				if (this._activeEditable === titleEl) this._activeEditable = null;
				const next = titleEl.textContent.trim();
				if (next && next !== item.title) {
					item.title = next;
					this._syncSnapshotItem(item);
					this._emitMutate('update', { id: item.id, patch: { title: item.title } });
				}
			});
			titleEl.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					titleEl.blur();
				} else if (e.key === 'Escape') {
					titleEl.blur();
					this._selectedId = null;
					this._render();
				}
			});
		}
		headRow.appendChild(typeIcon);
		headRow.appendChild(titleEl);

		const headRight = el('div', 'np-CardHeadRight');
		if (showContext && this._mode !== 'swimlanes' && item.context) {
			headRight.appendChild(el('span', 'np-ContextBadge', `#${item.context}`));
		}
		if (item.type === 'task' && (item.stepsTotal || 0) > 0) {
			const progress = el('span', 'np-StepProgress', `${item.stepsDone || 0}/${item.stepsTotal}`);
			progress.dataset.complete = item.stepsDone === item.stepsTotal && item.stepsTotal > 0 ? 'true' : 'false';
			headRight.appendChild(progress);
		}

		if (item._stale && item.status === 'open') {
			const staleBadge = el('span', 'np-StaleBadge', 'stale');
			staleBadge.title = 'Open for >60 days';
			headRight.appendChild(staleBadge);
		}

		if (dueInfo) {
			const stamp = el('span', 'np-DueText', dueInfo.text);
			stamp.dataset.tone = dueInfo.tone;
			headRight.appendChild(stamp);
		} else if (item.type === 'date' && item.when) {
			const [, m, day] = String(item.when).split('-');
			const dateStr = (m && day) ? `${MONTHS[Number(m) - 1]} ${Number(day)}` : item.when;
			const relText = formatDateRelative(item.daysUntil);
			const relStr = relText && relText !== dateStr ? `${dateStr} · ${relText}` : dateStr;
			const stamp = el('span', 'np-DueText', relStr);
			if (typeof item.daysUntil === 'number' && item.daysUntil <= 3) stamp.dataset.tone = 'soon';
			headRight.appendChild(stamp);
		}
		headRow.appendChild(headRight);
		card.appendChild(headRow);

		// Notes: Exact same <p> whether selected or not -> 0px layout shift!
		// Contact items have no notes field of their own — their subtitle is the
		// joined contact channels, rendered read-only so editing cannot overwrite notes.
		const contactLine = item.type === 'contact'
			? [item.phone, item.email, item.address].filter(Boolean).join(' · ')
			: '';
		const editingNote = Boolean(isSelected && item._editingNote);
		if (item.notes || editingNote || (!item.notes && contactLine)) {
			const noteEl = el('p', 'np-CardNotes', item.notes || contactLine || '');
			noteEl.dataset.placeholder = 'Add a note…';
			if (!item.notes && contactLine) {
				noteEl.classList.add('np-CardContact');
			} else if (isSelected) {
				noteEl.dataset.editNotes = item.id;
				noteEl.setAttribute('contenteditable', 'plaintext-only');
				noteEl.setAttribute('spellcheck', 'false');
				noteEl.addEventListener('input', () => {
					this._wakeVirtualScroll(card);
				});
				noteEl.addEventListener('focus', () => {
					this._activeEditable = noteEl;
				});
				noteEl.addEventListener('blur', () => {
					if (this._activeEditable === noteEl) this._activeEditable = null;
					const next = noteEl.textContent.trim();
					item._editingNote = false;
					if (next === (item.notes || '')) return;
					item.notes = next || null;
					this._syncSnapshotItem(item);
					this._emitMutate('update', { id: item.id, patch: { notes: item.notes } });
				});
				noteEl.addEventListener('keydown', (e) => {
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault();
						noteEl.blur();
					} else if (e.key === 'Escape') {
						noteEl.blur();
						this._selectedId = null;
						this._render();
					}
				});
			}
			card.appendChild(noteEl);
		}

		// Steps (for tasks): Exact same .np-StepRow DOM whether selected or not -> 0px layout shift!
		if (item.type === 'task') {
			const steps = item.steps || [];
			if (steps.length > 0) {
				const stepsBox = el('div', 'np-StepsList');
				let foundNext = false;
				steps.forEach((st, idx) => {
					const row = el('div', 'np-StepRow');
					row.dataset.done = String(!!st.done);
					if (!st.done && !foundNext) {
						row.dataset.next = 'true';
						foundNext = true;
					}

					const toggleBtn = el('button', 'np-StepToggle', st.done ? '✓' : '·');
					toggleBtn.type = 'button';
					toggleBtn.addEventListener('click', (e) => {
						e.stopPropagation();
						this._toggleStep(item, idx);
					});

					const txt = el('span', 'np-StepText', st.text);
					if (isSelected && !item._stepsPartial) {
						txt.dataset.editStep = String(idx);
						txt.setAttribute('contenteditable', 'plaintext-only');
						txt.setAttribute('spellcheck', 'false');
						txt.addEventListener('click', (e) => e.stopPropagation());
						txt.addEventListener('input', () => {
							this._wakeVirtualScroll(card);
						});
						txt.addEventListener('focus', () => {
							this._activeEditable = txt;
						});
						txt.addEventListener('blur', () => {
							if (this._activeEditable === txt) this._activeEditable = null;
							const next = txt.textContent.trim();
							if (next === (st.text || '')) return;
							const hadText = Boolean(st.text && st.text.trim());
							st.text = next;
							item.steps[idx] = st;
							this._syncStepCounts(item);
							// An emptied step drops out of the payload (backend rejects empty
							// step text), but the removal still has to reach the server.
							if (next || hadText) {
								this._emitMutate('update', { id: item.id, patch: { steps: this._cleanStepsPayload(item) } });
							}
						});
						txt.addEventListener('keydown', (e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								st.text = txt.textContent.trim();
								item.steps.splice(idx + 1, 0, { done: false, text: '' });
								this._syncStepCounts(item);
								this._render();
								requestAnimationFrame(() => {
									const allStepTexts = card.querySelectorAll('.np-StepText');
									allStepTexts[idx + 1]?.focus();
								});
							} else if (e.key === 'Backspace' && !txt.textContent.trim()) {
								e.preventDefault();
								item.steps.splice(idx, 1);
								this._syncStepCounts(item);
								this._emitMutate('update', { id: item.id, patch: { steps: this._cleanStepsPayload(item) } });
								this._render();
							} else if (e.key === 'Escape') {
								txt.blur();
								this._selectedId = null;
								this._render();
							}
						});
					} else {
						row.addEventListener('click', (e) => {
							e.stopPropagation();
							this._toggleStep(item, idx);
						});
					}

					row.append(toggleBtn, txt);
					stepsBox.appendChild(row);
				});

				card.appendChild(stepsBox);
			}
		}

		// Body: long-form payload, delivered only by notepad.get. Shown once it has
		// content, or while selected so an empty body can be authored in place.
		const hasBody = item.body !== null && item.body !== undefined;
		if ((isSelected && hasBody) || (!isSelected && item.body)) {
			const bodyBox = el('div', 'np-CardBody');
			bodyBox.appendChild(el('span', 'np-CardBodyLabel', 'BODY'));
			const bodyText = el('div', 'np-CardBodyText', item.body || '');
			bodyText.dataset.editBody = item.id;
			bodyText.dataset.placeholder = 'Write the long form…';
			if (isSelected) {
				bodyText.setAttribute('contenteditable', 'plaintext-only');
				bodyText.setAttribute('spellcheck', 'false');
				bodyText.addEventListener('click', (e) => e.stopPropagation());
				bodyText.addEventListener('input', () => {
					this._wakeVirtualScroll(card);
				});
				bodyText.addEventListener('focus', () => {
					this._activeEditable = bodyText;
				});
				bodyText.addEventListener('blur', () => {
					if (this._activeEditable === bodyText) this._activeEditable = null;
					const next = bodyText.textContent.trim();
					if (next === (item.body || '')) return;
					item.body = next || null;
					this._syncSnapshotItem(item);
					this._emitMutate('update', { id: item.id, patch: { body: item.body } });
				});
				bodyText.addEventListener('keydown', (e) => {
					if (e.key === 'Escape') {
						bodyText.blur();
						this._selectedId = null;
						this._render();
					}
				});
			}
			bodyBox.appendChild(bodyText);
			card.appendChild(bodyBox);
		}

		// References & attachments (clickable)
		const refsList = Array.isArray(item.ref) ? item.ref : [];
		const attachments = Array.isArray(item.attachments) ? item.attachments : [];
		if (isSelected && (refsList.length > 0 || attachments.length > 0)) {
			const refsRow = el('div', 'np-RefsRow');
			for (const r of refsList) {
				const chip = /^(https?:\/\/|\/)/.test(r)
					? el('a', 'np-RefChip np-RefChip--link', r)
					: el('span', 'np-RefChip', r);
				if (chip.tagName === 'A') {
					chip.href = r;
					chip.target = '_blank';
					chip.rel = 'noopener';
					chip.addEventListener('click', (e) => e.stopPropagation());
				}
				refsRow.appendChild(chip);
			}
			for (const att of attachments) {
				const href = att.url || (att.ref && att.ref.startsWith('notepad:') ? '/api/notepad/files/' + att.ref.slice('notepad:'.length) : '#');
				const chip = el('a', 'np-RefChip np-RefChip--link', `📎 ${att.name || att.ref || 'file'}`);
				chip.href = href;
				chip.target = '_blank';
				chip.rel = 'noopener';
				chip.addEventListener('click', (e) => e.stopPropagation());
				refsRow.appendChild(chip);
			}
			card.appendChild(refsRow);
		}

		if (!isSelected) {
			card.addEventListener('click', async () => {
				await this._ensureDetail(item.id);
				this._selectedId = item.id;
				this._composerCtx = null;
				this._render();
			});
		}

		return card;
	}

	// Floating context toolbar (modeled on nui-table-editor's .nte-zone — pure buttons, zero overlap)
	_buildContextZone(item) {
		const zone = el('div', 'np-ContextZone');
		zone.addEventListener('click', (e) => e.stopPropagation());

		const makeIconBtn = (iconName, label, onClick, isDanger = false) => {
			const btn = el('button', 'np-ZoneBtn');
			btn.type = 'button';
			if (isDanger) btn.dataset.danger = 'true';
			if (iconName) {
				const ic = document.createElement('nui-icon');
				ic.setAttribute('name', iconName);
				btn.appendChild(ic);
			}
			if (label) {
				btn.appendChild(el('span', null, label));
			}
			btn.addEventListener('click', onClick);
			return btn;
		};

		if (item.type === 'idea') {
			zone.appendChild(makeIconBtn('check_circle', 'To Task', () => this._promotePin(item)));
		} else if (item.type === 'task') {
			const doneBtn = makeIconBtn('check_circle', item.status === 'done' ? 'Reopen' : 'Done', () => {
				item.status = item.status === 'done' ? 'open' : 'done';
				this._selectedId = null;
				this._syncSnapshotItem(item);
				this._emitMutate('complete', { id: item.id, status: item.status });
				this._render();
			});
			doneBtn.dataset.completeItem = item.id;
			zone.appendChild(doneBtn);

			zone.appendChild(el('span', 'np-ZoneSep'));

			// Step adder button inside toolbar -> card stays 0px taller when merely selected!
			zone.appendChild(makeIconBtn('add', 'Step', () => {
				item.steps = item.steps || [];
				// Empty text, not a "New step" placeholder string — a placeholder that
				// lives in the DOM would be persisted verbatim by the next steps update.
				item.steps.push({ done: false, text: '' });
				this._syncStepCounts(item);
				this._render();
				requestAnimationFrame(() => {
					const texts = this.querySelectorAll('.np-Card[data-selected="true"] .np-StepText');
					const last = texts[texts.length - 1];
					if (last) {
						last.focus();
						const sel = window.getSelection();
						const range = document.createRange();
						range.selectNodeContents(last);
						sel.removeAllRanges();
						sel.addRange(range);
					}
				});
			}));

			zone.appendChild(el('span', 'np-ZoneSep'));

			// Clean Due button with hidden native date input (no wide browser date widget in toolbar!)
			const today = this._snapshot?.today || '2026-10-12';
			const dueInfo = formatDueBadge(today, item.due);
			const hiddenDate = el('input', 'np-HiddenDate');
			hiddenDate.type = 'date';
			hiddenDate.value = item.due || '';
			hiddenDate.dataset.dueInput = item.id;
			hiddenDate.addEventListener('change', () => {
				item.due = hiddenDate.value || null;
				this._syncSnapshotItem(item);
				this._emitMutate('update', { id: item.id, patch: { due: item.due } });
				this._render();
			});
			const dueBtn = makeIconBtn('calendar', dueInfo ? dueInfo.text : 'Due', () => {
				if (typeof hiddenDate.showPicker === 'function') {
					hiddenDate.showPicker();
				} else {
					hiddenDate.click();
				}
			});
			dueBtn.appendChild(hiddenDate);
			zone.appendChild(dueBtn);
		}

		if (!item.notes && !item._editingNote) {
			zone.appendChild(el('span', 'np-ZoneSep'));
			zone.appendChild(makeIconBtn('add', 'Note', () => {
				item._editingNote = true;
				this._render();
				requestAnimationFrame(() => {
					this.querySelector('.np-Card[data-selected="true"] .np-CardNotes')?.focus();
				});
			}));
		}

		if (item.body === null || item.body === undefined) {
			zone.appendChild(el('span', 'np-ZoneSep'));
			const bodyBtn = makeIconBtn('add', 'Body', () => {
				item.body = '';
				this._selectedId = item.id;
				this._render();
				requestAnimationFrame(() => {
					this.querySelector(`[data-edit-body="${item.id}"]`)?.focus();
				});
			});
			bodyBtn.dataset.addBody = item.id;
			zone.appendChild(bodyBtn);
		}

		// Context cycle button (clean button, no native select stretching).
		// Contacts have no context field — the backend rejects it for that type.
		if (item.type !== 'contact') {
			zone.appendChild(el('span', 'np-ZoneSep'));
			const contexts = this._snapshot?.contexts || ['arena', 'blog', 'teaching', 'general'];
			const ctxBtn = makeIconBtn(null, `#${item.context || 'general'}`, () => {
				const idx = contexts.indexOf(item.context);
				item.context = contexts[(idx + 1) % contexts.length];
				this._syncSnapshotItem(item);
				this._emitMutate('update', { id: item.id, patch: { context: item.context } });
				this._render();
			});
			ctxBtn.dataset.contextCycle = item.id;
			zone.appendChild(ctxBtn);
		}

		zone.appendChild(el('span', 'np-ZoneSep'));

		const delBtn = makeIconBtn('delete', null, () => {
			item.status = 'cancelled';
			this._selectedId = null;
			this._emitMutate('remove', { id: item.id });
			this._render();
		}, true);
		delBtn.title = 'Remove';
		zone.appendChild(delBtn);

		return zone;
	}

	// ── PARADIGM 1: Spatial Desk & Pin Wall (Bento) ───────────────────────────

	_renderBentoMode(container) {
		const tasks = this._getFilteredTasks();
		const pins = this._getFilteredPins();

		const layout = el('div', 'np-BentoLayout');

		const leftLane = el('section', 'np-Swimlane');
		const leftHead = el('div', 'np-LaneHeader');
		leftHead.append(
			el('span', 'np-LaneName', 'Tasks'),
			el('span', 'np-LaneCount', String(tasks.length))
		);
		const leftBody = el('div', 'np-LaneBody');
		const indexGrid = el('div', 'np-IndexGrid');
		for (const t of tasks) {
			indexGrid.appendChild(this._buildCard(t, { showContext: true }));
		}
		leftBody.appendChild(indexGrid);
		leftLane.append(leftHead, leftBody, this._buildAddStrip('arena', 'task'));

		const rightLane = el('section', 'np-Swimlane');
		const rightHead = el('div', 'np-LaneHeader');
		rightHead.append(
			el('span', 'np-LaneName', 'Pins'),
			el('span', 'np-LaneCount', String(pins.length))
		);
		const rightBody = el('div', 'np-LaneBody');
		const pinWall = el('div', 'np-PinWall');
		for (const p of pins) {
			pinWall.appendChild(this._buildCard(p, { showContext: true }));
		}
		rightBody.appendChild(pinWall);
		rightLane.append(rightHead, rightBody, this._buildAddStrip('arena', 'idea'));

		layout.append(leftLane, rightLane);
		container.appendChild(layout);
	}

	// ── PARADIGM 2: Project Context Swimlanes ─────────────────────────────────

	_renderSwimlanesMode(container) {
		const tasks = this._getFilteredTasks();
		const pins = this._getFilteredPins();

		const byContext = new Map();
		for (const item of [...tasks, ...pins]) {
			const ctx = item.context || 'general';
			if (!byContext.has(ctx)) byContext.set(ctx, []);
			byContext.get(ctx).push(item);
		}

		const grid = el('div', 'np-SwimlanesGrid');
		for (const [ctx, items] of byContext.entries()) {
			const lane = el('section', 'np-Swimlane');
			lane.style.setProperty('--ctx-hue', String(this._contextHue(ctx)));

			const head = el('div', 'np-LaneHeader');
			head.append(
				el('span', 'np-LaneName', ctx),
				el('span', 'np-LaneCount', String(items.length))
			);

			const body = el('div', 'np-LaneBody');
			for (const item of items) {
				body.appendChild(this._buildCard(item, { showContext: false }));
			}

			lane.append(head, body, this._buildAddStrip(ctx, 'idea'));
			grid.appendChild(lane);
		}
		container.appendChild(grid);
	}

	// ── PARADIGM 3: Focus Stage ("Right Now" Workbench + Tile Matrix) ─────────

	_renderFocusMode(container) {
		const tasks = this._getFilteredTasks();
		const pins = this._getFilteredPins();

		const deck = el('div', 'np-FocusDeck');

		const stage = el('section', 'np-Swimlane');
		const activeTask = tasks.find(t => t.id === this._spotlightId) || tasks[0];

		const stageHead = el('div', 'np-LaneHeader');
		stageHead.append(
			el('span', 'np-LaneName', 'Focus'),
			el('span', 'np-LaneCount', String(tasks.length))
		);
		stage.appendChild(stageHead);

		const stageBody = el('div', 'np-LaneBody');
		if (activeTask) {
			stageBody.appendChild(this._buildCard(activeTask, { showContext: true }));
		}
		stage.appendChild(stageBody);

		if (tasks.length > 1) {
			const queue = el('div', 'np-StageQueue');
			for (const t of tasks) {
				const qBtn = el('button', 'np-QueuePill', this._cleanTitle(t.title));
				qBtn.type = 'button';
				qBtn.setAttribute('aria-current', String(t.id === activeTask?.id));
				qBtn.addEventListener('click', () => {
					this._spotlightId = t.id;
					this._render();
				});
				queue.appendChild(qBtn);
			}
			stage.appendChild(queue);
		}

		const rightLane = el('section', 'np-Swimlane');
		const rightHead = el('div', 'np-LaneHeader');
		rightHead.append(
			el('span', 'np-LaneName', 'Pins'),
			el('span', 'np-LaneCount', String(pins.length))
		);
		const rightBody = el('div', 'np-LaneBody');
		const matrix = el('div', 'np-PinWall');
		for (const p of pins) {
			matrix.appendChild(this._buildCard(p, { showContext: true }));
		}
		rightBody.appendChild(matrix);
		rightLane.append(rightHead, rightBody, this._buildAddStrip('arena', 'idea'));

		deck.append(stage, rightLane);
		container.appendChild(deck);
	}

	// ── PARADIGM 4: All-Items List View (nui-list header + nui-virtual-scroll) ─

	_getListFilteredItems() {
		const today = this._snapshot?.today || '2026-10-12';
		const q = (this._listSearch || '').trim().toLowerCase();
		const items = [];

		for (const item of this._itemsById.values()) {
			if (!this._matchesFilter(item)) continue;

			if (this._listTypeFilter !== '__all__' && item.type !== this._listTypeFilter) continue;
			if (this._listContextFilter !== '__all__' && (item.context || 'general') !== this._listContextFilter) continue;

			if (this._listStatusFilter !== '__all__') {
				const diff = item.type === 'task' && item.due ? parseDayDiff(today, item.due) : null;
				if (this._listStatusFilter === 'overdue') {
					if (item.type !== 'task' || item.status === 'done' || diff === null || diff > 0) continue;
				} else if (this._listStatusFilter === 'soon') {
					if (item.type !== 'task' || item.status === 'done' || diff === null || diff <= 0 || diff > 7) continue;
				} else if (this._listStatusFilter === 'open') {
					if (item.status === 'done') continue;
				} else if (this._listStatusFilter === 'done') {
					if (item.status !== 'done') continue;
				}
			}

			if (q) {
				const hay = [
					this._cleanTitle(item.title),
					item.notes || '',
					item.body || '',
					item.context || '',
					item.type || '',
					...(item.steps || []).map(s => s.text || ''),
					...(item.ref || [])
				].join(' ').toLowerCase();
				if (!hay.includes(q)) continue;
			}

			items.push(item);
		}

		const dir = this._listSortDir === 'down' ? -1 : 1;
		items.sort((a, b) => {
			if (this._listSort === 'title') {
				return dir * this._cleanTitle(a.title).localeCompare(this._cleanTitle(b.title));
			}
			if (this._listSort === 'context') {
				const ca = a.context || 'general';
				const cb = b.context || 'general';
				if (ca !== cb) return dir * ca.localeCompare(cb);
				return this._cleanTitle(a.title).localeCompare(this._cleanTitle(b.title));
			}
			if (this._listSort === 'recent') {
				const ta = a.createdAt ? Date.parse(a.createdAt) : Number(a.id) || 0;
				const tb = b.createdAt ? Date.parse(b.createdAt) : Number(b.id) || 0;
				return dir * (tb - ta);
			}
			// Default: urgency / due horizon (done items sink to bottom)
			if ((a.status === 'done') !== (b.status === 'done')) {
				return a.status === 'done' ? 1 : -1;
			}
			const rankScore = (it) => {
				if (it.type === 'task' && it.due) {
					const d = parseDayDiff(today, it.due);
					if (d !== null) return d;
				}
				if (it.type === 'date' && typeof it.daysUntil === 'number') {
					return it.daysUntil;
				}
				return it.type === 'task' ? 500 : 1000;
			};
			const diff = rankScore(a) - rankScore(b);
			if (diff !== 0) return dir * diff;
			return this._cleanTitle(a.title).localeCompare(this._cleanTitle(b.title));
		});

		return items;
	}

	_collectContexts() {
		const set = new Set(this._snapshot?.contexts || []);
		for (const item of this._itemsById.values()) {
			if (item.context) set.add(item.context);
		}
		return [...set].sort();
	}

	_renderListMode(container) {
		if (!this._listViewDOM || !container.contains(this._listViewDOM.panel)) {
			container.innerHTML = '';
			this._listViewDOM = this._createListViewDOM();
			container.appendChild(this._listViewDOM.panel);
		}
		this._syncListViewHeader();
		this._updateListViewItems();
		this._fitListViewport();
		requestAnimationFrame(() => this._fitListViewport());
	}

	_createListViewDOM() {
		const panel = el('section', 'np-Swimlane np-ListPanel');

		// Header: mirrors .nui-list-header (left: sort + direction + filter selects, right: search + count)
		const header = el('div', 'np-ListHeader');
		const controlsLeft = el('div', 'np-ListHeaderLeft');

		const makeSelect = (label, options, initialValue, onChange) => {
			const wrap = document.createElement('nui-select');
			wrap.setAttribute('size', 'small');
			const sel = document.createElement('select');
			sel.setAttribute('aria-label', label);
			const grp = document.createElement('optgroup');
			grp.label = label;
			for (const opt of options) {
				const o = document.createElement('option');
				o.value = opt.value;
				o.textContent = opt.label;
				if (opt.value === initialValue) o.selected = true;
				grp.appendChild(o);
			}
			sel.appendChild(grp);
			wrap.appendChild(sel);

			wrap.addEventListener('nui-change', (e) => {
				const v = e.detail?.values?.[0] ?? sel.value;
				if (v !== undefined) onChange(v);
			});
			sel.addEventListener('change', () => onChange(sel.value));
			return { wrap, sel, grp };
		};

		const sortCtl = makeSelect('Sort by', [
			{ value: 'urgency', label: 'Sort: Urgency' },
			{ value: 'title', label: 'Sort: Title (A–Z)' },
			{ value: 'context', label: 'Sort: Context' },
			{ value: 'recent', label: 'Sort: Newest' }
		], this._listSort, (val) => {
			if (this._listSort === val) return;
			this._listSort = val;
			this._updateListViewItems(false);
		});

		const sortDirBtn = el('button', `np-SortDirBtn ${this._listSortDir}`);
		sortDirBtn.type = 'button';
		sortDirBtn.title = 'Toggle sort direction';
		sortDirBtn.setAttribute('aria-label', 'Toggle sort direction');
		const arrowIcon = document.createElement('nui-icon');
		arrowIcon.setAttribute('name', 'arrow');
		sortDirBtn.appendChild(arrowIcon);
		sortDirBtn.addEventListener('click', () => {
			this._listSortDir = this._listSortDir === 'up' ? 'down' : 'up';
			sortDirBtn.className = `np-SortDirBtn ${this._listSortDir}`;
			this._updateListViewItems(false);
		});

		const typeCtl = makeSelect('Type', [
			{ value: '__all__', label: 'All Types' },
			{ value: 'task', label: 'Tasks' },
			{ value: 'idea', label: 'Pins' },
			{ value: 'date', label: 'Dates' },
			{ value: 'contact', label: 'Contacts' }
		], this._listTypeFilter, (val) => {
			if (this._listTypeFilter === val) return;
			this._listTypeFilter = val;
			this._updateListViewItems(false);
		});

		const ctxCtl = makeSelect('Context', [
			{ value: '__all__', label: 'All Contexts' },
			...this._collectContexts().map(c => ({ value: c, label: `#${c}` }))
		], this._listContextFilter, (val) => {
			if (this._listContextFilter === val) return;
			this._listContextFilter = val;
			this._updateListViewItems(false);
		});

		const statusCtl = makeSelect('Status', [
			{ value: '__all__', label: 'All Status' },
			{ value: 'overdue', label: 'Overdue' },
			{ value: 'soon', label: 'Due Soon (≤7d)' },
			{ value: 'open', label: 'Open' },
			{ value: 'done', label: 'Completed' }
		], this._listStatusFilter, (val) => {
			if (this._listStatusFilter === val) return;
			this._listStatusFilter = val;
			this._updateListViewItems(false);
		});

		controlsLeft.append(sortCtl.wrap, sortDirBtn, typeCtl.wrap, ctxCtl.wrap, statusCtl.wrap);

		// Right side: Search input + matched count
		const controlsRight = el('div', 'np-ListHeaderRight');
		const searchWrap = document.createElement('nui-input');
		searchWrap.setAttribute('type', 'search');
		searchWrap.setAttribute('clearable', '');
		const searchInp = document.createElement('input');
		searchInp.type = 'search';
		searchInp.placeholder = 'Search title, steps, notes, #context…';
		searchInp.value = this._listSearch;
		searchWrap.appendChild(searchInp);

		const onSearch = (val) => {
			if (this._listSearch === val) return;
			this._listSearch = val;
			this._updateListViewItems(false);
		};
		searchWrap.addEventListener('nui-input', (e) => onSearch(e.detail?.value ?? searchInp.value));
		searchInp.addEventListener('input', () => onSearch(searchInp.value));

		const countBadge = el('span', 'np-LaneCount', '0');
		controlsRight.append(searchWrap, countBadge);

		header.append(controlsLeft, controlsRight);

		// Body: variable-height virtual scroller (<nui-virtual-scroll>)
		const scroller = document.createElement('nui-virtual-scroll');
		scroller.className = 'np-ListViewport';
		scroller.setAttribute('threshold', '12');
		scroller.setAttribute('margin', '220');

		const emptyEl = el('div', 'np-ListEmpty', 'No items match the current filters.');
		emptyEl.hidden = true;

		const addStripHost = el('div', 'np-ListAddHost');

		panel.append(header, scroller, emptyEl, addStripHost);

		return {
			panel,
			header,
			sortCtl,
			sortDirBtn,
			typeCtl,
			ctxCtl,
			statusCtl,
			searchInp,
			countBadge,
			scroller,
			emptyEl,
			addStripHost,
			knownContextsKey: ''
		};
	}

	_syncListViewHeader() {
		const dom = this._listViewDOM;
		if (!dom) return;

		const contexts = this._collectContexts();
		const key = contexts.join(',');
		if (key !== dom.knownContextsKey) {
			dom.knownContextsKey = key;
			const items = [
				{ value: '__all__', label: 'All Contexts' },
				...contexts.map(c => ({ value: c, label: `#${c}` }))
			];
			if (dom.ctxCtl.wrap.setItems) {
				dom.ctxCtl.wrap.setItems([{ group: 'Context', options: items }]);
				dom.ctxCtl.wrap.setValue(this._listContextFilter);
			}
		}
	}

	_updateListViewItems(preserveScroll = true) {
		const dom = this._listViewDOM;
		if (!dom) return;

		const filtered = this._getListFilteredItems();
		const total = [...this._itemsById.values()].filter(it => this._matchesFilter(it)).length;
		dom.countBadge.textContent = filtered.length === total
			? `${filtered.length} items`
			: `${filtered.length} of ${total}`;

		const cards = filtered.map(item => this._buildCard(item, { showContext: true }));

		if (cards.length === 0) {
			dom.scroller.clear?.();
			dom.scroller.hidden = true;
			dom.emptyEl.hidden = false;
		} else {
			dom.scroller.hidden = false;
			dom.emptyEl.hidden = true;
			if (dom.scroller.setItems) {
				dom.scroller.setItems(cards, { preserveScroll });
			} else {
				dom.scroller.replaceChildren(...cards);
			}
		}

		const targetCtx = this._listContextFilter !== '__all__' ? this._listContextFilter : 'general';
		const targetType = this._listTypeFilter === 'task' ? 'task' : 'idea';
		dom.addStripHost.replaceChildren(this._buildAddStrip(targetCtx, targetType));
	}
}

if (!customElements.get('nui-notepad')) {
	customElements.define('nui-notepad', NuiNotepad);
}

export { NuiNotepad };
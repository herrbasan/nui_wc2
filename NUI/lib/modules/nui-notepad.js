// NUI Notepad Addon — <nui-notepad>
// Spatial UX Prototype & Interactive Component for workshop.notepad
// Supports 3 non-list spatial paradigms so the user can sample & compare feel live:
//   1. "bento"     — Spatial Desk & Pin Wall (Index cards with punch-lists + sticky notes + calendar pad)
//   2. "swimlanes" — Project Context Worlds (Horizon radar bar + project columns grouping tasks & pins together)
//   3. "focus"     — Focus Workbench ("Right Now" stage card + compact post-it matrix)

import { nui } from '../../nui.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

		this._onDocPointerDown = (e) => {
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

		this._renderShell();
	}

	disconnectedCallback() {
		if (this._onDocPointerDown) {
			document.removeEventListener('pointerdown', this._onDocPointerDown, true);
		}
	}

	setItemResolver(fn) {
		this._itemResolver = fn;
	}

	load(snapshot, fullItems = []) {
		this._snapshot = structuredClone(snapshot);
		this._itemsById.clear();

		for (const item of fullItems) {
			this._itemsById.set(item.id, structuredClone(item));
		}

		const ingest = (row, fallbackType) => {
			const existing = this._itemsById.get(row.id) || {};
			const merged = {
				type: row.type || fallbackType || existing.type || 'idea',
				status: row.status || existing.status || 'open',
				owner: row.owner || existing.owner || 'david',
				context: row.context ?? existing.context ?? null,
				notes: row.notes ?? existing.notes ?? null,
				body: existing.body ?? null,
				ref: existing.ref ?? row.ref ?? [],
				...existing,
				...row
			};
			if (merged.type === 'task' && !Array.isArray(merged.steps)) {
				const total = merged.stepsTotal || 0;
				const doneCount = merged.stepsDone || 0;
				const steps = [];
				for (let i = 0; i < total; i++) {
					const isNext = i === doneCount && merged.nextStep;
					steps.push({
						done: i < doneCount,
						text: isNext ? merged.nextStep : `Step ${i + 1}`
					});
				}
				merged.steps = steps;
			}
			this._itemsById.set(merged.id, merged);
		};

		for (const t of snapshot.overdue || []) ingest(t, 'task');
		for (const t of snapshot.dueSoon || []) ingest(t, 'task');
		for (const t of snapshot.openTasks || []) ingest(t, 'task');
		for (const d of snapshot.upcoming || []) ingest(d, 'date');
		for (const p of snapshot.recentIdeas || []) ingest(p, 'idea');
		for (const p of snapshot.stalePins || []) ingest(p, 'idea');

		if (!this._spotlightId) {
			const firstTask = this._getFilteredTasks()[0];
			if (firstTask) this._spotlightId = firstTask.id;
		}

		this._render();
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
			if (item.type === 'date' && this._matchesFilter(item)) {
				dates.push(item);
			}
		}
		dates.sort((a, b) => (a.daysUntil ?? 999) - (b.daysUntil ?? 999));
		return dates;
	}

	async _ensureDetail(id) {
		const item = this._itemsById.get(id);
		if (!item) return null;
		if (!item._detailLoaded && this._itemResolver) {
			const detail = await this._itemResolver(id);
			if (detail) {
				Object.assign(item, detail, { _detailLoaded: true });
			}
		}
		return item;
	}

	_toggleStep(task, stepIndex) {
		if (!Array.isArray(task.steps) || !task.steps[stepIndex]) return;
		task.steps[stepIndex].done = !task.steps[stepIndex].done;
		task.stepsDone = task.steps.filter(s => s.done).length;
		task.stepsTotal = task.steps.length;
		const next = task.steps.find(s => !s.done);
		task.nextStep = next ? next.text : null;
		if (task.stepsDone === task.stepsTotal && task.stepsTotal > 0) {
			task.status = 'done';
		} else {
			task.status = 'open';
		}
		this._emitMutate('step-toggle', { id: task.id, stepIndex, done: task.steps[stepIndex].done });
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
			const relStr = d.daysUntil !== undefined ? `in ${d.daysUntil}d` : dateStr;
			const calIcon = document.createElement('nui-icon');
			calIcon.setAttribute('name', 'calendar');
			pill.append(
				calIcon,
				el('span', null, this._cleanTitle(d.title)),
				el('span', 'np-DateWhen', `${dateStr} · ${relStr}`)
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

	_wakeVirtualScroll(el) {
		el.closest('nui-virtual-scroll')?.wake?.();
	}

	_buildCard(item, { showContext = false } = {}) {
		const isSelected = this._selectedId === item.id;
		const today = this._snapshot?.today || '2026-10-12';
		const dueInfo = item.type === 'task' ? formatDueBadge(today, item.due) : null;

		const card = el('article', 'np-Card');
		card.dataset.type = item.type;
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
		const titleEl = el('h3', 'np-CardTitle', this._cleanTitle(item.title));
		if (isSelected) {
			titleEl.setAttribute('contenteditable', 'plaintext-only');
			titleEl.setAttribute('spellcheck', 'false');
			titleEl.addEventListener('input', () => {
				item.title = titleEl.textContent.trim();
				this._wakeVirtualScroll(card);
			});
			titleEl.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					titleEl.blur();
				} else if (e.key === 'Escape') {
					this._selectedId = null;
					this._render();
				}
			});
		}
		headRow.appendChild(titleEl);

		if (dueInfo) {
			const stamp = el('span', 'np-DueText', dueInfo.text);
			stamp.dataset.tone = dueInfo.tone;
			headRow.appendChild(stamp);
		} else if (item.type === 'date' && item.when) {
			const [, m, day] = String(item.when).split('-');
			const dateStr = (m && day) ? `${MONTHS[Number(m) - 1]} ${Number(day)}` : item.when;
			const relStr = item.daysUntil !== undefined ? `${dateStr} · in ${item.daysUntil}d` : dateStr;
			const stamp = el('span', 'np-DueText', relStr);
			if (item.daysUntil !== undefined && item.daysUntil <= 3) stamp.dataset.tone = 'soon';
			headRow.appendChild(stamp);
		}
		if (showContext && item.context) {
			headRow.appendChild(el('span', 'np-DueText', `#${item.context}`));
		}
		card.appendChild(headRow);

		// Notes: Exact same <p> whether selected or not -> 0px layout shift!
		if (item.notes || (isSelected && item._editingNote)) {
			const noteEl = el('p', 'np-CardNotes', item.notes || '');
			noteEl.dataset.placeholder = 'Add a note…';
			if (isSelected) {
				noteEl.setAttribute('contenteditable', 'plaintext-only');
				noteEl.setAttribute('spellcheck', 'false');
				noteEl.addEventListener('input', () => {
					item.notes = noteEl.textContent.trim() || null;
					this._wakeVirtualScroll(card);
				});
				noteEl.addEventListener('keydown', (e) => {
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault();
						noteEl.blur();
					} else if (e.key === 'Escape') {
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
					if (isSelected) {
						txt.setAttribute('contenteditable', 'plaintext-only');
						txt.setAttribute('spellcheck', 'false');
						txt.addEventListener('click', (e) => e.stopPropagation());
						txt.addEventListener('input', () => {
							this._wakeVirtualScroll(card);
							st.text = txt.textContent.trim();
						});
						txt.addEventListener('keydown', (e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								item.steps.splice(idx + 1, 0, { done: false, text: '' });
								item.stepsTotal = item.steps.length;
								this._render();
								requestAnimationFrame(() => {
									const allStepTexts = card.querySelectorAll('.np-StepText');
									allStepTexts[idx + 1]?.focus();
								});
							} else if (e.key === 'Backspace' && !txt.textContent.trim()) {
								e.preventDefault();
								item.steps.splice(idx, 1);
								item.stepsTotal = item.steps.length;
								item.stepsDone = item.steps.filter(s => s.done).length;
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

		// References (only shown when selected if present)
		if (isSelected && item.ref && item.ref.length) {
			const refsRow = el('div', 'np-RefsRow');
			for (const r of item.ref) {
				refsRow.appendChild(el('span', 'np-RefChip', r));
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
			zone.appendChild(makeIconBtn('check_circle', item.status === 'done' ? 'Reopen' : 'Done', () => {
				item.status = item.status === 'done' ? 'open' : 'done';
				this._selectedId = null;
				this._emitMutate('complete', { id: item.id });
				this._render();
			}));

			zone.appendChild(el('span', 'np-ZoneSep'));

			// Step adder button inside toolbar -> card stays 0px taller when merely selected!
			zone.appendChild(makeIconBtn('add', 'Step', () => {
				item.steps = item.steps || [];
				item.steps.push({ done: false, text: 'New step' });
				item.stepsTotal = item.steps.length;
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
			hiddenDate.addEventListener('change', () => {
				item.due = hiddenDate.value || null;
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

		zone.appendChild(el('span', 'np-ZoneSep'));

		// Context cycle button (clean button, no native select stretching)
		const contexts = this._snapshot?.contexts || ['arena', 'blog', 'teaching', 'general'];
		zone.appendChild(makeIconBtn(null, `#${item.context || 'general'}`, () => {
			const idx = contexts.indexOf(item.context);
			item.context = contexts[(idx + 1) % contexts.length];
			this._render();
		}));

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
				if (it.type === 'date' && it.daysUntil !== undefined) {
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
			{ value: 'date', label: 'Dates' }
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
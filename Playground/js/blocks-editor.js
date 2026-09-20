// NUI MD-Blocks Visual Editor
// Supports Webpages, Documents, and Slideshows

import '../../NUI/lib/modules/nui-rich-text.js';

export function initBlocksEditor(element, params, nui) {
	const { util } = nui;

	// Elements
	const modeSelect = element.querySelector('#editor-target-mode');
	const chromePanel = element.querySelector('#editor-chrome-panel');
	const chromeHeaderInput = element.querySelector('#chrome-header-input');
	const chromeFooterInput = element.querySelector('#chrome-footer-input');
	const sectionsContainer = element.querySelector('#editor-sections-container');
	const btnAddSecTop = element.querySelector('#btn-add-section-top');
	const btnAddSecBottom = element.querySelector('#btn-add-section-bottom');
	const btnLoadSample = element.querySelector('#btn-load-sample');
	const btnCopyMd = element.querySelector('#btn-copy-md');
	const viewSwitcher = element.querySelector('#editor-view-switcher');
	const paneCanvas = element.querySelector('#pane-canvas');
	const panePreview = element.querySelector('#pane-preview');
	const paneRaw = element.querySelector('#pane-raw');
	const workspace = element.querySelector('.editor-workspace');
	const rawEditor = element.querySelector('#raw-markdown-editor');
	const btnSyncRaw = element.querySelector('#btn-sync-raw-to-visual');
	const livePreview = element.querySelector('#live-markdown-preview');
	const previewBadge = element.querySelector('#preview-mode-badge');
	const btnEditFrontmatter = element.querySelector('#btn-edit-frontmatter');
	const metaTitleDisplay = element.querySelector('[data-meta-title]');

	// Current State
	let currentDoc = createDefaultDoc();
	let currentMode = 'web';
	let isSyncing = false;

	function createDefaultDoc() {
		return {
			frontmatter: { title: 'Untitled Document' },
			mains: [
				{
					attrs: {},
					sections: [
						{
							attrs: { id: 'sec-1', label: 'Hero', preset: 'cover' },
							vars: [],
							nodes: [
								{
									type: 'block',
									attrs: { id: 'block-1' },
									nodes: [
										{
											type: 'md',
											lines: [
												'![NUI artwork — plate 1](images/nui_1.webp)',
												'',
												'# Welcome to NUI Blocks',
												'',
												'A visual editor for **MD-Blocks** documents.'
											]
										}
									]
								}
							]
						},
						{
							attrs: { id: 'sec-2', label: 'Section 2', preset: 'band' },
							vars: [],
							nodes: [
								{
									type: 'block',
									attrs: { id: 'block-2', preset: 'lead' },
									nodes: [
										{
											type: 'md',
											lines: [
												'## Sections and blocks',
												'',
												'Sections group content — a section can wear a colored **band** or become a **hero** with a media background. Blocks are the movable units inside.'
											]
										}
									]
								}
							]
						}
					]
				}
			]
		};
	}

	// Normalize unannotated markdown runs into explicit blocks for visual editing
	function normalizeDoc(doc) {
		if (!doc || !doc.mains) return doc;
		for (const main of doc.mains) {
			for (const sec of main.sections || []) {
				const newNodes = [];
				for (const n of sec.nodes || []) {
					if (n.type === 'md') {
						newNodes.push({
							type: 'block',
							attrs: { id: generateId('b') },
							nodes: [n]
						});
					} else {
						newNodes.push(n);
					}
				}
				sec.nodes = newNodes;
			}
		}
		return doc;
	}

	// ── Target Mode Switching ──
	function setTargetMode(mode) {
		currentMode = mode;
		if (mode === 'slides') {
			chromePanel.style.display = 'block';
			previewBadge.textContent = 'Slideshow View';
		} else if (mode === 'document') {
			chromePanel.style.display = 'none';
			previewBadge.textContent = 'Document (Print) View';
		} else {
			chromePanel.style.display = 'none';
			previewBadge.textContent = 'Webpage / CMS View';
		}
		syncToOutputs();
	}

	if (modeSelect) {
		modeSelect.addEventListener('nui-change', (e) => {
			const val = e.detail?.values?.[0] || modeSelect.querySelector('select')?.value || 'web';
			setTargetMode(val);
		});
		modeSelect.querySelector('select')?.addEventListener('change', (e) => {
			setTargetMode(e.target.value);
		});
	}

	// ── Chrome Inputs for Slides ──
	function updateChromeFromDoc() {
		const main = currentDoc.mains?.[0];
		if (!main) return;
		let headerBlock = null;
		let footerBlock = null;
		for (const sec of main.sections || []) {
			for (const n of sec.nodes || []) {
				if (n.type === 'block' && n.attrs?.repeat === 'header') headerBlock = n;
				if (n.type === 'block' && n.attrs?.repeat === 'footer') footerBlock = n;
			}
		}
		if (chromeHeaderInput) {
			chromeHeaderInput.value = headerBlock ? getBlockText(headerBlock) : '';
		}
		if (chromeFooterInput) {
			chromeFooterInput.value = footerBlock ? getBlockText(footerBlock) : '';
		}
	}

	function applyChromeToDoc() {
		const main = currentDoc.mains?.[0];
		if (!main || !main.sections?.length) return;
		const sec = main.sections[0];
		for (const s of main.sections) {
			s.nodes = (s.nodes || []).filter(n => !(n.type === 'block' && (n.attrs?.repeat === 'header' || n.attrs?.repeat === 'footer')));
		}
		const headVal = chromeHeaderInput?.value?.trim();
		const footVal = chromeFooterInput?.value?.trim();
		if (headVal) {
			sec.nodes.unshift({
				type: 'block',
				attrs: { repeat: 'header' },
				nodes: [{ type: 'md', lines: [headVal] }]
			});
		}
		if (footVal) {
			sec.nodes.push({
				type: 'block',
				attrs: { repeat: 'footer' },
				nodes: [{ type: 'md', lines: [footVal] }]
			});
		}
		syncToOutputs();
	}

	chromeHeaderInput?.addEventListener('input', applyChromeToDoc);
	chromeFooterInput?.addEventListener('input', applyChromeToDoc);

	// ── Frontmatter Management ──
	function updateFrontmatterSummary() {
		if (metaTitleDisplay) {
			metaTitleDisplay.textContent = currentDoc.frontmatter?.title || 'Untitled Document';
		}
	}

	btnEditFrontmatter?.addEventListener('click', async () => {
		const title = currentDoc.frontmatter?.title || '';
		const res = await nui.components.dialog.prompt('Document Metadata', '', {
			fields: [
				{ id: 'title', label: 'Document Title', value: title }
			]
		});
		if (res && res.title !== undefined) {
			currentDoc.frontmatter = currentDoc.frontmatter || {};
			currentDoc.frontmatter.title = res.title;
			updateFrontmatterSummary();
			syncToOutputs();
		}
	});

	// Sections reorder by drag — the container is a nui-sortable in the page
	// markup; on commit the DOM order is mirrored into the data (commitSortOrder).
	// Block lists and column contents get the same wiring at render time.
	sectionsContainer.addEventListener('nui-sortable-change', () => {
		const main = currentDoc.mains?.[0];
		if (main) commitSortOrder(sectionsContainer, main, 'sections');
	});

	// ── Render Sections Canvas ──
	function renderVisualEditor() {
		sectionsContainer.innerHTML = '';
		const main = currentDoc.mains?.[0];
		if (!main || !main.sections) return;

		updateFrontmatterSummary();
		updateChromeFromDoc();

		main.sections.forEach((sec, sIdx) => {
			const hero = isHeroSection(sec);
			const secEl = document.createElement('nui-sortable-item');
			secEl.className = 'editor-section-card' + (hero ? ' section-hero' : '');
			secEl.dataset.nodeIndex = sIdx;

			// Header
			const header = document.createElement('div');
			header.className = 'section-card-header';

			const titleGroup = document.createElement('div');
			titleGroup.className = 'section-title-group';
			titleGroup.innerHTML = `
				<span class="drag-handle"><nui-icon name="drag_indicator"></nui-icon></span>
				<span class="section-idx-badge">${sIdx + 1}</span>
				<input type="text" class="section-label-input" value="${escapeHtml(sec.attrs?.label || 'Section ' + (sIdx + 1))}" placeholder="Section Title">
			`;

			// Template chip — the section's current function, derived from its state
			// (never stored separately; the preset + content shape ARE the template).
			const chip = document.createElement('span');
			chip.className = 'section-template-chip';
			const chipText = hero ? 'Hero' : (String(sec.attrs?.preset || '').startsWith('band') ? 'Band' : '');
			chip.textContent = chipText;
			chip.style.display = chipText ? '' : 'none';
			titleGroup.appendChild(chip);

			const labelInput = titleGroup.querySelector('.section-label-input');
			labelInput.addEventListener('change', (e) => {
				sec.attrs = sec.attrs || {};
				sec.attrs.label = e.target.value;
				syncToOutputs();
			});

			const controlsGroup = document.createElement('div');
			controlsGroup.className = 'section-controls-group';

			// Section options live behind the pen, not as permanent dropdowns — the
			// template decides which options exist. The pen carries an id because the panel
			// is wired to it by `for`, and the platform does the toggling.
			const optsTriggerId = `section-opts-trigger-${sIdx}`;
			const optsBtn = createNuiIconButton('edit', 'Section options');
			optsBtn.id = optsTriggerId;
			controlsGroup.appendChild(optsBtn);

			controlsGroup.appendChild(createNuiIconButton('close', 'Delete Section', () => deleteSection(sIdx)));

			header.appendChild(titleGroup);
			header.appendChild(controlsGroup);
			secEl.appendChild(header);

			// Content Body (Nodes)
			const contentBody = document.createElement('div');
			contentBody.className = 'section-content-body';

			// A hero section holds exactly one media block (template rule), so it gets
			// no add-block strips — the media card is the whole section.
			if (!hero) {
				contentBody.appendChild(addStripTop(() => openInsertBlockPalette(sec, 0)));
			}

			// Render Nodes — the list is a nui-sortable: drag order IS node order.
			const nodesContainer = document.createElement('nui-sortable');
			nodesContainer.className = 'section-nodes-list';
			nodesContainer.addEventListener('nui-sortable-change', () => commitSortOrder(nodesContainer, sec, 'nodes'));

			(sec.nodes || []).forEach((node, nIdx) => {
				// Skip repeat blocks in the visual section list (handled in Chrome panel)
				if (node.type === 'block' && (node.attrs?.repeat === 'header' || node.attrs?.repeat === 'footer')) {
					return;
				}

				const nodeEl = renderNode(node, sec, nIdx);
				nodesContainer.appendChild(nodeEl);

				// Add strip after each block
				if (!hero) {
					nodesContainer.appendChild(addStripBottom(() => openInsertBlockPalette(sec, nIdx + 1)));
				}
			});

			contentBody.appendChild(nodesContainer);
			secEl.appendChild(contentBody);
			sectionsContainer.appendChild(secEl);
			applyCoverPreview(secEl, sec);

			// Only now is the gear reachable by id, which is how the panel finds its trigger.
			buildSectionOptions(sec, chip, header, optsTriggerId);

			// Add strip between sections
			sectionsContainer.appendChild(addStripBottom(() => openSectionTemplateDialog(sIdx + 1), 'section-divider'));
		});
	}

	// ── Render Node (Leaf Block, Columns, Var) ──
	function renderNode(node, parentContainer, nodeIdx) {
		const nodeCard = document.createElement('nui-sortable-item');
		nodeCard.className = 'editor-block-card';
		nodeCard.dataset.nodeIndex = nodeIdx;

		if (node.type === 'columns') {
			nodeCard.classList.add('editor-columns-card');
			renderColumnsNode(nodeCard, node, parentContainer, nodeIdx);
			return nodeCard;
		}

		if (node.type === 'var') {
			nodeCard.classList.add('editor-var-card');
			renderVarNode(nodeCard, node, parentContainer, nodeIdx);
			return nodeCard;
		}

		// Leaf Block — the type is fixed: chosen in the insert palette, derived
		// structurally on load (blockType), never switched afterwards. The type
		// owns the body editor and the style list.
		const bType = blockType(node);
		if (bType === 'media') {
			nodeCard.classList.add('editor-media-card');
			renderMediaBlockNode(nodeCard, node, parentContainer, nodeIdx);
			return nodeCard;
		}

		if (bType === 'link') {
			nodeCard.classList.add('editor-link-card');
			renderLinkBlockNode(nodeCard, node, parentContainer, nodeIdx);
			return nodeCard;
		}

		// Table = prose-shaped body editor (the RTE roundtrips pipe tables and
		// has row/column context ops), but its own style list.
		if (bType === 'table') {
			nodeCard.classList.add('editor-table-card');
			renderLeafBlockNode(nodeCard, node, parentContainer, nodeIdx, TABLE_PRESETS);
			return nodeCard;
		}

		renderLeafBlockNode(nodeCard, node, parentContainer, nodeIdx);
		return nodeCard;
	}

	// Shared by every block card. `presets` is the style table for the preset
	// select — filtered by block type, since the type is fixed at creation and
	// only styles matching its shape are offered. `onToggleRaw` is omitted for
	// blocks with no raw mode; `onPresetChange` lets a type react to a style
	// change (e.g. prose revealing the icon picker for image:icon).
	function buildBlockHeader(node, parentContainer, nodeIdx, presets, onToggleRaw, onPresetChange) {
		const header = document.createElement('div');
		header.className = 'block-card-header';

		const left = document.createElement('div');
		left.className = 'block-header-left';
		left.innerHTML = `
			<span class="drag-handle"><nui-icon name="drag_indicator"></nui-icon></span>
			<span class="block-idx-badge">${nodeIdx + 1}</span>
			<span class="block-style-label">Style:</span>
		`;

		const presetSelectWrap = document.createElement('nui-select');
		presetSelectWrap.setAttribute('size', 'small');
		const currentPreset = node.attrs?.preset || '';
		// A preset this table doesn't know (e.g. `image:hero:bleed`) must still show
		// as itself — silently displaying the first option would misreport the block.
		const options = presets.some(p => p.value === currentPreset)
			? presets
			: [{ value: currentPreset, label: currentPreset }, ...presets];
		const nativeSelect = document.createElement('select');
		nativeSelect.innerHTML = options.map(({ value, label }) =>
			`<option value="${value}" ${currentPreset === value ? 'selected' : ''}>${label}</option>`
		).join('');
		presetSelectWrap.appendChild(nativeSelect);
		left.appendChild(presetSelectWrap);
		customElements.upgrade(presetSelectWrap);

		presetSelectWrap.addEventListener('nui-change', (e) => {
			const val = e.detail?.values?.[0] ?? '';
			node.attrs = node.attrs || {};
			if (val) node.attrs.preset = val;
			else delete node.attrs.preset;
			onPresetChange?.(val);
			syncToOutputs();
		});

		const right = document.createElement('div');
		right.className = 'block-header-right';
		if (onToggleRaw) right.appendChild(createNuiIconButton('code', 'Toggle Code / WYSIWYG', onToggleRaw));
		right.appendChild(createNuiIconButton('close', 'Delete', () => deleteNode(parentContainer, nodeIdx)));

		header.appendChild(left);
		header.appendChild(right);
		return header;
	}

	// A media block's body is not prose: it is an image set with a lead image and
	// a caption. `images[0]` is the lead — the prominent plate in a gallery preset,
	// the figure in a single-image one. The markdown is still the only state.
	function renderMediaBlockNode(nodeCard, node, parentContainer, nodeIdx) {
		let { images, caption: captionLines } = parseMediaBlock(getBlockText(node).split('\n'));
		let isRawMode = false;

		const body = document.createElement('div');
		body.className = 'block-card-body media-block-body';

		// Preview of the lead image, with the two ways an image gets in.
		const preview = document.createElement('div');
		preview.className = 'media-preview';

		const frame = document.createElement('div');
		frame.className = 'media-frame';

		// In cover sections the caption renders as an OVERLAY inside the ratio area
		// (a strip is mostly caption, not image). The canvas mirrors that with a
		// read-only ghost so the frame is an honest preview of the rendered cover.
		const frameCaption = document.createElement('div');
		frameCaption.className = 'frame-caption';
		frame.appendChild(frameCaption);

		const controls = document.createElement('div');
		controls.className = 'media-controls';

		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.accept = 'image/*';
		fileInput.multiple = true;
		fileInput.style.display = 'none';
		fileInput.addEventListener('change', () => {
			for (const file of fileInput.files) {
				addImage({ src: URL.createObjectURL(file), alt: file.name, local: true });
			}
			fileInput.value = '';
		});
		controls.appendChild(fileInput);
		controls.appendChild(createNuiIconButton('upload', 'Upload from disk', () => fileInput.click()));
		controls.appendChild(createNuiIconButton('folder', 'Choose from the media library', () => pickImages()));

		preview.appendChild(frame);
		preview.appendChild(controls);

		// Compact row: the preview takes the width, the thumbnails stack in a
		// vertical rail beside it. Width is the plentiful axis in the editor
		// canvas, height the scarce one.
		const row = document.createElement('div');
		row.className = 'media-body-row';
		row.appendChild(preview);

		// The block's image set, lead first. The rail is a nui-sortable: drag
		// order IS the image order, and the first item is the lead. Adding
		// happens through the preview's upload/browse buttons.
		const side = document.createElement('div');
		side.className = 'media-side';
		const strip = document.createElement('nui-sortable');
		strip.className = 'media-thumbs';
		strip.setAttribute('data-layout', 'grid');
		side.appendChild(strip);

		row.appendChild(side);
		body.appendChild(row);

		// Everything after the images is the caption.
		const captionBlock = document.createElement('div');
		captionBlock.className = 'media-caption';
		const richTextEl = document.createElement('nui-rich-text');
		const rawTextArea = document.createElement('textarea');
		rawTextArea.className = 'block-raw-textarea';
		rawTextArea.spellcheck = false;
		rawTextArea.style.display = 'none';
		captionBlock.appendChild(richTextEl);
		captionBlock.appendChild(rawTextArea);
		body.appendChild(captionBlock);

		nodeCard.appendChild(buildBlockHeader(node, parentContainer, nodeIdx, inHeroContext(parentContainer) ? HERO_MEDIA_PRESETS : MEDIA_PRESETS, toggleRaw));
		nodeCard.appendChild(body);

		richTextEl.setMarkdown(captionLines.join('\n'));
		rawTextArea.value = serializeMediaLines(images, captionLines).join('\n');
		paint();

		richTextEl.addEventListener('nui-change', (e) => {
			if (e.target !== richTextEl) return;
			if (isRawMode) return;
			captionLines = (richTextEl.markdown || richTextEl.getMarkdown?.() || '').split('\n');
			commit({ repaint: false });
		});

		// A completed drag (pointer or keyboard) carries the new order in the
		// DOM. Each tile knows the index it was painted with, so the permutation
		// is a plain lookup — no id bookkeeping on the image objects. The event
		// also fires for a plain click (a zero-length drag); the identity
		// permutation is not a reorder and must not repaint — a repaint would
		// reset the frame's click-preview back to the lead.
		strip.addEventListener('nui-sortable-change', () => {
			const order = Array.from(strip.querySelectorAll('nui-sortable-item')).map(item => Number(item.dataset.idx));
			if (order.every((v, i) => v === i)) return;
			images = order.map(i => images[i]);
			commit();
		});

		// Removal is drag-out: the sortable always lands the tile back in the
		// rail on an outside drop, so the removal decision lives here — a
		// pointerup beyond the rail's bounds drops the image from the set. The
		// keyboard equivalent is Delete/Backspace on a focused tile.
		let dragOutImage = null;
		let downAt = null;
		strip.addEventListener('pointerdown', (e) => {
			const item = e.target.closest('nui-sortable-item');
			dragOutImage = item ? images[Number(item.dataset.idx)] : null;
			downAt = item ? { x: e.clientX, y: e.clientY } : null;
		});
		strip.addEventListener('pointerup', (e) => {
			const down = downAt;
			downAt = null;
			if (!dragOutImage) return;
			const r = strip.getBoundingClientRect();
			const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
			const img = dragOutImage;
			dragOutImage = null;
			if (!outside) {
				// A pointerup (nearly) where the pointerdown was is a click — the
				// component suppresses the real click event by preventDefaulting
				// pointerdown. Click previews the tile in the frame; the order and
				// the lead stay untouched (the frame returns to the lead on the
				// next commit).
				if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) showInFrame(img);
				return;
			}
			const i = images.indexOf(img);
			if (i === -1) return;
			images.splice(i, 1);
			commit();
		});
		strip.addEventListener('keydown', (e) => {
			if (e.key !== 'Delete' && e.key !== 'Backspace') return;
			const item = e.target.closest('nui-sortable-item');
			if (!item) return;
			e.preventDefault();
			images.splice(Number(item.dataset.idx), 1);
			commit();
		});

		// In raw mode the whole block is the source of truth, so media state is
		// re-derived from the text. The preview refreshes when raw mode is left.
		rawTextArea.addEventListener('input', () => {
			if (!isRawMode) return;
			const parsed = parseMediaBlock(rawTextArea.value.split('\n'));
			images = parsed.images;
			captionLines = parsed.caption;
			commit({ repaint: false });
		});

		function toggleRaw() {
			isRawMode = !isRawMode;
			if (isRawMode) {
				richTextEl.style.display = 'none';
				rawTextArea.style.display = 'block';
				rawTextArea.value = serializeMediaLines(images, captionLines).join('\n');
				return;
			}
			rawTextArea.style.display = 'none';
			richTextEl.style.display = 'block';
			const parsed = parseMediaBlock(rawTextArea.value.split('\n'));
			images = parsed.images;
			captionLines = parsed.caption;
			richTextEl.setMarkdown(captionLines.join('\n'));
			paint();
		}

		function commit({ repaint = true } = {}) {
			setBlockText(node, serializeMediaLines(images, captionLines).join('\n'));
			if (repaint) paint();
			syncToOutputs();
		}

		function addImage(image) {
			if (image.local) {
				console.warn(`Media block: "${image.alt}" is an object URL — the Playground mock has no upload storage, so no path can be persisted for it.`);
				nui.components.banner.show({
					content: 'Uploaded images are session-only here — the markdown path will not survive a reload.',
					priority: 'alert',
					autoClose: 5000
				});
			}
			images.push(image);
			commit();
		}

		function showInFrame(image) {
			frame.innerHTML = `<img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}">`;
			frame.appendChild(frameCaption);
			// Selection follows the frame: the clicked tile's number cell lights
			// up. The next commit repaints and selection returns to the lead.
			strip.querySelectorAll('.media-thumb.selected').forEach(t => t.classList.remove('selected'));
			const tile = strip.querySelectorAll('nui-sortable-item.media-thumb')[images.indexOf(image)];
			if (tile) tile.classList.add('selected');
		}

		function paint() {
			const lead = images[0];
			frame.innerHTML = lead
				? `<img src="${escapeHtml(lead.src)}" alt="${escapeHtml(lead.alt)}">`
				: `<div class="media-empty"><nui-icon name="image"></nui-icon><span>No image yet</span></div>`;
			frame.appendChild(frameCaption);
			const captionMd = captionLines.join('\n').trim();
			frameCaption.innerHTML = captionMd ? util.markdownToHtml(captionMd) : '';

			strip.innerHTML = '';
			images.forEach((im, i) => {
				const li = document.createElement('nui-sortable-item');
				li.className = 'media-thumb' + (i === 0 ? ' selected' : '') + (im.local ? ' local' : '');
				li.dataset.idx = i;
				li.title = (i === 0 ? 'Lead image. ' : '') + 'Drag to reorder — the first image is the lead. Drag out of the rail to remove. Click to preview.';

				const handle = document.createElement('span');
				handle.className = 'handle';
				handle.textContent = String(i + 1);

				const pic = document.createElement('img');
				pic.src = libThumb(im.src);
				pic.alt = '';
				pic.loading = 'lazy';

				li.append(handle, pic);

				strip.appendChild(li);
			});
		}

		async function pickImages() {
		const entries = await openMediaLibrary({ multiple: true });
		for (const entry of entries) addImage({ src: entry.src, alt: entry.label });
	}
}

	function renderLeafBlockNode(nodeCard, node, parentContainer, nodeIdx, presets = LEAF_PRESETS) {
		// Toggle raw markdown / rich text mode
		let isRawMode = false;

		nodeCard.appendChild(buildBlockHeader(node, parentContainer, nodeIdx, presets, () => {
			isRawMode = !isRawMode;
			if (isRawMode) {
				richTextEl.style.display = 'none';
				rawTextArea.style.display = 'block';
				rawTextArea.value = getBlockText(node);
			} else {
				rawTextArea.style.display = 'none';
				richTextEl.style.display = 'block';
				richTextEl.setMarkdown(getBlockText(node));
			}
		}, onPresetChange));

		// Body editor (nui-rich-text + textarea fallback)
		const body = document.createElement('div');
		body.className = 'block-card-body';

		// Icon badge (preset=image:icon): the icon is a block ATTRIBUTE (spec §4.2),
		// not body content — the prose stays clean, so the picker row lives outside
		// the RTE and only exists while the style is active.
		const iconRow = document.createElement('div');
		iconRow.className = 'icon-badge-row';
		iconRow.style.display = 'none';

		const iconThumb = document.createElement('span');
		iconThumb.className = 'icon-badge-thumb';
		iconRow.appendChild(iconThumb);

		iconRow.appendChild(createNuiIconButton('folder', 'Choose icon from the media library', async () => {
			const [entry] = await openMediaLibrary({ multiple: false });
			if (!entry) return;
			node.attrs = node.attrs || {};
			node.attrs.icon = entry.src;
			paintIconRow();
			syncToOutputs();
		}));

		const iconAlt = document.createElement('input');
		iconAlt.type = 'text';
		iconAlt.className = 'nui-native-input';
		iconAlt.placeholder = 'Icon description (alt)';
		iconAlt.addEventListener('input', () => {
			node.attrs = node.attrs || {};
			if (iconAlt.value) node.attrs.alt = iconAlt.value;
			else delete node.attrs.alt;
			syncToOutputs();
		});
		iconRow.appendChild(iconAlt);

		function paintIconRow() {
			const src = node.attrs?.icon || '';
			iconThumb.innerHTML = src
				? `<img src="${escapeHtml(libThumb(src))}" alt="">`
				: '<nui-icon name="image"></nui-icon>';
			iconAlt.value = node.attrs?.alt || '';
		}

		function syncIconRow() {
			const active = node.attrs?.preset === 'image:icon';
			iconRow.style.display = active ? '' : 'none';
			if (active) paintIconRow();
		}

		// icon=/alt= only mean something on the image:icon preset (§4.2). Leaving
		// the style drops them — the file carries no dead attributes.
		function onPresetChange(val) {
			if (val !== 'image:icon' && node.attrs) {
				delete node.attrs.icon;
				delete node.attrs.alt;
			}
			syncIconRow();
		}

		const richTextEl = document.createElement('nui-rich-text');
		const rawTextArea = document.createElement('textarea');
		rawTextArea.className = 'block-raw-textarea';
		rawTextArea.spellcheck = false;
		rawTextArea.style.display = 'none';

		body.appendChild(iconRow);
		body.appendChild(richTextEl);
		body.appendChild(rawTextArea);
		nodeCard.appendChild(body);
		syncIconRow();

		const initialContent = getBlockText(node);
		rawTextArea.value = initialContent;
		richTextEl.setMarkdown(initialContent);

		richTextEl.addEventListener('nui-change', (e) => {
			if (e.target !== richTextEl) return;
			if (isRawMode) return;
			const md = richTextEl.markdown || richTextEl.getMarkdown?.() || '';
			setBlockText(node, md);
			syncToOutputs();
		});

		rawTextArea.addEventListener('input', () => {
			if (!isRawMode) return;
			setBlockText(node, rawTextArea.value);
			syncToOutputs();
		});
	}

	// A Link block's body is exactly one Markdown link (spec §5.1). The editor is
	// therefore two fields, not an RTE — the text and the destination ARE the
	// content, and the preset (cta/download) is the treatment.
	function renderLinkBlockNode(nodeCard, node, parentContainer, nodeIdx) {
		nodeCard.appendChild(buildBlockHeader(node, parentContainer, nodeIdx, LINK_PRESETS));

		const body = document.createElement('div');
		body.className = 'block-card-body link-block-body';

		const parsed = parseLinkBody(getBlockText(node)) || { text: '', url: '' };

		const textInput = document.createElement('input');
		textInput.type = 'text';
		textInput.className = 'nui-native-input';
		textInput.placeholder = 'Link text';
		textInput.value = parsed.text;

		const urlInput = document.createElement('input');
		urlInput.type = 'text';
		urlInput.className = 'nui-native-input';
		urlInput.placeholder = 'https://… or relative/path';
		urlInput.value = parsed.url;

		const commit = () => {
			setBlockText(node, serializeLinkBody(textInput.value, urlInput.value));
			if (node.attrs?.preset === 'player') {
				const ext = (urlInput.value.split('?')[0].split('#')[0].split('.').pop() || '').toLowerCase();
				if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) {
					node.attrs.kind = 'audio';
				} else if (['mp4', 'webm', 'ogv', 'mov', 'm4v', 'mkv'].includes(ext)) {
					node.attrs.kind = 'video';
				}
			}
			syncToOutputs();
		};
		textInput.addEventListener('input', commit);
		urlInput.addEventListener('input', commit);

		body.appendChild(textInput);
		body.appendChild(urlInput);
		nodeCard.appendChild(body);
	}

	function renderColumnsNode(nodeCard, node, parentContainer, nodeIdx) {
		const header = document.createElement('div');
		header.className = 'block-card-header columns-header';

		const left = document.createElement('div');
		left.className = 'block-header-left';
		const colCount = node.cols?.length || 2;
		left.innerHTML = `
			<span class="drag-handle"><nui-icon name="drag_indicator"></nui-icon></span>
			<span class="block-idx-badge">C</span>
			<span class="columns-meta-label">${colCount} Columns</span>
		`;

		const right = document.createElement('div');
		right.className = 'block-header-right';
		right.appendChild(createNuiIconButton('close', 'Delete', () => deleteNode(parentContainer, nodeIdx)));

		header.appendChild(left);
		header.appendChild(right);
		nodeCard.appendChild(header);

		// Columns Container
		const colsRow = document.createElement('div');
		colsRow.className = 'columns-flex-row';

		(node.cols || []).forEach((col) => {
			const colSlot = document.createElement('div');
			colSlot.className = 'column-slot';

			// Slot style — the col's own preset (mb:col preset=), same select
			// pattern as the block header, unknown tokens shown as themselves.
			const styleRow = document.createElement('div');
			styleRow.className = 'col-style-row';
			const styleLab = document.createElement('span');
			styleLab.className = 'block-style-label';
			styleLab.textContent = 'Style:';
			styleRow.appendChild(styleLab);

			const colSelectWrap = document.createElement('nui-select');
			colSelectWrap.setAttribute('size', 'small');
			const colPreset = col.attrs?.preset || '';
			const colOptions = COL_PRESETS.some(p => p.value === colPreset)
				? COL_PRESETS
				: [{ value: colPreset, label: colPreset }, ...COL_PRESETS];
			const colNative = document.createElement('select');
			colNative.innerHTML = colOptions.map(({ value, label }) =>
				`<option value="${value}" ${colPreset === value ? 'selected' : ''}>${label}</option>`
			).join('');
			colSelectWrap.appendChild(colNative);
			customElements.upgrade(colSelectWrap);
			colSelectWrap.addEventListener('nui-change', (e) => {
				const val = e.detail?.values?.[0] ?? '';
				col.attrs = col.attrs || {};
				if (val) col.attrs.preset = val;
				else delete col.attrs.preset;
				syncToOutputs();
			});
			styleRow.appendChild(colSelectWrap);
			colSlot.appendChild(styleRow);

			const colNodes = document.createElement('nui-sortable');
			colNodes.className = 'col-nodes-list';
			colNodes.addEventListener('nui-sortable-change', () => commitSortOrder(colNodes, col, 'nodes'));

			col.nodes = col.nodes || [];
			colSlot.appendChild(addStripTop(() => openInsertBlockPalette(col, 0, true)));

			col.nodes.forEach((cNode, cnIdx) => {
				const cEl = renderNode(cNode, col, cnIdx);
				colNodes.appendChild(cEl);
				colNodes.appendChild(addStripBottom(() => openInsertBlockPalette(col, cnIdx + 1, true)));
			});
			colSlot.appendChild(colNodes);

			colsRow.appendChild(colSlot);
		});

		nodeCard.appendChild(colsRow);
	}

	// A var is a NAMED SET of key-value pairs, serialized as one fenced json
	// object (spec §4.4). The editor writes only that form — scalar `value=`
	// and text-fence vars stay legal for hand authors and get a raw fallback
	// editor here, so their bytes survive untouched.
	function renderVarNode(nodeCard, node, parentContainer, nodeIdx) {
		const header = document.createElement('div');
		header.className = 'block-card-header var-header';

		const left = document.createElement('div');
		left.className = 'block-header-left';
		left.innerHTML = `
			<span class="drag-handle"><nui-icon name="drag_indicator"></nui-icon></span>
			<span class="block-idx-badge">V</span>
		`;

		const nameInput = document.createElement('input');
		nameInput.type = 'text';
		nameInput.className = 'nui-native-input var-name-input';
		nameInput.placeholder = 'name';
		nameInput.value = node.name || '';
		nameInput.addEventListener('input', () => {
			node.name = nameInput.value;
			syncToOutputs();
		});
		left.appendChild(nameInput);

		const right = document.createElement('div');
		right.className = 'block-header-right';
		right.appendChild(createNuiIconButton('close', 'Delete', () => deleteNode(parentContainer, nodeIdx)));

		header.appendChild(left);
		header.appendChild(right);
		nodeCard.appendChild(header);

		const body = document.createElement('div');
		body.className = 'block-card-body';
		nodeCard.appendChild(body);

		const isObject = node.value === undefined ||
			(node.value !== null && typeof node.value === 'object' && !Array.isArray(node.value));
		if (isObject) renderPairEditor();
		else renderRawFallback();

		// Pairs are edited in place — only adding/removing a pair rebuilds rows,
		// so typing never loses focus. The node is only touched on commit: a
		// rendered-but-unedited var keeps its authored serialization.
		function renderPairEditor() {
			const wrap = document.createElement('div');
			wrap.className = 'var-pairs';

			const commit = () => {
				const obj = {};
				wrap.querySelectorAll('.var-pair').forEach(row => {
					const key = row.querySelector('.var-key').value.trim();
					if (!key) return;
					obj[key] = parseVarValue(row.querySelector('.var-value').value);
				});
				node.fenced = 'json';
				node.value = obj;
				syncToOutputs();
			};

			const mkRow = (key, val) => {
				const row = document.createElement('div');
				row.className = 'var-pair';

				const keyInput = document.createElement('input');
				keyInput.type = 'text';
				keyInput.className = 'nui-native-input var-key';
				keyInput.placeholder = 'key';
				keyInput.value = key;

				const valInput = document.createElement('input');
				valInput.type = 'text';
				valInput.className = 'nui-native-input var-value';
				valInput.placeholder = 'value (string, 12, true, null, [..], {..})';
				valInput.value = typeof val === 'string' ? val : JSON.stringify(val);

				keyInput.addEventListener('input', commit);
				valInput.addEventListener('input', commit);

				const remove = createNuiIconButton('close', 'Remove pair', () => {
					row.remove();
					commit();
				});

				row.appendChild(keyInput);
				row.appendChild(valInput);
				row.appendChild(remove);
				return row;
			};

			for (const [k, v] of Object.entries(node.value || {})) {
				wrap.appendChild(mkRow(k, v));
			}

			const addBtn = document.createElement('nui-button');
			addBtn.setAttribute('variant', 'outline');
			addBtn.setAttribute('size', 'small');
			const addInner = document.createElement('button');
			addInner.type = 'button';
			addInner.textContent = 'Add pair';
			addBtn.appendChild(addInner);
			customElements.upgrade(addBtn);
			addBtn.addEventListener('click', () => {
				const row = mkRow('', '');
				wrap.insertBefore(row, addBtn);
				row.querySelector('.var-key').focus();
			});
			wrap.appendChild(addBtn);

			body.appendChild(wrap);
		}

		// Scalars, arrays and text payloads keep their authored form. JSON is
		// committed only while it parses — a json fence must never hold invalid
		// JSON (spec §4.4/§7); an unparsable draft is marked, not written.
		function renderRawFallback() {
			// A scalar from a plain value= attribute (no fence) is a one-line
			// affair — the prose-height textarea swallows the card for `12`.
			if (!node.fenced && (node.value === null || typeof node.value !== 'object')) {
				const input = document.createElement('input');
				input.type = 'text';
				input.className = 'nui-native-input var-scalar-input';
				input.value = String(node.value ?? '');
				input.placeholder = 'value (string, 12, true, null)';
				input.addEventListener('input', () => {
					node.value = parseVarValue(input.value);
					syncToOutputs();
				});
				body.appendChild(input);
				return;
			}
			const area = document.createElement('textarea');
			area.className = 'block-raw-textarea var-raw';
			area.spellcheck = false;
			area.value = node.fenced === 'text' || typeof node.value === 'string'
				? String(node.value ?? '')
				: JSON.stringify(node.value);
			area.title = node.fenced === 'text'
				? 'Text payload'
				: 'JSON payload — applied when it parses';
			area.addEventListener('input', () => {
				if (node.fenced === 'text') {
					node.value = area.value;
					syncToOutputs();
					return;
				}
				try {
					node.value = JSON.parse(area.value);
					area.classList.remove('invalid');
					syncToOutputs();
				} catch {
					area.classList.add('invalid');
				}
			});
			body.appendChild(area);
		}

		// Pair values are typed: "12"/"true"/"null"/JSON parse as themselves,
		// anything else stays a string.
		function parseVarValue(str) {
			const s = str.trim();
			if (!s) return '';
			try { return JSON.parse(s); } catch { return str; }
		}
	}

	// ── Node & Section Manipulations ──
	function getBlockText(node) {
		if (!node) return '';
		if (node.lines) return (node.lines || []).join('\n');
		if (node.type === 'md') return (node.lines || []).join('\n');
		if (node.nodes && node.nodes.length) {
			return node.nodes.map(getBlockText).filter(Boolean).join('\n\n');
		}
		return '';
	}

	function setBlockText(node, text) {
		const lines = String(text || '').split('\n');
		if (node.type === 'md') {
			node.lines = lines;
		} else {
			node.nodes = [{ type: 'md', lines }];
		}
	}

	// ── Media Blocks ──
	// MD-Blocks defines a media block structurally, not by its preset: the block's
	// first node is an image or an image list, and everything after the images is
	// the caption. Detecting by that shape keeps the editor and the renderer in
	// agreement — a block cannot look like prose here and render as a figure.
	// A `preset=image:icon` block is NOT media: its asset lives in an `icon=`
	// attribute so the prose stays clean for generic renderers.
	const IMAGE_LINE_RE = /^!\[([^\]]*)\]\(\s*(\S+?)(?:\s+"[^"]*")?\s*\)$/;
	const IMAGE_ITEM_RE = /^[-*]\s+!\[([^\]]*)\]\(\s*(\S+?)(?:\s+"[^"]*")?\s*\)$/;

	function parseMediaBlock(lines) {
		let i = 0;
		while (i < lines.length && lines[i].trim() === '') i++;

		const images = [];
		const re = IMAGE_ITEM_RE.test(lines[i] ?? '') ? IMAGE_ITEM_RE : IMAGE_LINE_RE;
		while (i < lines.length && re.test(lines[i])) {
			const m = lines[i].match(re);
			images.push({ alt: m[1], src: m[2] });
			i++;
		}
		return { images, caption: lines.slice(i) };
	}

	function serializeMediaLines(images, captionLines) {
		const line = (im) => `![${im.alt || ''}](${im.src})`;
		const head = images.length === 1 ? [line(images[0])] : images.map(im => `- ${line(im)}`);
		const caption = captionLines.slice();
		while (caption.length && caption[0].trim() === '') caption.shift();
		return caption.length ? [...head, '', ...caption] : head;
	}

	function isMediaBlock(node) {
		return parseMediaBlock(getBlockText(node).split('\n')).images.length > 0;
	}

	// ── Block types (fixed at creation) ──
	// The type is chosen in the insert palette and never changes in the UI —
	// there is no type conversion, because the types have incompatible body
	// shapes (spec §5.1 "Authored Markdown Shape"). Type is not a file concept:
	// on load it is derived structurally, using the format's own definitions —
	// a link-family preset on a single-link body is a Link block, a first-node
	// image (list) is a Media block (§4.2), everything else is Prose. Derived
	// once and cached on the node (`_type`, session-only, never serialized) so
	// raw-mode edits don't silently retype a block mid-session.
	const LINK_BODY_RE = /^\[([^\]]*)\]\(([^)\s]*)\)$/;

	function parseLinkBody(text) {
		const m = String(text || '').trim().match(LINK_BODY_RE);
		return m ? { text: m[1], url: m[2] } : null;
	}

	function serializeLinkBody(text, url) {
		const u = String(url || '').trim();
		const t = String(text || '').replace(/[\[\]]/g, '').trim();
		return `[${t || u}](${u})`;
	}

	// A table block's body is a pipe table: a header row followed by a
	// delimiter row. Same derivation style as link/media — the format's own
	// definition (§4.2), no new attribute.
	const TABLE_DELIM_RE = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|\s*$/;

	function isTableBody(text) {
		const lines = String(text || '').split('\n').filter(l => l.trim());
		return lines.length >= 2 && lines[0].trim().startsWith('|') && TABLE_DELIM_RE.test(lines[1].trim());
	}

	function blockType(node) {
		if (node._type) return node._type;
		const family = String(node.attrs?.preset || '').toLowerCase().split(':')[0];
		const text = getBlockText(node);
		if (family === 'link' && parseLinkBody(text)) node._type = 'link';
		else if (family === 'table' && isTableBody(text)) node._type = 'table';
		else if (isMediaBlock(node)) node._type = 'media';
		else if (isTableBody(text)) node._type = 'table';
		else node._type = 'prose';
		return node._type;
	}

	// Mock media library. The Playground is served statically, so there is no way
	// to list a folder — the set is derived from two naming rules instead of a
	// 126-entry manifest. Renaming either folder breaks tiles loudly in the picker.
	const AUDIO_ICON_THUMB = `data:image/svg+xml;utf8,${encodeURIComponent(`
		<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90" viewBox="0 0 160 90" fill="none">
			<rect width="160" height="90" rx="4" fill="#242830"/>
			<circle cx="80" cy="45" r="24" fill="#1e2229"/>
			<path d="M78 35v14.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V40h6V35h-8z" fill="#4a9eff"/>
		</svg>
	`)}`;

	const VIDEO_ICON_THUMB = `data:image/svg+xml;utf8,${encodeURIComponent(`
		<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90" viewBox="0 0 160 90" fill="none">
			<rect width="160" height="90" rx="4" fill="#242830"/>
			<circle cx="80" cy="45" r="24" fill="#1e2229"/>
			<path d="M74 37l16 8-16 8V37z" fill="#3dd68c"/>
		</svg>
	`)}`;

	const MEDIA_LIBRARY = [
		{
			id: 'video-flower',
			label: 'Flower Bloom (Clip)',
			collection: 'Sample Videos',
			variants: 'mp4 · 1080p',
			type: 'video',
			src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
			thumb: VIDEO_ICON_THUMB
		},
		{
			id: 'audio-play-11',
			label: 'Herrbasan — Play 11',
			collection: 'Sample Music',
			variants: 'mp3 · 320k',
			type: 'audio',
			src: 'https://herrbasan.com/files/Misc/herrbasan_Play_11.mp3',
			thumb: AUDIO_ICON_THUMB
		},
		{
			id: 'audio-brattle',
			label: 'Herrbasan — Brattle',
			collection: 'Sample Music',
			variants: 'mp3 · 320k',
			type: 'audio',
			src: 'https://herrbasan.com/files/Misc/herrbasan_Brattle.mp3',
			thumb: AUDIO_ICON_THUMB
		},
		{
			id: 'audio-t-rex',
			label: 'T-Rex Roar (Effect)',
			collection: 'Sound Effects',
			variants: 'mp3 · FX',
			type: 'audio',
			src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',
			thumb: AUDIO_ICON_THUMB
		},
		...Array.from({ length: 8 }, (_, i) => ({
			id: `nui-${i + 1}`,
			label: `NUI plate ${i + 1}`,
			collection: 'NUI plates',
			variants: 'webp',
			type: 'image',
			src: `images/nui_${i + 1}.webp`,
			thumb: `images/nui_${i + 1}.webp`
		})),
		...Array.from({ length: 118 }, (_, i) => {
			const n = String(i + 1).padStart(3, '0');
			return {
				id: n,
				label: `Plate ${n}`,
				collection: 'Random Picts',
				variants: '160p · 1080p',
				type: 'image',
				src: `images/Random_Picts/1080p/${n}.webp`,
				thumb: `images/Random_Picts/160p/${n}.webp`
			};
		})
	];

	// A block only stores the full-size path, so previews fall back to it. Library
	// entries resolve to their 160p sibling — strip and picker stay cheap.
	function libThumb(src) {
		return MEDIA_LIBRARY.find(m => m.src === src)?.thumb ?? src;
	}

	// Shared media library picker. Returns the picked entries ([{ src, label }])
	// or [] when cancelled. `multiple` switches the list between set picking
	// (media blocks) and single picking (the icon badge).
	async function openMediaLibrary({ multiple = true, filterType = null } = {}) {
		const container = document.createElement('div');
		container.className = 'media-library';
		container.style.cssText = 'flex: 1; min-height: 0; display: flex; flex-direction: column;';

		const wrapper = document.createElement('div');
		wrapper.style.cssText = 'flex: 1; min-height: 0; position: relative;';

		const listEl = document.createElement('nui-list');
		listEl.style.cssText = 'flex: 1; height: 100%;';
		wrapper.appendChild(listEl);
		container.appendChild(wrapper);

		let selected = [];
		let picked = [];

		// No dialog buttons: nui-list owns the footer (count + Clear + Add), as in
		// the CMS this is modelled on. The header supplies search and sort.
		const title = filterType === 'player' ? (multiple ? 'Insert Audio / Video' : 'Choose Media Track')
			: multiple ? 'Insert Media' : 'Choose Icon';
		const { dialog, result } = await nui.components.dialog.page(
			title,
			container,
			{ contentScroll: false }
		);
		dialog.style.cssText = '--space-page-maxwidth: 720px;';

		// Nothing to add until something is picked.
		const syncAddButton = () => {
			const add = dialog.querySelector('.nui-list-footer-right button');
			if (add) add.disabled = selected.length === 0;
		};

		const addSelection = () => {
			if (!selected.length) return;
			picked = selected;
			dialog.close();
		};

		const libraryData = filterType === 'player'
			? MEDIA_LIBRARY.filter(m => m.type === 'audio' || m.type === 'video')
			: filterType === 'image'
			? MEDIA_LIBRARY.filter(m => m.type !== 'audio' && m.type !== 'video')
			: MEDIA_LIBRARY;

		// The dialog has to finish layout before the list can measure a row, or the
		// list collapses to a zero-height container and renders nothing.
		customElements.whenDefined('nui-list').then(() => setTimeout(() => {
			listEl.loadData({
				data: libraryData,
				render: renderLibraryRow,
				multiple,
				search: [{ prop: 'id' }, { prop: 'label' }, { prop: 'src' }],
				sort: [
					{ label: 'Plate (A-Z)', prop: 'id' },
					{ label: 'Plate (Z-A)', prop: 'id', dir: 'desc' },
					{ label: 'Name', prop: 'label' }
				],
				footer: {
					buttons_left: [
						{ label: 'Clear', type: 'outline', fnc: () => listEl.setSelection([]) }
					],
					buttons_right: [
						{ label: multiple ? 'Add' : 'Choose', type: 'primary', fnc: addSelection }
					]
				},
				events: (ev) => {
					if (ev.type !== 'selection') return;
					selected = (listEl.getSelection(true) || []).map(item => item.data);
					syncAddButton();
				}
			});
			syncAddButton();
		}, 10));

		await result;
		return picked;
	}

	function renderLibraryRow(item) {
		// Four columns, in the order nui-list's image-item variant expects:
		// id | thumbnail | name + path | variant list.
		const el = document.createElement('div');
		el.className = 'nui-list-image-item';
		el.innerHTML = `
			<div>${escapeHtml(item.id)}</div>
			<div class="image-cell"><img alt=""></div>
			<div>
				<div class="media-library-label">${escapeHtml(item.label)}</div>
				<div class="media-library-meta">${escapeHtml(item.src)}</div>
			</div>
			<div>${escapeHtml(item.variants)}</div>
		`;

		// nui-list calls `update` when it binds a row to a data index, so off-screen
		// rows never request a bitmap. The variant fades the thumb in via `.loaded`.
		const img = el.querySelector('img');
		el.update = () => {
			img.classList.remove('loaded');
			img.onload = () => img.classList.add('loaded');
			img.src = item.thumb;
			if (img.complete) img.classList.add('loaded');
		};
		return el;
	}

	// Styles are scoped by block TYPE: the select only offers presets whose
	// authored shape (spec §5.1) matches the body editor. `image:icon` is a
	// prose style — its body IS prose; the icon lives in the `icon=` attribute.
	const LEAF_PRESETS = [
		{ value: '', label: 'Standard Prose' },
		{ value: 'lead', label: 'Lead Paragraph' },
		{ value: 'card:note', label: 'Card: Note' },
		{ value: 'card:warning', label: 'Card: Warning' },
		{ value: 'card:stat', label: 'Card: Stat' },
		{ value: 'card:quote', label: 'Card: Quote' },
		{ value: 'card:good', label: 'Card: Good' },
		{ value: 'card:danger', label: 'Card: Danger' },
		{ value: 'list:steps', label: 'List: Steps' },
		{ value: 'image:icon', label: 'Icon Badge' }
	];

	// Link blocks: the body is exactly one Markdown link, so the style is the
	// link's treatment — a call-to-action button or a download affordance.
	const LINK_PRESETS = [
		{ value: 'link:cta', label: 'Link: CTA' },
		{ value: 'link:download', label: 'Link: Download' }
	];

	const PLAYER_PRESETS = [
		{ value: 'player', label: 'Player: Auto' }
	];

	// Table blocks: the body is one pipe table; the style is the table's
	// presentation (renderer variants in nui-theme.css). '' is the default
	// full spreadsheet grid. `fit` only exists as clean:fit — column sizing by
	// data cells is a clean-table concern.
	const TABLE_PRESETS = [
		{ value: '', label: 'Table: Default Grid' },
		{ value: 'table:clean', label: 'Table: Clean' },
		{ value: 'table:clean:fit', label: 'Table: Clean + Data-fit' },
		{ value: 'table:specs', label: 'Table: Spec Sheet' }
	];

	// Column slots carry their own treatment (`mb:col preset=`): the stat metrics
	// row in the demo doc is col presets, not card blocks inside plain cols.
	const COL_PRESETS = [
		{ value: '', label: 'Plain' },
		{ value: 'card', label: 'Card' },
		{ value: 'card:stat', label: 'Card: Stat' },
		{ value: 'card:good', label: 'Card: Good' },
		{ value: 'card:danger', label: 'Card: Danger' }
	];

	// Gallery presets come from the MD-Blocks demo document; the lead image is the
	// prominent plate in every one of them, which is why the strip can promote.
	// The float presets wrap subsequent prose around the figure (magazine-style);
	// slideshow is the rotating multi-plate treatment (auto in cover sections).
	const MEDIA_PRESETS = [
		{ value: '', label: 'Media: Figure' },
		{ value: 'image:left', label: 'Media: Float Left' },
		{ value: 'image:right', label: 'Media: Float Right' },
		{ value: 'image:left:small', label: 'Media: Float Left (Small)' },
		{ value: 'image:hero', label: 'Media: Hero' },
		{ value: 'image:hero:bleed', label: 'Media: Hero (Bleed)' },
		{ value: 'gallery', label: 'Gallery: Grid' },
		{ value: 'gallery:featured', label: 'Gallery: Featured' },
		{ value: 'gallery:row', label: 'Gallery: Row' },
		{ value: 'gallery:mosaic', label: 'Gallery: Mosaic' },
		{ value: 'gallery:slideshow', label: 'Gallery: Slideshow' }
	];

	// Block option sets are scoped by the section template: in a hero, the media
	// block's preset is the cover's ARRANGEMENT, nothing else. Auto = the
	// enhanced-renderer's default: a single plate fills, multiple plates ROTATE
	// (slideshow, 5s crossfade, pausable). Row pins the static even split.
	const HERO_MEDIA_PRESETS = [
		{ value: '', label: 'Auto' },
		{ value: 'gallery:row', label: 'Row (static, even split)' }
	];

	// Drag-reorder commit: the sortable already arranged the DOM; mirror that
	// order into the data and re-render (the add-strips between cards are
	// positional, so they rebuild). Nodes not rendered as items (repeat chrome
	// blocks) keep their original slots. No-op drags (dropped where started)
	// skip the rebuild.
	function commitSortOrder(listEl, holder, prop) {
		const domOrder = [...listEl.querySelectorAll(':scope > nui-sortable-item')].map(el => Number(el.dataset.nodeIndex));
		if (domOrder.length < 2) return;
		const arr = holder[prop];
		const moved = new Set(domOrder);
		const movedNodes = domOrder.map(i => arr[i]);
		let k = 0;
		const next = arr.map((n, i) => moved.has(i) ? movedNodes[k++] : n);
		if (next.every((n, i) => n === arr[i])) return;
		holder[prop] = next;
		renderVisualEditor();
		syncToOutputs();
	}

	function deleteSection(index) {
		const main = currentDoc.mains?.[0];
		if (!main || !main.sections) return;
		if (main.sections.length <= 1) {
			main.sections[0] = { attrs: { label: 'Section 1' }, vars: [], nodes: [] };
		} else {
			main.sections.splice(index, 1);
		}
		renderVisualEditor();
		syncToOutputs();
	}

	function deleteNode(container, index) {
		if (!container.nodes) return;
		container.nodes.splice(index, 1);
		renderVisualEditor();
		syncToOutputs();
	}

	// ── Insert Block Palette Dialog ──
	async function openInsertBlockPalette(targetContainer, insertIdx, isInsideColumn = false) {
		// The palette is the ONLY place a block's type is chosen — after creation
		// the type is fixed. Groups mirror the ontology: Content (styling blocks),
		// Layout (containers), Data (vars). Card entries are templates (spec §5.1):
		// they create prose blocks with a preset, not new types.
		const dialogHtml = `
			<div class="palette-group">
				<div class="palette-group-label">Content</div>
				<div class="palette-grid">
					<div class="palette-item" data-type="prose">
						<div class="palette-icon"><nui-icon name="article"></nui-icon></div>
						<div class="palette-text">
							<strong>Markdown Prose</strong>
							<span>Paragraphs, headings, and lists</span>
						</div>
					</div>
					<div class="palette-item" data-type="card-note">
						<div class="palette-icon"><nui-icon name="info"></nui-icon></div>
						<div class="palette-text">
							<strong>Note Card</strong>
							<span>Callout box (preset=card:note)</span>
						</div>
					</div>
					<div class="palette-item" data-type="card-warning">
						<div class="palette-icon"><nui-icon name="warning"></nui-icon></div>
						<div class="palette-text">
							<strong>Warning Card</strong>
							<span>Alert callout (preset=card:warning)</span>
						</div>
					</div>
					<div class="palette-item" data-type="card-stat">
						<div class="palette-icon"><nui-icon name="bar_chart"></nui-icon></div>
						<div class="palette-text">
							<strong>Stat / KPI Callout</strong>
							<span>Highlighted number/metric</span>
						</div>
					</div>
					<div class="palette-item" data-type="media-figure">
						<div class="palette-icon"><nui-icon name="image"></nui-icon></div>
						<div class="palette-text">
							<strong>Media Figure</strong>
							<span>Image(s) with an optional caption</span>
						</div>
					</div>
					<div class="palette-item" data-type="media-player">
						<div class="palette-icon"><nui-icon name="play"></nui-icon></div>
						<div class="palette-text">
							<strong>Media Player</strong>
							<span>Video or audio inline player (preset=player)</span>
						</div>
					</div>
					<div class="palette-item" data-type="link-cta">
						<div class="palette-icon"><nui-icon name="link"></nui-icon></div>
						<div class="palette-text">
							<strong>Link / CTA</strong>
							<span>Button-style link — text + URL</span>
						</div>
					</div>
					<div class="palette-item" data-type="table">
						<div class="palette-icon"><nui-icon name="table_view"></nui-icon></div>
						<div class="palette-text">
							<strong>Table</strong>
							<span>Pipe table with presentation styles</span>
						</div>
					</div>
				</div>
			</div>
			${!isInsideColumn ? `
			<div class="palette-group">
				<div class="palette-group-label">Layout</div>
				<div class="palette-grid">
					<div class="palette-item" data-type="columns-two">
						<div class="palette-icon"><nui-icon name="view_column"></nui-icon></div>
						<div class="palette-text">
							<strong>Two Columns</strong>
							<span>Side-by-side layout (weights=[1,1])</span>
						</div>
					</div>
					<div class="palette-item" data-type="columns-three">
						<div class="palette-icon"><nui-icon name="view_column"></nui-icon></div>
						<div class="palette-text">
							<strong>Three Columns</strong>
							<span>Triple column layout (weights=[1,1,1])</span>
						</div>
					</div>
				</div>
			</div>
			<div class="palette-group">
				<div class="palette-group-label">Data</div>
				<div class="palette-grid">
					<div class="palette-item" data-type="var">
						<div class="palette-icon"><nui-icon name="data_object"></nui-icon></div>
						<div class="palette-text">
							<strong>Named Variable</strong>
							<span>mb:var metadata field</span>
						</div>
					</div>
				</div>
			</div>
			` : ''}
		`;

		const { dialog, main: dialogMain, result } = await nui.components.dialog.page(
			'Insert Block',
			dialogHtml,
			{
				placement: 'center',
				buttons: [
					{ label: 'Cancel', value: 'cancel', type: 'outline' }
				]
			}
		);

		// Handle selection
		const scope = dialogMain || dialog;
		scope.querySelectorAll('.palette-item').forEach(item => {
			item.addEventListener('click', () => {
				const type = item.dataset.type;
				dialog.close();
				dialog.remove();
				createAndInsertBlock(targetContainer, insertIdx, type);
			});
		});

		await result;
	}

	function createAndInsertBlock(targetContainer, insertIdx, type) {
		let newNode = null;
		if (type === 'prose') {
			newNode = {
				type: 'block',
				attrs: { id: generateId('b') },
				nodes: [{ type: 'md', lines: ['New paragraph. Edit this text.'] }]
			};
		} else if (type === 'card-note') {
			newNode = {
				type: 'block',
				attrs: { id: generateId('b'), preset: 'card:note' },
				nodes: [{ type: 'md', lines: ['### Note Header', 'Important callout details here.'] }]
			};
		} else if (type === 'card-warning') {
			newNode = {
				type: 'block',
				attrs: { id: generateId('b'), preset: 'card:warning' },
				nodes: [{ type: 'md', lines: ['### Warning', 'Be cautious when editing this state.'] }]
			};
		} else if (type === 'card-stat') {
			newNode = {
				type: 'block',
				attrs: { id: generateId('b'), preset: 'card:stat' },
				nodes: [{ type: 'md', lines: ['# 99.9%', 'System Uptime'] }]
			};
		} else if (type === 'media-figure') {
			newNode = {
				type: 'block',
				_type: 'media',
				attrs: { id: generateId('b') },
				nodes: [{ type: 'md', lines: ['![Alt text](images/nui_1.webp)', '', 'Figure caption text.'] }]
			};
		} else if (type === 'media-player') {
			newNode = {
				type: 'block',
				_type: 'link',
				attrs: { id: generateId('b'), kind: 'video', preset: 'player' },
				nodes: [{ type: 'md', lines: ['[Video title](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4)'] }]
			};
		} else if (type === 'link-cta') {
			newNode = {
				type: 'block',
				_type: 'link',
				attrs: { id: generateId('b'), preset: 'link:cta' },
				nodes: [{ type: 'md', lines: ['[Call to action](https://)'] }]
			};
		} else if (type === 'table') {
			newNode = {
				type: 'block',
				_type: 'table',
				attrs: { id: generateId('b') },
				nodes: [{ type: 'md', lines: [
					'| Name | Value | Note |',
					'|---|---|---|',
					'| First | 1 | Edit me |',
					'| Second | 2 | Edit me |'
				] }]
			};
		} else if (type === 'columns-two') {
			newNode = {
				type: 'columns',
				attrs: { id: generateId('cols'), weights: [1, 1] },
				cols: [
					{
						attrs: {},
						nodes: [{ type: 'block', attrs: { id: generateId('b') }, nodes: [{ type: 'md', lines: ['Left column text.'] }] }]
					},
					{
						attrs: {},
						nodes: [{ type: 'block', attrs: { id: generateId('b') }, nodes: [{ type: 'md', lines: ['Right column text.'] }] }]
					}
				]
			};
		} else if (type === 'columns-three') {
			newNode = {
				type: 'columns',
				attrs: { id: generateId('cols'), weights: [1, 1, 1] },
				cols: [
					{ attrs: {}, nodes: [{ type: 'block', attrs: { id: generateId('b') }, nodes: [{ type: 'md', lines: ['Column 1 text.'] }] }] },
					{ attrs: {}, nodes: [{ type: 'block', attrs: { id: generateId('b') }, nodes: [{ type: 'md', lines: ['Column 2 text.'] }] }] },
					{ attrs: {}, nodes: [{ type: 'block', attrs: { id: generateId('b') }, nodes: [{ type: 'md', lines: ['Column 3 text.'] }] }] }
				]
			};
		} else if (type === 'var') {
			// Canonical form: name + fenced json object of key-value pairs.
			newNode = {
				type: 'var',
				name: 'settings',
				fenced: 'json',
				value: { enabled: true }
			};
		}

		if (newNode) {
			// The palette fixes the block's type at creation — stamp it so the
			// canvas never re-derives it from body content mid-session.
			if (newNode.type === 'block' && !newNode._type) newNode._type = 'prose';
			targetContainer.nodes = targetContainer.nodes || [];
			targetContainer.nodes.splice(insertIdx, 0, newNode);
			renderVisualEditor();
			syncToOutputs();
		}
	}

	// Is this container a hero section? Sections carry `vars`; columns don't — the
	// guard keeps a media block inside a column on the full palette.
	function inHeroContext(container) {
		return !!(container && Array.isArray(container.vars) && isHeroSection(container));
	}

	// ── Section Templates ──
	// Templates are FUNCTIONS, not stored state (spec §5.1: composite editor palette
	// entries expand into primitives; they are not vocabulary). The file only ever
	// holds simple presets — the template is re-derived from preset + content shape
	// on every render, so the UI can never disagree with the document.

	// A section is a HERO when its preset family is `cover`, or when its whole
	// content is exactly one media block (a contain-mode hero). A normal section
	// that a user fills with a single media block IS a hero — same structure,
	// same treatment.
	function isHeroSection(sec) {
		const family = String(sec.attrs?.preset || '').toLowerCase().split(':')[0];
		if (family === 'cover') return true;
		const content = (sec.nodes || []).filter(n => !(n.type === 'block' && (n.attrs?.repeat === 'header' || n.attrs?.repeat === 'footer')));
		return content.length === 1 && content[0].type === 'block' && isMediaBlock(content[0]);
	}

	// Section options <-> preset token. The cover height is a NAMED aspect-ratio
	// variant (square/wide/banner/strip), never a raw value — spec §3 bans style
	// values on directives, and a width-relative ratio works in every profile.
	function parseSecOpts(sec) {
		const parts = String(sec.attrs?.preset || '').toLowerCase().split(':').filter(Boolean);
		const family = parts[0] || '';
		return {
			placement: family === 'cover' ? 'cover' : 'contain',
			ratio: family === 'cover' && ['square', 'banner', 'strip'].includes(parts[1]) ? parts[1] : 'wide',
			band: family === 'band',
			bleed: parts.includes('bleed'),
			inverted: parts.includes('inverted')
		};
	}

	function composePreset(opts) {
		if (opts.placement === 'cover') {
			return 'cover' + (opts.ratio && opts.ratio !== 'wide' ? ':' + opts.ratio : '');
		}
		if (opts.band) return 'band' + (opts.bleed ? ':bleed' : '') + (opts.inverted ? ':inverted' : '');
		return '';
	}

	// The canvas mirrors the section's cover options: a cover hero's media frame
	// fills and crops like the rendered cover (same aspect-ratio tokens), a contain
	// hero shows the image whole. Called on render and live from the options popover.
	function applyCoverPreview(secEl, sec) {
		if (!secEl) return;
		const hero = isHeroSection(sec);
		secEl.classList.toggle('section-hero', hero);
		const card = secEl.querySelector('.editor-media-card');
		if (!card) return;
		const opts = parseSecOpts(sec);
		const cover = hero && opts.placement === 'cover';
		card.classList.toggle('editor-cover', cover);
		card.classList.toggle('editor-cover-square', cover && opts.ratio === 'square');
		card.classList.toggle('editor-cover-banner', cover && opts.ratio === 'banner');
		card.classList.toggle('editor-cover-strip', cover && opts.ratio === 'strip');
	}

	// Section options live in a nui-popover bubble anchored to the gear — the tooltip's
	// surface, holding controls. The bubble sits in the top layer, so the section card's
	// `overflow: hidden` cannot clip it, and outside-click and Escape dismissal are the
	// platform's rather than ours. Built once per section, after the section is in the
	// document: the panel resolves its trigger by id at upgrade time. The gear is the
	// trigger, so nothing here toggles anything.
	function buildSectionOptions(sec, chip, header, triggerId) {
		const hero = isHeroSection(sec);
		const opts = parseSecOpts(sec);
		const pop = document.createElement('nui-popover');
		pop.setAttribute('for', triggerId);
		pop.setAttribute('aria-label', 'Section options');
		// Pinned below the gear rather than left on `auto`: auto prefers `top` whenever
		// there is room, which is the right call for a tooltip but wrong for a menu that
		// belongs to a section header. The placement is still clamped into the viewport,
		// so a section near the bottom of the screen keeps the panel on-screen.
		pop.setAttribute('placement', 'bottom');

		const apply = () => {
			sec.attrs = sec.attrs || {};
			const preset = composePreset(opts);
			if (preset) sec.attrs.preset = preset;
			else delete sec.attrs.preset;
			const chipText = isHeroSection(sec) ? 'Hero' : (preset.startsWith('band') ? 'Band' : '');
			chip.textContent = chipText;
			chip.style.display = chipText ? '' : 'none';
			applyCoverPreview(header.closest('.editor-section-card'), sec);
			syncToOutputs();
		};

		const mkRow = (labelText, control) => {
			const row = document.createElement('div');
			row.className = 'section-opts-row';
			const lab = document.createElement('label');
			lab.textContent = labelText;
			row.appendChild(lab);
			row.appendChild(control);
			return row;
		};

		const mkCheck = (checked, onChange) => {
			const input = document.createElement('input');
			input.type = 'checkbox';
			input.checked = checked;
			input.addEventListener('change', () => onChange(input.checked));
			return input;
		};

		// Items are declared here but applied after the panel is in the document: the
		// select builds its state in connectedCallback, so setItems() does not exist on a
		// detached element. Writing the slotted <select> instead would work, but that is
		// the documented fallback rather than the entry API.
		const pendingSelects = [];
		const mkSelect = (options, current, onChange) => {
			const wrap = document.createElement('nui-select');
			wrap.setAttribute('size', 'small');
			wrap.appendChild(document.createElement('select'));
			customElements.upgrade(wrap);
			pendingSelects.push({ wrap, options, current, onChange });
			return wrap;
		};

		if (hero) {
			const ratioRow = mkRow('Aspect ratio', mkSelect(
				[['square', 'Square (1:1)'], ['wide', 'Wide (16:9)'], ['banner', 'Banner (16:5)'], ['strip', 'Strip (16:3)']],
				opts.ratio,
				(v) => { opts.ratio = v || 'wide'; apply(); }
			));
			const bandRow = mkRow('Band', mkCheck(opts.band, (c) => { opts.band = c; if (!c) { opts.inverted = false; opts.bleed = false; } syncRows(); apply(); }));
			const bleedRow = mkRow('Bleed (edge-to-edge)', mkCheck(opts.bleed, (c) => { opts.bleed = c; apply(); }));
			const invRow = mkRow('Inverted', mkCheck(opts.inverted, (c) => { opts.inverted = c; apply(); }));

			pop.appendChild(mkRow('Placement', mkSelect(
				[['cover', 'Cover — media is the background'], ['contain', 'Contain — media shown whole']],
				opts.placement,
				(v) => { opts.placement = v || 'cover'; syncRows(); apply(); }
			)));
			pop.appendChild(ratioRow);
			pop.appendChild(bandRow);
			pop.appendChild(bleedRow);
			pop.appendChild(invRow);

			function syncRows() {
				ratioRow.style.display = opts.placement === 'cover' ? '' : 'none';
				bandRow.style.display = opts.placement === 'contain' ? '' : 'none';
				bleedRow.style.display = (opts.placement === 'contain' && opts.band) ? '' : 'none';
				invRow.style.display = (opts.placement === 'contain' && opts.band) ? '' : 'none';
			}
			syncRows();
		} else {
			const bandRow = mkRow('Band (colored background)', mkCheck(opts.band, (c) => { opts.band = c; if (!c) { opts.inverted = false; opts.bleed = false; } syncRows(); apply(); }));
			const bleedRow = mkRow('Bleed (edge-to-edge)', mkCheck(opts.bleed, (c) => { opts.bleed = c; apply(); }));
			const invRow = mkRow('Inverted (high contrast)', mkCheck(opts.inverted, (c) => { opts.inverted = c; apply(); }));
			pop.appendChild(bandRow);
			pop.appendChild(bleedRow);
			pop.appendChild(invRow);
			function syncRows() {
				bleedRow.style.display = opts.band ? '' : 'none';
				invRow.style.display = opts.band ? '' : 'none';
			}
			syncRows();
		}

		header.appendChild(pop);

		pendingSelects.forEach(({ wrap, options, current, onChange }) => {
			wrap.setItems(options.map(([value, label]) => ({ value, label })));
			if (current) wrap.setValue(current);
			wrap.addEventListener('nui-change', (e) => onChange(e.detail?.values?.[0] ?? ''));
		});

		return pop;
	}

	// ── Add Section (template dialog) ──
	async function openSectionTemplateDialog(insertAt) {
		const dialogHtml = `
			<div class="palette-grid">
				<div class="palette-item" data-type="normal">
					<div class="palette-icon"><nui-icon name="article"></nui-icon></div>
					<div class="palette-text">
						<strong>Normal Section</strong>
						<span>Headings, text, media — any blocks. Optional colored band via section options.</span>
					</div>
				</div>
				<div class="palette-item" data-type="hero">
					<div class="palette-icon"><nui-icon name="image"></nui-icon></div>
					<div class="palette-text">
						<strong>Hero Section</strong>
						<span>One media block as a visual feature — background media with overlay text.</span>
					</div>
				</div>
			</div>
		`;

		const { dialog, main: dialogMain, result } = await nui.components.dialog.page(
			'Add Section',
			dialogHtml,
			{
				placement: 'center',
				buttons: [
					{ label: 'Cancel', value: 'cancel', type: 'outline' }
				]
			}
		);

		const scope = dialogMain || dialog;
		scope.querySelectorAll('.palette-item').forEach(item => {
			item.addEventListener('click', () => {
				dialog.close();
				dialog.remove();
				addSection(insertAt, item.dataset.type);
			});
		});

		await result;
	}

	function addSection(insertAt, template = 'normal') {
		const main = currentDoc.mains?.[0];
		if (!main) return;
		main.sections = main.sections || [];
		const hero = template === 'hero';
		const newSec = {
			attrs: { id: generateId('sec'), label: hero ? 'Hero' : `Section ${main.sections.length + 1}` },
			vars: [],
			nodes: [
				hero
					? { type: 'block', attrs: { id: generateId('b') }, nodes: [{ type: 'md', lines: ['![Hero image](images/nui_1.webp)', '', '## Hero Title', '', 'Supporting tagline or call to action.'] }] }
					: { type: 'block', attrs: { id: generateId('b') }, nodes: [{ type: 'md', lines: ['## New Section Heading', '', 'Add blocks or prose here.'] }] }
			]
		};
		if (hero) newSec.attrs.preset = 'cover';
		if (typeof insertAt === 'number') {
			main.sections.splice(insertAt, 0, newSec);
		} else {
			main.sections.push(newSec);
		}
		renderVisualEditor();
		syncToOutputs();
	}

	btnAddSecTop?.addEventListener('click', () => openSectionTemplateDialog(0));
	btnAddSecBottom?.addEventListener('click', () => openSectionTemplateDialog());

	// ── Two-Way Sync ──
	function syncToOutputs() {
		if (isSyncing) return;
		isSyncing = true;
		try {
			const md = util.serializeBlocks(currentDoc);
			if (rawEditor && rawEditor.value !== md) {
				rawEditor.value = md;
			}
			if (livePreview) {
				const html = util.markdownToHtml(md);
				livePreview.innerHTML = html;
				util.enhanceSlideshows?.(livePreview);
			}
		} finally {
			isSyncing = false;
		}
	}

	btnSyncRaw?.addEventListener('click', () => {
		const text = rawEditor.value;
		try {
			const parsed = util.parseBlocks(text);
			if (parsed && parsed.mains?.length) {
				currentDoc = normalizeDoc(parsed);
				renderVisualEditor();
				syncToOutputs();
			}
		} catch (err) {
			console.error('Failed to parse raw markdown:', err);
		}
	});

	// ── View Mode Switching (Editor, Live Preview, Raw Markdown, Split View) ──
	function setView(viewName) {
		if (!workspace) return;
		workspace.setAttribute('data-active-view', viewName);
		viewSwitcher?.querySelectorAll('nui-button').forEach(btn => {
			if (btn.dataset.view === viewName) btn.setAttribute('state', 'active');
			else btn.removeAttribute('state');
		});

		const pageEl = element.querySelector('.page-blocks-editor');
		if (viewName === 'split') {
			pageEl?.setAttribute('breakout', '');
			paneCanvas.style.display = 'flex';
			panePreview.style.display = 'block';
			paneRaw.style.display = 'none';
		} else {
			pageEl?.removeAttribute('breakout');
			if (viewName === 'canvas') {
				paneCanvas.style.display = 'flex';
				panePreview.style.display = 'none';
				paneRaw.style.display = 'none';
			} else if (viewName === 'preview') {
				paneCanvas.style.display = 'none';
				panePreview.style.display = 'block';
				paneRaw.style.display = 'none';
			} else if (viewName === 'raw') {
				paneCanvas.style.display = 'none';
				panePreview.style.display = 'none';
				paneRaw.style.display = 'block';
			}
		}
	}

	viewSwitcher?.addEventListener('click', (e) => {
		const btn = e.target.closest('nui-button[data-view]');
		if (!btn) return;
		setView(btn.dataset.view);
	});

	btnCopyMd?.addEventListener('click', async () => {
		const md = util.serializeBlocks(currentDoc);
		try {
			await navigator.clipboard.writeText(md);
			nui.components.banner.show({
				content: 'MD-Blocks Markdown copied to clipboard!',
				priority: 'info',
				autoClose: 3000
			});
		} catch {
			nui.components.banner.show({
				content: 'Failed to copy to clipboard',
				priority: 'alert',
				autoClose: 3000
			});
		}
	});

	btnLoadSample?.addEventListener('click', async () => {
		try {
			const res = await fetch('pages/experiments/md-blocks-demo.md');
			if (res.ok) {
				let text = await res.text();
				// The demo md is written for the md-blocks demo PAGE (served from
				// pages/experiments/), so its media paths carry a ../../ prefix.
				// The editor canvas and live preview resolve against Playground/
				// index.html — same base the faux media library uses. Rebase on
				// load; every media path in the file is uniformly prefixed.
				text = text.replaceAll('../../images/', 'images/');
				currentDoc = normalizeDoc(util.parseBlocks(text));
				renderVisualEditor();
				syncToOutputs();
				nui.components.banner.show({
					content: 'Sample document loaded successfully.',
					priority: 'info',
					autoClose: 3000
				});
			}
		} catch (e) {
			console.warn('Could not fetch sample document:', e);
		}
	});

	// ── NUI Helpers ──
	function createNuiIconButton(iconName, title, onClick, extraClass = '') {
		const nuiBtn = document.createElement('nui-button');
		nuiBtn.setAttribute('variant', 'icon');
		if (extraClass) nuiBtn.classList.add(extraClass);
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.title = title;
		btn.setAttribute('aria-label', title);
		btn.innerHTML = `<nui-icon name="${iconName}"></nui-icon>`;
		nuiBtn.appendChild(btn);
		customElements.upgrade(nuiBtn);
		// Optional: a button that carries a `popovertarget` is toggled by the platform, and
		// adding a click handler as well would fight it.
		if (onClick) {
			nuiBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				onClick();
			});
		}
		return nuiBtn;
	}

	// Add strips are anchored to one edge of their container. The strip at the
	// top of a list hangs off the block below it; every other strip hangs off the
	// block above it. The edge is picked by which factory you call — there is no
	// position string to get wrong.
	function addStripTop(onClick, extraClass = '') {
		return createAddStrip(onClick, 'add-top', extraClass);
	}

	function addStripBottom(onClick, extraClass = '') {
		return createAddStrip(onClick, 'add-bottom', extraClass);
	}

	function createAddStrip(onClick, edge, extraClass = '') {
		const strip = document.createElement('div');
		strip.className = `editor-add-strip ${edge} ${extraClass}`.trim();
		strip.innerHTML = `
			<button type="button" class="add-icon-btn ${edge}" title="Add Block">
				<nui-icon name="add_circle"></nui-icon>
			</button>
		`;
		strip.querySelector('button').addEventListener('click', (e) => {
			e.stopPropagation();
			onClick();
		});
		return strip;
	}

	function generateId(prefix = 'id') {
		return `${prefix}-${Math.random().toString(36).substring(2, 7)}`;
	}

	function escapeHtml(str) {
		return String(str || '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	// Initial render
	renderVisualEditor();
	syncToOutputs();
}


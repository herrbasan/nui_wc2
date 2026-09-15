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
							attrs: { id: 'sec-1', label: 'Section 1' },
							vars: [],
							nodes: [
								{
									type: 'block',
									attrs: { id: 'block-1', preset: 'image:hero' },
									nodes: [
										{
											type: 'md',
											lines: [
												'![NUI artwork — plate 1](images/nui_1.webp)',
												'',
												'A media block holds one image or many — click a thumbnail to make it the lead.'
											]
										}
									]
								},
								{
									type: 'block',
									attrs: { id: 'block-2', preset: 'lead' },
									nodes: [
										{
											type: 'md',
											lines: [
												'# Welcome to NUI Blocks',
												'',
												'This is an interactive visual editor built for **MD-Blocks**.',
												'Sections turn into page regions or slides, while blocks structure content.'
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

	// ── Render Sections Canvas ──
	function renderVisualEditor() {
		sectionsContainer.innerHTML = '';
		const main = currentDoc.mains?.[0];
		if (!main || !main.sections) return;

		updateFrontmatterSummary();
		updateChromeFromDoc();

		main.sections.forEach((sec, sIdx) => {
			const secEl = document.createElement('div');
			secEl.className = 'editor-section-card';
			secEl.dataset.sectionIndex = sIdx;

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

			const labelInput = titleGroup.querySelector('.section-label-input');
			labelInput.addEventListener('change', (e) => {
				sec.attrs = sec.attrs || {};
				sec.attrs.label = e.target.value;
				syncToOutputs();
			});

			const controlsGroup = document.createElement('div');
			controlsGroup.className = 'section-controls-group';

			// NUI Select for Surface Preset
			const presetSelectWrap = document.createElement('nui-select');
			presetSelectWrap.setAttribute('size', 'small');
			const nativeSecSelect = document.createElement('select');
			nativeSecSelect.innerHTML = `
				<option value="">Default Surface</option>
				<option value="band" ${sec.attrs?.preset === 'band' ? 'selected' : ''}>Band</option>
				<option value="cover" ${sec.attrs?.preset === 'cover' ? 'selected' : ''}>Cover</option>
			`;
			presetSelectWrap.appendChild(nativeSecSelect);
			controlsGroup.appendChild(presetSelectWrap);
			customElements.upgrade(presetSelectWrap);

			presetSelectWrap.addEventListener('nui-change', (e) => {
				const val = e.detail?.values?.[0] ?? '';
				sec.attrs = sec.attrs || {};
				if (val) sec.attrs.preset = val;
				else delete sec.attrs.preset;
				syncToOutputs();
			});

			// Reorder / Delete buttons using NUI icon buttons
			controlsGroup.appendChild(createNuiIconButton('chevron_right', 'Move Up', () => moveSection(sIdx, -1), 'icon-rotate-up'));
			controlsGroup.appendChild(createNuiIconButton('chevron_right', 'Move Down', () => moveSection(sIdx, 1), 'icon-rotate-down'));
			controlsGroup.appendChild(createNuiIconButton('close', 'Delete Section', () => deleteSection(sIdx)));

			header.appendChild(titleGroup);
			header.appendChild(controlsGroup);
			secEl.appendChild(header);

			// Content Body (Nodes)
			const contentBody = document.createElement('div');
			contentBody.className = 'section-content-body';

			// Top Add Block Strip
			contentBody.appendChild(addStripTop(() => openInsertBlockPalette(sec, 0)));

			// Render Nodes
			const nodesContainer = document.createElement('div');
			nodesContainer.className = 'section-nodes-list';

			(sec.nodes || []).forEach((node, nIdx) => {
				// Skip repeat blocks in the visual section list (handled in Chrome panel)
				if (node.type === 'block' && (node.attrs?.repeat === 'header' || node.attrs?.repeat === 'footer')) {
					return;
				}

				const nodeEl = renderNode(node, sec, nIdx);
				nodesContainer.appendChild(nodeEl);

				// Add strip after each block
				nodesContainer.appendChild(addStripBottom(() => openInsertBlockPalette(sec, nIdx + 1)));
			});

			contentBody.appendChild(nodesContainer);
			secEl.appendChild(contentBody);
			sectionsContainer.appendChild(secEl);

			// Add strip between sections
			sectionsContainer.appendChild(addStripBottom(() => addSection(sIdx + 1), 'section-divider'));
		});
	}

	// ── Render Node (Leaf Block, Columns, Var) ──
	function renderNode(node, parentContainer, nodeIdx) {
		const nodeCard = document.createElement('div');
		nodeCard.className = 'editor-block-card';

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

		// Leaf Block — an image or image list at the head makes it a media block
		if (isMediaBlock(node)) {
			nodeCard.classList.add('editor-media-card');
			renderMediaBlockNode(nodeCard, node, parentContainer, nodeIdx);
			return nodeCard;
		}

		renderLeafBlockNode(nodeCard, node, parentContainer, nodeIdx);
		return nodeCard;
	}

	// Shared by every block card. `presets` is the option table for the preset
	// select; `onToggleRaw` is omitted for blocks with no raw mode.
	function buildBlockHeader(node, parentContainer, nodeIdx, presets, onToggleRaw) {
		const header = document.createElement('div');
		header.className = 'block-card-header';

		const left = document.createElement('div');
		left.className = 'block-header-left';
		left.innerHTML = `
			<span class="drag-handle"><nui-icon name="drag_indicator"></nui-icon></span>
			<span class="block-idx-badge">${nodeIdx + 1}</span>
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
			syncToOutputs();
		});

		const right = document.createElement('div');
		right.className = 'block-header-right';
		if (onToggleRaw) right.appendChild(createNuiIconButton('code', 'Toggle Code / WYSIWYG', onToggleRaw));
		right.appendChild(createNuiIconButton('chevron_right', 'Move Up', () => moveNode(parentContainer, nodeIdx, -1), 'icon-rotate-up'));
		right.appendChild(createNuiIconButton('chevron_right', 'Move Down', () => moveNode(parentContainer, nodeIdx, 1), 'icon-rotate-down'));
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
		controls.appendChild(createNuiIconButton('folder', 'Choose from the media library', () => openMediaLibrary()));

		preview.appendChild(frame);
		preview.appendChild(controls);
		body.appendChild(preview);

		// The block's image set, lead first. Click a thumb to promote it, × to drop it.
		const strip = document.createElement('ul');
		strip.className = 'media-thumbs';
		body.appendChild(strip);

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

		nodeCard.appendChild(buildBlockHeader(node, parentContainer, nodeIdx, MEDIA_PRESETS, toggleRaw));
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

		function paint() {
			const lead = images[0];
			frame.innerHTML = lead
				? `<img src="${escapeHtml(lead.src)}" alt="${escapeHtml(lead.alt)}">`
				: `<div class="media-empty"><nui-icon name="image"></nui-icon><span>No image yet</span></div>`;

			strip.innerHTML = '';
			images.forEach((im, i) => {
				const li = document.createElement('li');
				li.className = 'media-thumb' + (i === 0 ? ' selected' : '') + (im.local ? ' local' : '');
				li.title = i === 0 ? 'Lead image' : 'Make this the lead image';

				const handle = document.createElement('span');
				handle.className = 'handle';
				handle.textContent = String(i + 1);

				const pic = document.createElement('img');
				pic.src = libThumb(im.src);
				pic.alt = '';
				pic.loading = 'lazy';

				li.append(handle, pic);

				const remove = document.createElement('button');
				remove.type = 'button';
				remove.className = 'thumb-remove';
				remove.title = 'Remove image';
				remove.setAttribute('aria-label', 'Remove image');
				remove.innerHTML = '<nui-icon name="close"></nui-icon>';
				remove.addEventListener('click', (e) => {
					e.stopPropagation();
					images.splice(i, 1);
					commit();
				});
				li.appendChild(remove);

				if (i > 0) {
					li.addEventListener('click', () => {
						images = [images.splice(i, 1)[0], ...images];
						commit();
					});
				}
				strip.appendChild(li);
			});

			const addTile = document.createElement('li');
			addTile.className = 'media-thumb add-tile';
			addTile.title = 'Add an image';
			addTile.innerHTML = '<nui-icon name="add"></nui-icon>';
			addTile.addEventListener('click', () => openMediaLibrary());
			strip.appendChild(addTile);
		}

		async function openMediaLibrary() {
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

			// Nothing to add until something is picked.
			const syncAddButton = () => {
				const add = dialog.querySelector('.nui-list-footer-right button');
				if (add) add.disabled = selected.length === 0;
			};

			// No dialog buttons: nui-list owns the footer (count + Clear + Add), as in
			// the CMS this is modelled on. The header supplies search and sort.
			const { dialog, result } = await nui.components.dialog.page(
				'Insert Block',
				container,
				{ contentScroll: false }
			);
			dialog.style.cssText = '--space-page-maxwidth: 720px;';

			const addSelection = () => {
				if (!selected.length) return;
				dialog.close();
				for (const entry of selected) addImage({ src: entry.src, alt: entry.label });
			};

			// The dialog has to finish layout before the list can measure a row, or the
			// list collapses to a zero-height container and renders nothing.
			customElements.whenDefined('nui-list').then(() => setTimeout(() => {
				listEl.loadData({
					data: MEDIA_LIBRARY,
					render: renderLibraryRow,
					multiple: true,
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
							{ label: 'Add', type: 'primary', fnc: addSelection }
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
	}

	function renderLeafBlockNode(nodeCard, node, parentContainer, nodeIdx) {
		// Toggle raw markdown / rich text mode
		let isRawMode = false;

		nodeCard.appendChild(buildBlockHeader(node, parentContainer, nodeIdx, LEAF_PRESETS, () => {
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
		}));

		// Body editor (nui-rich-text + textarea fallback)
		const body = document.createElement('div');
		body.className = 'block-card-body';

		const richTextEl = document.createElement('nui-rich-text');
		const rawTextArea = document.createElement('textarea');
		rawTextArea.className = 'block-raw-textarea';
		rawTextArea.spellcheck = false;
		rawTextArea.style.display = 'none';

		body.appendChild(richTextEl);
		body.appendChild(rawTextArea);
		nodeCard.appendChild(body);

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
		right.appendChild(createNuiIconButton('chevron_right', 'Move Up', () => moveNode(parentContainer, nodeIdx, -1), 'icon-rotate-up'));
		right.appendChild(createNuiIconButton('chevron_right', 'Move Down', () => moveNode(parentContainer, nodeIdx, 1), 'icon-rotate-down'));
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

			const colNodes = document.createElement('div');
			colNodes.className = 'col-nodes-list';

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

	function renderVarNode(nodeCard, node, parentContainer, nodeIdx) {
		const header = document.createElement('div');
		header.className = 'block-card-header var-header';

		const left = document.createElement('div');
		left.className = 'block-header-left';
		left.innerHTML = `
			<span class="drag-handle"><nui-icon name="drag_indicator"></nui-icon></span>
			<span class="block-idx-badge">V</span>
			<strong>${escapeHtml(node.name || 'unnamed')}</strong>
		`;

		const right = document.createElement('div');
		right.className = 'block-header-right';
		right.appendChild(createNuiIconButton('close', 'Delete', () => deleteNode(parentContainer, nodeIdx)));

		header.appendChild(left);
		header.appendChild(right);
		nodeCard.appendChild(header);

		const body = document.createElement('div');
		body.className = 'block-card-body';
		const input = document.createElement('input');
		input.type = 'text';
		input.className = 'nui-native-input';
		input.value = node.value !== undefined ? (typeof node.value === 'object' ? JSON.stringify(node.value) : node.value) : '';
		input.placeholder = 'Value';
		input.addEventListener('input', (e) => {
			node.value = e.target.value;
			syncToOutputs();
		});
		body.appendChild(input);
		nodeCard.appendChild(body);
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

	// Mock media library. The Playground is served statically, so there is no way
	// to list a folder — the set is derived from two naming rules instead of a
	// 126-entry manifest. Renaming either folder breaks tiles loudly in the picker.
	const MEDIA_LIBRARY = [
		...Array.from({ length: 8 }, (_, i) => ({
			id: `nui-${i + 1}`,
			label: `NUI plate ${i + 1}`,
			collection: 'NUI plates',
			variants: 'webp',
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

	// Presets are split by which block owns them: `image:icon` renders as prose
	// with a decorative badge from its `icon=` attribute, so it is a leaf preset,
	// not a media one.
	const LEAF_PRESETS = [
		{ value: '', label: 'Standard Prose' },
		{ value: 'lead', label: 'Lead Paragraph' },
		{ value: 'card:note', label: 'Card: Note' },
		{ value: 'card:warning', label: 'Card: Warning' },
		{ value: 'card:stat', label: 'Card: Stat' },
		{ value: 'image:icon', label: 'Media: Icon' },
		{ value: 'link:cta', label: 'Link: CTA' }
	];

	// Gallery presets come from the MD-Blocks demo document; the lead image is the
	// prominent plate in every one of them, which is why the strip can promote.
	const MEDIA_PRESETS = [
		{ value: '', label: 'Media: Figure' },
		{ value: 'image:hero', label: 'Media: Hero' },
		{ value: 'gallery:featured', label: 'Gallery: Featured' },
		{ value: 'gallery:row', label: 'Gallery: Row' },
		{ value: 'gallery:mosaic', label: 'Gallery: Mosaic' }
	];

	function moveSection(index, direction) {
		const main = currentDoc.mains?.[0];
		if (!main || !main.sections) return;
		const targetIdx = index + direction;
		if (targetIdx < 0 || targetIdx >= main.sections.length) return;
		const [sec] = main.sections.splice(index, 1);
		main.sections.splice(targetIdx, 0, sec);
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

	function moveNode(container, index, direction) {
		const nodes = container.nodes;
		if (!nodes) return;
		const targetIdx = index + direction;
		if (targetIdx < 0 || targetIdx >= nodes.length) return;
		const [n] = nodes.splice(index, 1);
		nodes.splice(targetIdx, 0, n);
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
		const dialogHtml = `
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
				<div class="palette-item" data-type="media-hero">
					<div class="palette-icon"><nui-icon name="image"></nui-icon></div>
					<div class="palette-text">
						<strong>Media Figure</strong>
						<span>Image banner with caption</span>
					</div>
				</div>
				${!isInsideColumn ? `
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
				<div class="palette-item" data-type="var">
					<div class="palette-icon"><nui-icon name="data_object"></nui-icon></div>
					<div class="palette-text">
						<strong>Named Variable</strong>
						<span>mb:var metadata field</span>
					</div>
				</div>
				` : ''}
			</div>
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
		} else if (type === 'media-hero') {
			newNode = {
				type: 'block',
				attrs: { id: generateId('b'), preset: 'image:hero' },
				nodes: [{ type: 'md', lines: ['![Hero Banner](images/nui_1.webp)', '', 'Figure caption text.'] }]
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
			newNode = {
				type: 'var',
				name: 'myVar',
				value: 'Sample value'
			};
		}

		if (newNode) {
			targetContainer.nodes = targetContainer.nodes || [];
			targetContainer.nodes.splice(insertIdx, 0, newNode);
			renderVisualEditor();
			syncToOutputs();
		}
	}

	// ── Add Section ──
	function addSection(insertAt) {
		const main = currentDoc.mains?.[0];
		if (!main) return;
		main.sections = main.sections || [];
		const newSec = {
			attrs: { id: generateId('sec'), label: `Section ${main.sections.length + 1}` },
			vars: [],
			nodes: [
				{
					type: 'block',
					attrs: { id: generateId('b') },
					nodes: [{ type: 'md', lines: ['## New Section Heading', '', 'Add blocks or prose here.'] }]
				}
			]
		};
		if (typeof insertAt === 'number') {
			main.sections.splice(insertAt, 0, newSec);
		} else {
			main.sections.push(newSec);
		}
		renderVisualEditor();
		syncToOutputs();
	}

	btnAddSecTop?.addEventListener('click', () => addSection(0));
	btnAddSecBottom?.addEventListener('click', () => addSection());

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
				const text = await res.text();
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
		nuiBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			onClick();
		});
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


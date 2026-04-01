// nui-markdown.js - Markdown rendering component and utility
import { nui } from '../../nui.js';

/**
 * Converts Markdown to HTML using a lightweight parser.
 * Supports headers, lists, links, code blocks (with nui-code), tables, bold/italic, etc.
 * Used for LLM guides and rich content rendering.
 */
export function markdownToHtml(md) {
	if (typeof md !== 'string' || !md.trim()) return '';
	
	let html = md.trim().replace(/\r\n/g, '\n');
	const codeBlocks = [];
	html = html.replace(/^[ \t]*```(\w+)?\n([\s\S]*?)\n[ \t]*```/gm, (match, lang, code) => {
		const token = `\uE000${codeBlocks.length}\uE001`;
		codeBlocks.push({ token, lang, code });
		return token;
	});
	html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	// Simple tables
	html = html.replace(/^[ \t]*\|(.+)\|\n[ \t]*\|([-:| ]+)\|\n((?:[ \t]*\|.+\|\n?)*)/gm, (match, header, sep, body) => {
		const headCells = header.trim().replace(/^\||\|$/g, '').split('|').map(c => `<th>${c.trim()}</th>`).join('');
		const bodyRows = body.trim().split('\n').filter(r => r.trim()).map(row => {
			const cells = row.trim().replace(/^\||\|$/g, '').split('|').map(c => `<td>${c.trim()}</td>`).join('');
			return `<tr>${cells}</tr>`;
		}).join('');
		return `<table class="nui-table"><thead><tr>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
	});

	// Headers
	html = html.replace(/^[ \t]*(#{1,6})\s+(.+)$/gm, (match, hashes, text) => `<h${hashes.length}>${text}</h${hashes.length}>`);

	// Blockquotes
	html = html.replace(/^[ \t]*(&gt;\s+.+(?:\n[ \t]*&gt;\s+.+)*)/gm, (match) => `<blockquote>${match.replace(/^[ \t]*&gt;\s+/gm, '')}</blockquote>`);

	// Unordered lists
	html = html.replace(/^((?:[ \t]*(?:-|\*)\s+.+\n?)+)/gm, (match) => {
		const items = match.trim().split('\n').map(item => `<li>${item.replace(/^[ \t]*(?:-|\*)\s+/, '')}</li>`).join('');
		return `<ul>${items}</ul>`;
	});
	
	// Ordered lists
	html = html.replace(/^((?:[ \t]*\d+\.\s+.+\n?)+)/gm, (match) => {
		const items = match.trim().split('\n').map(item => `<li>${item.replace(/^[ \t]*\d+\.\s+/, '')}</li>`).join('');
		return `<ol>${items}</ol>`;
	});

	// Horizontal rules with style classes
	html = html.replace(/^[ \t]*(={3,})[ \t]*$/gm, '<hr class="equals">');
	html = html.replace(/^[ \t]*(-{3,})[ \t]*$/gm, '<hr class="dash">');
	html = html.replace(/^[ \t]*(\*{3,})[ \t]*$/gm, '<hr class="stars">');
	html = html.replace(/^[ \t]*(_{3,})[ \t]*$/gm, '<hr>');

	// Block separation
	const blocks = html.split(/\n{2,}/);
	const htmlBlocks = blocks.map(block => {
		block = block.trim();
		if (!block) return '';
		if (/^\uE000\d+\uE001$/.test(block)) return block;
		if (/^<(h\d|ul|ol|pre|blockquote|table|hr|nui-code)/i.test(block)) return block;
		return `<p>${block.replace(/\n/g, '<br>')}</p>`;
	});
	html = htmlBlocks.join('\n');

	// Inline elements
	html = html.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
	html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
	html = html.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
	html = html.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
	html = html.replace(/~~(.*?)~~/g, '<s>$1</s>');
	html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
	html = codeBlocks.reduce((result, { token, lang, code }) => {
		const safeCode = code.replace(/<\/script/gi, '<\\/script');
		return result.replace(token, `<nui-code><script type="example"${lang ? ` data-lang="${lang}"` : ''}>${safeCode}</script></nui-code>`);
	}, html);

	return html;
}

// Add to nui.util for global access if needed
nui.util.markdownToHtml = markdownToHtml;

class NuiMarkdown extends HTMLElement {
	constructor() {
		super();
		this._streamText = '';
		this._activeBuffer = '';
		this._isStreaming = false;
	}

	connectedCallback() {
		if (this._isStreaming) return;

		// Check for <script type="text/markdown"> pattern
		const mdScript = this.querySelector('script[type="text/markdown"]');
		let rawText = '';

		if (mdScript) {
			rawText = mdScript.textContent.trim();
		} else {
			// Fallback to direct text content if no script tag is used
			rawText = this.textContent.trim();
		}

		if (!rawText) return;

		this.innerHTML = markdownToHtml(rawText);
	}

	_isInsideCodeBlock(text) {
		const matches = text.match(/```/g);
		return matches && matches.length % 2 !== 0;
	}

	beginStream() {
		this._isStreaming = true;
		this._streamText = '';
		this._activeBuffer = '';
		
		this.innerHTML = '';
		this._stableContainer = document.createElement('div');
		this._stableContainer.className = 'nui-md-stable';
		
		this._tempContainer = document.createElement('div');
		this._tempContainer.className = 'nui-md-temp';
		
		this.appendChild(this._stableContainer);
		this.appendChild(this._tempContainer);
	}

	appendChunk(chunk) {
		if (!this._isStreaming) this.beginStream();

		this._streamText += chunk;
		this._activeBuffer += chunk;

		this._processBuffer(false);
	}

	endStream() {
		if (this._isStreaming) {
			this._processBuffer(true);
			this._isStreaming = false;
		}
	}

	_processBuffer(forceDrain) {
		while (true) {
			if (!forceDrain && this._isInsideCodeBlock(this._streamText)) {
				break;
			}
			
			// Find a valid \n\n boundary that doesn't occur inside a code block
			let boundary = -1;
			let searchIndex = 0;
			
			while (true) {
				const nextIndex = this._activeBuffer.indexOf('\n\n', searchIndex);
				if (nextIndex === -1) break;
				
				const blockSoFar = this._activeBuffer.substring(0, nextIndex);
				if (!this._isInsideCodeBlock(blockSoFar)) {
					boundary = nextIndex;
					break;
				}
				searchIndex = nextIndex + 1;
			}

			if (boundary !== -1) {
				const block = this._activeBuffer.substring(0, boundary + 2);
				this._activeBuffer = this._activeBuffer.substring(boundary + 2);
				
				const tempDiv = document.createElement('div');
				tempDiv.innerHTML = markdownToHtml(block);
				while (tempDiv.firstChild) {
					this._stableContainer.appendChild(tempDiv.firstChild);
				}
			} else {
				break;
			}
		}

		if (forceDrain && this._activeBuffer) {
			const drainDiv = document.createElement('div');
			drainDiv.innerHTML = markdownToHtml(this._activeBuffer);
			while (drainDiv.firstChild) {
				this._stableContainer.appendChild(drainDiv.firstChild);
			}
			this._activeBuffer = '';
		}
		
		this._tempContainer.innerHTML = markdownToHtml(this._activeBuffer);
	}
}

if (!customElements.get('nui-markdown')) {
	customElements.define('nui-markdown', NuiMarkdown);
}

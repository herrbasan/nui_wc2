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

	html = html.replace(/^[ \t]*(-*_){3,}[ \t]*$/gm, '<hr>');

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
	connectedCallback() {
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
}

if (!customElements.get('nui-markdown')) {
	customElements.define('nui-markdown', NuiMarkdown);
}

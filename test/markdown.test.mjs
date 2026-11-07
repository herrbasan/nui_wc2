// MD-Blocks renderer — Node test.
//
// The renderer used to live inside nui.js, which extends HTMLElement and therefore cannot be
// imported outside a browser: the renderer had no test that could run in CI. It now lives in
// NUI/markdown.js, which is DOM-free, so it can be exercised here — plain Node, no
// dependencies, no test framework.
//
//   node test/markdown.test.mjs
//
// The browser-side checks (the enhancement passes, which need elements to attach to) live in
// test/md-blocks-render.html.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

// ── prove the module is DOM-free ─────────────────────────────────────────────
// A throwing getter is stronger than "the globals are absent": any access at all —
// even `typeof document` — blows up here, and the import itself would fail.
const FORBIDDEN = ['document', 'window', 'navigator', 'HTMLElement', 'customElements', 'location', 'localStorage'];
for (const name of FORBIDDEN) {
	Object.defineProperty(globalThis, name, {
		configurable: true,
		get() { throw new Error(`the renderer touched \`${name}\` — it must stay DOM-free`); }
	});
}

const md = await import('../NUI/markdown.js');
const { markdownToHtml, parseBlocks, serializeBlocks, setMarkdownImagePolicy, setMarkdownMediaTrust, setMarkdownImageRewrite } = md;

const results = [];
function check(name, fn) {
	try {
		const problem = fn();
		if (problem) results.push({ name, ok: false, detail: problem });
		else results.push({ name, ok: true, detail: '' });
	} catch (err) {
		results.push({ name, ok: false, detail: err && err.message ? err.message : String(err) });
	}
}
const has = (html, re) => re.test(html);

// ── line breaks ──────────────────────────────────────────────────────────────
// CommonMark: a soft break is a newline the width decides; a hard break is explicit.
check('a soft break does not become a <br>', () => {
	const html = markdownToHtml('Line one\nLine two');
	if (has(html, /<br>/)) return 'a <br> was inserted';
	if (!has(html, /Line one\nLine two/)) return 'the newline was not kept';
	return null;
});

check('a hard break with two trailing spaces becomes one <br>', () => {
	const html = markdownToHtml('Line one  \nLine two');
	const count = (html.match(/<br>/g) || []).length;
	if (count !== 1) return 'expected exactly 1 <br>, got ' + count;
	if (has(html, /  <br>/)) return 'the trailing spaces were not stripped';
	return null;
});

check('a hard break with a backslash becomes one <br>', () => {
	const html = markdownToHtml('Line one\\\nLine two');
	const count = (html.match(/<br>/g) || []).length;
	if (count !== 1) return 'expected exactly 1 <br>, got ' + count;
	if (has(html, /\\<br>/)) return 'the backslash was not stripped';
	return null;
});

check('a fenced code block keeps its newlines and gains no <br>', () => {
	const html = markdownToHtml('```js\nconst a = 1;\nconst b = 2;\n```');
	if (has(html, /<br>/)) return 'a <br> was inserted into the code';
	if (!has(html, /const a = 1;\nconst b = 2;/)) return 'the code newlines were lost';
	return null;
});

check('an inline code span is untouched', () => {
	const html = markdownToHtml('Text with `code` in it');
	if (has(html, /<br>/)) return 'a <br> was inserted';
	if (!has(html, /<code>code<\/code>/)) return 'the code span is missing';
	return null;
});

// ── MD-Blocks structure ──────────────────────────────────────────────────────
check('an explicit mb:/col yields two columns, not three', () => {
	const html = markdownToHtml('<!-- mb:columns weights=[1,1] -->\n<!-- mb:col -->\nA\n<!-- mb:/col -->\n<!-- mb:col -->\nB\n<!-- mb:/columns -->');
	if (!has(html, /data-cols="2"/)) return 'expected data-cols="2", got ' + (html.match(/data-cols="(\d+)"/) || [])[1];
	return null;
});

check('an explicit mb:/col keeps the column weights', () => {
	const html = markdownToHtml('<!-- mb:columns weights=[1,1] -->\n<!-- mb:col -->\nA\n<!-- mb:/col -->\n<!-- mb:col -->\nB\n<!-- mb:/columns -->');
	if (!has(html, /grid-template-columns:1fr 1fr/)) return 'weights were dropped';
	return null;
});

check('a var renders', () => {
	const html = markdownToHtml('<!-- mb:var name=seconds value=20 -->');
	if (!has(html, /class="nui-blocks-var"/)) return 'no var element';
	if (!has(html, /data-var="seconds"/)) return 'the var name is missing';
	return null;
});

// ── media classification ─────────────────────────────────────────────────────
check('a .jpg link reads as file, not image', () => {
	const html = markdownToHtml('<!-- mb:block -->\n[Photo](shot.jpg)\n<!-- mb:/block -->');
	if (!has(html, /nui-blocks-file/)) return 'no nui-blocks-file class';
	if (has(html, /nui-blocks-image/)) return 'the block was classified as an image';
	return null;
});

check('a .jpg link still renders as a link', () => {
	const html = markdownToHtml('<!-- mb:block -->\n[Photo](shot.jpg)\n<!-- mb:/block -->');
	if (!has(html, /<a href="shot\.jpg">Photo<\/a>/)) return 'the anchor is missing';
	return null;
});

check('an image reads as image', () => {
	const html = markdownToHtml('<!-- mb:block -->\n![Photo](shot.jpg)\n<!-- mb:/block -->');
	if (!has(html, /nui-blocks-image/)) return 'no nui-blocks-image class';
	return null;
});

check('a video link reads as video', () => {
	const html = markdownToHtml('<!-- mb:block -->\n[Watch](clip.mp4)\n<!-- mb:/block -->');
	if (!has(html, /nui-blocks-video/)) return 'no nui-blocks-video class';
	return null;
});

check('an audio link reads as audio', () => {
	const html = markdownToHtml('<!-- mb:block -->\n[Listen](track.mp3)\n<!-- mb:/block -->');
	if (!has(html, /nui-blocks-audio/)) return 'no nui-blocks-audio class';
	return null;
});

check('a gallery list keeps every plate', () => {
	const html = markdownToHtml('<!-- mb:block preset=gallery:row -->\n- ![a](1.jpg)\n- ![b](2.jpg)\n<!-- mb:/block -->');
	if (!has(html, /nui-blocks-gallery/)) return 'no gallery class';
	const count = (html.match(/<img/g) || []).length;
	return count === 2 ? null : 'expected 2 plates, got ' + count;
});

check('a stamped kind is kept', () => {
	const html = markdownToHtml('<!-- mb:block kind=video -->\n[Watch](clip.mp4)\n<!-- mb:/block -->');
	if (!has(html, /nui-blocks-video/)) return 'the stamp was not honoured';
	return null;
});

// ── a link to a page is not a media file ─────────────────────────────────────
check('a CTA link renders as a nav, not a media figure', () => {
	const html = markdownToHtml('<!-- mb:block preset=link:cta -->\n[Explore](https://github.com/herrbasan/md-blocks)\n<!-- mb:/block -->');
	if (!has(html, /<nav[^>]*nui-variant-cta/)) return 'no nav element';
	if (has(html, /nui-blocks-media/)) return 'the block was rendered as a media figure';
	return null;
});

check('a link to a PDF is a media figure', () => {
	const html = markdownToHtml('<!-- mb:block preset=link:download -->\n[Spec](doc.pdf)\n<!-- mb:/block -->');
	if (!has(html, /nui-blocks-media/)) return 'the block was not rendered as media';
	return null;
});

// ── the document model ───────────────────────────────────────────────────────
check('a document without directives is unchanged', () => {
	const html = markdownToHtml('# Title\n\nSome text.');
	if (!has(html, /<h1[^>]*>Title<\/h1>/)) return 'the heading is missing';
	if (has(html, /nui-blocks-main/)) return 'the document was wrapped in structure';
	return null;
});

check('frontmatter renders as a metadata disclosure', () => {
	const html = markdownToHtml('---\ntitle: T\n---\n\nBody');
	if (!has(html, /nui-md-frontmatter/)) return 'no frontmatter element';
	return null;
});

check('parseBlocks returns the canonical tree', () => {
	const doc = parseBlocks('<!-- mb:block -->\nX\n<!-- mb:/block -->');
	if (!doc.mains || !doc.mains.length) return 'no mains';
	const child = doc.mains[0].sections[0].children[0];
	if (!child || child.type !== 'block') return 'the first child is not a block';
	if (child.markdown !== 'X') return 'the block body is wrong: ' + JSON.stringify(child.markdown);
	return null;
});

check('serializeBlocks round-trips a document', () => {
	const source = '<!-- mb:block -->\nX\n<!-- mb:/block -->\n';
	const out = serializeBlocks(parseBlocks(source));
	if (!out.includes('<!-- mb:block -->')) return 'the block is missing from the output';
	if (!out.includes('X')) return 'the content is missing from the output';
	return null;
});

// ── the app-level hooks ──────────────────────────────────────────────────────
// One state holder, shared by the browser app and a Node consumer.
check('the image policy hook can refuse a destination', () => {
	setMarkdownImagePolicy(() => false);
	const html = markdownToHtml('<!-- mb:block -->\n![Photo](shot.jpg)\n<!-- mb:/block -->');
	setMarkdownImagePolicy(null);
	if (!has(html, /nui-md-media-rejected/)) return 'the refusal marker is missing';
	return null;
});

check('the image rewrite hook changes the destination', () => {
	setMarkdownImageRewrite((url) => '/proxied' + url);
	const html = markdownToHtml('<!-- mb:block -->\n![Photo](shot.jpg)\n<!-- mb:/block -->');
	setMarkdownImageRewrite(null);
	if (!has(html, /src="\/proxied/)) return 'the rewrite did not apply';
	return null;
});

check('the media trust hook overrides a refused path', () => {
	setMarkdownMediaTrust(() => 'C:/trusted/photo.jpg');
	const html = markdownToHtml('<!-- mb:block -->\n![Photo](C:/secret/photo.jpg)\n<!-- mb:/block -->');
	setMarkdownMediaTrust(null);
	if (has(html, /nui-md-media-rejected/)) return 'the destination was refused';
	return null;
});

// ── the real fixtures render ─────────────────────────────────────────────────
// The parser's own suite proves the tree; this proves the renderer survives every
// document the project actually ships.
function walk(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const p = join(dir, entry);
		if (statSync(p).isDirectory()) walk(p, out);
		else if (p.endsWith('.md')) out.push(p);
	}
	return out;
}
const fixtureDir = join(repoRoot, 'parser', 'test', 'fixtures');
const fixtures = walk(fixtureDir);
check('every fixture renders without throwing', () => {
	for (const f of fixtures) {
		const src = readFileSync(f, 'utf8');
		const html = markdownToHtml(src);
		if (typeof html !== 'string') return f + ' did not render';
		if (!html.length) return f + ' rendered empty';
	}
	return null;
});

check('every fixture renders the same on a second pass', () => {
	for (const f of fixtures) {
		const src = readFileSync(f, 'utf8');
		if (markdownToHtml(src) !== markdownToHtml(src)) return f + ' is not deterministic';
	}
	return null;
});

// ── report ───────────────────────────────────────────────────────────────────
const failed = results.filter(r => !r.ok);
for (const r of results) {
	const line = (r.ok ? '  ok   ' : '  FAIL ') + r.name + (r.detail ? '  — ' + r.detail : '');
	console.log(line);
}
console.log('');
console.log(failed.length
	? `${failed.length} of ${results.length} checks FAILED`
	: `all ${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);

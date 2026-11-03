'use strict';

/*
	Conformance cases for the MD-Blocks parser — spec v1.10 §10, transcribed as data.

	Every case is source plus what the parse must produce. Cases whose §10 row is about rendering
	("renders as a link", "playlist treatment") are not here: the parser cannot observe them. The
	structural half of each row — the tree, the kind, the class, the diagnostics — is.

	`src` is an array of lines so nothing has to be escaped, and line numbers in `diagnostics`
	stay literal.
*/

const cases = [];
const add = (name, spec, src, expect) => cases.push(Object.assign({ name, spec, src: src.join('\n') }, expect));

/* ---------------------------------------------------------------- sections */

add('body with no section break is one section', '§10', [
	'# Title',
	'',
	'Paragraph.',
], {
	clean: true,
	counts: { mains: 1, sections: 1, markdown: 1 },
	select: [{ path: 'mains[0].sections[0].children[0].type', expect: 'markdown' }],
});

add('consecutive and trailing --- preserve empty sections', '§10', [
	'# A',
	'',
	'---',
	'',
	'---',
	'',
	'# B',
], {
	clean: true,
	counts: { mains: 1, sections: 3 },
	select: [{ path: 'mains[0].sections[1].children.length', expect: 0 }],
});

add('--- inside a block is an <hr>, not a break', '§10', [
	'<!-- mb:block -->',
	'Before',
	'',
	'---',
	'',
	'After',
	'<!-- mb:/block -->',
], {
	clean: true,
	counts: { sections: 1, blocks: 1 },
	select: [{ path: 'mains[0].sections[0].children[0].markdown', expect: 'Before\n\n---\n\nAfter' }],
});

add('paragraph line followed by --- is a setext H2 and a warning', '§10', [
	'Some paragraph',
	'---',
	'More',
], {
	counts: { sections: 1 },
	diagnostics: [{ severity: 'warning', code: 'setext-trap', line: 2 }],
	select: [{ path: 'mains[0].sections[0].children[0].markdown', expect: 'Some paragraph\n---\nMore' }],
});

add('*** at root is a section break', '§10', [
	'First',
	'',
	'***',
	'',
	'Second',
], {
	clean: true,
	counts: { sections: 2 },
});

add('frontmatter not at line 1 is a section break, not metadata', '§10', [
	'# Title',
	'---',
	'title: x',
	'---',
	'',
	'Body',
], {
	diagnostics: [{ severity: 'warning', code: 'setext-trap', line: 4 }],
	counts: { sections: 2 },
	select: [{ path: 'frontmatter', expect: null }],
});

/* ------------------------------------------------------------------ blocks */

add('two adjacent blocks stay two leaves', '§10', [
	'<!-- mb:block -->',
	'One',
	'<!-- mb:/block -->',
	'<!-- mb:block -->',
	'Two',
	'<!-- mb:/block -->',
], {
	clean: true,
	counts: { blocks: 2 },
	select: [{ path: 'mains[0].sections[0].children.length', expect: 2 }],
});

add('an unannotated run is one implicit markdown block', '§10', [
	'Intro',
	'',
	'# Heading',
	'',
	'- a',
	'- b',
], {
	clean: true,
	counts: { markdown: 1 },
	select: [{ path: 'mains[0].sections[0].children.length', expect: 1 }],
});

add('a var splits the implicit run', '§10', [
	'One',
	'',
	'<!-- mb:var name=x value=1 -->',
	'',
	'Two',
], {
	clean: true,
	counts: { markdown: 2, vars: 1 },
	select: [{ path: 'mains[0].sections[0].vars[0].value', expect: 1 }],
});

add('an empty block is legal', '§10', [
	'<!-- mb:block -->',
	'<!-- mb:/block -->',
], {
	clean: true,
	counts: { blocks: 1 },
	select: [{ path: 'mains[0].sections[0].children[0].markdown', expect: '' }],
});

add('a directive inside a fence is literal text', '§10', [
	'<!-- mb:block -->',
	'```',
	'<!-- mb:block -->',
	'```',
	'<!-- mb:/block -->',
], {
	clean: true,
	counts: { blocks: 1, columns: 0 },
	select: [{ path: 'mains[0].sections[0].children[0].markdown', expect: '```\n<!-- mb:block -->\n```' }],
});

/* ------------------------------------------------------------------- mains */

add('a body with no mb:main has one implicit main', '§10', [
	'# Title',
], {
	clean: true,
	counts: { mains: 1 },
});

add('mb:main as the first line annotates the implicit main', '§10', [
	'<!-- mb:main id=deck -->',
	'',
	'# Title',
], {
	clean: true,
	counts: { mains: 1, sections: 1 },
	select: [{ path: 'mains[0].id', expect: 'deck' }],
});

add('content before the first mb:main is the first main', '§10', [
	'First',
	'',
	'<!-- mb:main id=second -->',
	'',
	'Second',
], {
	clean: true,
	counts: { mains: 2 },
	select: [
		{ path: 'mains[0].sections[0].children[0].markdown', expect: 'First' },
		{ path: 'mains[1].id', expect: 'second' },
	],
});

add('two adjacent mb:main markers leave the first empty', '§10', [
	'<!-- mb:main id=one -->',
	'<!-- mb:main id=two -->',
	'',
	'# T',
], {
	clean: true,
	counts: { mains: 2 },
	select: [
		{ path: 'mains[0].sections[0].children.length', expect: 0 },
		{ path: 'mains[1].id', expect: 'two' },
	],
});

add('mb:/main is an error — a main has no closing form', '§10', [
	'<!-- mb:/main -->',
], {
	diagnostics: [{ severity: 'error', code: 'main-closing', line: 1 }],
});

add('preset on a main and on a section target different things', '§10', [
	'<!-- mb:main preset=cover -->',
	'<!-- mb:section preset=band -->',
	'',
	'Body',
], {
	clean: true,
	select: [
		{ path: 'mains[0].preset', expect: 'cover' },
		{ path: 'mains[0].sections[0].preset', expect: 'band' },
	],
});

add('a chrome block keeps its place and its repeat attribute', '§10', [
	'<!-- mb:main id=deck -->',
	'',
	'# Title',
	'',
	'<!-- mb:block repeat=footer -->',
	'Foot',
	'<!-- mb:/block -->',
], {
	clean: true,
	counts: { blocks: 1 },
	select: [{ path: 'mains[0].sections[0].children[1].repeat', expect: 'footer' }],
});

add('two blocks may share one chrome slot', '§10', [
	'<!-- mb:block repeat=header -->',
	'A',
	'<!-- mb:/block -->',
	'<!-- mb:block repeat=header -->',
	'B',
	'<!-- mb:/block -->',
], {
	clean: true,
	counts: { blocks: 2 },
	select: [{ path: 'mains[0].sections[0].children[1].repeat', expect: 'header' }],
});

/* ---------------------------------------------------------------- columns */

add('mb:/col is the same boundary written explicitly', '§10', [
	'<!-- mb:columns weights=[1,1] -->',
	'<!-- mb:col -->',
	'Left',
	'<!-- mb:/col -->',
	'<!-- mb:col -->',
	'Right',
	'<!-- mb:/columns -->',
], {
	clean: true,
	counts: { columns: 1, cols: 2 },
	select: [
		{ path: 'mains[0].sections[0].children[0].cols[0].closedBy', expect: '/col' },
		{ path: 'mains[0].sections[0].children[0].cols[1].closedBy', expect: '/columns' },
		{ path: 'mains[0].sections[0].children[0].cols[0].children[0].markdown', expect: 'Left' },
	],
});

add('a block may sit inside a column', '§10', [
	'<!-- mb:columns -->',
	'<!-- mb:col -->',
	'<!-- mb:block id=b -->',
	'X',
	'<!-- mb:/block -->',
	'<!-- mb:col -->',
	'Y',
	'<!-- mb:/columns -->',
], {
	clean: true,
	counts: { columns: 1, cols: 2, blocks: 1 },
	select: [{ path: 'mains[0].sections[0].children[0].cols[0].children[0].type', expect: 'block' }],
});

add('weights must have one entry per col marker', '§10', [
	'<!-- mb:columns weights=[2,1] -->',
	'<!-- mb:col -->',
	'A',
	'<!-- mb:col -->',
	'B',
	'<!-- mb:col -->',
	'C',
	'<!-- mb:/columns -->',
], {
	diagnostics: [{ severity: 'error', code: 'weights-length', line: 1 }],
});

add('columns needs at least two col markers', '§10', [
	'<!-- mb:columns -->',
	'<!-- mb:col -->',
	'A',
	'<!-- mb:/columns -->',
], {
	diagnostics: [{ severity: 'error', code: 'columns-too-few-cols', line: 1 }],
});

add('unclosed columns are reported at EOF, citing the opener', '§10', [
	'<!-- mb:columns -->',
	'<!-- mb:col -->',
	'A',
	'<!-- mb:col -->',
	'B',
], {
	diagnostics: [{ severity: 'error', code: 'unclosed-columns', line: 5 }],
	counts: { cols: 2 },
});

add('columns cannot nest', '§10', [
	'<!-- mb:columns -->',
	'<!-- mb:col -->',
	'<!-- mb:columns -->',
	'<!-- mb:/col -->',
	'<!-- mb:col -->',
	'X',
	'<!-- mb:/columns -->',
], {
	diagnostics: [{ severity: 'error', code: 'nested-columns', line: 3 }],
	clean: false,
});

add('a col marker outside columns is an error', '§10', [
	'<!-- mb:col -->',
	'X',
], {
	diagnostics: [{ severity: 'error', code: 'col-outside-columns', line: 1 }],
});

/* ------------------------------------------------------------------- media */

add('a hand-authored media block infers kind from the first node', '§10', [
	'<!-- mb:block -->',
	'![Alt](images/a.jpg)',
	'',
	'Cap',
	'<!-- mb:/block -->',
], {
	clean: true,
	counts: { blocks: 1 },
	select: [
		{ path: 'mains[0].sections[0].children[0].kind', expect: 'image' },
		{ path: 'mains[0].sections[0].children[0].kindStamped', expect: false },
		{ path: 'mains[0].sections[0].children[0].mediaClass', expect: 'image' },
		{ path: 'mains[0].sections[0].children[0].mediaForm', expect: 'single' },
	],
});

add('image first, two paragraphs after: media with a two-paragraph caption', '§10', [
	'<!-- mb:block -->',
	'![Alt](images/a.jpg)',
	'',
	'Cap one',
	'',
	'Cap two',
	'<!-- mb:/block -->',
], {
	clean: true,
	select: [{ path: 'mains[0].sections[0].children[0].mediaForm', expect: 'single' }],
});

add('image second: a text block with an inline image', '§10', [
	'<!-- mb:block -->',
	'Text first',
	'',
	'![Alt](a.jpg)',
	'<!-- mb:/block -->',
], {
	clean: true,
	select: [
		{ path: 'mains[0].sections[0].children[0].mediaClass', expect: null },
		{ path: 'mains[0].sections[0].children[0].kind', expect: undefined },
	],
});

add('a lone media link makes the block link-class media', '§10', [
	'<!-- mb:block -->',
	'[Watch the film](film.mp4)',
	'',
	'After',
	'<!-- mb:/block -->',
], {
	clean: true,
	select: [
		{ path: 'mains[0].sections[0].children[0].mediaClass', expect: 'link' },
		{ path: 'mains[0].sections[0].children[0].kind', expect: 'video' },
		{ path: 'mains[0].sections[0].children[0].mediaDest', expect: 'film.mp4' },
	],
});

add('a linked image is the poster, not the media', '§10', [
	'<!-- mb:block -->',
	'[![poster](p.jpg)](film.mp4)',
	'<!-- mb:/block -->',
], {
	clean: true,
	select: [
		{ path: 'mains[0].sections[0].children[0].kind', expect: 'video' },
		{ path: 'mains[0].sections[0].children[0].mediaClass', expect: 'link' },
	],
});

add('a link-class media block keeps the authored shape with no preset', '§10', [
	'<!-- mb:block id=walk label="Walk" -->',
	'[Watch](https://example.com/v.mp4)',
	'<!-- mb:/block -->',
], {
	clean: true,
	select: [
		{ path: 'mains[0].sections[0].children[0].kind', expect: 'video' },
		{ path: 'mains[0].sections[0].children[0].attrs.preset', expect: undefined },
	],
});

add('a nested list is not a flat list', '§4.2', [
	'<!-- mb:block -->',
	'- ![a](a.jpg)',
	'  - ![b](b.jpg)',
	'<!-- mb:/block -->',
], {
	clean: true,
	select: [{ path: 'mains[0].sections[0].children[0].mediaClass', expect: null }],
});

add('an ordered list is not the flat unordered form', '§4.2', [
	'<!-- mb:block -->',
	'1. [a](a.mp3)',
	'2. [b](b.mp3)',
	'<!-- mb:/block -->',
], {
	clean: true,
	select: [{ path: 'mains[0].sections[0].children[0].mediaClass', expect: null }],
});

add('a flat list of audio links is one media block, list form', '§10', [
	'<!-- mb:block preset=player -->',
	'- [Voices](v.mp3)',
	'- [Guitar](g.mp3)',
	'<!-- mb:/block -->',
], {
	clean: true,
	select: [
		{ path: 'mains[0].sections[0].children[0].kind', expect: 'audio' },
		{ path: 'mains[0].sections[0].children[0].mediaForm', expect: 'list' },
	],
});

add('an unknown extension under a media preset reads as file', '§10', [
	'<!-- mb:block preset=player -->',
	'[File](download.xyz)',
	'<!-- mb:/block -->',
], {
	clean: true,
	select: [
		{ path: 'mains[0].sections[0].children[0].kind', expect: 'file' },
		{ path: 'mains[0].sections[0].children[0].mediaClass', expect: 'link' },
	],
});

add('a plain link with no media preset and no known extension is not media', '§10', [
	'<!-- mb:block -->',
	'[Read more](about.html)',
	'<!-- mb:/block -->',
], {
	clean: true,
	select: [
		{ path: 'mains[0].sections[0].children[0].mediaClass', expect: null },
		{ path: 'mains[0].sections[0].children[0].kind', expect: undefined },
	],
});

add('a stamped image kind contradicts a paragraph first node', '§10', [
	'<!-- mb:block kind=image -->',
	'Now a paragraph.',
	'<!-- mb:/block -->',
], {
	diagnostics: [{ severity: 'error', code: 'kind-media-class', line: 1 }],
});

add('a stamped video kind contradicts a paragraph first node', '§10', [
	'<!-- mb:block kind=video -->',
	'Plain text',
	'<!-- mb:/block -->',
], {
	diagnostics: [{ severity: 'error', code: 'kind-media-class', line: 1 }],
});

add('a refinement disagreement is not an error — the stamp survives', '§10', [
	'<!-- mb:block kind=video -->',
	'[Alt cut](film.webm)',
	'<!-- mb:/block -->',
], {
	clean: true,
	options: { extensions: { video: ['mp4'], audio: ['webm'] } },
	select: [{ path: 'mains[0].sections[0].children[0].kind', expect: 'video' }],
});

/* ----------------------------------------------------------------- teasers */

add('a card:teaser owns its destination — last node, exactly one link', '§5.1', [
	'<!-- mb:block preset=card:teaser -->',
	'# Card',
	'',
	'A line of note.',
	'',
	'[Open the thing](https://example.com/x)',
	'<!-- mb:/block -->',
], {
	clean: true,
	select: [
		{ path: 'mains[0].sections[0].children[0].teaser.dest', expect: 'https://example.com/x' },
		{ path: 'mains[0].sections[0].children[0].teaser.label', expect: 'Open the thing' },
	],
});

add('a card:teaser with no destination is valid — a renderer warning', '§7', [
	'<!-- mb:block preset=card:teaser -->',
	'# Card',
	'',
	'No link here.',
	'<!-- mb:/block -->',
], {
	clean: true,
	select: [{ path: 'mains[0].sections[0].children[0].teaser', expect: null }],
});

/* -------------------------------------------------------------- narration */

add('a narration block is an ordinary block', '§10', [
	'<!-- mb:block preset=narration -->',
	'Spoken words.',
	'<!-- mb:/block -->',
], {
	clean: true,
	select: [
		{ path: 'mains[0].sections[0].children[0].preset', expect: 'narration' },
		{ path: 'mains[0].sections[0].children[0].mediaClass', expect: null },
	],
});

add('three narrations in one section keep source order', '§10', [
	'<!-- mb:block preset=narration -->',
	'One',
	'<!-- mb:/block -->',
	'<!-- mb:block preset=narration -->',
	'Two',
	'<!-- mb:/block -->',
	'<!-- mb:block preset=narration -->',
	'Three',
	'<!-- mb:/block -->',
], {
	clean: true,
	counts: { blocks: 3 },
	select: [{ path: 'mains[0].sections[0].children[2].markdown', expect: 'Three' }],
});

add('a speaker id lives in the preset modifier', '§10', [
	'<!-- mb:block preset=narration:alice -->',
	'A',
	'<!-- mb:/block -->',
	'<!-- mb:block preset=narration:bob -->',
	'B',
	'<!-- mb:/block -->',
], {
	clean: true,
	select: [{ path: 'mains[0].sections[0].children[1].preset', expect: 'narration:bob' }],
});

add('name= carries the speaker display name', '§10', [
	'<!-- mb:block preset=narration:david name="David" -->',
	'Hi',
	'<!-- mb:/block -->',
], {
	clean: true,
	select: [{ path: 'mains[0].sections[0].children[0].attrs.name', expect: 'David' }],
});

add('name= on a non-narration block is an error', '§10', [
	'<!-- mb:block preset=card name="X" -->',
	'X',
	'<!-- mb:/block -->',
], {
	diagnostics: [{ severity: 'error', code: 'name-without-narration', line: 1 }],
});

add('one speaker id with two names is an error with both locations', '§10', [
	'<!-- mb:block preset=narration:alice name="Alice" -->',
	'A',
	'<!-- mb:/block -->',
	'<!-- mb:block preset=narration:alice name="Alicia" -->',
	'B',
	'<!-- mb:/block -->',
], {
	diagnostics: [{ severity: 'error', code: 'speaker-name-conflict', line: 4 }],
});

add('audio= on a non-narration block is an error', '§7', [
	'<!-- mb:block audio=a.mp3 -->',
	'X',
	'<!-- mb:/block -->',
], {
	diagnostics: [{ severity: 'error', code: 'audio-without-narration', line: 1 }],
});

/* ------------------------------------------------------------------- vars */

add('a var fence must follow its marker directly', '§10', [
	'<!-- mb:var name=slideshow -->',
	'oops',
	'```json',
	'{ }',
	'```',
], {
	diagnostics: [{ severity: 'error', code: 'var-missing-payload', line: 1 }],
});

add('the same var name in two sections is two vars', '§10', [
	'<!-- mb:var name=n value=1 -->',
	'',
	'A',
	'',
	'---',
	'',
	'<!-- mb:var name=n value=2 -->',
	'',
	'B',
], {
	clean: true,
	counts: { sections: 2, vars: 2 },
	select: [
		{ path: 'mains[0].sections[0].vars[0].value', expect: 1 },
		{ path: 'mains[0].sections[1].vars[0].value', expect: 2 },
	],
});

add('a var may carry its payload in a json fence', '§4.4', [
	'<!-- mb:var name=slideshow -->',
	'',
	'```json',
	'{ "loop": false, "secondsPerSlide": 12 }',
	'```',
], {
	clean: true,
	counts: { vars: 1 },
	select: [
		{ path: 'mains[0].sections[0].vars[0].fenced', expect: 'json' },
		{ path: 'mains[0].sections[0].vars[0].value.secondsPerSlide', expect: 12 },
	],
});

add('a document with frontmatter and no directives is valid but flagged', '§10', [
	'---',
	'title: Aurora Desk',
	'year: 2026',
	'---',
	'',
	'Plain prose.',
], {
	clean: true,
	diagnostics: [{ severity: 'info', code: 'no-structure', line: 1 }],
	select: [
		{ path: 'frontmatter.data.title', expect: 'Aurora Desk' },
		{ path: 'frontmatter.data.year', expect: 2026 },
	],
});

/* --------------------------------------------------------- attribute rules */

add('data: keys are open and preserved', '§10', [
	'<!-- mb:block data:foo=1 -->',
	'X',
	'<!-- mb:/block -->',
], {
	clean: true,
	select: [{ path: 'mains[0].sections[0].children[0].attrs["data:foo"]', expect: 1 }],
});

add('an empty data: property name is an error', '§7', [
	'<!-- mb:block data:=1 -->',
	'X',
	'<!-- mb:/block -->',
], {
	diagnostics: [{ severity: 'error', code: 'data-empty-key', line: 1 }],
});

add('an unknown bare attribute is an error', '§7', [
	'<!-- mb:block width=3 -->',
	'X',
	'<!-- mb:/block -->',
], {
	diagnostics: [{ severity: 'error', code: 'unknown-attribute', line: 1 }],
});

add('a duplicate attribute is an error', '§7', [
	'<!-- mb:block id=a id=b -->',
	'X',
	'<!-- mb:/block -->',
], {
	diagnostics: [{ severity: 'error', code: 'duplicate-attribute', line: 1 }],
});

add('malformed JSON is an error, not a string', '§7', [
	'<!-- mb:block focal={x:1} -->',
	'![A](a.jpg)',
	'<!-- mb:/block -->',
], {
	diagnostics: [{ severity: 'error', code: 'attribute-value', line: 1 }],
});

add('an unknown mb: kind is an error', '§3', [
	'<!-- mb:blokc -->',
], {
	diagnostics: [{ severity: 'error', code: 'unknown-directive', line: 1 }],
});

add('a directive must start at column 0', '§3', [
	'  <!-- mb:block -->',
	'X',
], {
	diagnostics: [{ severity: 'error', code: 'directive-indented', line: 1 }],
});

add('four-column indentation is code, so the directive stays literal', '§3', [
	'<!-- mb:block -->',
	'    <!-- mb:block -->',
	'<!-- mb:/block -->',
], {
	clean: true,
	counts: { blocks: 1 },
	select: [{ path: 'mains[0].sections[0].children[0].markdown', expect: '    <!-- mb:block -->' }],
});

add('a quoted directive is an ordinary comment, not a marker', '§3', [
	'> <!-- mb:block -->',
	'> text',
], {
	clean: true,
	counts: { blocks: 0, columns: 0 },
	select: [{ path: 'mains[0].sections[0].children[0].markdown', expect: '> <!-- mb:block -->\n> text' }],
});

add('a duplicate id is an error with both locations', '§7', [
	'<!-- mb:block id=x -->',
	'A',
	'<!-- mb:/block -->',
	'<!-- mb:block id=x -->',
	'B',
	'<!-- mb:/block -->',
], {
	diagnostics: [{ severity: 'error', code: 'duplicate-id', line: 4 }],
});

add('a second mb:section in one section is an error', '§7', [
	'<!-- mb:section id=a -->',
	'<!-- mb:section id=b -->',
	'X',
], {
	diagnostics: [{ severity: 'error', code: 'duplicate-section', line: 2 }],
});

/* -------------------------------------------------------------- structure */

add('mb: markers inside a block are errors', '§7', [
	'<!-- mb:block -->',
	'<!-- mb:var name=x value=1 -->',
	'<!-- mb:/block -->',
], {
	diagnostics: [{ severity: 'error', code: 'directive-in-block', line: 2 }],
});

add('a block cannot nest', '§7', [
	'<!-- mb:block -->',
	'<!-- mb:block -->',
	'<!-- mb:/block -->',
	'<!-- mb:/block -->',
], {
	// The nested opener is consumed as an error, so only one of the two closers matches.
	diagnostics: [
		{ severity: 'error', code: 'nested-block', line: 2 },
		{ severity: 'error', code: 'stray-close', line: 4 },
	],
});

add('mb:main inside a block is an error', '§7', [
	'<!-- mb:block -->',
	'<!-- mb:main -->',
	'<!-- mb:/block -->',
], {
	diagnostics: [{ severity: 'error', code: 'main-in-container', line: 2 }],
});

add('an unclosed block is reported at EOF, citing the opener', '§7', [
	'<!-- mb:block -->',
	'X',
], {
	diagnostics: [{ severity: 'error', code: 'unclosed-block', line: 2 }],
	counts: { blocks: 1 },
});

add('a stray /block is an error', '§7', [
	'<!-- mb:/block -->',
], {
	diagnostics: [{ severity: 'error', code: 'stray-close', line: 1 }],
});

add('raw HTML outside code is unsupported content', '§7', [
	'<!-- mb:block -->',
	'<div>hi</div>',
	'<!-- mb:/block -->',
], {
	diagnostics: [{ severity: 'error', code: 'unsupported-html', line: 2 }],
});

add('CRLF and LF parse the same', '§3', [
	'# Title\r',
	'\r',
	'Paragraph.\r',
], {
	clean: true,
	counts: { sections: 1, markdown: 1 },
});

module.exports = cases;

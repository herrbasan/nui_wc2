'use strict';

/*
	CJS entry for the MD-Blocks parser — the same object a plain require('./md-blocks.js')
	returns. It exists so the contract survives a "type": "module" package.json: that would make
	.js files ESM and break require(), while this entry keeps working.

	The implementation is `md-blocks.js` beside this file. It is evaluated HERE rather than
	required, because under a "type": "module" parent that .js file is parsed as ESM: requiring
	it yields an empty namespace (the UMD factory has no ESM exports) and, on Node versions
	without require(esm), throws outright. Evaluating the source with a CommonJS wrapper keeps
	this entry working in every host — the implementation stays a single file either way.
*/

const fs = require('node:fs');
const path = require('node:path');

const implementation = path.join(__dirname, 'md-blocks.js');
const source = fs.readFileSync(implementation, 'utf8');

const wrapper = new Function('module', 'exports', 'require', '__dirname', '__filename', source);
const loaded = { exports: {} };
wrapper(loaded, loaded.exports, require, __dirname, implementation);

module.exports = loaded.exports;

/*
	Compatibility entry for the MD-Blocks parser.

	The implementation moved to `NUI/md-blocks.js` (nui_wc2#84) so the shipped library carries
	it — `NUI/` is the folder consumers copy, and the deploy workflow publishes exactly that
	folder. This file stays so every path that already pointed at `parser/md-blocks.js` keeps
	working. There is ONE implementation; this is a forwarder.

	Works as CommonJS (require) and as a plain <script> tag. Under a "type": "module" parent
	the file is parsed as an ES module, where `require` does not exist — the implementation must
	already be loaded, so the global it published is handed on instead of re-required.
*/

(function (root) {
	'use strict';

	let api;
	if (typeof module === 'object' && module.exports && typeof require === 'function') {
		api = require('../NUI/md-blocks.cjs');
	} else {
		api = root.MDBlocks;
	}

	if (typeof module === 'object' && module.exports) module.exports = api;
	if (root) root.MDBlocks = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

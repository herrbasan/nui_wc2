'use strict';

/*
	CJS entry for the MD-Blocks parser — the same object a plain require('./md-blocks.js')
	returns. It exists so the contract survives a "type": "module" package.json: that would make
	.js files ESM and break require(), while this entry keeps working.

	The implementation lives in `NUI/md-blocks.js` (nui_wc2#84); this entry forwards to it.
*/

module.exports = require('../NUI/md-blocks.cjs');

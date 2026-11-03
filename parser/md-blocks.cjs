'use strict';

/*
	CJS entry for the MD-Blocks parser — the same object a plain require('./md-blocks.js')
	returns. It exists so the contract survives a "type": "module" package.json: that would make
	.js files ESM and break require(), while this entry keeps working.
*/

module.exports = require('./md-blocks.js');

/*
	ESM entry for the MD-Blocks parser.

	The implementation lives in md-blocks.js, written as a UMD factory so the same file serves
	CJS (require), a classic <script> tag, and this module — no build step, no duplication. The
	import below evaluates that factory; every consumer then shares one instance.
*/

import './md-blocks.js';

const api = globalThis.MDBlocks;
if (!api) throw new Error('MD-Blocks parser failed to initialise: md-blocks.js did not publish MDBlocks');

export const SPEC_VERSION = api.SPEC_VERSION;
export const DEFAULT_EXTENSIONS = api.DEFAULT_EXTENSIONS;
export const MDBlocksError = api.MDBlocksError;
export const parse = api.parse;
export const parseOrThrow = api.parseOrThrow;
export const validate = api.validate;
export const errorsOf = api.errorsOf;
export const warningsOf = api.warningsOf;

export default api;

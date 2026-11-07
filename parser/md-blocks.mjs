/*
	ESM entry for the MD-Blocks parser.

	The implementation lives in NUI/md-blocks.js, written as a UMD factory so the same file serves
	CJS (require), a classic <script> tag, and this module — no build step, no duplication. The
	import below evaluates that factory; every consumer then shares one instance.

	Forwarder since nui_wc2#84: the implementation moved into `NUI/`, the folder the library
	ships as. See `NUI/md-blocks.mjs`.
*/

export {
	SPEC_VERSION,
	DEFAULT_EXTENSIONS,
	MDBlocksError,
	parse,
	parseOrThrow,
	validate,
	errorsOf,
	warningsOf,
	default as default
} from '../NUI/md-blocks.mjs';

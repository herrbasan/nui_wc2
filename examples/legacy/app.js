// NUI Legacy Patterns — example app.
//
// A page of superseded components, each shown next to its replacement. It
// exists so the deprecated markup is visible and labelled without any of the
// real examples carrying it.

import { nui } from '../../NUI/nui.js';

nui.notify({
	id: 'legacy-warning',
	content: 'This page shows deprecated components. Do not copy them.',
	banner: false
});

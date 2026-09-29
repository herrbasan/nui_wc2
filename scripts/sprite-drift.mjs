// Report the drift between the generated sprite and its source-of-truth folder.
//
// The sprite is GENERATED from assets/Material_Icons/*.svg, so any symbol in the
// sprite without a matching source file is a hand-rolled addition that the next
// generator run will silently delete. That is the failure mode to catch.

import { readFileSync, readdirSync } from 'fs';

const SPRITE = 'NUI/assets/material-icons-sprite.svg';
const SRC = 'assets/Material_Icons';

const sprite = [...readFileSync(SPRITE, 'utf8').matchAll(/<symbol id="([^"]+)"/g)].map(m => m[1]);
const files = readdirSync(SRC).filter(f => f.endsWith('.svg')).map(f => f.slice(0, -4));

const missing = sprite.filter(id => !files.includes(id));
const extra = files.filter(id => !sprite.includes(id));

console.log(`sprite symbols : ${sprite.length}`);
console.log(`source files   : ${files.length}`);
console.log('');
console.log(`IN SPRITE, NO SOURCE FILE (${missing.length}) — would be DELETED by a generator run:`);
for (const id of missing) console.log(`  ${id}`);
console.log('');
console.log(`SOURCE FILE, NOT IN SPRITE (${extra.length}):`);
for (const id of extra) console.log(`  ${id}`);

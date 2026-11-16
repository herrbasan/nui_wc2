// Generates a short silent WAV so the media-player example has a real source.
// Run: node examples/assets/make-tone.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rate = 8000;
const seconds = 2;
const frames = rate * seconds;

const dataBytes = frames * 2; // 16-bit mono
const buffer = Buffer.alloc(44 + dataBytes);

buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataBytes, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);      // PCM chunk size
buffer.writeUInt16LE(1, 20);       // format: PCM
buffer.writeUInt16LE(1, 22);       // channels: mono
buffer.writeUInt32LE(rate, 24);
buffer.writeUInt32LE(rate * 2, 28); // byte rate
buffer.writeUInt16LE(2, 32);       // block align
buffer.writeUInt16LE(16, 34);      // bits per sample
buffer.write('data', 36);
buffer.writeUInt32LE(dataBytes, 40);

// A quiet 220 Hz tone, faded in and out, so the player has something to show.
for (let i = 0; i < frames; i++) {
	const t = i / rate;
	const envelope = Math.min(1, t * 4, (seconds - t) * 4);
	const sample = Math.sin(2 * Math.PI * 220 * t) * 0.18 * envelope;
	buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
}

const out = join(dirname(fileURLToPath(import.meta.url)), 'theme-bed.wav');
writeFileSync(out, buffer);
console.log(`wrote ${out} (${buffer.length} bytes)`);

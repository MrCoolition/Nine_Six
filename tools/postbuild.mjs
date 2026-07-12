import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = resolve(root, 'dist');

for (const file of ['manifest.webmanifest', 'service-worker.js']) {
  cpSync(resolve(root, file), resolve(dist, file));
}

const assetSource = resolve(root, 'src', 'assets');
if (existsSync(assetSource)) {
  cpSync(assetSource, resolve(dist, 'src', 'assets'), { recursive: true });
}

console.log(`Copied NINE SIX PWA and audio assets into ${dist}`);

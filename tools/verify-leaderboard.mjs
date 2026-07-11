import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const artifactDir = join(root, 'artifacts');
const gameUrl = process.env.GAME_URL || 'http://127.0.0.1:4174/?leaderboard-seed=v20';
const cdpUrl = process.env.CDP_URL || 'http://127.0.0.1:9334';
const storageKey = 'nine-six-leaderboard-v1';
const profileKey = 'nine-six-profile-v1';

mkdirSync(artifactDir, { recursive: true });

const targets = await fetch(`${cdpUrl}/json/list`).then((response) => response.json());
const pageTarget = targets.find((target) => target.type === 'page');
if (!pageTarget?.webSocketDebuggerUrl) {
  throw new Error(`No Chrome page target found at ${cdpUrl}`);
}

const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 1;

await new Promise((resolveOpen, rejectOpen) => {
  socket.addEventListener('open', resolveOpen, { once: true });
  socket.addEventListener('error', rejectOpen, { once: true });
});

socket.addEventListener('message', (event) => {
  const message = JSON.parse(typeof event.data === 'string' ? event.data : Buffer.from(event.data).toString('utf8'));
  if (!message.id || !pending.has(message.id)) return;
  const { resolveCommand, rejectCommand, timer } = pending.get(message.id);
  clearTimeout(timer);
  pending.delete(message.id);
  if (message.error) rejectCommand(new Error(message.error.message));
  else resolveCommand(message.result || {});
});

function cdp(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolveCommand, rejectCommand) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      rejectCommand(new Error(`CDP timeout: ${method}`));
    }, 10000);
    pending.set(id, { resolveCommand, rejectCommand, timer });
  });
}

function pause(ms) {
  return new Promise((resolvePause) => setTimeout(resolvePause, ms));
}

async function evalValue(expression) {
  const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed');
  return result.result.value;
}

const entries = [
  { sessionId: 'walk', playerName: 'WALKER', result: 'walkout', bank: 89, turns: 12, boofballs: 4, bestHand: 45, perfect: false, mode: 'free', skin: 'woods-96', completedAt: '2026-07-11T11:00:00.000Z' },
  { sessionId: 'exact', playerName: 'ACE', result: 'win', bank: 96, turns: 5, boofballs: 1, bestHand: 54, perfect: false, mode: 'daily', skin: 'cool-current', completedAt: '2026-07-11T12:00:00.000Z' },
  { sessionId: 'perfect', playerName: 'PERFECT', result: 'win', bank: 96, turns: 8, boofballs: 2, bestHand: 96, perfect: true, mode: 'free', skin: 'drakkar-noir', completedAt: '2026-07-11T13:00:00.000Z' }
];

await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 980, deviceScaleFactor: 1, mobile: false });
await cdp('Page.navigate', { url: gameUrl });
await pause(700);
await evalValue(`localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(JSON.stringify(entries))}); location.reload(); true`);
await pause(900);

const result = await evalValue(`(() => {
  const rows = Array.from(document.querySelectorAll('.leaders-card tbody tr')).map((row) => row.innerText.replace(/\s+/g, ' ').trim());
  const card = document.querySelector('.leaders-card');
  card.scrollIntoView({ block: 'center' });
  return { rows, heading: card.querySelector('header strong')?.textContent || '' };
})()`);
const screenshot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
const screenshotPath = join(artifactDir, 'leaderboard-seeded-v20.png');
writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));

await evalValue(`(() => {
  const input = document.querySelector('[data-action="player-name"]');
  input.value = 'NIGHT SHIFT';
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()`);
await pause(120);
await cdp('Page.reload', { ignoreCache: true });
await pause(700);
const savedPlayerName = await evalValue(`document.querySelector('[data-action="player-name"]')?.value || ''`);
await evalValue(`localStorage.removeItem(${JSON.stringify(storageKey)}); localStorage.removeItem(${JSON.stringify(profileKey)}); true`);
socket.close();

const passed = result.rows.length === 3
  && result.rows[0].includes('PERFECT')
  && result.rows[0].includes('9 / 6 / Q')
  && result.rows[1].includes('ACE')
  && result.rows[1].includes('EXACT 96')
  && result.rows[2].includes('WALKER')
  && result.rows[2].includes('WALKOUT')
  && savedPlayerName === 'NIGHT SHIFT';

console.log(JSON.stringify({ passed, savedPlayerName, ...result, screenshot: screenshotPath }, null, 2));
if (!passed) process.exitCode = 1;

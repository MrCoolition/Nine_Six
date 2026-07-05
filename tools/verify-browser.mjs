import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const artifactDir = resolve(root, 'artifacts');
const gameUrl = process.env.GAME_URL || 'http://127.0.0.1:4174';
const cdpUrl = process.env.CDP_URL || 'http://127.0.0.1:9334';
const viewportWidth = Number(process.env.VIEWPORT_WIDTH || 1440);
const viewportHeight = Number(process.env.VIEWPORT_HEIGHT || 980);
const viewportMobile = process.env.VIEWPORT_MOBILE === 'true';
const screenshotPrefix = process.env.SCREENSHOT_PREFIX || 'nine-six';

mkdirSync(artifactDir, { recursive: true });

const targets = await fetch(`${cdpUrl}/json/list`).then((response) => response.json());
const pageTarget = targets.find((target) => target.type === 'page');

if (!pageTarget?.webSocketDebuggerUrl) {
  throw new Error(`No Chrome page target found at ${cdpUrl}`);
}

const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
const pending = new Map();
const consoleEvents = [];
const runtimeErrors = [];
let nextId = 1;

await new Promise((resolveOpen, rejectOpen) => {
  socket.addEventListener('open', resolveOpen, { once: true });
  socket.addEventListener('error', rejectOpen, { once: true });
});

socket.addEventListener('message', (event) => {
  const raw = typeof event.data === 'string' ? event.data : Buffer.from(event.data).toString('utf8');
  const message = JSON.parse(raw);

  if (message.id && pending.has(message.id)) {
    const { resolve, reject, timer } = pending.get(message.id);
    clearTimeout(timer);
    pending.delete(message.id);
    if (message.error) {
      reject(new Error(message.error.message));
    } else {
      resolve(message.result || {});
    }
    return;
  }

  if (message.method === 'Runtime.consoleAPICalled') {
    consoleEvents.push(message.params);
  }

  if (message.method === 'Runtime.exceptionThrown') {
    runtimeErrors.push(message.params?.exceptionDetails?.text || 'Runtime exception');
  }
});

function cdp(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolveCommand, rejectCommand) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      rejectCommand(new Error(`CDP timeout: ${method}`));
    }, 10000);
    pending.set(id, { resolve: resolveCommand, reject: rejectCommand, timer });
  });
}

function pause(ms) {
  return new Promise((resolvePause) => {
    setTimeout(resolvePause, ms);
  });
}

async function evalValue(expression) {
  const result = await cdp('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed');
  }

  return result.result.value;
}

async function saveScreenshot(fileName) {
  const screenshot = await cdp('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true
  });
  const filePath = join(artifactDir, fileName);
  writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));
  return filePath;
}

async function clickAt(point) {
  await cdp('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: point.x,
    y: point.y,
    button: 'none'
  });
  await cdp('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: point.x,
    y: point.y,
    button: 'left',
    clickCount: 1
  });
  await cdp('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: point.x,
    y: point.y,
    button: 'left',
    clickCount: 1
  });
}

await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Log.enable');
await cdp('Emulation.setDeviceMetricsOverride', {
  width: viewportWidth,
  height: viewportHeight,
  deviceScaleFactor: 1,
  mobile: viewportMobile
});

await cdp('Page.navigate', { url: gameUrl });
await pause(1200);

const title = await evalValue('document.title');
const bodyText = await evalValue('document.body.innerText');
const faceLabels = await evalValue(
  'Array.from(document.querySelectorAll(".die-card header strong")).map((node) => node.textContent.trim())'
);
const hasAutoRoll = await evalValue('Boolean(document.querySelector(\'[data-action="auto"]\')) || document.body.innerText.includes("Run table")');
const hasCardRibbon = await evalValue('Boolean(document.querySelector(".card-ribbon"))');
const audioSrc = await evalValue('document.querySelector("#music-track")?.getAttribute("src") || ""');
const overlayState = await evalValue(
  'document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay") ? "ERROR_OVERLAY" : "OK"'
);
const beforePath = await saveScreenshot(`${screenshotPrefix}-before-roll.png`);
const soundCenter = await evalValue(`(() => {
  const button = document.querySelector('[data-action="sound"]');
  const rect = button.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
})()`);
await clickAt(soundCenter);
await clickAt(soundCenter);
const soundAfterDoubleClick = await evalValue('document.querySelector(\'[data-action="sound"]\')?.textContent.trim()');
await pause(760);
await clickAt(soundCenter);
const soundAfterRestore = await evalValue('document.querySelector(\'[data-action="sound"]\')?.textContent.trim()');
const buttonCenter = await evalValue(`(() => {
  const button = document.querySelector('[data-action="roll"]');
  const rect = button.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, text: button.textContent.trim() };
})()`);

await clickAt(buttonCenter);
await pause(10200);

const rollList = await evalValue('document.querySelector(".turn-panel strong").textContent.trim()');
const total = await evalValue('document.querySelector(".score-meter strong").textContent.trim()');
const historyRows = await evalValue('document.querySelectorAll("tbody tr").length');
const cardFooter = await evalValue('Array.from(document.querySelectorAll(".die-card footer span")).map((node) => node.textContent.trim()).join("|")');
const hasMessageBurst = await evalValue('Boolean(document.querySelector(".message-burst"))');
const afterText = await evalValue('document.body.innerText');
const afterTextLower = afterText.toLowerCase();
const afterPath = await saveScreenshot(`${screenshotPrefix}-after-roll.png`);
const rollCard = rollList.match(/\[(?:[^,]+),\s*(?:[^,]+),\s*([JQK])\]/)?.[1] ?? '';

socket.close();

const result = {
  title,
  loaded: bodyText.includes('NINE SIX') && bodyText.includes('Roll'),
  hasCorrectTable: bodyText.includes('The hand is 9, 6, Queen')
    && faceLabels.join('|') === 'Nine die|Six die|Playing card',
  hasFaceCardSlot: bodyText.includes('Face cards only') || afterText.includes('Face cards only') || cardFooter.includes('Face cards only'),
  hasFaceCardRoll: Boolean(rollCard),
  hasMessageBurst,
  hasNoAutoRoll: !hasAutoRoll,
  hasNoCardRibbon: !hasCardRibbon,
  hasNoHuntCopy: !/\bhunt\b/i.test(bodyText),
  hasMusic: bodyText.includes('Snake Eyes High Stakes') && audioSrc.includes('snake-eyes-high-stakes.wav'),
  overlayState,
  initialButton: buttonCenter.text,
  doubleClickGuarded: soundAfterDoubleClick === 'Sound off' && soundAfterRestore === 'Sound on',
  viewport: {
    width: viewportWidth,
    height: viewportHeight,
    mobile: viewportMobile
  },
  rollUpdated: !rollList.includes('?'),
  rollList,
  total,
  historyRows,
  runtimeErrors,
  consoleEvents: consoleEvents.map((event) => ({
    type: event.type,
    args: event.args?.map((arg) => arg.value || arg.description)
  })),
  hasGameContent: afterTextLower.includes('this turn') && afterTextLower.includes('table log'),
  screenshots: [beforePath, afterPath]
};

console.log(JSON.stringify(result, null, 2));

if (!result.loaded || !result.hasCorrectTable || !result.hasFaceCardSlot || !result.hasFaceCardRoll || !result.hasMessageBurst || !result.doubleClickGuarded || !result.hasNoAutoRoll || !result.hasNoCardRibbon || !result.hasNoHuntCopy || !result.hasMusic || result.overlayState !== 'OK' || !result.rollUpdated || !result.historyRows || result.runtimeErrors.length) {
  process.exitCode = 1;
}

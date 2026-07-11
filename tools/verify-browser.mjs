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

async function waitForRollSettled(timeoutMs = 15000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const result = await evalValue(`(() => ({
      roll: document.querySelector('.turn-panel strong')?.textContent?.trim() || '',
      rolling: document.querySelector('[data-action="roll"]')?.textContent?.includes('Showdown') || false,
      disabled: document.querySelector('[data-action="roll"]')?.disabled || false
    }))()`);

    if (!result.rolling && /\[[^\?]+\]/.test(result.roll)) {
      return result;
    }

    await pause(160);
  }

  throw new Error('Timed out waiting for roll to settle');
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
const bodyTextLower = bodyText.toLowerCase();
const bodyContentLower = await evalValue('document.body.textContent.toLowerCase()');
const faceLabels = await evalValue(
  'Array.from(document.querySelectorAll(".die-card header strong")).map((node) => node.textContent.trim())'
);
const hasAutoRoll = await evalValue('Boolean(document.querySelector(\'[data-action="auto"]\')) || document.body.innerText.includes("Run table")');
const hasCardRibbon = await evalValue('Boolean(document.querySelector(".card-ribbon"))');
const audioSrc = await evalValue('document.querySelector("#music-track")?.getAttribute("src") || ""');
const initialJukeboxTitle = await evalValue('document.querySelector("[data-jukebox-title]")?.textContent.trim() || ""');
const manifestHref = await evalValue('document.querySelector(\'link[rel="manifest"]\')?.getAttribute("href") || ""');
const fragranceFeatures = await evalValue(`(() => ({
  skinCount: document.querySelectorAll('[data-action="skin"]').length,
  skin: document.documentElement.dataset.skin || '',
  hasLeaderboard: Boolean(document.querySelector('.leaders-card')),
  hasPlayerName: Boolean(document.querySelector('[data-action="player-name"]')),
  hasAutoplay: Boolean(document.querySelector('[data-action="music-autoplay"]'))
}))()`);
const overlayState = await evalValue(
  'document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay") ? "ERROR_OVERLAY" : "OK"'
);
const beforePath = await saveScreenshot(`${screenshotPrefix}-before-roll.png`);
const layoutMetrics = await evalValue(`(() => {
  const visibleElement = (selector) => Array.from(document.querySelectorAll(selector)).find((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  });
  const cards = Array.from(document.querySelectorAll('.die-card')).map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      bottom: Math.round(rect.bottom)
    };
  });
  const rollButton = visibleElement('[data-action="roll"]');
  const rollRect = rollButton.getBoundingClientRect();
  const controlRow = document.querySelector('${viewportMobile ? '.mobile-command-bar' : '.control-row'}');
  const controls = Array.from(controlRow.querySelectorAll('button')).map((button) => button.dataset.action);
  const controlRect = controlRow.getBoundingClientRect();
  const tableRect = document.querySelector('.table-zone').getBoundingClientRect();
  const scoreRect = document.querySelector('.score-band').getBoundingClientRect();
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    cards,
    diceInSingleRow: cards.length === 3 && Math.max(...cards.map((card) => card.top)) - Math.min(...cards.map((card) => card.top)) <= 8,
    visibleDiceOnFirstScreen: cards.length === 3 && cards.every((card) => card.top >= 0 && card.bottom < window.innerHeight - 86),
    minCardWidth: Math.min(...cards.map((card) => card.width)),
    rollButtonHeight: Math.round(rollRect.height),
    rollBottomGap: Math.round(window.innerHeight - rollRect.bottom),
    controlPosition: getComputedStyle(controlRow).position,
    controls,
    controlHeight: Math.round(controlRect.height),
    scoreBandHeight: Math.round(scoreRect.height),
    tableTop: Math.round(tableRect.top),
    noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 2
  };
})()`);
let mobileArchiveOk = true;
const fragranceScreenshots = [];
let mobileArchiveStates = null;
if (viewportMobile) {
  const lockerTabCenter = await evalValue(`(() => {
    const button = document.querySelector('[data-action="intel"][data-intel="progress"]');
    button.scrollIntoView({ block: 'center' });
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await clickAt(lockerTabCenter);
  await pause(220);

  const minimalSkinCenter = await evalValue(`(() => {
    const button = document.querySelector('[data-action="skin"][data-skin="one-minimal"]');
    button.scrollIntoView({ block: 'center' });
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await clickAt(minimalSkinCenter);
  await pause(260);
  const minimalState = await evalValue(`(() => ({
    skin: document.documentElement.dataset.skin,
    skinButtons: document.querySelectorAll('[data-action="skin"]').length,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    turnStrong: getComputedStyle(document.querySelector('.turn-panel strong')).color,
    turnCopy: getComputedStyle(document.querySelector('.turn-panel p')).color
  }))()`);
  fragranceScreenshots.push(await saveScreenshot(`${screenshotPrefix}-locker-minimal.png`));

  const leadersTabCenter = await evalValue(`(() => {
    const button = document.querySelector('[data-action="intel"][data-intel="leaders"]');
    button.scrollIntoView({ block: 'center' });
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await clickAt(leadersTabCenter);
  await pause(220);
  const leadersState = await evalValue(`(() => {
    const card = document.querySelector('.leaders-card');
    const rect = card.getBoundingClientRect();
    return {
      skin: document.documentElement.dataset.skin,
      tabCount: document.querySelectorAll('.intel-tabs button').length,
      visible: rect.width > 0 && rect.height > 0 && getComputedStyle(card).display !== 'none',
      playerName: Boolean(card.querySelector('[data-action="player-name"]')),
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2
    };
  })()`);
  fragranceScreenshots.push(await saveScreenshot(`${screenshotPrefix}-leaders.png`));
  const restoredSkin = await evalValue(`(() => {
    document.querySelector('[data-action="skin"][data-skin="drakkar-noir"]')?.click();
    return document.documentElement.dataset.skin;
  })()`);
  await pause(560);
  mobileArchiveOk = minimalState.skin === 'one-minimal'
    && minimalState.skinButtons === 6
    && !minimalState.overflow
    && minimalState.turnStrong === 'rgb(247, 246, 242)'
    && minimalState.turnCopy === 'rgb(200, 201, 199)'
    && leadersState.skin === 'one-minimal'
    && leadersState.tabCount === 5
    && leadersState.visible
    && leadersState.playerName
    && !leadersState.overflow
    && restoredSkin === 'drakkar-noir';
  mobileArchiveStates = { minimalState, leadersState, restoredSkin };
}
if (viewportMobile) {
  const tableTrayCenter = await evalValue(`(() => {
    const button = document.querySelector('[data-action="table-tray"]');
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await clickAt(tableTrayCenter);
  await pause(220);
}

const soundCenter = await evalValue(`(() => {
  const button = Array.from(document.querySelectorAll('[data-action="sound"]')).find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  const rect = button.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
})()`);
await clickAt(soundCenter);
await clickAt(soundCenter);
const soundAfterDoubleClick = await evalValue(`(() => {
  const button = Array.from(document.querySelectorAll('[data-action="sound"]')).find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  return button?.textContent.trim() || '';
})()`);
await pause(760);
await clickAt(soundCenter);
const soundAfterRestore = await evalValue(`(() => {
  const button = Array.from(document.querySelectorAll('[data-action="sound"]')).find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  return button?.textContent.trim() || '';
})()`);
const modeCenter = await evalValue(`(() => {
  const button = Array.from(document.querySelectorAll('[data-action="tone-mode"]')).find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  const rect = button.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
})()`);
await clickAt(modeCenter);
await pause(220);
const pgText = await evalValue('document.body.innerText');
const pgTextLower = pgText.toLowerCase();
const modeAfterPg = await evalValue(`(() => {
  const button = Array.from(document.querySelectorAll('[data-action="tone-mode"]')).find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  return button?.textContent.trim() || '';
})()`);
await pause(760);
await clickAt(modeCenter);
await pause(220);
const modeAfterAdult = await evalValue(`(() => {
  const button = Array.from(document.querySelectorAll('[data-action="tone-mode"]')).find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  return button?.textContent.trim() || '';
})()`);
let jukeboxAfterNext = { title: initialJukeboxTitle, src: audioSrc };
let jukeboxNextWorks = true;
let mobileJukeboxReady = true;
if (viewportMobile) {
  const closeTableCenter = await evalValue(`(() => {
    const button = Array.from(document.querySelectorAll('[data-action="close-tray"]')).find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await clickAt(closeTableCenter);
  await pause(220);

  const openJukeboxCenter = await evalValue(`(() => {
    const button = document.querySelector('[data-action="music-tray"]');
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await clickAt(openJukeboxCenter);
  await pause(220);
}

{
  const jukeboxNextCenter = await evalValue(`(() => {
    const button = Array.from(document.querySelectorAll('[data-action="music-next"]')).find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await clickAt(jukeboxNextCenter);
  await pause(220);
  jukeboxAfterNext = await evalValue(`(() => ({
    title: Array.from(document.querySelectorAll('[data-jukebox-title]')).find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    })?.textContent.trim() || '',
    src: document.querySelector('#music-track')?.getAttribute('src') || ''
  }))()`);
  jukeboxNextWorks = jukeboxAfterNext.title === 'Groove 2' && jukeboxAfterNext.src.includes('jukebox-groove-2.wav');
}

if (viewportMobile) {
  const playMusicCenter = await evalValue(`(() => {
    const button = Array.from(document.querySelectorAll('.music-play')).find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await clickAt(playMusicCenter);
  await pause(360);
  mobileJukeboxReady = await evalValue(`(() => {
    const audio = document.querySelector('#music-track');
    return !audio.paused || (audio.controls && audio.classList.contains('needs-native'));
  })()`);

  const closeJukeboxCenter = await evalValue(`(() => {
    const button = Array.from(document.querySelectorAll('[data-action="close-tray"]')).find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await clickAt(closeJukeboxCenter);
  await pause(220);
}
const buttonCenter = await evalValue(`(() => {
  const button = Array.from(document.querySelectorAll('[data-action="roll"]')).find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  const rect = button.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, text: button.textContent.trim() };
})()`);

await clickAt(buttonCenter);
await waitForRollSettled();
await pause(360);

const rollList = await evalValue('document.querySelector(".turn-panel strong").textContent.trim()');
const total = await evalValue('document.querySelector(".score-meter strong").textContent.trim()');
const historyRows = await evalValue('document.querySelectorAll("tbody tr").length');
const cardFooter = await evalValue('Array.from(document.querySelectorAll(".die-card footer span")).map((node) => node.textContent.trim()).join("|")');
const hasMessageBurst = await evalValue('Boolean(document.querySelector(".message-burst"))');
const afterText = await evalValue('document.body.innerText');
const afterTextLower = afterText.toLowerCase();
const afterContentLower = await evalValue('document.body.textContent.toLowerCase()');
const afterPath = await saveScreenshot(`${screenshotPrefix}-after-roll.png`);
const rollCard = rollList.match(/\[(?:[^,]+),\s*(?:[^,]+),\s*([JQK])\]/)?.[1] ?? '';

socket.close();

const result = {
  title,
  loaded: bodyContentLower.includes('nine six') && bodyContentLower.includes('roll'),
  hasCorrectTable: (viewportMobile || bodyText.includes('Land 9 / 6 / Q'))
    && faceLabels.join('|') === 'Nine die|Six die|Playing card',
  hasFaceCardSlot: bodyText.includes('Face cards only') || afterText.includes('Face cards only') || cardFooter.includes('Face cards only'),
  hasFaceCardRoll: Boolean(rollCard),
  hasMessageBurst,
  hasNoAutoRoll: !hasAutoRoll,
  hasNoCardRibbon: !hasCardRibbon,
  hasNoHuntCopy: !/\bhunt\b/i.test(bodyText),
  hasMusic: audioSrc.includes('jukebox-groove-1.wav') && (viewportMobile || (bodyTextLower.includes('jukebox') && initialJukeboxTitle === 'Groove 1')),
  jukeboxNextWorks,
  mobileJukeboxReady,
  jukeboxAfterNext,
  hasViralFeatures: bodyContentLower.includes('daily riot')
    && bodyContentLower.includes('odds / fairness')
    && bodyContentLower.includes('fragrance archive')
    && bodyContentLower.includes('table legends')
    && bodyContentLower.includes('fictional bankroll')
    && bodyContentLower.includes('fictional chips'),
  hasFragranceCollection: fragranceFeatures.skinCount === 6
    && ['drakkar-noir', 'cool-current', 'woods-96', 'fahrenheit-heat', 'one-minimal', 'sport-blue'].includes(fragranceFeatures.skin)
    && fragranceFeatures.hasLeaderboard
    && fragranceFeatures.hasPlayerName
    && fragranceFeatures.hasAutoplay,
  mobileArchiveOk,
  mobileArchiveStates,
  fragranceFeatures,
  hasPwa: manifestHref.includes('manifest.webmanifest'),
  overlayState,
  layoutMetrics,
  initialButton: buttonCenter.text,
  doubleClickGuarded: /off/i.test(soundAfterDoubleClick) && /on/i.test(soundAfterRestore),
  soundGuardStates: { soundAfterDoubleClick, soundAfterRestore },
  modeToggleWorks: /PG/i.test(modeAfterPg)
    && /Adult/i.test(modeAfterAdult)
    && (viewportMobile || (pgTextLower.includes('clean cut') && pgTextLower.includes('drakkar noir')))
    && (!viewportMobile || pgText.includes('NINE SIX / CLEAN CUT'))
    && !/bitch|fuck|bullshit|talk shit|21\+ table/i.test(pgText),
  mobileLayoutOk: !viewportMobile || (
    layoutMetrics.noHorizontalOverflow
    && layoutMetrics.diceInSingleRow
    && layoutMetrics.visibleDiceOnFirstScreen
    && layoutMetrics.minCardWidth >= 86
    && layoutMetrics.controlPosition === 'fixed'
    && layoutMetrics.rollButtonHeight >= 48
    && layoutMetrics.rollBottomGap <= 18
    && layoutMetrics.controls.includes('roll')
    && layoutMetrics.controls.includes('music-tray')
    && layoutMetrics.controls.includes('table-tray')
  ),
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
  hasGameContent: afterContentLower.includes('this turn') && afterContentLower.includes('damage report'),
  screenshots: [beforePath, afterPath, ...fragranceScreenshots]
};

console.log(JSON.stringify(result, null, 2));

if (!result.loaded || !result.hasCorrectTable || !result.hasFaceCardSlot || !result.hasFaceCardRoll || !result.hasMessageBurst || !result.doubleClickGuarded || !result.modeToggleWorks || !result.mobileLayoutOk || !result.mobileArchiveOk || !result.hasNoAutoRoll || !result.hasNoCardRibbon || !result.hasNoHuntCopy || !result.hasMusic || !result.jukeboxNextWorks || !result.mobileJukeboxReady || !result.hasViralFeatures || !result.hasFragranceCollection || !result.hasPwa || result.overlayState !== 'OK' || !result.rollUpdated || !result.historyRows || result.runtimeErrors.length) {
  process.exitCode = 1;
}

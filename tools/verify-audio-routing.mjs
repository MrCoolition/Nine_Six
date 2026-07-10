const gameUrl = process.env.GAME_URL || 'http://127.0.0.1:4174';
const cdpUrl = process.env.CDP_URL || 'http://127.0.0.1:9334';

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
  }
});

function cdp(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolveCommand, rejectCommand) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      rejectCommand(new Error(`CDP timeout: ${method}`));
    }, 12000);
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

async function clickRoll() {
  const buttonCenter = await evalValue(`(() => {
    const button = Array.from(document.querySelectorAll('[data-action="roll"]')).find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);

  await cdp('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: buttonCenter.x,
    y: buttonCenter.y,
    button: 'left',
    clickCount: 1
  });
  await cdp('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: buttonCenter.x,
    y: buttonCenter.y,
    button: 'left',
    clickCount: 1
  });
}

async function waitForSettledRoll(timeoutMs = 18000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const result = await evalValue(`(() => ({
      roll: document.querySelector('.turn-panel strong')?.textContent?.trim() || '',
      rolling: document.querySelector('[data-action="roll"]')?.textContent?.includes('Showdown') || false
    }))()`);

    if (!result.rolling && /\[[^\?]+\]/.test(result.roll)) {
      await pause(1200);
      return result;
    }

    await pause(150);
  }

  throw new Error('Timed out waiting for hand to settle');
}

async function runCase(name, rolls) {
  await cdp('Page.navigate', { url: `${gameUrl}?audio-route=${Date.now()}-${name}` });
  await pause(1200);

  for (const sequence of rolls) {
    await evalValue(`(() => {
      const values = ${JSON.stringify(sequence)};
      let index = 0;
      Math.random = () => values[index++] ?? 0.1;
    })()`);
    await clickRoll();
    await waitForSettledRoll();
  }

  return evalValue(`(() => ({
    roll: document.querySelector('.turn-panel strong')?.textContent?.trim(),
    bank: document.querySelector('.score-meter strong')?.textContent?.trim(),
    burst: document.querySelector('.message-burst strong')?.textContent?.trim(),
    boofLetters: Array.from(document.querySelectorAll('.boofball-stack i b')).map((node) => node.textContent.trim()).join(''),
    audioEvents: window.__nineSixAudioEvents || []
  }))()`);
}

async function runExactBankNoVoiceCase() {
  await cdp('Page.navigate', { url: `${gameUrl}?audio-route=${Date.now()}-exact-bank` });
  await pause(1200);

  const rawTwoPay18 = [0.8, 0.7, 0.5, 0];
  for (let roll = 0; roll < 6; roll += 1) {
    await evalValue(`(() => {
      const values = ${JSON.stringify(rawTwoPay18)};
      let index = 0;
      Math.random = () => values[index++] ?? 0.1;
    })()`);
    await clickRoll();
    await waitForSettledRoll();
  }

  await evalValue('window.__nineSixAudioEvents = []');
  await evalValue(`(() => {
    const values = [0.56, 0.9, 0.5, 0];
    let index = 0;
    Math.random = () => values[index++] ?? 0.1;
  })()`);
  await clickRoll();
  await waitForSettledRoll();

  return evalValue(`(() => ({
    roll: document.querySelector('.turn-panel strong')?.textContent?.trim(),
    bank: document.querySelector('.score-meter strong')?.textContent?.trim(),
    burst: document.querySelector('.message-burst strong')?.textContent?.trim(),
    boofLetters: Array.from(document.querySelectorAll('.boofball-stack i b')).map((node) => node.textContent.trim()).join(''),
    audioEvents: window.__nineSixAudioEvents || []
  }))()`);
}

await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 980,
  deviceScaleFactor: 1,
  mobile: false
});
await cdp('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    window.__nineSixAudioEvents = [];
    window.Audio = function Audio(src) {
      const audio = {
        src: src || '',
        currentTime: 0,
        volume: 1,
        dataset: {},
        addEventListener() {},
        pause() {},
        play() {
          window.__nineSixAudioEvents.push({
            src: this.src,
            type: this.dataset.nineSixVoice || this.dataset.nineSixEffect || ''
          });
          return Promise.resolve();
        }
      };
      return audio;
    };
  `
});

const rawTwoPay18 = [0.8, 0.7, 0.5, 0];
const cases = {
  badHand: await runCase('bad-hand', [[0, 0, 0.9, 0]]),
  screenshotBadHand: await runCase('screenshot-bad-hand', [[0.45, 0, 0.9, 0]]),
  perfectNineSix: await runCase('perfect-nine-six', [[0.999, 0.999, 0.5, 0]]),
  bankBust: await runCase('bank-bust', [
    rawTwoPay18,
    rawTwoPay18,
    rawTwoPay18,
    rawTwoPay18,
    rawTwoPay18,
    rawTwoPay18
  ]),
  exactBankNoVoice: await runExactBankNoVoiceCase()
};

socket.close();

const result = {
  badHand: cases.badHand,
  screenshotBadHand: cases.screenshotBadHand,
  perfectNineSix: cases.perfectNineSix,
  bankBust: cases.bankBust,
  exactBankNoVoice: cases.exactBankNoVoice
};

console.log(JSON.stringify(result, null, 2));

const routedEvents = (events) => events.filter((event) => event.type !== 'tumble-dice' && event.type !== 'card-deal');
const badSrcs = routedEvents(cases.badHand.audioEvents).map((event) => event.src).join('|');
const screenshotBadSrcs = routedEvents(cases.screenshotBadHand.audioEvents).map((event) => event.src).join('|');
const perfectSrcs = routedEvents(cases.perfectNineSix.audioEvents).map((event) => event.src).join('|');
const bustSrcs = routedEvents(cases.bankBust.audioEvents).map((event) => event.src).join('|');
const exactBankSrcs = routedEvents(cases.exactBankNoVoice.audioEvents).map((event) => event.src).join('|');
const hasRevealEffects = (caseResult) => {
  const types = caseResult.audioEvents.map((event) => event.type).join('|');
  return types.includes('tumble-dice') && types.includes('card-deal');
};

if (
  badSrcs.includes('jackpot-')
  || screenshotBadSrcs.includes('jackpot-')
  || !badSrcs.includes('boofball-boo-')
  || !screenshotBadSrcs.includes('boofball-boo-')
  || cases.badHand.boofLetters !== 'B'
  || cases.screenshotBadHand.boofLetters !== 'B'
  || cases.screenshotBadHand.roll !== '[5, 1, K]'
  || !hasRevealEffects(cases.perfectNineSix)
  || !perfectSrcs.includes('jackpot-')
  || perfectSrcs.includes('bad-hand-')
  || perfectSrcs.includes('boofball-boo-')
  || !bustSrcs.includes('bust-horn-')
  || bustSrcs.includes('jackpot-')
  || bustSrcs.includes('bad-hand-')
  || bustSrcs.includes('boofball-boo-')
  || exactBankSrcs.includes('jackpot-')
  || exactBankSrcs.includes('bad-hand-')
  || exactBankSrcs.includes('boofball-boo-')
  || exactBankSrcs.includes('bust-horn-')
) {
  process.exitCode = 1;
}

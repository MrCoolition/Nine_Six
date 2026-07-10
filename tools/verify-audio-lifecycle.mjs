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

  if (!message.id || !pending.has(message.id)) {
    return;
  }

  const { resolve, reject, timer } = pending.get(message.id);
  clearTimeout(timer);
  pending.delete(message.id);
  if (message.error) {
    reject(new Error(message.error.message));
  } else {
    resolve(message.result || {});
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

async function waitForResult() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 13000) {
    const result = await evalValue(`(() => {
      const roll = document.querySelector('.turn-panel strong')?.textContent?.trim() || '';
      const rolling = document.querySelector('[data-action="roll"]')?.textContent?.includes('Showdown') || false;
      return { roll, rolling };
    })()`);

    if (!result.rolling && /\[[^\?]+\]/.test(result.roll)) {
      return result;
    }

    await pause(100);
  }

  throw new Error('Timed out waiting for roll result');
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
    window.__nineSixToneStarts = 0;
    window.__nineSixToneStops = 0;

    window.Audio = function Audio(src) {
      return {
        src: src || '',
        currentTime: 0,
        volume: 1,
        dataset: {},
        addEventListener() {},
        pause() {},
        play() {
          window.__nineSixAudioEvents.push({
            src: this.src,
            type: this.dataset.nineSixVoice || ''
          });
          return Promise.resolve();
        }
      };
    };

    class FakeOscillator {
      constructor() {
        this.onended = null;
        this.type = 'sine';
        this.frequency = { setValueAtTime() {} };
      }
      connect() {}
      start() {
        window.__nineSixToneStarts += 1;
      }
      stop() {
        window.__nineSixToneStops += 1;
        const onended = this.onended;
        this.onended = null;
        if (onended) onended();
      }
    }

    class FakeGain {
      constructor() {
        this.gain = {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {}
        };
      }
      connect() {}
    }

    class FakeAudioContext {
      constructor() {
        this.currentTime = 0;
        this.destination = {};
        this.state = 'running';
      }
      createOscillator() {
        return new FakeOscillator();
      }
      createGain() {
        return new FakeGain();
      }
      resume() {
        this.state = 'running';
        return Promise.resolve();
      }
    }

    window.AudioContext = FakeAudioContext;
    window.webkitAudioContext = FakeAudioContext;
  `
});

await cdp('Page.navigate', { url: `${gameUrl}?audio-lifecycle=${Date.now()}` });
await pause(1200);

await evalValue(`(() => {
  const values = [0.999, 0.999, 0.5, 0];
  let index = 0;
  Math.random = () => values[index++] ?? 0.1;
})()`);

await clickRoll();
const result = await waitForResult();

const beforeHide = await evalValue(`(() => ({
  audioEvents: window.__nineSixAudioEvents.length,
  toneStarts: window.__nineSixToneStarts,
  toneStops: window.__nineSixToneStops
}))()`);

await evalValue(`(() => {
  Object.defineProperty(document, 'visibilityState', {
    value: 'hidden',
    configurable: true
  });
  document.dispatchEvent(new Event('visibilitychange'));
})()`);

await pause(1200);

const afterHide = await evalValue(`(() => ({
  audioEvents: window.__nineSixAudioEvents.length,
  toneStarts: window.__nineSixToneStarts,
  toneStops: window.__nineSixToneStops
}))()`);

socket.close();

const output = {
  result,
  beforeHide,
  afterHide,
  noVoiceAfterHidden: afterHide.audioEvents === beforeHide.audioEvents,
  noToneStartsAfterHidden: afterHide.toneStarts === beforeHide.toneStarts
};

console.log(JSON.stringify(output, null, 2));

if (!output.noVoiceAfterHidden || !output.noToneStartsAfterHidden) {
  process.exitCode = 1;
}

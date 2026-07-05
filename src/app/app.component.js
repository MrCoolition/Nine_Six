const TARGET_SCORE = 96;
const BUST_RESET_SCORE = 69;
const TABLE_STAKE = 25;
const BOOFBALL_LIMIT = 4;
const MUSIC_TITLE = 'Snake Eyes High Stakes';
const JACKPOT_HAND = '9, 6, Q';
const HISTORY_LIMIT = 14;
const REVEAL_SPINS = 11;
const REVEAL_DURATION_MS = 3000;
const ENABLE_SYNTH_SFX = false;
const ENABLE_ROLL_SPIN_SFX = false;
const JACKPOT_CALLOUTS = [
  './src/assets/jackpot-bradford.mp3',
  './src/assets/jackpot-gael.mp3',
  './src/assets/jackpot-jessica-gallagher.mp3',
  './src/assets/jackpot-arabella.mp3',
  './src/assets/jackpot-viraj.mp3'
];
const BOOFBALL_CALLOUTS = [
  './src/assets/boofball-boo-1.mp3',
  './src/assets/boofball-boo-2.mp3',
  './src/assets/boofball-boo-3.mp3'
];
const BUST_HORNS = [
  './src/assets/bust-horn-1.wav',
  './src/assets/bust-horn-2.wav',
  './src/assets/bust-horn-3.wav',
  './src/assets/bust-horn-4.wav'
];
const TUMBLE_DICE_SOUNDS = [
  './src/assets/tumble-dice-1.wav',
  './src/assets/tumble-dice-2.wav',
  './src/assets/tumble-dice-3.wav',
  './src/assets/tumble-dice-4.wav'
];
const CARD_DEAL_SOUNDS = [
  './src/assets/card-deal-1.wav'
];
const PG_REPLACEMENTS = [
  [/NINE SIX BITCH!!!!/g, 'NINE SIX!'],
  [/NINE SIX BITCH/g, 'NINE SIX'],
  [/Nine Six Bitch!!!!/g, 'Nine Six!'],
  [/Nine Six Bitch/g, 'Nine Six'],
  [/WALK THE FUCK OUT/g, 'WALK OUT'],
  [/Walk the fuck out/gi, 'Walk out'],
  [/bullshit/gi, 'bad hand'],
  [/Trash hand/gi, 'No-score hand'],
  [/\bfucking\b/gi, 'very'],
  [/\bfuck\b/gi, 'heck'],
  [/\bshit\b/gi, 'stuff'],
  [/Talk stuff/gi, 'Talk big'],
  [/raising hell/gi, 'rolling wild']
];
const cardRanks = ['J', 'Q', 'K'];
const cardSuits = [
  { code: 'S', symbol: '&spades;', label: 'Spades', color: 'black' },
  { code: 'H', symbol: '&hearts;', label: 'Hearts', color: 'red' },
  { code: 'D', symbol: '&diams;', label: 'Diamonds', color: 'red' },
  { code: 'C', symbol: '&clubs;', label: 'Clubs', color: 'black' }
];
const queenRankIndex = cardRanks.indexOf('Q');

const dice = [
  {
    key: 'rollem',
    label: 'Nine die',
    shortLabel: 'D9',
    sides: 9,
    target: 9,
    shape: 'nine',
    scoreText: (value) => `9 - ${value}`,
    score: (value) => 9 - value
  },
  {
    key: 'rollem2',
    label: 'Six die',
    shortLabel: 'D6',
    sides: 6,
    target: 6,
    shape: 'six',
    scoreText: (value) => `6 - ${value}`,
    score: (value) => 6 - value
  },
  {
    key: 'card',
    label: 'Playing card',
    shortLabel: 'CARD',
    type: 'card',
    sides: 12,
    target: 'Q',
    scoreText: (value) => `Q gap (${value?.rank ?? '?'})`,
    score: cardScore,
    isTarget: (value) => value?.rank === 'Q'
  }
];

const state = {
  totalScore: 0,
  round: 0,
  rolling: false,
  muted: false,
  toneMode: 'adult',
  musicPlaying: false,
  musicVolume: 0.45,
  musicError: '',
  current: null,
  history: [],
  boofballs: 0,
  rollToken: 0,
  audioContext: null,
  activeTones: [],
  calloutAudio: null,
  effectAudio: null,
  calloutTimerIds: [],
  soundTimerIds: [],
  lastCallout: null,
  lastCalloutByType: {},
  actionTimes: {}
};

const root = document.querySelector('#game-root');

bindPageAudioGuards();
render();

function render() {
  const current = state.current ?? emptyTurn();
  const currentHype = current.hype ?? idleHype();
  const moodClass = `mood-${currentHype.tone || 'idle'}`;
  const rollingClass = state.rolling ? 'is-rolling' : '';
  const gameWon = hasGameWin();
  const gameLost = hasGameLoss();
  const gameOver = gameWon || gameLost;
  const progress = gameWon ? 100 : Math.min(100, Math.round((state.totalScore / TARGET_SCORE) * 100));
  const bestTurn = state.history.reduce((best, turn) => Math.max(best, turn.finalScore), 0);
  const lastScore = state.history[0]?.finalScore ?? 0;
  const tablePot = state.history.reduce((sum, turn) => sum + (turn.tableStake ?? TABLE_STAKE), 0);
  const heatLevel = gameLost ? 'Walked' : gameWon ? 'Paid' : current.card?.rank === 'Q' ? 'Queen' : state.totalScore >= 72 ? 'Hot' : state.round >= 3 ? 'Warm' : 'Cold';
  const musicVolume = Math.round(state.musicVolume * 100);
  const targetGap = Math.max(0, TARGET_SCORE - state.totalScore);
  const adultMode = isAdultMode();

  root.innerHTML = `
    <main class="game-shell ${moodClass} ${rollingClass} ${gameWon ? 'game-won' : ''} ${gameLost ? 'game-lost' : ''}">
      <section class="score-band" aria-label="NINE SIX scoreboard">
        <div class="brand-lockup">
          <div class="brand-mark" aria-hidden="true">
            <span>9</span>
            <span>6</span>
          </div>
          <div>
            <p>${adultMode ? 'NINE SIX / 21+ TABLE' : 'NINE SIX / PG TABLE'}</p>
            <h1>NINE SIX.</h1>
            <small>Two dice. One card. The hand is 9, 6, Queen.</small>
          </div>
        </div>

        <div class="score-meter ${current.phase === 'settled' ? 'score-pop' : ''}" aria-label="Bank score ${state.totalScore}">
          <div>
            <span>Bank</span>
            <strong>${state.totalScore}</strong>
          </div>
          <div class="meter-track"><i style="width: ${progress}%"></i></div>
          <small>${gameLost ? 'Walked out' : gameWon ? 'Bank 96 hit' : `Need exactly ${targetGap}`} / Pot ${tablePot} chips</small>
        </div>

        <div class="control-stack">
          <div class="control-row">
            <button type="button" class="primary-action" data-action="roll" ${state.rolling || gameOver ? 'disabled' : ''}>
              ${state.rolling ? 'Showdown...' : 'Roll hand'}
            </button>
            <button type="button" class="music-action ${state.musicPlaying ? 'active' : ''}" data-action="music">
              ${state.musicPlaying ? 'Kill track' : 'Drop needle'}
            </button>
            <button type="button" data-action="reset">Reset</button>
            <button type="button" data-action="sound" aria-label="Toggle sound">
              ${state.muted ? 'Sound off' : 'Sound on'}
            </button>
            <button type="button" class="mode-action ${adultMode ? 'adult' : 'pg'}" data-action="tone-mode" aria-pressed="${adultMode ? 'true' : 'false'}">
              ${adultMode ? 'Adult' : 'PG'}
            </button>
          </div>
          <div class="table-tags" aria-label="Table tone">
            <span>${adultMode ? '21+ tone' : 'PG tone'}</span>
            <span>${TABLE_STAKE} chip ante</span>
            <span>${adultMode ? 'uncensored calls' : 'clean calls'}</span>
          </div>
          <div class="music-console ${state.musicPlaying ? 'playing' : ''}" aria-label="Music controls">
            <div>
              <span>Soundtrack</span>
              <strong>${MUSIC_TITLE}</strong>
              <small>${state.musicError || (state.musicPlaying ? 'Now playing' : 'Needle up')}</small>
            </div>
            <label>
              <span>Vol</span>
              <input type="range" data-action="music-volume" min="0" max="100" value="${musicVolume}" aria-label="Music volume">
              <b data-music-volume-value>${musicVolume}</b>
            </label>
          </div>
        </div>
      </section>

      <section class="play-layout">
        <section class="table-zone ${moodClass} ${rollingClass}" aria-label="Current turn">
          <div class="felt-art" aria-hidden="true">
            <svg viewBox="0 0 620 210" role="img" aria-label="">
              <path d="M24 132 C126 38 220 38 310 124 C400 210 494 210 596 116" />
              <path d="M58 160 C152 92 222 86 310 140 C398 194 468 188 562 88" />
              <circle cx="98" cy="126" r="18" />
              <circle cx="310" cy="132" r="24" />
              <circle cx="522" cy="112" r="18" />
              <text x="284" y="76">96</text>
            </svg>
          </div>

          <div class="dice-row">
            ${dice.map((die) => dieCard(die, current)).join('')}
          </div>

          ${hypeBanner(currentHype)}
          ${messageBurst(currentHype, current)}
          ${winCelebration(current, gameWon)}

          <div class="turn-panel ${currentHype.tone}" aria-live="polite">
            <div>
              <span>This Turn</span>
              <strong>[${displayRollList(current)}]</strong>
            </div>
            <p>${displayCopy(current.verdict)}</p>
          </div>
        </section>

        <aside class="side-panel" aria-label="Score details">
          <div class="stat-grid">
            <article>
              <span>Turns</span>
              <strong>${state.round}</strong>
            </article>
            <article>
              <span>Last</span>
              <strong>${lastScore}</strong>
            </article>
            <article>
              <span>Best</span>
              <strong>${bestTurn}</strong>
            </article>
            <article>
              <span>Heat</span>
              <strong>${heatLevel}</strong>
            </article>
          </div>

          ${boofballStacker(current)}

          <section class="score-card">
            <header>
              <span>Hand math</span>
              <strong>${scoreLabel(current.rawScore)}</strong>
            </header>
            <dl class="score-breakdown">
              ${dice.map((die, index) => scoreLine(die, current, index)).join('')}
            </dl>
            <div class="final-score">
              <span>Final score this turn</span>
              <strong>${scoreLabel(current.finalScore)}</strong>
            </div>
          </section>

          <section class="rules-card">
            <h2>House Rules</h2>
            <p>${modeCopy(`Base hand = (9 - D9) + (6 - D6) + Queen gap. Over 9 scores zero and stacks a BOOFBALL. Four BOOFBALLS is a walk-out loss. Under 7 gets paid x9. The bank must land exactly ${TARGET_SCORE}. Overshoot busts back to ${BUST_RESET_SCORE}.`, `Base hand = (9 - D9) + (6 - D6) + Queen gap. Over 9 scores zero and stacks a BOOFBALL. Four BOOFBALLS ends the game. Under 7 gets paid x9. The bank must land exactly ${TARGET_SCORE}. Overshoot resets to ${BUST_RESET_SCORE}.`)}</p>
          </section>
        </aside>
      </section>

      <section class="event-strip" aria-label="Round result">
        ${messageList(current, gameWon, gameLost)}
      </section>

      <section class="history-section" aria-label="Turn history">
        <header>
          <span>Log</span>
          <h2>Table Log</h2>
        </header>
        ${historyTable()}
      </section>
    </main>
  `;

  bindActions();
}

function bindActions() {
  root.querySelector('[data-action="roll"]')?.addEventListener('click', () => {
    runSingleClickAction('roll', () => rollTurn());
  });
  root.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
    runSingleClickAction('reset', () => resetGame());
  });
  root.querySelector('[data-action="sound"]')?.addEventListener('click', () => {
    runSingleClickAction('sound', () => {
      state.muted = !state.muted;
      if (state.muted) {
        stopAllAudio();
      }
      render();
    });
  });
  root.querySelector('[data-action="music"]')?.addEventListener('click', () => {
    runSingleClickAction('music', () => toggleMusic());
  });
  root.querySelector('[data-action="tone-mode"]')?.addEventListener('click', () => {
    runSingleClickAction('tone-mode', () => {
      state.toneMode = isAdultMode() ? 'pg' : 'adult';
      stopActiveCallout();
      render();
    });
  });
  root.querySelector('[data-action="music-volume"]')?.addEventListener('input', (event) => {
    setMusicVolume(event.target.value);
  });
}

function bindPageAudioGuards() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') {
      stopAllAudio({ cancelRoll: true, pauseMusic: true });
    }
  });

  window.addEventListener('pagehide', () => {
    stopAllAudio({ cancelRoll: true, pauseMusic: true });
  });

  window.addEventListener('blur', () => {
    stopAllAudio({ cancelRoll: true, pauseMusic: true });
  });

  window.addEventListener('focus', () => {
    state.actionTimes = {};
    render();
  });
}

function isActiveGameTab() {
  return document.visibilityState === 'visible';
}

function isAdultMode() {
  return state.toneMode === 'adult';
}

function modeCopy(adultCopy, pgCopy) {
  return isAdultMode() ? adultCopy : pgCopy;
}

function displayCopy(value) {
  const text = String(value ?? '');
  if (isAdultMode()) {
    return text;
  }

  return PG_REPLACEMENTS.reduce((copy, [pattern, replacement]) => copy.replace(pattern, replacement), text);
}

function runSingleClickAction(action, callback) {
  const now = Date.now();
  const lastRun = state.actionTimes[action] ?? 0;

  if (now - lastRun < 700) {
    return;
  }

  state.actionTimes[action] = now;
  callback();
}

async function rollTurn() {
  if (state.rolling || hasGameWin() || hasGameLoss() || !isActiveGameTab()) {
    return;
  }

  stopAllAudio();

  const token = ++state.rollToken;
  const result = createTurn();
  const round = state.round + 1;
  const totalBefore = state.totalScore;
  const previousHistory = state.history;

  state.rolling = true;
  state.current = {
    round,
    rollem: null,
    rollem2: null,
    card: null,
    scores: [null, null, null],
    rawScore: null,
    finalScore: null,
    totalBefore,
    totalAfter: totalBefore,
    phase: 'rollem',
    verdict: 'The table goes quiet...',
    messages: ['This Turn'],
    hype: rollingHype()
  };
  render();
  await sleep(260);

  for (const die of dice) {
    await revealDie(die, result[die.key], token);
    if (token !== state.rollToken || !isActiveGameTab()) {
      state.rolling = false;
      render();
      return;
    }
  }

  const bankedResult = settleBank(result, totalBefore);
  const boofballsBefore = state.boofballs;
  const boofballHit = isNoScoreHand(bankedResult);
  const boofballsAfter = boofballHit ? Math.min(BOOFBALL_LIMIT, boofballsBefore + 1) : boofballsBefore;
  const penaltyResult = {
    ...bankedResult,
    boofballsBefore,
    boofballsAfter,
    boofballHit,
    walkOut: boofballsAfter >= BOOFBALL_LIMIT,
    verdict: boofballsAfter >= BOOFBALL_LIMIT
      ? 'WALK THE FUCK OUT. Four BOOFBALLS on the rack. You lose.'
      : bankedResult.verdict
  };
  const hype = analyzeHype(penaltyResult, previousHistory);
  const settled = {
    ...penaltyResult,
    round,
    totalBefore,
    tableStake: TABLE_STAKE,
    tablePayout: bankedResult.finalScore * 10,
    phase: 'settled',
    targetHits: hype.targetHits,
    targetLabels: hype.targetLabels,
    streak: hype.streak,
    hype,
    messages: buildTurnMessages(penaltyResult, hype)
  };

  state.current = settled;
  state.totalScore = settled.totalAfter;
  state.boofballs = settled.boofballsAfter;
  state.round = round;
  state.history = [settled, ...state.history].slice(0, HISTORY_LIMIT);
  state.rolling = false;

  playOutcomeSound(settled);
  render();
}

async function revealDie(die, finalValue, token) {
  playRevealEffect(die);
  const revealStepMs = Math.round(REVEAL_DURATION_MS / REVEAL_SPINS);

  for (let spin = 0; spin < REVEAL_SPINS; spin += 1) {
    if (token !== state.rollToken || !isActiveGameTab()) {
      return;
    }
    const value = spin === REVEAL_SPINS - 1 ? finalValue : spinValue(die);
    const locked = spin === REVEAL_SPINS - 1;
    const isTarget = die.isTarget ? die.isTarget(value) : value === die.target;
    const scores = [...state.current.scores];
    const dieIndex = dice.findIndex((item) => item.key === die.key);
    scores[dieIndex] = die.score(value);
    const toneValue = die.type === 'card' ? value.value : value;

    state.current = {
      ...state.current,
      [die.key]: value,
      scores,
      phase: die.key,
      verdict: `${die.label} is ${locked ? 'locked' : 'raising hell'}...`,
      hype: revealHype(die, value, locked, isTarget)
    };

    if (ENABLE_ROLL_SPIN_SFX) {
      playTone(170 + toneValue * 28 + die.sides * 2, 0.035, 'square', 0.024);
    }
    render();
    if (locked) {
      playDieLockSound(die, finalValue, isTarget);
    }
    await sleep(revealStepMs);
  }
}

function resetGame() {
  state.rollToken += 1;
  stopAllAudio();
  state.totalScore = 0;
  state.round = 0;
  state.rolling = false;
  state.current = null;
  state.history = [];
  state.boofballs = 0;
  state.lastCalloutByType = {};
  render();
}

function toggleMusic() {
  if (!isActiveGameTab()) {
    return;
  }

  const music = musicElement();
  if (!music) {
    state.musicError = 'Track missing.';
    render();
    return;
  }

  if (!music.paused) {
    music.pause();
    state.musicPlaying = false;
    state.musicError = '';
    render();
    return;
  }

  music.volume = state.musicVolume;
  state.musicPlaying = true;
  state.musicError = 'Loading track...';
  render();

  music.play()
    .then(() => {
      state.musicPlaying = true;
      state.musicError = '';
      render();
    })
    .catch(() => {
      music.pause();
      state.musicPlaying = false;
      state.musicError = 'Tap again to unlock browser audio.';
      render();
    });
}

function setMusicVolume(value) {
  const volume = Math.max(0, Math.min(1, Number(value) / 100));
  state.musicVolume = volume;
  const music = musicElement();
  if (music) {
    music.volume = volume;
  }
  const label = root.querySelector('[data-music-volume-value]');
  if (label) {
    label.textContent = String(Math.round(volume * 100));
  }
}

function musicElement() {
  return document.querySelector('#music-track');
}

function createTurn() {
  const rollem = randomInt(1, 9);
  const rollem2 = randomInt(1, 6);
  const card = drawCard();
  const scores = [
    9 - rollem,
    6 - rollem2,
    cardScore(card)
  ];
  const rawScore = scores.reduce((total, score) => total + score, 0);
  const jackpot = isPerfectNineSix({ rollem, rollem2, card });
  const noScoreHand = isNoScoreHand({ rollem, rollem2, card, rawScore });
  let verdict;
  let finalScore;

  if (jackpot) {
    finalScore = TARGET_SCORE;
    verdict = 'Nine Six Bitch. 9, 6, Queen. The table is yours.';
  } else if (noScoreHand) {
    finalScore = 0;
    verdict = 'Trash hand. House sweeps that bullshit because you got too high. Final score is zero.';
  } else if (rawScore < 7) {
    finalScore = rawScore * 9;
    verdict = `That's money. Under 7 gets paid x9 for ${finalScore}.`;
  } else {
    finalScore = rawScore;
    verdict = `Respectable. Bank ${finalScore} and do not get cute.`;
  }

  return {
    rollem,
    rollem2,
    card,
    scores,
    rawScore,
    finalScore,
    jackpot,
    noScoreHand,
    verdict,
    messages: [verdict],
    rollList: [rollem, rollem2, card.rank]
  };
}

function settleBank(turn, totalBefore) {
  if (turn.jackpot) {
    return {
      ...turn,
      handScore: turn.finalScore,
      finalScore: TARGET_SCORE,
      totalAfter: TARGET_SCORE,
      bankBust: false,
      exactWin: true,
      verdict: 'Nine Six Bitch. Final bank is exactly 96. The table is yours.'
    };
  }

  if (turn.finalScore <= 0) {
    return {
      ...turn,
      handScore: turn.finalScore,
      totalAfter: totalBefore,
      bankBust: false,
      exactWin: false
    };
  }

  const plannedTotal = totalBefore + turn.finalScore;

  if (plannedTotal > TARGET_SCORE) {
    return {
      ...turn,
      handScore: turn.finalScore,
      finalScore: 0,
      totalAfter: BUST_RESET_SCORE,
      bankBust: true,
      exactWin: false,
      verdict: `BUST. ${totalBefore} plus ${turn.finalScore} blows past 96. Back to 69.`
    };
  }

  return {
    ...turn,
    handScore: turn.finalScore,
    totalAfter: plannedTotal,
    bankBust: false,
    exactWin: plannedTotal === TARGET_SCORE,
    verdict: plannedTotal === TARGET_SCORE
      ? 'Bank 96. Final bank is 96. That is the number.'
      : turn.verdict
  };
}

function hypeBanner(hype) {
  const pills = hype.pills ?? [];

  return `
    <div class="showdown-banner ${hype.tone}" aria-live="polite">
      <div>
        <span>${displayCopy(hype.kicker)}</span>
        <strong>${displayCopy(hype.title)}</strong>
        <p>${displayCopy(hype.body)}</p>
      </div>
      ${pills.length ? `
        <div class="hype-pills">
          ${pills.map((pill) => `<b>${displayCopy(pill)}</b>`).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function messageBurst(hype, current) {
  if (!hype || current.phase === '') {
    return '';
  }

  const symbol = {
    idle: '96',
    rolling: '...',
    locked: 'LOCK',
    spark: 'HIT',
    queen: 'Q',
    near: '2/3',
    monster: 'x9',
    run: 'RUN',
    money: 'BANK',
    solid: '+',
    bust: '0',
    over: '69',
    walkout: '4',
    exact: '96',
    jackpot: '96'
  }[hype.tone] ?? '96';
  const burst = hype.burst ?? hype.kicker;

  return `
    <div class="message-burst ${hype.tone}" aria-hidden="true">
      <span>${displayCopy(hype.kicker)}</span>
      <strong>${displayCopy(burst)}</strong>
      <em>${symbol}</em>
      <i></i>
      <i></i>
      <i></i>
    </div>
  `;
}

function winCelebration(current, gameWon) {
  if (!gameWon || !current.exactWin) {
    return '';
  }

  const perfect = isPerfectNineSix(current);
  const chips = ['96', '9', '6', 'Q', '96', 'WIN', 'PAID', '96'];

  return `
    <section class="win-fanfare ${perfect ? 'jackpot' : 'exact'}" aria-live="polite">
      <div class="win-rays" aria-hidden="true"></div>
      <div class="win-copy">
        <span>${displayCopy(perfect ? 'Perfect hand locked' : 'Exact bank locked')}</span>
        <strong>${displayCopy(perfect ? 'NINE SIX BITCH' : 'BANK 96')}</strong>
        <p>${modeCopy(perfect ? '9, 6, Queen. The room goes off.' : 'Exact 96. Clean landing. Big table energy.', perfect ? '9, 6, Queen. The table celebrates.' : 'Exact 96. Clean landing. Big table energy.')}</p>
      </div>
      <div class="win-chip-rain" aria-hidden="true">
        ${chips.map((chip, index) => `<i style="--i:${index}">${chip}</i>`).join('')}
      </div>
    </section>
  `;
}

function idleHype() {
  return {
    tone: 'idle',
    kicker: 'Table open',
    title: 'D9. D6. Queen.',
    body: 'The room gets quiet before the first throw.',
    pills: ['Target 9', 'Target 6', 'Target Q']
  };
}

function rollingHype() {
  return {
    tone: 'rolling',
    kicker: 'Showdown',
    title: 'Hands off the felt.',
    body: 'Nine die, six die, then the card. Every reveal gets its own heat.',
    pills: ['D9 first', 'D6 second', 'Card last']
  };
}

function revealHype(die, value, locked, isTarget) {
  const valueText = die.type === 'card'
    ? `${formatRollValue(value)} ${value?.suit?.label ?? ''}`.trim()
    : formatRollValue(value);

  if (locked && isTarget) {
    return {
      tone: 'spark',
      kicker: 'Target locked',
      title: `${die.label} lands ${valueText}.`,
      body: 'One piece of 9, 6, Queen just hit the table.',
      pills: [`Target ${die.target}`, 'Alive']
    };
  }

  if (locked) {
    return {
      tone: 'locked',
      kicker: 'Locked',
      title: `${die.label} lands ${valueText}.`,
      body: 'The next reveal gets louder.',
      pills: [`Target ${die.target}`]
    };
  }

  return {
    tone: 'rolling',
    kicker: 'Rolling',
    title: `${die.label} is loose.`,
    body: 'The table is waiting for the lock.',
    pills: [`Target ${die.target}`]
  };
}

function analyzeHype(turn, history) {
  const targetLabels = targetHitLabels(turn);
  const targetHits = targetLabels.length;
  const streak = scoringStreak(turn, history);
  const payout = turn.handScore ?? turn.finalScore;
  const basePills = [
    `${targetHits}/3 targets`,
    `Base ${turn.rawScore}`,
    `${turn.boofballsAfter ?? state.boofballs}/${BOOFBALL_LIMIT} BOOFBALLS`,
    turn.bankBust ? 'Back to 69' : `Pays ${payout * 10}`
  ];

  if (turn.walkOut) {
    return {
      tone: 'walkout',
      kicker: 'BOOFBALL WALK',
      title: 'Walk the fuck out.',
      body: 'Fourth BOOFBALL hit the rack. The table is done with you.',
      burst: 'WALK OUT',
      pills: [`${BOOFBALL_LIMIT}/${BOOFBALL_LIMIT} BOOFBALLS`, 'Game over', 'You lose'],
      targetHits,
      targetLabels,
      streak
    };
  }

  if (turn.exactWin) {
    const perfectHand = isPerfectNineSix(turn);
    return {
      tone: perfectHand ? 'jackpot' : 'exact',
      kicker: perfectHand ? 'NINE SIX BITCH' : 'Bank 96',
      title: perfectHand ? '9, 6, Queen. Perfect hand.' : 'Final bank detonates at 96.',
      body: perfectHand ? 'The table erupts. Lights hot. Chips flying. That is the hand.' : 'Exact landing. The rail goes loud without stealing the perfect-hand voice.',
      burst: perfectHand ? '9 6 Q' : 'BANK 96',
      pills: [perfectHand ? 'Perfect roll' : 'Exact bank', 'Final 96', 'Fanfare'],
      targetHits,
      targetLabels,
      streak
    };
  }

  if (turn.bankBust) {
    return {
      tone: 'over',
      kicker: 'Busted over',
      title: 'Back to 69.',
      body: 'You overshot 96. The table yanks the bank back to 69.',
      burst: 'BACK TO 69',
      pills: [...basePills, `Tried ${turn.totalBefore + turn.handScore}`],
      targetHits,
      targetLabels,
      streak
    };
  }

  if (targetHits === 2) {
    return {
      tone: 'near',
      kicker: 'Near miss',
      title: `${targetLabels.join(' + ')} locked.`,
      body: 'Two pieces of the hand landed. One piece ducked the smoke.',
      burst: 'ONE AWAY',
      pills: [...basePills, 'One away'],
      targetHits,
      targetLabels,
      streak
    };
  }

  if (streak >= 3) {
    return {
      tone: 'run',
      kicker: `${streak}-hand run`,
      title: 'The table is leaning in.',
      body: 'Paying hands are stacking. This is how a room starts yelling.',
      burst: `${streak} RUN`,
      pills: [...basePills, 'Hot run'],
      targetHits,
      targetLabels,
      streak
    };
  }

  if (turn.finalScore >= 45) {
    return {
      tone: 'monster',
      kicker: 'Monster score',
      title: `${turn.handScore ?? turn.finalScore} on one hand.`,
      body: 'That x9 payout hit like a hammer.',
      burst: 'MONSTER',
      pills: [...basePills, 'x9 paid'],
      targetHits,
      targetLabels,
      streak
    };
  }

  if (turn.card.rank === 'Q') {
    return {
      tone: 'queen',
      kicker: 'Queen hit',
      title: 'The card did its job.',
      body: 'Now the dice owe you the rest of the story.',
      burst: 'QUEEN',
      pills: [...basePills, 'Queen live'],
      targetHits,
      targetLabels,
      streak
    };
  }

  if (targetHits === 1) {
    return {
      tone: 'spark',
      kicker: 'Target hit',
      title: `${targetLabels[0]} landed.`,
      body: 'That is one clean piece of the big hand.',
      burst: 'TARGET',
      pills: basePills,
      targetHits,
      targetLabels,
      streak
    };
  }

  if (turn.finalScore === 0) {
    return {
      tone: 'bust',
      kicker: 'House sweep',
      title: 'Too high. Zeroed out.',
      body: 'The hand blew past nine and got dragged off the felt.',
      burst: 'NO SCORE',
      pills: basePills,
      targetHits,
      targetLabels,
      streak
    };
  }

  if (turn.finalScore >= 9) {
    return {
      tone: 'money',
      kicker: 'Bank it',
      title: `${turn.finalScore} goes to the rail.`,
      body: 'Clean score. Keep pressure on the target hand.',
      burst: `+${turn.finalScore}`,
      pills: basePills,
      targetHits,
      targetLabels,
      streak
    };
  }

  return {
    tone: 'solid',
    kicker: 'Respectable',
    title: `${turn.finalScore} stays alive.`,
    body: 'Not fireworks, but not dead air either.',
    burst: `+${turn.finalScore}`,
    pills: basePills,
    targetHits,
    targetLabels,
    streak
  };
}

function buildTurnMessages(turn, hype) {
  const messages = [];

  if (turn.walkOut) {
    messages.push('WALK THE FUCK OUT. Fourth BOOFBALL hit the rack. You lose.');
  }
  if (turn.exactWin) {
    messages.push(isPerfectNineSix(turn)
      ? 'Nine Six Bitch!!!! 9, 6, Queen. Final bank is 96.'
      : 'Bank 96. Final bank lands clean.');
  }
  if (!turn.exactWin && !turn.walkOut && hype.tone !== 'bust') {
    messages.push(`${hype.kicker}: ${hype.title} ${hype.body}`);
  }
  if (turn.boofballHit && !turn.walkOut) {
    messages.push(`BOOFBALL stacked. ${turn.boofballsAfter}/${BOOFBALL_LIMIT} on the rack.`);
  }
  if (hype.streak >= 3 && hype.tone !== 'run') {
    messages.push(`${hype.streak}-hand run. The table is starting to lean in.`);
  }

  messages.push(turn.verdict);
  return [...new Set(messages)];
}

function targetHitLabels(turn) {
  const labels = [];

  if (turn.rollem === 9) {
    labels.push('D9');
  }
  if (turn.rollem2 === 6) {
    labels.push('D6');
  }
  if (turn.card?.rank === 'Q') {
    labels.push('Queen');
  }

  return labels;
}

function scoringStreak(turn, history) {
  const scoringValue = turn.handScore ?? turn.finalScore;
  if (scoringValue <= 0 || turn.bankBust) {
    return 0;
  }

  let streak = 1;
  for (const pastTurn of history) {
    const pastScoringValue = pastTurn.handScore ?? pastTurn.finalScore;
    if (pastScoringValue <= 0 || pastTurn.bankBust) {
      break;
    }
    streak += 1;
  }
  return streak;
}

function dieCard(die, current) {
  const value = current[die.key];
  const isActive = current.phase === die.key;
  const isTarget = die.isTarget ? die.isTarget(value) : value === die.target;
  const isLocked = value !== null && value !== undefined && !isActive;
  const valueText = formatRollValue(value);
  const face = die.type === 'card'
    ? cardFace(value, isTarget)
    : `
      <div class="die-shape ${die.shape}" aria-label="${die.label} value ${valueText}">
        <b>${valueText}</b>
      </div>
    `;

  return `
    <article class="die-card ${isActive ? 'active' : ''} ${isTarget ? 'target-hit' : ''} ${isLocked ? 'locked' : ''}">
      <header>
        <span>${die.shortLabel}</span>
        <strong>${die.label}</strong>
      </header>
      ${face}
      <footer>
        <span>Target ${die.target}</span>
        <span>${die.type === 'card' ? 'Face cards only' : `${die.sides} sides`}</span>
      </footer>
    </article>
  `;
}

function cardFace(card, isTarget) {
  const rank = card?.rank ?? '?';
  const suitSymbol = card?.suit?.symbol ?? '&spades;';
  const suitLabel = card?.suit?.label ?? 'unknown suit';
  const color = card?.suit?.color ?? 'black';
  const cardLabel = isTarget ? 'Queen target' : 'Drawn card';

  return `
    <div class="card-face ${color} ${isTarget ? 'target-card' : ''}" aria-label="Playing card ${rank} ${suitLabel}">
      <span class="card-sheen" aria-hidden="true"></span>
      <span class="card-pip pip-left" aria-hidden="true">${suitSymbol}</span>
      <span class="card-pip pip-right" aria-hidden="true">${suitSymbol}</span>
      <span class="card-corner top"><b>${rank}</b><small>${suitSymbol}</small></span>
      <span class="card-corner bottom"><b>${rank}</b><small>${suitSymbol}</small></span>
      <span class="card-watermark" aria-hidden="true">96</span>
      <span class="card-center">
        <small>${cardLabel}</small>
        <b>${rank}</b>
        <i>${suitSymbol}</i>
      </span>
    </div>
  `;
}

function scoreLine(die, current, index) {
  const value = current[die.key];
  const score = current.scores[index];

  return `
    <div>
      <dt>${value === null || value === undefined ? die.scoreText('?') : die.scoreText(value)}</dt>
      <dd>${scoreLabel(score)}</dd>
    </div>
  `;
}

function boofballStacker(current) {
  const count = state.boofballs;
  const isWalkOut = hasGameLoss();
  const letters = ['B', 'O', 'O', 'F'];

  return `
    <section class="boofball-card ${isWalkOut ? 'walkout' : current.boofballHit ? 'hot' : ''}" aria-label="BOOFBALL penalty stack ${count} of ${BOOFBALL_LIMIT}">
      <header>
        <span>Penalty Stacker</span>
        <strong>${count}/${BOOFBALL_LIMIT}</strong>
      </header>
      <div class="boofball-stack" aria-hidden="true">
        ${Array.from({ length: BOOFBALL_LIMIT }, (_, index) => {
          const filled = index < count;
          const isLatest = current.boofballHit && index === count - 1;
          return `<i class="${filled ? 'filled' : 'empty'} ${isLatest ? 'latest' : ''}">${filled ? `<b>${letters[index]}</b>` : '<b></b>'}</i>`;
        }).join('')}
      </div>
      <p>${displayCopy(isWalkOut ? 'Walk the fuck out. You lose.' : current.boofballHit ? 'That NO SCORE hand added a BOOFBALL.' : `${BOOFBALL_LIMIT - count} until the walk.`)}</p>
    </section>
  `;
}

function messageList(current, gameWon, gameLost) {
  const messages = [...(current.messages ?? [])];
  const tone = current.hype?.tone ?? 'quiet';
  if (gameLost) {
    messages.unshift('BOOFBALL WALK: four NO SCORE hands. Walk the fuck out. You lose.');
  }
  if (gameWon) {
    messages.unshift(isPerfectNineSix(current)
      ? 'NINE SIX BITCH hit: 9, 6, Queen. Cash the fictional pot and walk out loud.'
      : 'Bank 96 hit: final bank is 96. Cash the fictional pot and walk out loud.');
  }

  return messages.map((message, index) => `
    <article class="${index === 0 && gameWon ? 'win' : index === 0 && gameLost ? 'walkout' : index === 0 ? tone : ''}">
      <span>${displayCopy(index === 0 && gameWon ? (isPerfectNineSix(current) ? 'Perfect roll' : 'Bank 96') : index === 0 && gameLost ? 'Walk-out loss' : index === 0 ? current.hype?.kicker ?? 'Call' : 'Call')}</span>
      <strong>${displayCopy(message)}</strong>
    </article>
  `).join('');
}

function historyTable() {
  if (!state.history.length) {
    return `
      <div class="empty-history">
        <strong>No turns yet.</strong>
        <span>Roll once and NINE SIX starts filling in.</span>
      </div>
    `;
  }

  return `
    <div class="history-frame">
      <table>
        <thead>
          <tr>
            <th>Turn</th>
            <th>Roll</th>
            <th>Base</th>
            <th>Final</th>
            <th>Chips</th>
            <th>Total</th>
            <th>Boof</th>
          </tr>
        </thead>
        <tbody>
          ${state.history.map((turn) => `
            <tr>
              <td>${turn.round}</td>
              <td>[${turn.rollList.join(', ')}]</td>
              <td>${turn.rawScore}</td>
              <td>${turn.finalScore}</td>
              <td>${turn.tablePayout ?? turn.finalScore * 10}</td>
              <td>${turn.totalAfter}</td>
              <td>${turn.boofballsAfter ?? '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function emptyTurn() {
  return {
    rollem: null,
    rollem2: null,
    card: null,
    scores: [null, null, null],
    rawScore: null,
    finalScore: null,
    phase: '',
    verdict: 'Buy in. Roll hard. Talk shit.',
    messages: ['Backroom table is open.'],
    rollList: [],
    boofballsAfter: state.boofballs,
    boofballHit: false,
    walkOut: false
  };
}

function displayRollList(current) {
  const list = [current.rollem, current.rollem2, current.card];
  return list.map(formatRollValue).join(', ');
}

function formatRollValue(value) {
  if (value === null || value === undefined) {
    return '?';
  }
  if (typeof value === 'object' && 'rank' in value) {
    return value.rank;
  }
  return String(value);
}

function scoreLabel(value) {
  return value === null || value === undefined ? '-' : value;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function spinValue(item) {
  return item.type === 'card' ? drawCard() : randomInt(1, item.sides);
}

function drawCard() {
  const rankIndex = randomInt(0, cardRanks.length - 1);
  const suit = cardSuits[randomInt(0, cardSuits.length - 1)];
  const rank = cardRanks[rankIndex];
  return {
    rank,
    suit,
    value: rankIndex,
    code: `${rank}${suit.code}`
  };
}

function cardScore(card) {
  if (!card) {
    return null;
  }
  return Math.min(3, Math.abs(card.value - queenRankIndex));
}

function hasGameWin() {
  return state.history.some((turn) => turn.exactWin);
}

function hasGameLoss() {
  return state.boofballs >= BOOFBALL_LIMIT || state.history.some((turn) => turn.walkOut);
}

function isPerfectNineSix(turn) {
  return turn?.rollem === 9 && turn?.rollem2 === 6 && turn?.card?.rank === 'Q';
}

function isNoScoreHand(turn) {
  return !isPerfectNineSix(turn) && (turn?.rawScore ?? 0) > 9;
}

function outcomeVoiceRoute(turn) {
  if (isPerfectNineSix(turn)) {
    if (!isAdultMode()) {
      return null;
    }

    return {
      type: 'perfect-nine-six',
      callouts: JACKPOT_CALLOUTS,
      volume: 0.92,
      delay: 460
    };
  }

  if (turn?.boofballHit && isNoScoreHand(turn)) {
    return {
      type: 'boofball-boo',
      callouts: BOOFBALL_CALLOUTS,
      volume: 0.9,
      delay: 260
    };
  }

  return null;
}

function canPlayCalloutType(type) {
  if (type === 'perfect-nine-six') {
    return isAdultMode() && isPerfectNineSix(state.current);
  }

  if (type === 'boofball-boo') {
    return Boolean(state.current?.boofballHit) && isNoScoreHand(state.current);
  }

  if (type === 'bank-bust-horn') {
    return Boolean(state.current?.bankBust);
  }

  return false;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function playOutcomeSound(turn) {
  cancelScheduledSounds();
  cancelScheduledCallouts();
  stopActiveCallout();
  stopActiveEffectAudio();
  stopActiveTones();

  if (state.muted || !isActiveGameTab()) {
    return;
  }

  const voiceRoute = outcomeVoiceRoute(turn);

  if (turn.exactWin) {
    const perfect = isPerfectNineSix(turn);
    const fanfare = perfect
      ? [330, 440, 554, 660, 880, 1108, 1320]
      : [294, 370, 440, 554, 740, 880, 988];

    fanfare.forEach((frequency, index) => {
      const delay = index * (perfect ? 76 : 82);
      scheduleSound(() => playTone(frequency, 0.14, 'triangle', 0.055), delay);
    });
    scheduleSound(() => playTone(perfect ? 1760 : 1175, 0.24, 'sine', 0.048), fanfare.length * 82 + 110);
    scheduleVoiceRoute(voiceRoute);
    return;
  }

  if (isNoScoreHand(turn)) {
    playTone(110, 0.16, 'sawtooth', 0.03);
    [94, 66, 48].forEach((frequency, index) => {
      scheduleSound(() => playTone(frequency, 0.14, 'sawtooth', 0.042), index * 94);
    });
    scheduleVoiceRoute(voiceRoute);
  } else if (turn.bankBust) {
    [146, 110, 82].forEach((frequency, index) => {
      scheduleSound(() => playTone(frequency, 0.1, 'sawtooth', 0.034), index * 92);
    });
    scheduleCallout(() => playRandomCallout(BUST_HORNS, 0.88, 'bank-bust-horn'), 180);
  } else if (turn.hype?.tone === 'near') {
    [294, 392, 587, 740].forEach((frequency, index) => {
      scheduleSound(() => playTone(frequency, 0.08, 'triangle', 0.047), index * 74);
    });
  } else if (turn.hype?.tone === 'run') {
    [330, 392, 494, 659].forEach((frequency, index) => {
      scheduleSound(() => playTone(frequency, 0.08, 'triangle', 0.045), index * 72);
    });
  } else if (turn.finalScore >= 45) {
    [392, 523, 659].forEach((frequency, index) => {
      scheduleSound(() => playTone(frequency, 0.08, 'triangle', 0.045), index * 80);
    });
  } else {
    playTone(260 + turn.finalScore * 8, 0.09, 'square', 0.035);
  }
}

function scheduleVoiceRoute(route) {
  if (!route?.callouts?.length) {
    return;
  }

  scheduleCallout(() => playRandomCallout(route.callouts, route.volume, route.type), route.delay);
}

function stopAllAudio({ cancelRoll = false, pauseMusic = false } = {}) {
  cancelScheduledSounds();
  cancelScheduledCallouts();
  stopActiveCallout();
  stopActiveEffectAudio();
  stopActiveTones();

  if (pauseMusic) {
    const music = musicElement();
    if (music) {
      music.pause();
      music.currentTime = 0;
    }
    state.musicPlaying = false;
    state.musicError = '';
  }

  if (cancelRoll) {
    state.rollToken += 1;
    state.rolling = false;
  }
}

function scheduleSound(callback, delay) {
  if (!ENABLE_SYNTH_SFX || state.muted || !isActiveGameTab()) {
    return;
  }

  const timerId = setTimeout(() => {
    state.soundTimerIds = state.soundTimerIds.filter((id) => id !== timerId);
    if (!state.muted && isActiveGameTab()) {
      callback();
    }
  }, delay);
  state.soundTimerIds.push(timerId);
}

function cancelScheduledSounds() {
  state.soundTimerIds.forEach((timerId) => clearTimeout(timerId));
  state.soundTimerIds = [];
}

function scheduleCallout(callback, delay) {
  if (state.muted || !isActiveGameTab()) {
    return;
  }

  const timerId = setTimeout(() => {
    state.calloutTimerIds = state.calloutTimerIds.filter((id) => id !== timerId);
    if (!state.muted && isActiveGameTab()) {
      callback();
    }
  }, delay);
  state.calloutTimerIds.push(timerId);
}

function cancelScheduledCallouts() {
  state.calloutTimerIds.forEach((timerId) => clearTimeout(timerId));
  state.calloutTimerIds = [];
}

function stopActiveCallout() {
  if (!state.calloutAudio) {
    return;
  }

  state.calloutAudio.pause();
  state.calloutAudio.currentTime = 0;
  state.calloutAudio = null;
}

function stopActiveEffectAudio() {
  if (!state.effectAudio) {
    return;
  }

  state.effectAudio.pause();
  state.effectAudio.currentTime = 0;
  state.effectAudio = null;
}

function playTumbleDiceSound() {
  playOneShotEffect(TUMBLE_DICE_SOUNDS, 0.72, 'tumble-dice');
}

function playCardDealSound() {
  playOneShotEffect(CARD_DEAL_SOUNDS, 0.74, 'card-deal');
}

function playRevealEffect(die) {
  if (die.type === 'card') {
    playCardDealSound();
    return;
  }

  playTumbleDiceSound();
}

function playOneShotEffect(sources, volume, type) {
  if (state.muted || !sources.length || !isActiveGameTab()) {
    return;
  }

  stopActiveEffectAudio();
  const effect = new Audio(sources[randomInt(0, sources.length - 1)]);
  effect.volume = volume;
  effect.dataset.nineSixEffect = type;
  state.effectAudio = effect;
  effect.addEventListener('ended', () => {
    if (state.effectAudio === effect) {
      state.effectAudio = null;
    }
  }, { once: true });
  effect.play().catch(() => {
    if (state.effectAudio === effect) {
      state.effectAudio = null;
    }
  });
}

function playRandomCallout(callouts, volume, type) {
  if (state.muted || !callouts.length || !isActiveGameTab() || !canPlayCalloutType(type)) {
    return;
  }

  stopActiveCallout();
  const src = pickRandomSource(callouts, type);
  const callout = new Audio(src);
  callout.volume = volume;
  callout.dataset.nineSixVoice = type;
  state.lastCallout = { type, src };
  state.calloutAudio = callout;
  callout.addEventListener('ended', () => {
    if (state.calloutAudio === callout) {
      state.calloutAudio = null;
    }
  }, { once: true });
  callout.play().catch(() => {
    if (state.calloutAudio === callout) {
      state.calloutAudio = null;
    }
  });
}

function pickRandomSource(sources, type) {
  if (sources.length <= 1) {
    return sources[0];
  }

  const lastSource = state.lastCalloutByType[type];
  const choices = sources.filter((source) => source !== lastSource);
  const src = choices[randomInt(0, choices.length - 1)] ?? sources[randomInt(0, sources.length - 1)];
  state.lastCalloutByType[type] = src;
  return src;
}

function playTargetHitSound(die) {
  if (!ENABLE_SYNTH_SFX || state.muted || !isActiveGameTab()) {
    return;
  }

  const offset = die.type === 'card' ? 120 : die.sides * 9;
  [520 + offset, 780 + offset].forEach((frequency, index) => {
    scheduleSound(() => playTone(frequency, 0.06, 'triangle', 0.042), index * 52);
  });
}

function playDieLockSound(die, value, isTarget) {
  if (!ENABLE_SYNTH_SFX || state.muted || !isActiveGameTab()) {
    return;
  }

  if (isTarget) {
    playTargetHitSound(die);
    return;
  }

  const toneValue = die.type === 'card' ? value.value : value;
  playTone(210 + toneValue * 34 + die.sides * 3, 0.07, 'square', 0.028);
}

function stopActiveTones() {
  state.activeTones.forEach((oscillator) => {
    try {
      oscillator.onended = null;
      oscillator.stop();
    } catch {
      // Already stopped.
    }
  });
  state.activeTones = [];
}

function playTone(frequency, duration, type, gainValue) {
  if (!ENABLE_SYNTH_SFX || state.muted || !isActiveGameTab()) {
    return;
  }

  const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContext) {
    return;
  }

  try {
    state.audioContext ??= new AudioContext();
    if (state.audioContext.state === 'suspended') {
      state.audioContext.resume().catch(() => {});
    }

    const now = state.audioContext.currentTime;
    const oscillator = state.audioContext.createOscillator();
    const gain = state.audioContext.createGain();
    const removeTone = () => {
      state.activeTones = state.activeTones.filter((tone) => tone !== oscillator);
    };

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(state.audioContext.destination);
    oscillator.onended = removeTone;
    state.activeTones.push(oscillator);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  } catch {
    state.muted = true;
  }
}

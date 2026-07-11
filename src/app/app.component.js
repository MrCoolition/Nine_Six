const TARGET_SCORE = 96;
const BUST_RESET_SCORE = 69;
const TABLE_STAKE = 25;
const BOOFBALL_LIMIT = 4;
const JACKPOT_HAND = '9, 6, Q';
const HISTORY_LIMIT = 14;
const STORAGE_KEY = 'nine-six-player-v2';
const MUSIC_STORAGE_KEY = 'nine-six-jukebox-v1';
const PROFILE_STORAGE_KEY = 'nine-six-profile-v1';
const LEADERBOARD_STORAGE_KEY = 'nine-six-leaderboard-v1';
const LEADERBOARD_LIMIT = 30;
const DAILY_NAMESPACE = 'NINE-SIX-DAILY';
const REVEAL_SPINS = 11;
const REVEAL_DURATION_MS = 3000;
const ENABLE_SYNTH_SFX = false;
const ENABLE_ROLL_SPIN_SFX = false;
const ODDS = {
  totalHands: 162,
  perfect: '1 / 162',
  perfectPercent: '0.62%',
  boofball: '40 / 162',
  boofballPercent: '24.69%',
  scoring: '122 / 162',
  scoringPercent: '75.31%',
  x9: '68 / 162',
  x9Percent: '41.98%',
  sessionWinPercent: '40.81%',
  sessionLossPercent: '59.19%',
  averageTurns: '12.25',
  expectedPayout: '192 fictional chips',
  anteWarning: '25 chip ante is entertainment math only. Chips have no cash value.'
};
const RANKS = [
  { name: 'Corner Stool', minXp: 0 },
  { name: 'Felt Regular', minXp: 120 },
  { name: 'Rail Menace', minXp: 360 },
  { name: 'Backroom Boss', minXp: 760 },
  { name: 'NINE SIX Legend', minXp: 1400 }
];
const UNLOCKS = [
  { label: 'Chrome die finish', at: 120 },
  { label: 'Velvet queen card', at: 360 },
  { label: 'Boo Choir pack', at: 760 },
  { label: 'Legend monogram', at: 1400 }
];
const SKINS = [
  {
    key: 'drakkar-noir',
    name: 'Drakkar Noir',
    short: 'Noir',
    note: 'Black glass / oxblood',
    themeColor: '#050505',
    swatches: ['#050505', '#eeeae1', '#941d31']
  },
  {
    key: 'cool-current',
    name: 'Cool Current',
    short: 'Water',
    note: 'Marine blue / cold chrome',
    themeColor: '#031017',
    swatches: ['#031017', '#137c99', '#dff5f7']
  },
  {
    key: 'woods-96',
    name: 'Woods 96',
    short: 'Woods',
    note: 'Deep forest / aged brass',
    themeColor: '#07100b',
    swatches: ['#07100b', '#2f4937', '#b69657']
  },
  {
    key: 'fahrenheit-heat',
    name: 'Fahrenheit Heat',
    short: 'Heat',
    note: 'Charcoal / ember / cognac',
    themeColor: '#100705',
    swatches: ['#100705', '#8f2f1b', '#d87b36']
  },
  {
    key: 'one-minimal',
    name: 'One Minimal',
    short: 'One',
    note: 'Frosted ivory / soft graphite',
    themeColor: '#e8e7e1',
    swatches: ['#e8e7e1', '#b9bab8', '#1b1c1e']
  },
  {
    key: 'sport-blue',
    name: 'Sport Blue',
    short: 'Sport',
    note: 'Cobalt glass / bright aluminum',
    themeColor: '#061126',
    swatches: ['#061126', '#1557b7', '#c8ddff']
  }
];
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
const JUKEBOX_TRACKS = [
  ...Array.from({ length: 22 }, (_, index) => ({
    title: `Groove ${index + 1}`,
    src: `./src/assets/jukebox-groove-${index + 1}.wav`
  })),
  {
    title: 'Snake Eyes High Stakes',
    src: './src/assets/snake-eyes-high-stakes.wav'
  }
];
const PG_REPLACEMENTS = [
  [/NINE SIX BITCH!!!!/g, 'NINE SIX!'],
  [/NINE SIX BITCH/g, 'NINE SIX'],
  [/Nine Six Bitch!!!!/g, 'Nine Six!'],
  [/Nine Six Bitch/g, 'Nine Six'],
  [/WALK THE FUCK OUT/g, 'WALK OUT'],
  [/Walk the fuck out/gi, 'Walk out'],
  [/bullshit/gi, 'bad hand'],
  [/\bdamn\b/gi, 'room'],
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
const savedMusicPreferences = loadMusicPreferences();
const savedProfile = loadProfile();

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
  playMode: 'free',
  toneMode: 'adult',
  musicPlaying: false,
  musicVolume: savedMusicPreferences.volume ?? 0.45,
  musicError: '',
  musicTrackIndex: 0,
  musicShuffle: savedMusicPreferences.shuffle ?? true,
  musicAutoplay: savedMusicPreferences.autoplay ?? true,
  skin: savedProfile.skin,
  playerName: savedProfile.playerName,
  leaderboard: loadLeaderboard(),
  sessionId: createSessionId(),
  mobileTray: null,
  intelView: 'daily',
  endScreenDismissed: false,
  shareNotice: '',
  dailySeed: dailySeedForDate(),
  dailyRollIndex: 0,
  current: null,
  history: [],
  boofballs: 0,
  stats: loadPlayerStats(),
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

applySkin(state.skin, { animate: false });
bindPageAudioGuards();
bindMusicEvents();
registerServiceWorker();
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
  const musicTrack = currentMusicTrack();
  const musicStatus = state.musicError || `${state.musicPlaying ? 'Now playing' : 'Needle up'} - ${state.musicTrackIndex + 1}/${JUKEBOX_TRACKS.length}`;
  const music = musicElement();
  const musicDuration = Number.isFinite(music?.duration) ? music.duration : 0;
  const musicTime = Number.isFinite(music?.currentTime) ? music.currentTime : 0;
  const targetGap = Math.max(0, TARGET_SCORE - state.totalScore);
  const adultMode = isAdultMode();
  const playerRank = rankForXp(state.stats.xp);
  const activeSkin = skinByKey(state.skin);

  root.innerHTML = `
    <main class="game-shell ${moodClass} ${rollingClass} rank-${playerRank.index} ${gameWon ? 'game-won' : ''} ${gameLost ? 'game-lost' : ''} tray-${state.mobileTray ?? 'closed'} intel-${state.intelView}">
      <section class="score-band" aria-label="NINE SIX scoreboard">
        <div class="brand-lockup">
          <div class="brand-mark" aria-hidden="true">
            <span>9</span>
            <span>6</span>
          </div>
          <div>
            <p>${adultMode ? 'NINE SIX / ADULT CUT' : 'NINE SIX / CLEAN CUT'}</p>
            <h1>NINE SIX</h1>
            <small>Two dice. One face card. Land 9 / 6 / Q.</small>
          </div>
        </div>

        <div class="score-meter ${current.phase === 'settled' ? 'score-pop' : ''}" aria-label="Bank score ${state.totalScore}">
          <div>
            <span>96 chase</span>
            <strong>${state.totalScore}</strong>
          </div>
          <div class="meter-track"><i style="width: ${progress}%"></i></div>
          <small>${gameLost ? 'Walked out' : gameWon ? '96 nailed' : `${targetGap} to go`} / ${tablePot} fake chips burned</small>
        </div>

        <div class="control-stack">
          <div class="control-row">
            <button type="button" class="primary-action" data-action="roll" data-short="${state.rolling ? 'Deal...' : 'Roll'}" ${state.rolling || gameOver ? 'disabled' : ''}>
              ${state.rolling ? 'Showdown...' : 'Roll hand'}
            </button>
            <button type="button" class="music-action ${state.musicPlaying ? 'active' : ''}" data-action="music" data-short="Track">
              ${state.musicPlaying ? 'Kill track' : 'Drop needle'}
            </button>
            <button type="button" data-action="reset" data-short="Reset">Reset</button>
            <button type="button" data-action="sound" data-short="${state.muted ? 'Muted' : 'Sound'}" aria-label="Toggle sound">
              ${state.muted ? 'Sound off' : 'Sound on'}
            </button>
            <button type="button" class="mode-action ${adultMode ? 'adult' : 'pg'}" data-action="tone-mode" data-short="${adultMode ? 'Adult' : 'PG'}" aria-pressed="${adultMode ? 'true' : 'false'}">
              ${adultMode ? 'Adult' : 'PG'}
            </button>
            <button type="button" class="daily-action ${state.playMode === 'daily' ? 'active' : ''}" data-action="daily" data-short="${state.playMode === 'daily' ? 'Daily' : 'Free'}" ${state.rolling ? 'disabled' : ''}>
              ${state.playMode === 'daily' ? 'Daily on' : 'Free play'}
            </button>
          </div>
          <div class="table-tags" aria-label="Table tone">
            <span>${adultMode ? 'adult cut' : 'clean cut'}</span>
            <span>${TABLE_STAKE} fake chips</span>
            <span>${activeSkin.name}</span>
          </div>
          ${jukeboxConsole({ musicTrack, musicStatus, musicVolume, musicTime, musicDuration, variant: 'desktop' })}
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
              <span>Vibe</span>
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
            <h2>How It Hits</h2>
            <p>${modeCopy(`Base hand = (9 - D9) + (6 - D6) + Queen gap. Over 9 scores zero and stacks a BOOFBALL. Four BOOFBALLS is a walk-out loss. 6 or under gets paid x9. The bank must land exactly ${TARGET_SCORE}. Overshoot busts back to ${BUST_RESET_SCORE}.`, `Base hand = (9 - D9) + (6 - D6) + Queen gap. Over 9 scores zero and stacks a BOOFBALL. Four BOOFBALLS ends the game. 6 or under gets paid x9. The bank must land exactly ${TARGET_SCORE}. Overshoot resets to ${BUST_RESET_SCORE}.`)}</p>
          </section>
        </aside>
      </section>

      <section class="event-strip" aria-label="Round result">
        ${messageList(current, gameWon, gameLost)}
      </section>

      ${shareCard(current, gameWon, gameLost)}
      <nav class="intel-tabs" aria-label="Table information">
        ${intelTab('daily', 'Daily')}
        ${intelTab('odds', 'Odds')}
        ${intelTab('progress', 'Locker')}
        ${intelTab('leaders', 'Leaders')}
        ${intelTab('log', 'Log')}
      </nav>

      ${viralConsole(current)}

      <section class="history-section" aria-label="Turn history">
        <header>
          <span>Receipts</span>
          <h2>Damage Report</h2>
        </header>
        ${historyTable()}
      </section>

      ${endGameCurtain(current, gameWon, gameLost)}

      <div class="tray-scrim" data-action="close-tray" aria-hidden="true"></div>
      ${jukeboxConsole({ musicTrack, musicStatus, musicVolume, musicTime, musicDuration, variant: 'mobile' })}
      ${mobileTableTray(adultMode, playerRank, heatLevel)}

      <nav class="mobile-command-bar" aria-label="Game controls">
        <button type="button" class="command-music ${state.musicPlaying ? 'active' : ''}" data-action="music-tray" aria-expanded="${state.mobileTray === 'music'}">
          <span aria-hidden="true">&#9835;</span>
          <b>Jukebox</b>
          <small>${state.musicPlaying ? 'Playing' : 'Music'}</small>
        </button>
        <button type="button" class="command-roll" data-action="roll" ${state.rolling || gameOver ? 'disabled' : ''}>
          <span>${state.rolling ? '...' : 'ROLL'}</span>
          <small>${state.rolling ? 'Showdown' : '9 / 6 / Q'}</small>
        </button>
        <button type="button" class="command-table" data-action="table-tray" aria-expanded="${state.mobileTray === 'table'}">
          <span aria-hidden="true">96</span>
          <b>Control</b>
          <small>${adultMode ? 'Adult' : 'PG'}</small>
        </button>
      </nav>
    </main>
  `;

  bindActions();
}

function jukeboxConsole({ musicTrack, musicStatus, musicVolume, musicTime, musicDuration, variant }) {
  const mobile = variant === 'mobile';

  return `
    <section class="music-console ${variant}-music-console ${state.musicPlaying ? 'playing' : ''}" aria-label="Music controls" ${mobile ? `aria-hidden="${state.mobileTray !== 'music'}"` : ''}>
      <header class="jukebox-head">
        <div class="record-mark ${state.musicPlaying ? 'spinning' : ''}" aria-hidden="true"><i></i></div>
        <div>
          <span>Jukebox / ${state.musicTrackIndex + 1} of ${JUKEBOX_TRACKS.length}</span>
          <strong data-jukebox-title>${musicTrack.title}</strong>
          <small data-jukebox-status>${musicStatus}</small>
        </div>
        ${mobile ? '<button type="button" class="tray-close" data-action="close-tray" aria-label="Close jukebox" title="Close jukebox">&times;</button>' : ''}
      </header>
      <div class="track-progress">
        <input type="range" data-action="music-seek" min="0" max="${Math.max(1, Math.round(musicDuration))}" value="${Math.min(Math.round(musicTime), Math.max(1, Math.round(musicDuration)))}" aria-label="Track position">
        <small><span data-music-time>${formatClock(musicTime)}</span><span data-music-duration>${formatClock(musicDuration)}</span></small>
      </div>
      <div class="jukebox-buttons" aria-label="Jukebox track controls">
        <button type="button" data-action="music-prev" aria-label="Previous track" title="Previous track"><span aria-hidden="true">&#9198;</span><b>Prev</b></button>
        <button type="button" class="music-play ${state.musicPlaying ? 'active' : ''}" data-action="music" aria-label="${state.musicPlaying ? 'Pause music' : 'Play music'}" title="${state.musicPlaying ? 'Pause' : 'Play'}"><span aria-hidden="true">${state.musicPlaying ? '&#10074;&#10074;' : '&#9654;'}</span><b>${state.musicPlaying ? 'Pause' : 'Play'}</b></button>
        <button type="button" data-action="music-next" aria-label="Next track" title="Next track"><span aria-hidden="true">&#9197;</span><b>Next</b></button>
        <button type="button" class="shuffle-button ${state.musicShuffle ? 'active' : ''}" data-action="music-shuffle" aria-pressed="${state.musicShuffle}" aria-label="Shuffle" title="Toggle shuffle"><span aria-hidden="true">&#8644;</span><b>${state.musicShuffle ? 'Shuffle' : 'Order'}</b></button>
      </div>
      <div class="jukebox-settings">
        <label class="volume-control">
          <span>Volume</span>
          <input type="range" data-action="music-volume" min="0" max="100" value="${musicVolume}" aria-label="Music volume">
          <b data-music-volume-value>${musicVolume}</b>
        </label>
        <label class="autoplay-control">
          <input type="checkbox" data-action="music-autoplay" ${state.musicAutoplay ? 'checked' : ''}>
          <i aria-hidden="true"></i>
          <span>Autoplay</span>
        </label>
      </div>
    </section>
  `;
}

function bindActions() {
  bindClickAction('roll', () => rollTurn());
  bindClickAction('reset', () => resetGame());
  bindClickAction('sound', () => {
    state.muted = !state.muted;
    if (state.muted) {
      stopAllAudio({ pauseMusic: true });
    }
    render();
  });
  bindClickAction('music', () => toggleMusic());
  bindClickAction('music-prev', () => advanceMusicTrack(-1, { autoplay: state.musicPlaying, forceOrder: true }));
  bindClickAction('music-next', () => advanceMusicTrack(1, { autoplay: state.musicPlaying, forceOrder: true }));
  bindClickAction('music-shuffle', () => {
    state.musicShuffle = !state.musicShuffle;
    saveMusicPreferences();
    render();
  });
  bindClickAction('tone-mode', () => {
    state.toneMode = isAdultMode() ? 'pg' : 'adult';
    stopActiveCallout();
    render();
  });
  bindClickAction('daily', () => {
    state.mobileTray = null;
    toggleDailyMode();
  });
  bindClickAction('share', () => shareCurrentMoment());
  bindClickAction('install', () => installPromptHint());
  bindClickAction('music-tray', () => {
    state.mobileTray = state.mobileTray === 'music' ? null : 'music';
    render();
  });
  bindClickAction('table-tray', () => {
    state.mobileTray = state.mobileTray === 'table' ? null : 'table';
    render();
  });
  bindClickAction('close-tray', () => {
    state.mobileTray = null;
    render();
  });
  bindClickAction('dismiss-end', () => {
    state.endScreenDismissed = true;
    render();
  });
  bindClickAction('intel', (event) => {
    state.intelView = event.currentTarget.dataset.intel || 'daily';
    render();
  });
  root.querySelectorAll('[data-action="skin"]').forEach((button) => {
    button.addEventListener('click', (event) => setSkin(event.currentTarget.dataset.skin));
  });
  root.querySelectorAll('[data-action="open-intel"]').forEach((button) => {
    button.addEventListener('click', (event) => {
      state.mobileTray = null;
      state.intelView = event.currentTarget.dataset.intel || 'progress';
      render();
      window.requestAnimationFrame(() => document.querySelector('.intel-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    });
  });
  root.querySelectorAll('[data-action="player-name"]').forEach((input) => {
    input.addEventListener('change', (event) => setPlayerName(event.target.value));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.currentTarget.blur();
      }
    });
  });

  root.querySelectorAll('[data-action="music-volume"]').forEach((input) => {
    input.addEventListener('input', (event) => setMusicVolume(event.target.value));
  });
  root.querySelectorAll('[data-action="music-seek"]').forEach((input) => {
    input.addEventListener('input', (event) => seekMusic(event.target.value));
  });
  root.querySelectorAll('[data-action="music-autoplay"]').forEach((input) => {
    input.addEventListener('change', (event) => {
      state.musicAutoplay = event.target.checked;
      saveMusicPreferences();
      render();
    });
  });
}

function bindClickAction(action, callback) {
  root.querySelectorAll(`[data-action="${action}"]`).forEach((button) => {
    button.addEventListener('click', (event) => {
      runSingleClickAction(action, () => callback(event));
    });
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

  window.addEventListener('focus', () => {
    state.actionTimes = {};
    render();
  });
}

function bindMusicEvents() {
  const music = musicElement();
  if (!music || music.dataset.jukeboxBound === 'true') {
    return;
  }

  music.dataset.jukeboxBound = 'true';
  music.addEventListener('play', () => {
    state.musicPlaying = true;
    state.musicError = '';
    music.controls = false;
    music.classList.remove('needs-native');
    syncMusicUi();
  });
  music.addEventListener('playing', () => {
    state.musicPlaying = true;
    state.musicError = '';
    syncMusicUi();
  });
  music.addEventListener('pause', () => {
    state.musicPlaying = false;
    syncMusicUi();
  });
  music.addEventListener('waiting', () => {
    state.musicError = 'Buffering...';
    syncMusicUi();
  });
  music.addEventListener('loadedmetadata', syncMusicUi);
  music.addEventListener('timeupdate', syncMusicTimeline);
  music.addEventListener('ended', () => {
    state.musicPlaying = false;
    if (state.musicAutoplay && !state.muted && isActiveGameTab()) {
      advanceMusicTrack(1, { autoplay: true });
      return;
    }
    state.musicError = state.musicAutoplay ? '' : 'Autoplay off.';
    render();
  });
  music.addEventListener('error', () => {
    if (!state.musicPlaying || !state.musicAutoplay) {
      state.musicError = 'Track unavailable.';
      render();
      return;
    }

    state.musicError = 'Track skipped.';
    advanceMusicTrack(1, { autoplay: true });
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
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

function defaultProfile() {
  return {
    playerName: 'PLAYER 96',
    skin: SKINS[0].key
  };
}

function loadProfile() {
  try {
    const stored = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || '{}');
    return {
      playerName: normalizePlayerName(stored.playerName),
      skin: skinByKey(stored.skin).key
    };
  } catch {
    return defaultProfile();
  }
}

function saveProfile() {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({
      playerName: state.playerName,
      skin: state.skin
    }));
  } catch {
    // A custom table identity is optional.
  }
}

function skinByKey(key) {
  return SKINS.find((skin) => skin.key === key) ?? SKINS[0];
}

function setSkin(key) {
  const skin = skinByKey(key);
  if (skin.key === state.skin) {
    return;
  }

  state.skin = skin.key;
  applySkin(skin.key);
  saveProfile();
  render();
}

function applySkin(key, { animate = true } = {}) {
  const skin = skinByKey(key);
  document.documentElement.dataset.skin = skin.key;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', skin.themeColor);

  if (animate) {
    document.documentElement.classList.add('skin-changing');
    window.setTimeout(() => document.documentElement.classList.remove('skin-changing'), 520);
  }
}

function setPlayerName(value) {
  state.playerName = normalizePlayerName(value);
  saveProfile();
  render();
}

function normalizePlayerName(value) {
  const normalized = String(value ?? '')
    .replace(/[^A-Za-z0-9 ._'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16);
  return normalized || defaultProfile().playerName;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function defaultPlayerStats() {
  return {
    bankroll: 960,
    xp: 0,
    sessions: 0,
    turns: 0,
    wins: 0,
    perfects: 0,
    walkouts: 0,
    boofballs: 0,
    monsterHands: 0,
    bestBank: 0,
    bestHand: 0,
    daily: {
      date: dailyLabel(),
      plays: 0,
      bestBank: 0
    }
  };
}

function loadPlayerStats() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return {
      ...defaultPlayerStats(),
      ...stored,
      daily: {
        ...defaultPlayerStats().daily,
        ...(stored?.daily ?? {})
      }
    };
  } catch {
    return defaultPlayerStats();
  }
}

function savePlayerStats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.stats));
  } catch {
    // Local progress is optional.
  }
}

function loadMusicPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(MUSIC_STORAGE_KEY) || '{}');
    return {
      volume: Number.isFinite(stored.volume) ? Math.max(0, Math.min(1, stored.volume)) : undefined,
      shuffle: typeof stored.shuffle === 'boolean' ? stored.shuffle : undefined,
      autoplay: typeof stored.autoplay === 'boolean' ? stored.autoplay : undefined
    };
  } catch {
    return {};
  }
}

function saveMusicPreferences() {
  try {
    localStorage.setItem(MUSIC_STORAGE_KEY, JSON.stringify({
      volume: state.musicVolume,
      shuffle: state.musicShuffle,
      autoplay: state.musicAutoplay
    }));
  } catch {
    // Jukebox preferences are optional.
  }
}

function createSessionId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadLeaderboard() {
  try {
    const stored = JSON.parse(localStorage.getItem(LEADERBOARD_STORAGE_KEY) || '[]');
    if (!Array.isArray(stored)) {
      return [];
    }

    return stored
      .map((entry) => ({
        sessionId: String(entry.sessionId ?? ''),
        playerName: normalizePlayerName(entry.playerName),
        result: entry.result === 'win' ? 'win' : 'walkout',
        bank: Math.max(0, Math.min(TARGET_SCORE, Number(entry.bank) || 0)),
        turns: Math.max(1, Number(entry.turns) || 1),
        boofballs: Math.max(0, Math.min(BOOFBALL_LIMIT, Number(entry.boofballs) || 0)),
        bestHand: Math.max(0, Number(entry.bestHand) || 0),
        perfect: Boolean(entry.perfect),
        mode: entry.mode === 'daily' ? 'daily' : 'free',
        skin: skinByKey(entry.skin).key,
        completedAt: String(entry.completedAt ?? '')
      }))
      .sort(compareLeaderboardEntries)
      .slice(0, LEADERBOARD_LIMIT);
  } catch {
    return [];
  }
}

function saveLeaderboard() {
  try {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(state.leaderboard));
  } catch {
    // Completed-run history is optional.
  }
}

function recordCompletedRun(turn) {
  if ((!turn.exactWin && !turn.walkOut) || state.leaderboard.some((entry) => entry.sessionId === state.sessionId)) {
    return;
  }

  const entry = {
    sessionId: state.sessionId,
    playerName: state.playerName,
    result: turn.exactWin ? 'win' : 'walkout',
    bank: turn.totalAfter ?? state.totalScore,
    turns: turn.round ?? state.round,
    boofballs: turn.boofballsAfter ?? state.boofballs,
    bestHand: state.history.reduce((best, item) => Math.max(best, item.handScore ?? item.finalScore ?? 0), 0),
    perfect: isPerfectNineSix(turn),
    mode: state.playMode,
    skin: state.skin,
    completedAt: new Date().toISOString()
  };

  state.leaderboard = [entry, ...state.leaderboard]
    .sort(compareLeaderboardEntries)
    .slice(0, LEADERBOARD_LIMIT);
  saveLeaderboard();
}

function compareLeaderboardEntries(left, right) {
  const leftWon = left.result === 'win';
  const rightWon = right.result === 'win';
  if (leftWon !== rightWon) return leftWon ? -1 : 1;

  if (leftWon) {
    if (left.perfect !== right.perfect) return left.perfect ? -1 : 1;
    if (left.turns !== right.turns) return left.turns - right.turns;
    if (left.boofballs !== right.boofballs) return left.boofballs - right.boofballs;
  } else {
    if (left.bank !== right.bank) return right.bank - left.bank;
    if (left.turns !== right.turns) return left.turns - right.turns;
  }

  if (left.bestHand !== right.bestHand) return right.bestHand - left.bestHand;
  return String(right.completedAt).localeCompare(String(left.completedAt));
}

function recordSettledTurn(turn) {
  const handScore = turn.handScore ?? turn.finalScore;
  const wasFirstTurn = turn.round === 1;
  const fictionalDelta = (turn.tablePayout ?? turn.finalScore * 10) - TABLE_STAKE;

  if (wasFirstTurn) {
    state.stats.sessions += 1;
    if (state.playMode === 'daily') {
      const today = dailyLabel();
      if (state.stats.daily.date !== today) {
        state.stats.daily = { date: today, plays: 0, bestBank: 0 };
      }
      state.stats.daily.plays += 1;
    }
  }

  state.stats.turns += 1;
  state.stats.bankroll = Math.max(0, state.stats.bankroll + fictionalDelta);
  state.stats.bestBank = Math.max(state.stats.bestBank, turn.totalAfter ?? 0);
  state.stats.bestHand = Math.max(state.stats.bestHand, handScore);
  state.stats.xp += turnXp(turn);

  if (turn.boofballHit) {
    state.stats.boofballs += 1;
  }
  if (handScore >= 45) {
    state.stats.monsterHands += 1;
  }
  if (isPerfectNineSix(turn)) {
    state.stats.perfects += 1;
  }
  if (turn.walkOut) {
    state.stats.walkouts += 1;
  }
  if (turn.exactWin) {
    state.stats.wins += 1;
  }
  if (state.playMode === 'daily') {
    state.stats.daily.bestBank = Math.max(state.stats.daily.bestBank, turn.totalAfter ?? 0);
  }

  recordCompletedRun(turn);
  savePlayerStats();
}

function turnXp(turn) {
  let xp = 8 + Math.round((turn.handScore ?? turn.finalScore) / 3);
  if (turn.boofballHit) xp += 2;
  if ((turn.handScore ?? turn.finalScore) >= 45) xp += 24;
  if (turn.targetHits >= 2) xp += 18;
  if (turn.exactWin) xp += 110;
  if (isPerfectNineSix(turn)) xp += 220;
  if (turn.walkOut) xp += 12;
  return xp;
}

function rankForXp(xp) {
  const index = RANKS.reduce((best, rank, rankIndex) => (xp >= rank.minXp ? rankIndex : best), 0);
  return {
    index,
    current: RANKS[index]
  };
}

function dailyLabel(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function dailySeedForDate(date = dailyLabel()) {
  return `${DAILY_NAMESPACE}-${date}`;
}

function dailyRngForRoll(index) {
  return mulberry32(hashString(`${state.dailySeed}:${index}`));
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return () => {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value ?? 0);
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
  state.shareNotice = '';
  state.mobileTray = null;

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
  if (settled.exactWin || settled.walkOut) {
    state.endScreenDismissed = false;
  }
  recordSettledTurn(settled);
  state.rolling = false;

  vibrateForTurn(settled);
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
  state.dailyRollIndex = 0;
  state.sessionId = createSessionId();
  state.shareNotice = '';
  state.lastCalloutByType = {};
  state.mobileTray = null;
  state.endScreenDismissed = false;
  render();
}

function toggleDailyMode() {
  state.playMode = state.playMode === 'daily' ? 'free' : 'daily';
  state.dailySeed = dailySeedForDate();
  resetGame();
}

async function shareCurrentMoment() {
  const current = state.current ?? emptyTurn();
  const moment = shareMomentForTurn(current, hasGameWin(), hasGameLoss());
  const text = moment
    ? `NINE SIX: ${moment.title} - ${moment.body} ${location.href}`
    : `NINE SIX Daily Table ${state.dailySeed}. Fictional chips only. ${location.href}`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: 'NINE SIX',
        text
      });
      state.shareNotice = 'Shared from the table.';
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      state.shareNotice = 'Share text copied.';
    } else {
      state.shareNotice = text;
    }
  } catch {
    state.shareNotice = 'Share cancelled. No chips moved.';
  }

  render();
}

function installPromptHint() {
  state.shareNotice = 'Install from your browser menu: Add to Home Screen. NINE SIX now has PWA files ready.';
  render();
}

function currentMusicTrack() {
  return JUKEBOX_TRACKS[state.musicTrackIndex] ?? JUKEBOX_TRACKS[0];
}

function syncMusicTrack() {
  const music = musicElement();
  if (!music) {
    return null;
  }

  const track = currentMusicTrack();
  if (music.getAttribute('src') !== track.src) {
    music.pause();
    music.setAttribute('src', track.src);
    music.preload = 'auto';
    music.load();
  }
  music.muted = false;
  music.volume = state.musicVolume;
  return music;
}

async function toggleMusic() {
  if (!isActiveGameTab()) {
    return;
  }

  const music = syncMusicTrack();
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

  state.muted = false;
  await playCurrentMusicTrack();
}

async function playCurrentMusicTrack() {
  const music = syncMusicTrack();
  if (!music) {
    state.musicError = 'Track missing.';
    render();
    return;
  }

  state.musicError = 'Starting track...';
  syncMusicUi();

  try {
    await music.play();
    state.musicPlaying = !music.paused;
    state.musicError = '';
    music.controls = false;
    music.classList.remove('needs-native');
  } catch (error) {
    music.pause();
    music.controls = true;
    music.classList.add('needs-native');
    state.musicPlaying = false;
    state.musicError = error?.name === 'NotAllowedError'
      ? 'Phone audio lock. Use the player below.'
      : 'Track could not start.';
  }

  render();
}

async function advanceMusicTrack(direction, { autoplay = false, forceOrder = false } = {}) {
  const music = musicElement();
  const shouldAutoplay = autoplay || Boolean(music && !music.paused);
  const nextIndex = forceOrder || !state.musicShuffle
    ? state.musicTrackIndex + direction
    : randomNextTrackIndex();
  state.musicTrackIndex = wrapTrackIndex(nextIndex);
  state.musicError = '';

  if (music) {
    music.pause();
    music.currentTime = 0;
    music.setAttribute('src', currentMusicTrack().src);
    music.preload = 'auto';
    music.load();
    music.volume = state.musicVolume;
  }

  if (shouldAutoplay && !state.muted) {
    await playCurrentMusicTrack();
    return;
  }

  state.musicPlaying = false;
  render();
}

function randomNextTrackIndex() {
  if (JUKEBOX_TRACKS.length <= 1) {
    return 0;
  }

  let nextIndex = state.musicTrackIndex;
  while (nextIndex === state.musicTrackIndex) {
    nextIndex = Math.floor(Math.random() * JUKEBOX_TRACKS.length);
  }
  return nextIndex;
}

function wrapTrackIndex(index) {
  return (index + JUKEBOX_TRACKS.length) % JUKEBOX_TRACKS.length;
}

function setMusicVolume(value) {
  const volume = Math.max(0, Math.min(1, Number(value) / 100));
  state.musicVolume = volume;
  const music = syncMusicTrack();
  if (music) {
    music.volume = volume;
  }
  saveMusicPreferences();
  const label = root.querySelector('[data-music-volume-value]');
  if (label) {
    label.textContent = String(Math.round(volume * 100));
  }
}

function seekMusic(value) {
  const music = musicElement();
  if (!music || !Number.isFinite(music.duration)) {
    return;
  }

  music.currentTime = Math.max(0, Math.min(music.duration, Number(value)));
  syncMusicTimeline();
}

function syncMusicUi() {
  const track = currentMusicTrack();
  const status = state.musicError || `${state.musicPlaying ? 'Now playing' : 'Needle up'} - ${state.musicTrackIndex + 1}/${JUKEBOX_TRACKS.length}`;

  root.querySelectorAll('[data-jukebox-title]').forEach((label) => {
    label.textContent = track.title;
  });
  root.querySelectorAll('[data-jukebox-status]').forEach((label) => {
    label.textContent = status;
  });
  root.querySelectorAll('.music-console').forEach((consoleElement) => {
    consoleElement.classList.toggle('playing', state.musicPlaying);
  });
  root.querySelectorAll('.record-mark').forEach((record) => {
    record.classList.toggle('spinning', state.musicPlaying);
  });
  root.querySelectorAll('.music-play').forEach((button) => {
    button.classList.toggle('active', state.musicPlaying);
    button.setAttribute('aria-label', state.musicPlaying ? 'Pause music' : 'Play music');
    button.setAttribute('title', state.musicPlaying ? 'Pause' : 'Play');
    button.innerHTML = `<span aria-hidden="true">${state.musicPlaying ? '&#10074;&#10074;' : '&#9654;'}</span><b>${state.musicPlaying ? 'Pause' : 'Play'}</b>`;
  });
  root.querySelectorAll('.music-action').forEach((button) => {
    button.classList.toggle('active', state.musicPlaying);
    button.textContent = state.musicPlaying ? 'Kill track' : 'Drop needle';
  });
  root.querySelectorAll('.command-music').forEach((button) => {
    button.classList.toggle('active', state.musicPlaying);
    const statusLabel = button.querySelector('small');
    if (statusLabel) {
      statusLabel.textContent = state.musicPlaying ? 'Playing' : 'Music';
    }
  });

  syncMusicTimeline();
}

function syncMusicTimeline() {
  const music = musicElement();
  if (!music) {
    return;
  }

  const duration = Number.isFinite(music.duration) ? music.duration : 0;
  const currentTime = Number.isFinite(music.currentTime) ? music.currentTime : 0;
  root.querySelectorAll('[data-action="music-seek"]').forEach((input) => {
    input.max = String(Math.max(1, Math.round(duration)));
    input.value = String(Math.min(Math.round(currentTime), Math.max(1, Math.round(duration))));
  });
  root.querySelectorAll('[data-music-time]').forEach((label) => {
    label.textContent = formatClock(currentTime);
  });
  root.querySelectorAll('[data-music-duration]').forEach((label) => {
    label.textContent = formatClock(duration);
  });
}

function formatClock(seconds) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

function musicElement() {
  return document.querySelector('#music-track');
}

function createTurn() {
  const rng = state.playMode === 'daily' ? dailyRngForRoll(state.dailyRollIndex++) : Math.random;
  const rollem = randomInt(1, 9, rng);
  const rollem2 = randomInt(1, 6, rng);
  const card = drawCard(rng);
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
    verdict = `That's money. 6 or under gets paid x9 for ${finalScore}.`;
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

function intelTab(key, label) {
  return `<button type="button" class="${state.intelView === key ? 'active' : ''}" data-action="intel" data-intel="${key}" aria-pressed="${state.intelView === key}">${label}</button>`;
}

function mobileTableTray(adultMode, playerRank, heatLevel) {
  return `
    <aside class="mobile-table-tray" aria-label="Table controls" aria-hidden="${state.mobileTray !== 'table'}">
      <header>
        <div>
          <span>Control booth</span>
          <strong>Set the chaos.</strong>
        </div>
        <button type="button" class="tray-close" data-action="close-tray" aria-label="Close table controls" title="Close table controls">&times;</button>
      </header>
      <div class="table-control-grid">
        <button type="button" data-action="sound"><span>Sound</span><strong>${state.muted ? 'Off' : 'On'}</strong></button>
        <button type="button" data-action="tone-mode"><span>Language</span><strong>${adultMode ? 'Adult' : 'PG'}</strong></button>
        <button type="button" data-action="daily" class="${state.playMode === 'daily' ? 'active' : ''}"><span>Mode</span><strong>${state.playMode === 'daily' ? 'Riot' : 'Free'}</strong></button>
        <button type="button" data-action="open-intel" data-intel="progress"><span>Skin</span><strong>${skinByKey(state.skin).short}</strong></button>
        <button type="button" data-action="open-intel" data-intel="leaders"><span>Board</span><strong>Leaders</strong></button>
        <button type="button" data-action="reset"><span>Session</span><strong>Reset</strong></button>
      </div>
      <div class="table-tray-stats">
        <div><span>Rank</span><strong>${playerRank.current.name}</strong></div>
        <div><span>Vibe</span><strong>${heatLevel}</strong></div>
        <div><span>Bankroll</span><strong>${formatNumber(state.stats.bankroll)}</strong></div>
        <div><span>Skin</span><strong>${skinByKey(state.skin).name}</strong></div>
      </div>
      <p>Fictional chips only. No cash value.</p>
    </aside>
  `;
}

function endGameCurtain(current, gameWon, gameLost) {
  if ((!gameWon && !gameLost) || state.endScreenDismissed) {
    return '';
  }

  const perfect = gameWon && isPerfectNineSix(current);
  const tone = gameLost ? 'walkout' : perfect ? 'jackpot' : 'exact';
  const kicker = gameLost ? 'Four BOOFBALLS' : perfect ? 'Perfect 9 / 6 / Q' : 'Exact bank';
  const title = gameLost ? 'WALK THE FUCK OUT' : perfect ? 'NINE SIX BITCH' : 'BANK 96';
  const body = gameLost
    ? `The rack spells BOOF. Session over at bank ${state.totalScore}.`
    : perfect
      ? 'Nine die. Six die. Queen. The whole table belongs to you.'
      : `Exact 96 in ${state.round} turns. No overshoot. No apology.`;

  return `
    <section class="end-game-curtain ${tone}" role="dialog" aria-modal="true" aria-label="${displayCopy(title)}">
      <div class="curtain-rays" aria-hidden="true"></div>
      <div class="curtain-confetti" aria-hidden="true">
        ${Array.from({ length: 18 }, (_, index) => `<i style="--i:${index}"></i>`).join('')}
      </div>
      <div class="curtain-content">
        <span>${displayCopy(kicker)}</span>
        <div class="curtain-mark" aria-hidden="true">${gameLost ? '<b>B</b><b>O</b><b>O</b><b>F</b>' : '<b>9</b><b>6</b>'}</div>
        <strong>${displayCopy(title)}</strong>
        <p>${displayCopy(body)}</p>
        <div class="curtain-actions">
          <button type="button" class="primary-action" data-action="reset">Run it back</button>
          <button type="button" data-action="share">Share the damage</button>
          <button type="button" data-action="dismiss-end">See the table</button>
        </div>
      </div>
    </section>
  `;
}

function viralConsole(current) {
  const rank = rankForXp(state.stats.xp);
  const nextRank = RANKS[rank.index + 1];
  const rankProgress = nextRank
    ? Math.min(100, Math.round(((state.stats.xp - rank.current.minXp) / (nextRank.minXp - rank.current.minXp)) * 100))
    : 100;
  const today = dailyLabel();
  const dailyBest = state.stats.daily?.date === today ? state.stats.daily.bestBank : 0;

  return `
    <section class="viral-console" aria-label="NINE SIX viral console">
      <article class="feature-card daily-card intel-card intel-daily ${state.intelView === 'daily' ? 'active' : ''}">
        <header>
          <span>Daily Riot</span>
          <strong>${state.playMode === 'daily' ? 'Live seed' : 'Tap Daily'}</strong>
        </header>
        <p>Everybody gets the same ${today} roll stream. Same chaos. Same odds. Share the damage.</p>
        <div class="daily-code">${state.dailySeed}</div>
        <dl>
          <div><dt>Mode</dt><dd>${state.playMode === 'daily' ? 'Daily' : 'Free'}</dd></div>
          <div><dt>Daily best</dt><dd>${dailyBest}</dd></div>
          <div><dt>Runs</dt><dd>${state.stats.daily?.plays ?? 0}</dd></div>
        </dl>
      </article>

      <article class="feature-card odds-card intel-card intel-odds ${state.intelView === 'odds' ? 'active' : ''}">
        <header>
          <span>Odds / Fairness</span>
          <strong>${ODDS.perfectPercent}</strong>
        </header>
        <div class="odds-grid">
          <b><span>Perfect 9, 6, Q</span>${ODDS.perfect}</b>
          <b><span>BOOFBALL hand</span>${ODDS.boofballPercent}</b>
          <b><span>Session win</span>${ODDS.sessionWinPercent}</b>
          <b><span>Avg session</span>${ODDS.averageTurns} turns</b>
        </div>
        <p>${ODDS.anteWarning} Expected payout at this table is ${ODDS.expectedPayout}, so this is not real-money economics.</p>
      </article>

      <article class="feature-card progress-card intel-card intel-progress ${state.intelView === 'progress' ? 'active' : ''}">
        <header>
          <span>Fragrance Archive / 90s collection</span>
          <strong>${skinByKey(state.skin).name}</strong>
        </header>
        <div class="locker-rank-line">
          <div>
            <span>Table rank</span>
            <strong>${rank.current.name}</strong>
          </div>
          <div>
            <span>Fictional bankroll</span>
            <strong>${formatNumber(state.stats.bankroll)}</strong>
          </div>
        </div>
        <div class="rank-meter"><i style="width: ${rankProgress}%"></i></div>
        <small>${nextRank ? `${nextRank.minXp - state.stats.xp} XP to ${nextRank.name}` : 'Top table unlocked'}</small>
        ${skinLocker()}
        <div class="unlock-row">
          ${UNLOCKS.map((unlock) => `<span class="${state.stats.xp >= unlock.at ? 'unlocked' : ''}">${unlock.label}</span>`).join('')}
        </div>
        <button type="button" data-action="install">Install game</button>
      </article>

      ${leaderboardCard()}
    </section>
  `;
}

function skinLocker() {
  return `
    <div class="skin-locker" aria-label="Table skin selection">
      <div class="skin-grid">
        ${SKINS.map((skin) => `
          <button type="button" class="skin-option ${state.skin === skin.key ? 'active' : ''}" data-action="skin" data-skin="${skin.key}" aria-pressed="${state.skin === skin.key}" title="${skin.note}">
            <span class="skin-swatch" aria-hidden="true">
              ${skin.swatches.map((color) => `<i style="background:${color}"></i>`).join('')}
            </span>
            <span class="skin-name">
              <strong>${skin.name}</strong>
              <small>${skin.note}</small>
            </span>
            <b aria-hidden="true">${state.skin === skin.key ? 'ON' : ''}</b>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function leaderboardCard() {
  const entries = state.leaderboard.slice(0, 10);

  return `
    <article class="feature-card leaders-card intel-card intel-leaders ${state.intelView === 'leaders' ? 'active' : ''}">
      <header>
        <span>Table Legends / this device</span>
        <strong>${entries.length ? `Top ${entries.length}` : 'Open board'}</strong>
      </header>
      <div class="leader-identity">
        <label>
          <span>Your table name</span>
          <input type="text" data-action="player-name" value="${escapeHtml(state.playerName)}" maxlength="16" autocomplete="nickname" spellcheck="false" aria-label="Leaderboard table name">
        </label>
        <p>Wins rank first: perfect hands, then fewer turns and fewer BOOFBALLS. Walkouts rank by highest bank.</p>
      </div>
      ${entries.length ? `
        <div class="leaderboard-frame">
          <table>
            <thead>
              <tr><th>#</th><th>Player</th><th>Result</th><th>Turns</th><th>Bank</th></tr>
            </thead>
            <tbody>
              ${entries.map((entry, index) => leaderboardRow(entry, index)).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="leaderboard-empty">
          <strong>The board is clean.</strong>
          <span>Finish at exact 96 or take the BOOF walk to post the first run.</span>
        </div>
      `}
      <small>Local standings only. A verified global board needs accounts and a hosted score service.</small>
    </article>
  `;
}

function leaderboardRow(entry, index) {
  const result = entry.result === 'win'
    ? entry.perfect ? '9 / 6 / Q' : 'EXACT 96'
    : 'WALKOUT';

  return `
    <tr class="leader-${entry.result}">
      <td><b>${index + 1}</b></td>
      <td>
        <strong>${escapeHtml(entry.playerName)}</strong>
        <span>${skinByKey(entry.skin).short} / ${entry.mode === 'daily' ? 'Daily' : 'Free'}</span>
      </td>
      <td><i>${result}</i></td>
      <td>${entry.turns}</td>
      <td>${entry.bank}</td>
    </tr>
  `;
}

function shareCard(current, gameWon, gameLost) {
  const shareable = shareMomentForTurn(current, gameWon, gameLost);
  if (!shareable && !state.shareNotice) {
    return '';
  }

  return `
    <section class="share-card ${shareable?.tone ?? 'quiet'}" aria-live="polite">
      <div>
        <span>${state.shareNotice ? 'Share status' : 'Share card'}</span>
        <strong>${state.shareNotice || shareable.title}</strong>
        ${shareable ? `<p>${shareable.body}</p>` : ''}
      </div>
      ${shareable ? '<button type="button" data-action="share">Share</button>' : ''}
    </section>
  `;
}

function shareMomentForTurn(current, gameWon, gameLost) {
  if (!current || current.phase !== 'settled') {
    return null;
  }

  if (isPerfectNineSix(current)) {
    return {
      tone: 'jackpot',
      title: 'Perfect NINE SIX',
      body: `[${current.rollList.join(', ')}] on ${state.playMode === 'daily' ? state.dailySeed : 'Free Play'}.`
    };
  }

  if (gameWon && current.exactWin) {
    return {
      tone: 'exact',
      title: 'Bank hit exact 96',
      body: `${state.round} turns, ${state.boofballs}/${BOOFBALL_LIMIT} BOOFBALLS, fictional bankroll ${formatNumber(state.stats.bankroll)}.`
    };
  }

  if (gameLost) {
    return {
      tone: 'walkout',
      title: 'BOOF walk-out',
      body: `Four BOOFBALLS ended the table at bank ${state.totalScore}.`
    };
  }

  if ((current.handScore ?? current.finalScore) >= 45) {
    return {
      tone: 'monster',
      title: 'Monster x9 hand',
      body: `[${current.rollList.join(', ')}] paid ${current.tablePayout} fictional chips.`
    };
  }

  if (current.targetHits >= 2) {
    return {
      tone: 'near',
      title: 'One piece away',
      body: `${current.targetLabels.join(' + ')} landed. The table wanted the third piece.`
    };
  }

  return null;
}

function idleHype() {
  return {
    tone: 'idle',
    kicker: 'Mic check',
    title: 'D9. D6. Queen.',
    body: 'Hit the button and wake the whole damn screen up.',
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

function randomInt(min, max, rng = Math.random) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function spinValue(item) {
  return item.type === 'card' ? drawCard() : randomInt(1, item.sides);
}

function drawCard(rng = Math.random) {
  const rankIndex = randomInt(0, cardRanks.length - 1, rng);
  const suit = cardSuits[randomInt(0, cardSuits.length - 1, rng)];
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

function vibrateForTurn(turn) {
  if (!navigator.vibrate || state.muted) {
    return;
  }

  if (isPerfectNineSix(turn)) {
    navigator.vibrate([80, 50, 80, 50, 160]);
  } else if (turn.exactWin) {
    navigator.vibrate([70, 40, 120]);
  } else if (turn.walkOut || turn.bankBust) {
    navigator.vibrate([120, 80, 120]);
  } else if (turn.boofballHit) {
    navigator.vibrate([90, 50, 90]);
  } else if ((turn.handScore ?? turn.finalScore) >= 45) {
    navigator.vibrate([45, 35, 90]);
  }
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

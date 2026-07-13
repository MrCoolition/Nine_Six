import { createPartyAuth } from './auth-client.js';
import { createDemoPartyBackend } from './demo-backend.js';
import { getPartyConfig, hydratePartyConfig } from './party-config.js';
import {
  normalizePartyPresentationMode,
  PARTY_PAYOFF_HOLD_MS,
  PARTY_PRESENTATION_STORAGE_KEY,
  PARTY_REVEAL_DURATION_MS,
  partyEventKey,
  partyOutcomeCopy,
  partyRevealStages,
  partySpinValue
} from './party-presentation.js';
import { createSupabasePartyBackend } from './supabase-backend.js';

const STAKES = [25, 50, 100, 250];
const BOOF_LETTERS = ['B', 'O', 'O', 'F'];
const TAUNTS = [
  'PAY THE TABLE.',
  'THAT BANK LOOKS NERVOUS.',
  'BOOF IS CALLING.',
  'ROLL IT, COWARD.',
  'I OWN THIS FELT.'
];

export function createPartyController({ root, onExit, presentationEffects = {} }) {
  const config = getPartyConfig();
  const auth = createPartyAuth(config);
  const state = {
    open: false,
    view: 'gate',
    busy: false,
    error: '',
    notice: '',
    session: null,
    backend: null,
    lobby: null,
    sharedLeaderboard: null,
    table: null,
    createOpen: false,
    chatOpen: false,
    quickStake: 25,
    quickTone: 'adult',
    lockDeadline: 0,
    lockSignature: '',
    startTriggered: false,
    timeoutAdvancing: false,
    botPending: false,
    typing: null,
    mutedSubjects: new Set(),
    lastClockSecond: -1,
    actionTimes: new Map(),
    presentationMode: loadPresentationMode(),
    presentation: null,
    presentationToken: 0,
    latestHandKey: '',
    fastRevealKey: '',
    fastRevealTimer: null
  };
  let unsubscribe = null;
  let ticker = null;
  let typingTimer = null;

  root.addEventListener('click', handleClick);
  root.addEventListener('submit', handleSubmit);
  root.addEventListener('change', handleChange);
  root.addEventListener('input', handleInput);
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return {
    get open() {
      return state.open;
    },

    async open() {
      if (!config.enabled) return;
      state.open = true;
      state.view = 'loading';
      state.error = '';
      root.hidden = false;
      document.body.classList.add('party-active');
      setPartyUrl(true);
      render();
      startTicker();

      try {
        await hydratePartyConfig(config);
        state.sharedLeaderboard = await loadSharedLeaderboard();
        state.session = await auth.init();
        if (state.session && config.backendConfigured) {
          await connectLiveParty();
          return;
        }
      } catch (error) {
        state.error = cleanError(error);
      }

      state.view = 'gate';
      render();
    },

    close() {
      closeParty();
    },

    shouldOpenFromUrl() {
      return new URLSearchParams(window.location.search).get('party') === '1';
    }
  };

  async function connectLiveParty() {
    state.backend = createSupabasePartyBackend({ config, auth, session: state.session });
    state.lobby = await state.backend.bootstrap();
    state.view = 'lobby';
    state.notice = 'Community connection secured.';
    render();
  }

  async function connectPreview() {
    state.backend = createDemoPartyBackend();
    state.session = state.backend.session;
    state.lobby = await state.backend.bootstrap();
    state.sharedLeaderboard = await loadSharedLeaderboard();
    state.view = 'lobby';
    state.notice = 'Preview table. Results stay on this device.';
    render();
  }

  async function loadSharedLeaderboard() {
    if (!config.sharedLeaderboardConfigured) return null;
    try {
      const response = await fetch('/api/community/leaderboard?metric=wins&limit=20', {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      if (!response.ok) return null;
      const payload = await response.json();
      return payload.connected ? payload : null;
    } catch {
      return null;
    }
  }

  function closeParty() {
    cancelPresentation();
    unsubscribe?.();
    unsubscribe = null;
    window.clearInterval(ticker);
    ticker = null;
    window.clearTimeout(typingTimer);
    state.open = false;
    state.chatOpen = false;
    state.table = null;
    state.lockDeadline = 0;
    state.latestHandKey = '';
    root.hidden = true;
    root.innerHTML = '';
    document.body.classList.remove('party-active', 'party-chat-open');
    setPartyUrl(false);
    onExit?.();
  }

  async function handleClick(event) {
    const button = event.target.closest('[data-party-action]');
    if (!button || !root.contains(button)) return;
    event.preventDefault();
    const action = button.dataset.partyAction;
    const actionKey = [action, button.dataset.mode, button.dataset.roomId, button.dataset.messageId, button.dataset.subject].filter(Boolean).join(':');
    if (!acceptAction(actionKey)) return;
    if (state.busy && !['close', 'chat-toggle', 'presentation-mode', 'presentation-skip'].includes(action)) return;

    if (action === 'close') return closeParty();
    if (action === 'presentation-mode') {
      setPresentationMode(button.dataset.mode);
      return;
    }
    if (action === 'presentation-skip') {
      cancelPresentation();
      render();
      scheduleBot();
      return;
    }
    if (action === 'chat-toggle') {
      state.chatOpen = !state.chatOpen;
      document.body.classList.toggle('party-chat-open', state.chatOpen);
      render();
      return;
    }
    if (action === 'create-toggle') {
      state.createOpen = !state.createOpen;
      render();
      return;
    }
    if (action === 'sign-in') {
      return run(async () => auth.login(`${window.location.pathname}?party=1`), { renderAfter: false });
    }
    if (action === 'sign-out') return run(() => auth.logout(), { renderAfter: false });
    if (action === 'preview') return run(connectPreview);
    if (action === 'lobby') return run(returnToLobby);
    if (action === 'quick-match') {
      return run(async () => enterRoom(await state.backend.quickMatch({ stake: state.quickStake, tone: state.quickTone })));
    }
    if (action === 'join-room') {
      return run(async () => enterRoom(await state.backend.joinRoom(button.dataset.roomId)));
    }
    if (action === 'ready') {
      const member = myMember();
      return run(async () => {
        await state.backend.setReady(state.table.room.id, !member?.ready);
        await refreshRoom();
      });
    }
    if (action === 'add-bot') {
      return run(async () => applyRoom(await state.backend.addBots()));
    }
    if (action === 'roll') {
      if (!isMyTurn()) return;
      cancelPresentation();
      return run(async () => {
        await state.backend.takeTurn(state.table.match.id, crypto.randomUUID());
        if (state.backend.kind !== 'demo') await refreshRoom();
      });
    }
    if (action === 'forfeit') {
      return run(async () => {
        await state.backend.forfeitMatch(state.table.match.id);
        if (state.backend.kind !== 'demo') await refreshRoom();
      });
    }
    if (action === 'leave') {
      return run(async () => {
        await state.backend.leaveRoom(state.table.room.id);
        await returnToLobby();
      });
    }
    if (action === 'rematch') return run(() => rematch(state.table.room.stake));
    if (action === 'double') {
      const nextStake = STAKES.find((stake) => stake > Number(state.table.room.stake));
      return run(() => rematch(nextStake || STAKES.at(-1)));
    }
    if (action === 'rescue') {
      return run(async () => {
        await state.backend.claimDailyRescue();
        state.lobby = await state.backend.loadLobby();
        state.notice = 'Daily rescue landed: +96 fictional chips.';
      });
    }
    if (action === 'taunt') {
      return run(async () => {
        await state.backend.sendMessage(state.table.room.id, '', 'taunt', button.dataset.tauntKey);
        if (state.backend.kind !== 'demo') await refreshRoom();
      }, { quiet: true });
    }
    if (action === 'report') {
      return run(async () => {
        await state.backend.reportMessage(button.dataset.messageId, 'table-conduct');
        state.notice = 'Message sent to the house for review.';
      }, { quiet: true });
    }
    if (action === 'mute') {
      const subject = button.dataset.subject;
      if (state.mutedSubjects.has(subject)) state.mutedSubjects.delete(subject);
      else state.mutedSubjects.add(subject);
      render();
    }
  }

  async function handleSubmit(event) {
    const form = event.target.closest('[data-party-form]');
    if (!form || !root.contains(form)) return;
    event.preventDefault();
    if (!acceptAction(`form:${form.dataset.partyForm}`)) return;
    const values = new FormData(form);

    if (form.dataset.partyForm === 'create') {
      return run(async () => {
        const result = await state.backend.createRoom({
          name: String(values.get('name') || '').trim().slice(0, 28),
          visibility: values.get('visibility') === 'private' ? 'private' : 'public',
          tone: values.get('tone') === 'pg' ? 'pg' : 'adult',
          maxSeats: clamp(Number(values.get('capacity')), 2, 9),
          stake: normalizeStake(values.get('stake'))
        });
        state.createOpen = false;
        await enterRoom(result);
      });
    }

    if (form.dataset.partyForm === 'join-code') {
      return run(async () => {
        const code = String(values.get('code') || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
        if (code.length !== 6) throw new Error('Private codes are six characters.');
        await enterRoom(await state.backend.joinRoom(null, code));
      });
    }

    if (form.dataset.partyForm === 'chat') {
      const input = form.elements.message;
      const body = String(input.value || '').trim();
      if (!body) return;
      input.value = '';
      await run(async () => {
        await state.backend.sendMessage(state.table.room.id, body);
        await state.backend.sendTyping(state.table.room.id, false);
        if (state.backend.kind !== 'demo') await refreshRoom();
      }, { quiet: true, preserveFocus: true });
    }
  }

  function handleChange(event) {
    const input = event.target;
    if (!root.contains(input)) return;
    if (input.name === 'quick-stake') {
      state.quickStake = normalizeStake(input.value);
      render();
    }
    if (input.name === 'quick-tone') {
      state.quickTone = input.value === 'pg' ? 'pg' : 'adult';
      render();
    }
  }

  function handleInput(event) {
    const input = event.target;
    if (!root.contains(input) || input.name !== 'message' || !state.table?.room) return;
    window.clearTimeout(typingTimer);
    state.backend?.sendTyping(state.table.room.id, true).catch(() => {});
    typingTimer = window.setTimeout(() => state.backend?.sendTyping(state.table.room.id, false).catch(() => {}), 900);
  }

  function handleKeydown(event) {
    if (!state.open || event.key !== 'Escape') return;
    if (state.chatOpen) {
      state.chatOpen = false;
      document.body.classList.remove('party-chat-open');
      render();
      return;
    }
    closeParty();
  }

  function handleVisibilityChange() {
    if (!state.open || document.visibilityState === 'visible') return;
    cancelPresentation();
    if (!root.hidden) render();
  }

  function acceptAction(key) {
    const now = Date.now();
    const previous = state.actionTimes.get(key) || 0;
    if (now - previous < 650) return false;
    state.actionTimes.set(key, now);
    if (state.actionTimes.size > 40) {
      for (const [name, time] of state.actionTimes) {
        if (now - time > 5000) state.actionTimes.delete(name);
      }
    }
    return true;
  }

  async function run(task, { quiet = false, renderAfter = true, preserveFocus = false } = {}) {
    if (state.busy) return;
    state.busy = true;
    state.error = '';
    if (!preserveFocus) render();
    try {
      await task();
    } catch (error) {
      state.error = cleanError(error);
      if (!quiet) state.notice = '';
    } finally {
      state.busy = false;
      if (renderAfter) render();
    }
  }

  async function enterRoom(table) {
    cancelPresentation();
    unsubscribe?.();
    state.table = table;
    state.view = 'room';
    state.lockDeadline = 0;
    state.lockSignature = '';
    state.startTriggered = false;
    state.chatOpen = false;
    state.latestHandKey = partyEventKey(latestHandFromTable(table));
    unsubscribe = state.backend.subscribeRoom(table.room.id, (next, error) => {
      if (error) {
        state.error = cleanError(error);
        render();
        return;
      }
      if (next?.typing) {
        state.typing = next.typing.typing ? next.typing : null;
        updateTyping();
        return;
      }
      if (next) applyRoom(next);
    });
    render();
    scheduleBot();
  }

  function applyRoom(table) {
    if (!table) return;
    const previousTable = state.table;
    const latest = latestHandFromTable(table);
    const latestKey = partyEventKey(latest);
    const isNewHand = Boolean(latestKey && latestKey !== state.latestHandKey);
    state.table = table;
    if (!latestKey && table.room.status === 'open') state.latestHandKey = '';
    else if (latestKey) state.latestHandKey = latestKey;
    if (table.room.status !== 'open') {
      state.lockDeadline = 0;
      state.startTriggered = false;
    }
    if (isNewHand) {
      if (state.presentationMode === 'dramatic') beginDramaticPresentation(latest, previousTable);
      else showFastPresentation(latest);
      return;
    }
    render();
    scheduleBot();
  }

  function setPresentationMode(value) {
    const nextMode = normalizePartyPresentationMode(value);
    if (nextMode === state.presentationMode) return;
    state.presentationMode = nextMode;
    try {
      localStorage.setItem(PARTY_PRESENTATION_STORAGE_KEY, nextMode);
    } catch {}
    cancelPresentation();
    render();
    scheduleBot();
  }

  function cancelPresentation() {
    state.presentationToken += 1;
    state.presentation = null;
    state.fastRevealKey = '';
    window.clearTimeout(state.fastRevealTimer);
    state.fastRevealTimer = null;
    presentationEffects.stop?.();
  }

  function showFastPresentation(event) {
    cancelPresentation();
    const eventKey = partyEventKey(event);
    state.fastRevealKey = eventKey;
    presentationEffects.playOutcome?.(event.payload || {}, state.table?.room?.tone);
    presentationEffects.vibrate?.(event.payload || {});
    render();
    state.fastRevealTimer = window.setTimeout(() => {
      if (state.fastRevealKey !== eventKey) return;
      state.fastRevealKey = '';
      state.fastRevealTimer = null;
      render();
    }, 900);
    scheduleBot();
  }

  async function beginDramaticPresentation(event, previousTable) {
    cancelPresentation();
    const token = state.presentationToken;
    const hand = event.payload || {};
    const stages = partyRevealStages(hand);
    state.presentation = {
      active: true,
      event,
      hand,
      stage: 'house-call',
      stageLabel: 'THE HAND IS IN',
      display: { d9: '-', d6: '-', card_rank: '-' },
      locked: [],
      outcome: null,
      playersBefore: (previousTable?.players || state.table?.players || []).map((player) => ({ ...player })),
      matchBefore: previousTable?.match ? { ...previousTable.match } : state.table?.match ? { ...state.table.match } : null
    };
    render();
    await waitForPresentation(260, token);

    for (const stage of stages) {
      if (!presentationIsCurrent(token)) return;
      state.presentation.stage = stage.key;
      state.presentation.stageLabel = stage.label;
      state.presentation.display[stage.key] = partySpinValue(stage);
      presentationEffects.playReveal?.(stage.kind, stage.key);
      render();
      await animatePartyStage(stage, token);
      if (!presentationIsCurrent(token)) return;
      state.presentation.display[stage.key] = stage.finalValue;
      state.presentation.locked.push(stage.key);
      render();
    }

    if (!presentationIsCurrent(token)) return;
    state.presentation.stage = 'payoff';
    state.presentation.stageLabel = 'HAND SETTLED';
    state.presentation.outcome = partyOutcomeCopy(hand, state.table?.room?.tone);
    presentationEffects.playOutcome?.(hand, state.table?.room?.tone);
    presentationEffects.vibrate?.(hand);
    render();
    await waitForPresentation(PARTY_PAYOFF_HOLD_MS, token);
    if (!presentationIsCurrent(token)) return;
    state.presentation = null;
    render();
    scheduleBot();
  }

  async function animatePartyStage(stage, token) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < PARTY_REVEAL_DURATION_MS) {
      await waitForPresentation(96, token);
      if (!presentationIsCurrent(token)) return;
      const value = partySpinValue(stage);
      state.presentation.display[stage.key] = value;
      const node = root.querySelector(`[data-party-reveal-value="${stage.key}"]`);
      if (node) node.textContent = String(value);
    }
  }

  function presentationIsCurrent(token) {
    return state.open && state.presentation?.active && state.presentationToken === token && document.visibilityState === 'visible';
  }

  function waitForPresentation(milliseconds, token) {
    return new Promise((resolve) => {
      window.setTimeout(() => resolve(state.presentationToken === token), milliseconds);
    });
  }

  async function refreshRoom() {
    if (!state.table?.room) return;
    applyRoom(await state.backend.loadRoom(state.table.room.id));
  }

  async function returnToLobby() {
    unsubscribe?.();
    unsubscribe = null;
    state.table = null;
    state.view = 'lobby';
    state.chatOpen = false;
    state.lobby = await state.backend.loadLobby();
    render();
  }

  async function rematch(stake) {
    applyRoom(await state.backend.proposeRematch(state.table.room.id, stake));
  }

  function startTicker() {
    window.clearInterval(ticker);
    ticker = window.setInterval(() => {
      if (!state.open || state.view !== 'room' || !state.table) return;
      updateClocks();
      driveLockIn();
      driveTurnTimeout();
      scheduleBot();
    }, 250);
  }

  function driveLockIn() {
    if (state.table.room.status !== 'open' || state.table.match) return;
    const ready = state.table.members.filter((member) => member.ready);
    const signature = ready.map((member) => member.auth_subject).sort().join('|');
    if (ready.length < 2) {
      if (state.lockDeadline) {
        state.lockDeadline = 0;
        state.lockSignature = '';
        render();
      }
      return;
    }
    const serverLock = new Date(state.table.room.lock_at || 0).getTime();
    if (!state.lockDeadline || signature !== state.lockSignature || (serverLock > 0 && state.lockDeadline !== serverLock)) {
      state.lockDeadline = serverLock > 0 ? serverLock : Date.now() + 5000;
      state.lockSignature = signature;
      state.startTriggered = false;
      render();
      return;
    }
    if (Date.now() < state.lockDeadline || state.startTriggered) return;
    state.startTriggered = true;
    run(async () => {
      try {
        await state.backend.startMatch(state.table.room.id);
      } finally {
        if (state.backend.kind !== 'demo') await refreshRoom();
      }
    }, { quiet: true });
  }

  function driveTurnTimeout() {
    const match = state.table.match;
    if (!match || match.status !== 'active' || state.timeoutAdvancing) return;
    if (Date.now() < new Date(match.turn_deadline).getTime()) return;
    state.timeoutAdvancing = true;
    state.backend.advanceTimeout(match.id)
      .then(() => state.backend.kind === 'demo' ? null : refreshRoom())
      .catch((error) => { state.error = cleanError(error); })
      .finally(() => {
        state.timeoutAdvancing = false;
        render();
      });
  }

  function scheduleBot() {
    if (state.backend?.kind !== 'demo' || state.botPending || state.presentation?.active) return;
    const actor = activePlayer();
    if (!actor?.is_bot || state.table?.match?.status !== 'active') return;
    state.botPending = true;
    window.setTimeout(async () => {
      try {
        await state.backend.takeBotTurn();
      } catch (error) {
        state.error = cleanError(error);
      } finally {
        state.botPending = false;
        scheduleBot();
      }
    }, 1050);
  }

  function updateClocks() {
    const match = state.table?.match;
    const turnSeconds = match?.status === 'active'
      ? Math.max(0, Math.ceil((new Date(match.turn_deadline).getTime() - Date.now()) / 1000))
      : 0;
    const lockSeconds = state.lockDeadline ? Math.max(0, Math.ceil((state.lockDeadline - Date.now()) / 1000)) : 0;
    root.querySelectorAll('[data-party-clock]').forEach((node) => {
      node.textContent = String(turnSeconds).padStart(2, '0');
      node.closest('.party-clock')?.classList.toggle('warning', turnSeconds <= 10);
      node.closest('.party-clock')?.style.setProperty('--clock-progress', `${Math.max(0, Math.min(100, turnSeconds * 5))}%`);
    });
    root.querySelectorAll('[data-lock-clock]').forEach((node) => { node.textContent = String(lockSeconds); });
    state.lastClockSecond = turnSeconds;
  }

  function updateTyping() {
    const node = root.querySelector('[data-party-typing]');
    if (!node) return;
    const subject = state.typing?.subject;
    const member = state.table?.members.find((item) => item.auth_subject === subject);
    node.textContent = member && subject !== state.session?.subject ? `${member.handle} is typing...` : '';
  }

  function render() {
    if (!state.open) return;
    document.body.classList.toggle('party-chat-open', state.chatOpen);
    if (state.view === 'loading') root.innerHTML = loadingView();
    else if (state.view === 'gate') root.innerHTML = gateView();
    else if (state.view === 'lobby') root.innerHTML = lobbyView();
    else root.innerHTML = roomView();
    updateClocks();
    updateTyping();
  }

  function loadingView() {
    return partyShell(`
      <main class="party-loading" aria-live="polite">
        <div class="party-spinner" aria-hidden="true"><i>9</i><i>6</i></div>
        <strong>Opening the back room</strong>
        <span>Securing your seat...</span>
      </main>
    `);
  }

  function gateView() {
    const sharedLive = Boolean(state.sharedLeaderboard?.connected);
    const status = !config.authConfigured
      ? `${sharedLive ? 'Neon standings are live. ' : ''}Auth0 needs a domain, SPA client ID, and API audience.`
      : !config.backendConfigured
        ? `${sharedLive ? 'Neon standings are live. ' : ''}Authenticated Party match writes are still locked.`
        : 'Sign in to take a community seat.';
    return partyShell(`
      <main class="party-gate">
        <section class="party-gate-copy">
          <p class="party-kicker">NINE SIX / PARTY TABLES</p>
          <h1>Take the table.</h1>
          <p>Two to nine players. One locked pot. First to exact 96, perfect 9 / 6 / Q, or last player standing takes it.</p>
          <div class="party-rule-line" aria-label="Party rules">
            <span>20 sec turns</span><span>4 BOOFBALL walk</span><span>Fictional chips only</span>
          </div>
        </section>
        <section class="party-auth-panel" aria-label="Party sign in">
          <span class="party-panel-label">COMMUNITY ACCESS</span>
          <h2>Bring your name. Bring your mouth.</h2>
          <p>${escapeHtml(status)}</p>
          ${feedback()}
          <button class="party-primary" type="button" data-party-action="sign-in" ${!config.authConfigured || state.busy ? 'disabled' : ''}>Sign in with Auth0</button>
          ${config.demoEnabled ? '<button type="button" data-party-action="preview" ' + (state.busy ? 'disabled' : '') + '>Preview a local table</button>' : ''}
          <small>Preview opponents are simulated. No global stats or community chips are written.</small>
        </section>
      </main>
    `, { gate: true });
  }

  function lobbyView() {
    const profile = state.lobby?.profile || {};
    const rooms = state.lobby?.rooms || [];
    const shared = state.sharedLeaderboard;
    const leaders = shared?.connected ? shared.leaders || [] : state.lobby?.leaders || [];
    const standingsLabel = shared?.connected ? 'NEON SHARED STANDINGS' : 'PREVIEW STANDINGS';
    const standingsFooter = shared?.connected
      ? `${formatNumber(shared.summary?.players)} players / ${formatNumber(shared.summary?.matches)} matches / biggest pot ${formatNumber(shared.summary?.biggestPot)}`
      : 'Preview names stay on this device and never enter the shared board.';
    return partyShell(`
      <main class="party-lobby">
        <section class="party-lobby-head">
          <div>
            <p class="party-kicker">COMMUNITY FLOOR</p>
            <h1>Pick a fight.</h1>
          </div>
          <div class="party-bankroll">
            <span>FICTIONAL BANKROLL</span>
            <strong>${formatNumber(profile.bankroll ?? 0)}</strong>
            <small>chips / no cash value</small>
          </div>
          ${Number(profile.bankroll) < 96 ? '<button type="button" data-party-action="rescue">Claim +96 rescue</button>' : ''}
        </section>
        ${feedback()}

        <section class="party-quick-strip" aria-label="Quick match">
          <header><span>QUICK MATCH</span><strong>Find a public table</strong></header>
          <fieldset class="party-segments"><legend>Stake</legend>${stakeRadios('quick-stake', state.quickStake)}</fieldset>
          <fieldset class="party-segments"><legend>Tone</legend>${toneRadios('quick-tone', state.quickTone)}</fieldset>
          <button class="party-primary" type="button" data-party-action="quick-match" ${state.busy ? 'disabled' : ''}>Find my seat</button>
        </section>

        <div class="party-lobby-grid">
          <section class="party-table-browser">
            <header class="party-section-head">
              <div><span>LIVE TABLES</span><h2>Open seats</h2></div>
              <button type="button" data-party-action="create-toggle">${state.createOpen ? 'Cancel' : 'Create table'}</button>
            </header>
            ${state.createOpen ? createTableForm() : ''}
            <form class="party-code-form" data-party-form="join-code">
              <label><span>PRIVATE CODE</span><input name="code" maxlength="6" autocomplete="off" placeholder="96XXXX" aria-label="Private table code"></label>
              <button type="submit">Enter</button>
            </form>
            <div class="party-room-list">
              ${rooms.length ? rooms.map(roomListing).join('') : '<p class="party-empty">No public tables are open. Start one.</p>'}
            </div>
          </section>

          <aside class="party-standings">
            <header class="party-section-head"><div><span>${standingsLabel}</span><h2>${shared?.connected ? 'The board' : 'House names'}</h2></div></header>
            <div class="party-leader-head"><span># / Player</span><span>Wins</span><span>9/6/Q</span></div>
            ${leaders.map((leader, index) => `
              <div class="party-leader-row">
                <span><b>${index + 1}</b>${avatar(leader.handle)}<strong>${escapeHtml(leader.handle)}</strong></span>
                <b>${formatNumber(leader.wins)}</b><b>${formatNumber(leader.perfects)}</b>
              </div>
            `).join('') || `<p class="party-empty">${shared?.connected ? 'Connected. First verified Party win takes number one.' : 'The preview board is waiting.'}</p>`}
            <footer>${standingsFooter}</footer>
          </aside>
        </div>
      </main>
    `);
  }

  function roomView() {
    const table = state.table;
    const room = table.room;
    const match = table.match;
    const open = room.status === 'open' && !match;
    const active = match?.status === 'active';
    const finished = match?.status === 'finished' || room.status === 'finished';
    const readyCount = table.members.filter((member) => member.ready).length;
    const actor = activePlayer();
    const latest = latestHandEvent();
    const presenting = Boolean(state.presentation?.active);
    const seatPlayers = presenting ? state.presentation.playersBefore : table.players;
    const seatMatch = presenting ? state.presentation.matchBefore : match;
    const winner = finished ? table.players.find((player) => player.auth_subject === match?.winner_subject) : null;
    return partyShell(`
      <main class="party-room ${active ? 'match-live' : ''} ${finished ? 'match-finished' : ''}">
        <section class="party-room-head">
          <button class="party-back" type="button" data-party-action="${active ? 'forfeit' : 'lobby'}" title="${active ? 'Forfeit match' : 'Back to lobby'}" aria-label="${active ? 'Forfeit match' : 'Back to lobby'}">&#8592;</button>
          <div><span>${escapeHtml(room.visibility)} TABLE / ${escapeHtml(room.code)}</span><h1>${escapeHtml(room.name || 'NINE SIX TABLE')}</h1></div>
          <dl><div><dt>Stake</dt><dd>${room.stake}</dd></div><div><dt>Pot</dt><dd>${formatNumber(match?.pot ?? room.stake * readyCount)}</dd></div><div><dt>Tone</dt><dd>${escapeHtml(room.tone)}</dd></div></dl>
          ${presentationModeControl()}
          <button class="party-chat-launch" type="button" data-party-action="chat-toggle" aria-expanded="${state.chatOpen}"><span aria-hidden="true">#</span> Talk shit</button>
        </section>
        ${feedback()}

        <div class="party-room-grid">
          <section class="party-table-column">
            <div class="party-felt ${active ? 'is-live' : ''} ${finished ? 'is-finished' : ''}">
              <div class="party-seat-ring" style="--seat-count:${Math.max(2, room.max_seats)}">
                ${seatRing(room.max_seats, table.members, seatPlayers, seatMatch)}
              </div>
              ${open ? lockInCenter(readyCount) : matchCenter(match, actor, latest, winner)}
            </div>
            ${open ? openTableActions(readyCount) : presenting ? presentationActions() : matchActions(match, winner)}
            ${latest && !presenting ? handReceipt(latest) : ''}
          </section>
          ${chatPanel(room)}
        </div>
      </main>
    `);
  }

  function partyShell(content, { gate = false } = {}) {
    const preview = state.backend?.kind === 'demo';
    return `
      <div class="party-shell ${gate ? 'party-shell-gate' : ''} ${preview ? 'party-preview' : 'party-live'}">
        <header class="party-topbar">
          <button type="button" class="party-wordmark" data-party-action="close" aria-label="Return to solo NINE SIX"><i><span>9</span><span>6</span></i><b>NINE SIX</b><small>PARTY</small></button>
          <nav aria-label="Game mode"><button type="button" data-party-action="close">Solo</button><strong>Community</strong></nav>
          <div class="party-connection"><i></i>${preview ? 'PREVIEW' : state.session ? 'LIVE' : 'OFFLINE'}</div>
          ${state.session ? `<div class="party-identity">${avatar(state.session.name)}<span><b>${escapeHtml(state.session.name)}</b><small>${preview ? 'Local player' : 'Authenticated'}</small></span></div>` : ''}
          ${state.session && !preview && state.view !== 'gate' ? '<button class="party-signout" type="button" data-party-action="sign-out">Sign out</button>' : ''}
          <button class="party-exit" type="button" data-party-action="close" title="Close Party Mode" aria-label="Close Party Mode">&times;</button>
        </header>
        ${preview ? '<div class="party-preview-ribbon">LOCAL PARTY PREVIEW / NO COMMUNITY RECORD</div>' : ''}
        ${content}
      </div>
    `;
  }

  function createTableForm() {
    return `
      <form class="party-create-form" data-party-form="create">
        <label class="party-field"><span>TABLE NAME</span><input name="name" maxlength="28" placeholder="THE BACK ROOM"></label>
        <label class="party-field"><span>SEATS</span><select name="capacity">${Array.from({ length: 8 }, (_, index) => `<option value="${index + 2}" ${index === 4 ? 'selected' : ''}>${index + 2}</option>`).join('')}</select></label>
        <label class="party-field"><span>STAKE</span><select name="stake">${STAKES.map((stake) => `<option value="${stake}">${stake}</option>`).join('')}</select></label>
        <label class="party-field"><span>ACCESS</span><select name="visibility"><option value="public">Public</option><option value="private">Private code</option></select></label>
        <label class="party-field"><span>TONE</span><select name="tone"><option value="adult">Adult</option><option value="pg">PG</option></select></label>
        <button class="party-primary" type="submit">Open table</button>
      </form>
    `;
  }

  function presentationModeControl() {
    return `
      <div class="party-presentation-mode" aria-label="Roll presentation">
        <span>ROLL CUT</span>
        <div role="group" aria-label="Choose roll presentation speed">
          <button type="button" data-party-action="presentation-mode" data-mode="fast" aria-pressed="${state.presentationMode === 'fast'}" class="${state.presentationMode === 'fast' ? 'active' : ''}">Fast</button>
          <button type="button" data-party-action="presentation-mode" data-mode="dramatic" aria-pressed="${state.presentationMode === 'dramatic'}" class="${state.presentationMode === 'dramatic' ? 'active' : ''}">Dramatic</button>
        </div>
      </div>
    `;
  }

  function roomListing(room) {
    return `
      <article class="party-room-listing">
        <div class="party-room-number">${String(room.stake).padStart(3, '0')}</div>
        <div><span>${escapeHtml(room.tone)} / ${room.seated || 0} OF ${room.max_seats}</span><h3>${escapeHtml(room.name || `TABLE ${room.code}`)}</h3><small>Pot opens at ${formatNumber(room.pot_preview || room.stake * (room.seated || 0))}</small></div>
        <div class="party-seat-dots">${Array.from({ length: room.max_seats }, (_, index) => `<i class="${index < (room.seated || 0) ? 'filled' : ''}"></i>`).join('')}</div>
        <button type="button" data-party-action="join-room" data-room-id="${escapeHtml(room.id)}">Take seat</button>
      </article>
    `;
  }

  function seatRing(count, members, players, match) {
    return Array.from({ length: count }, (_, index) => {
      const seat = index + 1;
      const member = members.find((item) => Number(item.seat_no) === seat);
      const player = players.find((item) => Number(item.seat_no) === seat);
      const current = match?.status === 'active' && Number(match.current_seat) === seat;
      const angle = (360 / count) * index;
      const empty = !member;
      return `
        <article class="party-seat ${empty ? 'empty' : ''} ${current ? 'current' : ''} ${player?.status || ''}" style="--seat-angle:${angle}deg" aria-label="Seat ${seat}${member ? ` ${escapeHtml(member.handle)}` : ' open'}">
          <span class="party-seat-no">${seat}</span>
          ${member ? avatar(member.handle) : '<i class="party-open-seat">+</i>'}
          <div><strong>${member ? escapeHtml(member.handle) : 'OPEN'}</strong><small>${player ? `${player.bank} bank` : member?.ready ? 'READY' : member ? 'NOT READY' : 'TAKE SEAT'}</small></div>
          ${player ? boofRack(player.boofballs) : ''}
          ${member?.connected === false ? '<em>RECONNECTING</em>' : ''}
        </article>
      `;
    }).join('');
  }

  function lockInCenter(readyCount) {
    const me = myMember();
    return `
      <section class="party-table-center party-lock-center">
        <span class="party-kicker">ROSTER OPEN</span>
        <strong>${readyCount}<small> READY</small></strong>
        ${state.lockDeadline ? `<div class="party-lock-count"><b data-lock-clock>${Math.max(0, Math.ceil((state.lockDeadline - Date.now()) / 1000))}</b><span>LOCKING POT</span></div>` : '<p>Two ready players lights the five-second fuse.</p>'}
        <div class="party-ante-readout"><span>Your ante</span><b>${state.table.room.stake}</b><small>once / fictional</small></div>
        <button class="party-primary" type="button" data-party-action="ready" ${state.busy ? 'disabled' : ''}>${me?.ready ? 'Stand down' : 'Ready up'}</button>
      </section>
    `;
  }

  function matchCenter(match, actor, latest, winner) {
    if (state.presentation?.active) return dramaticRevealCenter();
    if (match.status === 'finished') {
      return `
        <section class="party-table-center party-winner-center">
          <span class="party-kicker">TABLE SETTLED</span>
          <div class="party-winner-96">96</div>
          <h2>${escapeHtml(winner?.handle || 'HOUSE')}</h2>
          <p>${winReason(match.win_reason)}</p>
          <strong>${formatNumber(match.pot)} <small>CHIPS</small></strong>
        </section>
      `;
    }
    const hand = latest?.payload;
    const fastArrival = partyEventKey(latest) === state.fastRevealKey;
    return `
      <section class="party-table-center ${isMyTurn() ? 'your-turn' : ''}">
        <div class="party-turn-line"><span>${isMyTurn() ? 'YOUR TURN' : `${escapeHtml(actor?.handle || 'HOUSE')} IS UP`}</span><div class="party-clock"><b data-party-clock>20</b><i></i></div></div>
        <div class="party-live-hand ${hand?.perfect ? 'perfect' : ''} ${fastArrival ? 'fast-arrival' : ''}">
          <div><span>D9</span><b>${hand?.d9 ?? '-'}</b></div>
          <div><span>D6</span><b>${hand?.d6 ?? '-'}</b></div>
          <div class="party-card-slot"><span>CARD</span><b>${hand?.card_rank ?? '-'}</b></div>
        </div>
        <div class="party-current-player"><span>${avatar(actor?.handle || 'HOUSE')}</span><div><small>CLOCKWISE ACTION</small><strong>${escapeHtml(actor?.handle || 'WAITING')}</strong></div></div>
        ${isMyTurn() ? `<button class="party-roll-button" type="button" data-party-action="roll" ${state.busy ? 'disabled' : ''}><span>ROLL</span><small>9 / 6 / Q</small></button>` : '<p>No auto-roll. Their clock, their problem.</p>'}
      </section>
    `;
  }

  function dramaticRevealCenter() {
    const reveal = state.presentation;
    const actor = state.table.members.find((member) => member.auth_subject === reveal.event.actor_subject);
    const stages = partyRevealStages(reveal.hand);
    const activeIndex = Math.max(0, stages.findIndex((stage) => stage.key === reveal.stage));
    const outcome = reveal.outcome;
    return `
      <section class="party-table-center party-reveal-center stage-${escapeHtml(reveal.stage)} ${outcome ? `outcome-${escapeHtml(outcome.tone)}` : ''}" aria-live="polite">
        <div class="party-reveal-head"><span>${escapeHtml(actor?.handle || 'PLAYER')} THREW THE HAND</span><strong>DRAMATIC CUT</strong></div>
        <div class="party-reveal-status"><span>${escapeHtml(reveal.stageLabel)}</span><b>${outcome ? 'SETTLED' : `${activeIndex + 1} / 3`}</b></div>
        <div class="party-live-hand party-dramatic-hand ${reveal.hand.perfect && outcome ? 'perfect' : ''}">
          ${dramaticRevealSlot(stages[0], reveal)}
          ${dramaticRevealSlot(stages[1], reveal)}
          ${dramaticRevealSlot(stages[2], reveal)}
        </div>
        ${outcome ? `
          <div class="party-reveal-payoff ${escapeHtml(outcome.tone)}">
            <span>${escapeHtml(outcome.kicker)}</span>
            <strong>${escapeHtml(outcome.headline)}</strong>
            <small>${escapeHtml(outcome.detail)}</small>
          </div>
        ` : `
          <div class="party-reveal-meter" aria-hidden="true"><i></i></div>
          <p>${reveal.stage === 'card_rank' ? 'The face card is coming off the deck.' : 'Let it tumble. Let it talk.'}</p>
        `}
        <button class="party-reveal-skip" type="button" data-party-action="presentation-skip">Skip reveal</button>
      </section>
    `;
  }

  function dramaticRevealSlot(stage, reveal) {
    const active = reveal.stage === stage.key;
    const locked = reveal.locked.includes(stage.key);
    const value = reveal.display[stage.key];
    return `
      <div class="party-reveal-slot ${stage.kind === 'card' ? 'party-card-slot' : ''} ${active ? 'spinning' : ''} ${locked ? 'locked' : ''} ${!active && !locked ? 'waiting' : ''}">
        <span>${escapeHtml(stage.label)}</span>
        <b data-party-reveal-value="${escapeHtml(stage.key)}">${escapeHtml(value)}</b>
        <small>${locked ? 'LOCKED' : active ? stage.kind === 'card' ? 'DEALING' : 'TUMBLING' : 'WAITING'}</small>
      </div>
    `;
  }

  function presentationActions() {
    const reveal = state.presentation;
    const actor = state.table.members.find((member) => member.auth_subject === reveal.event.actor_subject);
    const nextTurnReady = isMyTurn() && state.table.match?.status === 'active';
    return `
      <section class="party-action-dock party-presentation-dock">
        <div><span>HAND IN MOTION</span><strong>${escapeHtml(actor?.handle || 'PLAYER')} / ${escapeHtml(reveal.stageLabel)}</strong><small>Server result is locked. This cut only controls how you see it.</small></div>
        ${nextTurnReady ? '<button class="party-primary" type="button" data-party-action="roll">Skip + roll your hand</button>' : '<button type="button" data-party-action="presentation-skip">Show result now</button>'}
        <button class="party-chat-launch mobile" type="button" data-party-action="chat-toggle"># Chat</button>
      </section>
    `;
  }

  function openTableActions(readyCount) {
    const room = state.table.room;
    return `
      <section class="party-action-dock">
        <div><span>LOCK RULE</span><strong>${readyCount >= 2 ? 'FUSE LIT' : 'WAITING FOR READY PLAYERS'}</strong><small>Roster closes when the countdown hits zero.</small></div>
        ${state.backend.kind === 'demo' && state.table.members.length < room.max_seats ? '<button type="button" data-party-action="add-bot">Add preview rival</button>' : ''}
        <button type="button" data-party-action="leave">Leave table</button>
        <button class="party-chat-launch mobile" type="button" data-party-action="chat-toggle"># Chat</button>
      </section>
    `;
  }

  function matchActions(match, winner) {
    if (match.status === 'finished') {
      const nextStake = STAKES.find((stake) => stake > Number(state.table.room.stake));
      return `
        <section class="party-action-dock settlement">
          <div><span>WINNER TAKES THE TABLE</span><strong>${escapeHtml(winner?.handle || 'NO SURVIVOR')}</strong><small>${formatNumber(match.pot)} fictional chips settled once.</small></div>
          <button class="party-primary" type="button" data-party-action="rematch">Run it back / ${state.table.room.stake}</button>
          ${nextStake ? `<button type="button" data-party-action="double">Double or walk / ${nextStake}</button>` : ''}
          <button type="button" data-party-action="leave">Leave table</button>
        </section>
      `;
    }
    return `
      <section class="party-action-dock">
        <div><span>ACTIVE POT</span><strong>${formatNumber(match.pot)} FICTIONAL CHIPS</strong><small>Exact 96, perfect hand, or last standing wins.</small></div>
        <button type="button" data-party-action="forfeit">Walk out</button>
        <button class="party-chat-launch mobile" type="button" data-party-action="chat-toggle"># Chat</button>
      </section>
    `;
  }

  function handReceipt(event) {
    const hand = event.payload || {};
    const actor = state.table.players.find((player) => player.auth_subject === event.actor_subject);
    const label = hand.perfect ? 'PERFECT 9 / 6 / Q' : hand.bust ? 'BUST TO 69' : hand.lane === 'no-score' ? 'NO SCORE / BOOFBALL' : hand.lane === 'money' ? '6 OR UNDER / x9' : 'RAW BANK';
    return `
      <section class="party-hand-receipt ${hand.perfect ? 'perfect' : ''} ${hand.lane === 'no-score' ? 'no-score' : ''}" aria-live="polite">
        <span>${escapeHtml(actor?.handle || 'PLAYER')} / LAST HAND</span><strong>${label}</strong>
        <dl><div><dt>Base</dt><dd>${hand.raw_score}</dd></div><div><dt>Paid</dt><dd>${hand.hand_score}</dd></div><div><dt>Bank</dt><dd>${hand.bank_after}</dd></div></dl>
      </section>
    `;
  }

  function chatPanel(room) {
    const messages = (state.table.messages || []).filter((message) => !state.mutedSubjects.has(message.sender_subject));
    const closed = room.chat_closes_at && new Date(room.chat_closes_at).getTime() <= Date.now();
    return `
      <aside class="party-chat ${state.chatOpen ? 'open' : ''}" aria-label="Table chat">
        <header><div><span>TABLE CHAT</span><strong>${escapeHtml(room.tone)} CUT</strong></div><button type="button" data-party-action="chat-toggle" aria-label="Close chat">&times;</button></header>
        <div class="party-message-list" aria-live="polite">
          ${messages.map(chatMessage).join('') || '<p class="party-empty">Say it with your whole chest.</p>'}
        </div>
        <div class="party-typing" data-party-typing></div>
        <div class="party-taunts">${TAUNTS.map((taunt, index) => `<button type="button" data-party-action="taunt" data-taunt-key="${index}" title="${escapeHtml(taunt)}">${index + 1}</button>`).join('')}</div>
        <form class="party-chat-form" data-party-form="chat">
          <input name="message" maxlength="160" autocomplete="off" placeholder="Talk shit..." aria-label="Table message" ${closed ? 'disabled' : ''}>
          <button class="party-primary" type="submit" aria-label="Send message" ${closed ? 'disabled' : ''}>&#8593;</button>
        </form>
        <footer>${closed ? 'Table chat is closed.' : '160 chars / 1 per second / report what crosses the line'}</footer>
      </aside>
    `;
  }

  function chatMessage(message) {
    const mine = message.sender_subject === state.session?.subject;
    const system = message.kind === 'system' || message.sender_subject === 'system';
    return `
      <article class="party-message ${mine ? 'mine' : ''} ${system ? 'system' : ''}">
        ${system ? '' : avatar(message.handle)}
        <div><span><b>${escapeHtml(message.handle || 'PLAYER')}</b><time>${formatTime(message.created_at)}</time></span><p>${escapeHtml(message.body)}</p></div>
        ${!mine && !system ? `<div class="party-message-tools"><button type="button" data-party-action="mute" data-subject="${escapeHtml(message.sender_subject)}" title="Mute player">M</button><button type="button" data-party-action="report" data-message-id="${escapeHtml(message.id)}" title="Report message">!</button></div>` : ''}
      </article>
    `;
  }

  function feedback() {
    if (!state.error && !state.notice && !state.busy) return '';
    return `<div class="party-feedback ${state.error ? 'error' : ''}" role="status">${state.busy ? '<i></i> Working the table...' : escapeHtml(state.error || state.notice)}</div>`;
  }

  function myMember() {
    return state.table?.members.find((member) => member.auth_subject === state.session?.subject) || null;
  }

  function activePlayer() {
    const match = state.table?.match;
    return state.table?.players.find((player) => Number(player.seat_no) === Number(match?.current_seat)) || null;
  }

  function isMyTurn() {
    return state.table?.match?.status === 'active' && activePlayer()?.auth_subject === state.session?.subject;
  }

  function latestHandEvent() {
    return [...(state.table?.events || [])].reverse().find((event) => event.type === 'hand-settled') || null;
  }
}

function stakeRadios(name, selected) {
  return STAKES.map((stake) => `<label><input type="radio" name="${name}" value="${stake}" ${stake === selected ? 'checked' : ''}><span>${stake}</span></label>`).join('');
}

function toneRadios(name, selected) {
  return ['adult', 'pg'].map((tone) => `<label><input type="radio" name="${name}" value="${tone}" ${tone === selected ? 'checked' : ''}><span>${tone}</span></label>`).join('');
}

function latestHandFromTable(table) {
  return [...(table?.events || [])].reverse().find((event) => event.type === 'hand-settled') || null;
}

function loadPresentationMode() {
  try {
    return normalizePartyPresentationMode(localStorage.getItem(PARTY_PRESENTATION_STORAGE_KEY));
  } catch {
    return 'dramatic';
  }
}

function boofRack(value) {
  const count = Number(value) || 0;
  return `<div class="party-boofs" aria-label="${count} of 4 BOOFBALLS">${BOOF_LETTERS.map((letter, index) => `<i class="${index < count ? 'filled' : ''}">${index < count ? letter : ''}</i>`).join('')}</div>`;
}

function avatar(value) {
  const letters = String(value || '96').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '96';
  return `<i class="party-avatar" aria-hidden="true">${escapeHtml(letters)}</i>`;
}

function winReason(value) {
  if (value === 'perfect') return 'Perfect 9 / 6 / Q. Immediate table kill.';
  if (value === 'exact-96') return 'Exact 96. The number landed clean.';
  if (value === 'last-standing') return 'Last player standing. Everybody else walked.';
  return 'Table closed without a survivor.';
}

function normalizeStake(value) {
  const number = Number(value);
  return STAKES.includes(number) ? number : 25;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0);
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function cleanError(error) {
  return String(error?.message || error || 'The table hit a problem.').replace(/^Error:\s*/i, '').slice(0, 220);
}

function setPartyUrl(enabled) {
  const url = new URL(window.location.href);
  if (enabled) url.searchParams.set('party', '1');
  else url.searchParams.delete('party');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

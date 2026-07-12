import {
  NINE_SIX_BOOFBALL_LIMIT,
  createNineSixRoll,
  nextActiveSeat,
  scoreNineSixHand,
  settleNineSixBank
} from '../core/game-rules.js';

const USER_SUBJECT = 'preview|player-96';
const BOT_NAMES = ['VELVET ROPE', 'COOL WATER', 'NIGHT SHIFT', 'WOODS BOSS', 'ONE MORE', 'BLUE SPORT', 'FIRE EXIT', 'LAST CALL'];
const ADULT_TAUNTS = ['PAY THE TABLE.', 'THAT BANK LOOKS NERVOUS.', 'BOOF IS CALLING.', 'ROLL IT, COWARD.', 'I OWN THIS FELT.'];
const PG_TAUNTS = ['PAY THE TABLE.', 'THAT BANK LOOKS NERVOUS.', 'BOOF IS CALLING.', 'ROLL IT.', 'I OWN THIS FELT.'];

export function createDemoPartyBackend({ rng = Math.random } = {}) {
  const listeners = new Set();
  const messageTimes = [];
  const profile = loadProfile();
  let room = null;
  let sequence = 0;

  const publicRooms = [
    roomSummary('demo-noir', 'NOIR AFTER DARK', 50, 'adult', 6, 4),
    roomSummary('demo-water', 'COOL CURRENT', 25, 'pg', 4, 2),
    roomSummary('demo-high', 'HIGH ROLLER 96', 250, 'adult', 9, 7)
  ];
  const leaders = [
    leader('VELVET ROPE', 31, 4, 2250),
    leader('LAST CALL', 24, 2, 1800),
    leader('COOL WATER', 19, 3, 1250),
    leader(profile.handle, profile.stats.wins, profile.stats.perfects, profile.stats.biggestPot)
  ];

  return {
    kind: 'demo',
    session: { subject: USER_SUBJECT, name: profile.handle },

    async bootstrap() {
      return this.loadLobby();
    },

    async loadLobby() {
      return clone({ profile, rooms: publicRooms, leaders });
    },

    async createRoom(options) {
      room = buildRoom({
        id: crypto.randomUUID(),
        name: options.name || `${profile.handle}'S TABLE`,
        visibility: options.visibility,
        tone: options.tone,
        maxSeats: options.maxSeats,
        stake: options.stake,
        bots: 0
      });
      emit();
      return snapshot();
    },

    async quickMatch({ stake, tone }) {
      room = buildRoom({
        id: crypto.randomUUID(),
        name: 'BACKROOM QUICK MATCH',
        visibility: 'public',
        tone,
        maxSeats: 6,
        stake,
        bots: 3
      });
      emit();
      return snapshot();
    },

    async joinRoom(roomId) {
      const summary = publicRooms.find((item) => item.id === roomId) || publicRooms[0];
      room = buildRoom({
        id: summary.id,
        name: summary.name,
        visibility: 'public',
        tone: summary.tone,
        maxSeats: summary.max_seats,
        stake: summary.stake,
        bots: Math.max(1, summary.seated - 1)
      });
      emit();
      return snapshot();
    },

    async loadRoom() {
      return snapshot();
    },

    subscribeRoom(_roomId, onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },

    unsubscribe() {
      listeners.clear();
    },

    async addBots() {
      requireRoom();
      if (room.status !== 'open' || room.members.length >= room.max_seats) return snapshot();
      const seat = firstOpenSeat(room.members, room.max_seats);
      const botIndex = room.members.filter((member) => member.is_bot).length;
      room.members.push(makeMember(`preview|bot-${botIndex + 1}`, BOT_NAMES[botIndex % BOT_NAMES.length], seat, true));
      room.members.sort(bySeat);
      addSystemMessage(`${room.members.find((member) => member.seat_no === seat).handle} took seat ${seat}.`);
      emit();
      return snapshot();
    },

    async setReady(_roomId, ready) {
      const member = currentMember();
      member.ready = Boolean(ready);
      room.members.filter((item) => item.is_bot).forEach((item) => { item.ready = Boolean(ready); });
      emit();
      return snapshot();
    },

    async startMatch() {
      requireRoom();
      if (room.status !== 'open') throw new Error('This table is already locked.');
      const ready = room.members.filter((member) => member.ready);
      if (ready.length < 2) throw new Error('Two ready players are required.');
      if (profile.bankroll < room.stake) throw new Error('Not enough fictional chips for this stake.');

      profile.bankroll -= room.stake;
      saveProfile(profile);
      room.status = 'active';
      room.match = {
        id: crypto.randomUUID(),
        sequence: 1,
        status: 'active',
        stake: room.stake,
        pot: room.stake * ready.length,
        current_seat: Math.min(...ready.map((member) => member.seat_no)),
        turn_deadline: deadline(),
        winner_subject: null,
        win_reason: null,
        started_at: new Date().toISOString()
      };
      room.players = ready.map((member) => ({
        auth_subject: member.auth_subject,
        handle: member.handle,
        avatar_seed: member.avatar_seed,
        seat_no: member.seat_no,
        bank: 0,
        boofballs: 0,
        timeout_streak: 0,
        status: 'active',
        is_bot: member.is_bot
      }));
      room.events = [];
      event('match-started', USER_SUBJECT, { pot: room.match.pot, stake: room.stake, seats: ready.length });
      addSystemMessage(`The pot is locked at ${room.match.pot} fictional chips.`);
      emit();
      return snapshot();
    },

    async takeTurn(_matchId, _requestId, actorSubject = USER_SUBJECT) {
      const match = activeMatch();
      const player = room.players.find((item) => item.seat_no === match.current_seat);
      if (!player || player.auth_subject !== actorSubject) throw new Error('It is not that player\'s turn.');

      const roll = createNineSixRoll(rng);
      const hand = scoreNineSixHand(roll);
      const settlement = settleNineSixBank(player.bank, hand);
      player.timeout_streak = 0;
      player.bank = settlement.bankAfter;
      if (hand.boofball) {
        player.boofballs = Math.min(NINE_SIX_BOOFBALL_LIMIT, player.boofballs + 1);
        if (player.boofballs >= NINE_SIX_BOOFBALL_LIMIT) player.status = 'walkout';
      }

      const payload = {
        d9: hand.d9,
        d6: hand.d6,
        card_rank: hand.cardRank,
        gaps: hand.gaps,
        raw_score: hand.rawScore,
        calculated_score: hand.handScore,
        hand_score: settlement.displayedScore,
        bank_before: settlement.bankBefore,
        bank_after: settlement.bankAfter,
        lane: hand.lane,
        perfect: hand.perfect,
        bust: settlement.bust,
        boofballs: player.boofballs,
        player_status: player.status
      };
      event('hand-settled', player.auth_subject, payload);

      if (hand.perfect || settlement.exactWin) {
        settleWinner(player, hand.perfect ? 'perfect' : 'exact-96');
      } else {
        settleLastStandingOrAdvance(player.seat_no);
      }
      emit();
      return clone(payload);
    },

    async advanceTimeout() {
      const match = activeMatch();
      if (new Date(match.turn_deadline).getTime() > Date.now()) return snapshot();
      const player = room.players.find((item) => item.seat_no === match.current_seat);
      if (!player) return snapshot();
      player.timeout_streak += 1;
      if (player.timeout_streak >= 2) player.status = 'forfeit';
      event('turn-timeout', player.auth_subject, { timeout_streak: player.timeout_streak, status: player.status });
      settleLastStandingOrAdvance(player.seat_no);
      emit();
      return snapshot();
    },

    async forfeitMatch() {
      const match = activeMatch();
      const player = room.players.find((item) => item.auth_subject === USER_SUBJECT);
      player.status = 'forfeit';
      event('player-forfeit', USER_SUBJECT, {});
      settleLastStandingOrAdvance(match.current_seat);
      emit();
      return snapshot();
    },

    async proposeRematch(_roomId, stake) {
      requireRoom();
      room.stake = Number(stake);
      room.status = 'open';
      room.match = null;
      room.players = [];
      room.events = [];
      room.members.forEach((member) => { member.ready = false; });
      addSystemMessage(`Rematch offered at ${room.stake} chips. Double or walk.`);
      emit();
      return snapshot();
    },

    async claimDailyRescue() {
      const today = new Date().toISOString().slice(0, 10);
      if (profile.bankroll >= 96) throw new Error('Rescue unlocks below 96 chips.');
      if (profile.last_rescue_on === today) throw new Error('Today\'s rescue was already claimed.');
      profile.bankroll += 96;
      profile.last_rescue_on = today;
      saveProfile(profile);
      emit();
      return clone(profile);
    },

    async leaveRoom() {
      room = null;
      emit();
      return null;
    },

    async sendMessage(_roomId, body, kind = 'text', tauntKey = null) {
      requireRoom();
      enforceRateLimit(messageTimes);
      const text = kind === 'taunt'
        ? tauntForKey(tauntKey, room.tone)
        : moderateMessage(body, room.tone);
      const message = makeMessage(USER_SUBJECT, profile.handle, kind, text, tauntKey);
      room.messages.push(message);
      room.messages = room.messages.slice(-50);
      globalThis.setTimeout(() => botReply(), 520);
      emit();
      return clone(message);
    },

    async reportMessage(messageId, reason) {
      const message = room?.messages.find((item) => item.id === messageId);
      if (message) message.reported = true;
      emit();
      return { reported: Boolean(message), reason };
    },

    async sendTyping() {},

    getCurrentActor() {
      const player = room?.players.find((item) => item.seat_no === room?.match?.current_seat);
      return player || null;
    },

    async takeBotTurn() {
      const actor = this.getCurrentActor();
      if (!actor?.is_bot) return null;
      return this.takeTurn(room.match.id, crypto.randomUUID(), actor.auth_subject);
    }
  };

  function buildRoom({ id, name, visibility, tone, maxSeats, stake, bots }) {
    const members = [makeMember(USER_SUBJECT, profile.handle, 1, false)];
    for (let index = 0; index < bots && members.length < maxSeats; index += 1) {
      members.push(makeMember(`preview|bot-${index + 1}`, BOT_NAMES[index], index + 2, true));
    }
    return {
      id,
      code: codeFor(id),
      name,
      host_subject: USER_SUBJECT,
      visibility,
      tone,
      max_seats: maxSeats,
      stake,
      status: 'open',
      members,
      match: null,
      players: [],
      events: [],
      messages: [makeMessage('system', 'HOUSE', 'system', `Welcome to ${name}. Talk shit, then back it up.`)]
    };
  }

  function snapshot() {
    requireRoom();
    return clone({ room: stripNested(room), members: room.members, match: room.match, players: room.players, events: room.events, messages: room.messages });
  }

  function event(type, actorSubject, payload) {
    room.events.push({ id: crypto.randomUUID(), sequence: ++sequence, type, actor_subject: actorSubject, payload, created_at: new Date().toISOString() });
    room.events = room.events.slice(-30);
  }

  function settleLastStandingOrAdvance(currentSeat) {
    const active = room.players.filter((player) => player.status === 'active');
    if (active.length === 1) {
      settleWinner(active[0], 'last-standing');
      return;
    }
    if (!active.length) {
      room.match.status = 'finished';
      room.match.win_reason = 'no-survivor';
      room.status = 'finished';
      event('match-finished', null, { reason: 'no-survivor' });
      return;
    }
    room.match.current_seat = nextActiveSeat(room.players.map((player) => ({ seat: player.seat_no, status: player.status })), currentSeat);
    room.match.turn_deadline = deadline();
  }

  function settleWinner(player, reason) {
    if (room.match.status === 'finished') return;
    player.status = 'winner';
    room.match.status = 'finished';
    room.match.winner_subject = player.auth_subject;
    room.match.win_reason = reason;
    room.match.finished_at = new Date().toISOString();
    room.status = 'finished';
    room.chat_closes_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    if (player.auth_subject === USER_SUBJECT) {
      profile.bankroll += room.match.pot;
      profile.stats.wins += 1;
      if (reason === 'perfect') profile.stats.perfects += 1;
      profile.stats.biggestPot = Math.max(profile.stats.biggestPot, room.match.pot);
      saveProfile(profile);
    }
    event('match-won', player.auth_subject, { reason, pot: room.match.pot, handle: player.handle });
    addSystemMessage(`${player.handle} takes ${room.match.pot} fictional chips. ${reason.replace('-', ' ')}.`);
  }

  function botReply() {
    if (!room || room.status === 'finished' && new Date(room.chat_closes_at).getTime() < Date.now()) return;
    const bots = room.members.filter((member) => member.is_bot);
    if (!bots.length) return;
    const bot = bots[Math.floor(Math.random() * bots.length)];
    const taunts = room.tone === 'pg' ? PG_TAUNTS : ADULT_TAUNTS;
    room.messages.push(makeMessage(bot.auth_subject, bot.handle, 'taunt', taunts[Math.floor(Math.random() * taunts.length)]));
    room.messages = room.messages.slice(-50);
    emit();
  }

  function addSystemMessage(body) {
    room.messages.push(makeMessage('system', 'HOUSE', 'system', body));
  }

  function emit() {
    const value = room ? snapshot() : null;
    for (const listener of listeners) listener(value);
  }

  function activeMatch() {
    requireRoom();
    if (!room.match || room.match.status !== 'active') throw new Error('No active match.');
    return room.match;
  }

  function currentMember() {
    requireRoom();
    return room.members.find((member) => member.auth_subject === USER_SUBJECT);
  }

  function requireRoom() {
    if (!room) throw new Error('Join a Party table first.');
  }
}

function loadProfile() {
  try {
    const stored = JSON.parse(localStorage.getItem('nine-six-party-preview-v1') || 'null');
    if (stored) return stored;
  } catch {}
  return { auth_subject: USER_SUBJECT, handle: 'PLAYER 96', avatar_seed: USER_SUBJECT, bankroll: 960, last_rescue_on: null, stats: { wins: 0, perfects: 0, biggestPot: 0 } };
}

function saveProfile(profile) {
  localStorage.setItem('nine-six-party-preview-v1', JSON.stringify(profile));
}

function roomSummary(id, name, stake, tone, maxSeats, seated) {
  return { id, code: codeFor(id), name, stake, tone, max_seats: maxSeats, seated, visibility: 'public', status: 'open', pot_preview: stake * seated, created_at: new Date().toISOString() };
}

function leader(handle, wins, perfects, biggestPot) {
  return { handle, wins, perfects, biggest_pot: biggestPot, win_streak: Math.min(wins, 4), walkouts: Math.max(0, Math.floor(wins / 3)) };
}

function makeMember(subject, handle, seat, bot) {
  return { auth_subject: subject, handle, avatar_seed: subject, seat_no: seat, ready: false, is_bot: bot, connected: true };
}

function makeMessage(subject, handle, kind, body, tauntKey = null) {
  return { id: crypto.randomUUID(), sender_subject: subject, handle, kind, body, taunt_key: tauntKey, created_at: new Date().toISOString(), reported: false };
}

function stripNested(room) {
  const { members: _members, match: _match, players: _players, events: _events, messages: _messages, ...flat } = room;
  return flat;
}

function firstOpenSeat(members, maxSeats) {
  for (let seat = 1; seat <= maxSeats; seat += 1) {
    if (!members.some((member) => member.seat_no === seat)) return seat;
  }
  return maxSeats;
}

function deadline() {
  return new Date(Date.now() + 20_000).toISOString();
}

function codeFor(value) {
  return String(value).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-6).padStart(6, '9');
}

function bySeat(left, right) {
  return left.seat_no - right.seat_no;
}

function clone(value) {
  return structuredClone(value);
}

function enforceRateLimit(times) {
  const now = Date.now();
  while (times.length && now - times[0] > 10_000) times.shift();
  if (times.length && now - times[times.length - 1] < 1000) throw new Error('Let the last shot land before sending another.');
  if (times.length >= 5) throw new Error('Chat is cooling down for a few seconds.');
  times.push(now);
}

function moderateMessage(value, tone) {
  let text = String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
  if (!text) throw new Error('Say something first.');
  if (/\b(kill yourself|home address|social security number)\b/i.test(text)) throw new Error('That message crosses the table rules.');
  if (/(.)\1{10,}/i.test(text)) throw new Error('Ease up on the spam.');
  if (tone === 'pg') {
    text = text.replace(/\bfuck(?:ing|ed|er)?\b/gi, 'heck').replace(/\bshit(?:ty)?\b/gi, 'stuff').replace(/\bbitch\b/gi, 'player').replace(/\bdamn\b/gi, 'dang');
  }
  return text;
}

function tauntForKey(key, tone) {
  const taunts = tone === 'pg' ? PG_TAUNTS : ADULT_TAUNTS;
  const index = Math.max(0, Number(key) || 0) % taunts.length;
  return taunts[index];
}

import { createClient } from '@supabase/supabase-js';

export function createSupabasePartyBackend({ config, auth, session }) {
  if (!config.backendConfigured || !session?.subject) {
    throw new Error('Supabase Party backend requires configuration and an Auth0 session.');
  }

  const client = createClient(config.supabase.url, config.supabase.publishableKey, {
    accessToken: () => auth.getIdToken(),
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 20 } }
  });
  let activeChannel = null;
  let refreshTimer = null;

  return {
    kind: 'supabase',
    session,

    async bootstrap() {
      const handle = normalizeHandle(session.name);
      await rpc('party_upsert_profile', { p_handle: handle, p_avatar_seed: session.subject });
      return this.loadLobby();
    },

    async loadLobby() {
      const [profile, rooms, leaders] = await Promise.all([
        single(client.from('profiles').select('auth_subject,handle,avatar_seed,bankroll,last_rescue_on').eq('auth_subject', session.subject)),
        rows(client.from('party_public_rooms').select('*').order('created_at', { ascending: false }).limit(24)),
        rows(client.from('party_leaderboard').select('*').order('wins', { ascending: false }).limit(20))
      ]);
      return { profile, rooms, leaders };
    },

    async createRoom(options) {
      const room = await rpc('party_create_room', {
        p_visibility: options.visibility,
        p_tone: options.tone,
        p_max_seats: options.maxSeats,
        p_stake: options.stake,
        p_name: options.name || null
      });
      return this.loadRoom(room.id || room.room_id);
    },

    async quickMatch({ stake, tone }) {
      const room = await rpc('party_quick_match', { p_stake: stake, p_tone: tone });
      return this.loadRoom(room.id || room.room_id);
    },

    async joinRoom(roomId, code = null) {
      const room = await rpc('party_join_room', { p_room_id: roomId || null, p_code: code || null });
      return this.loadRoom(room.id || room.room_id);
    },

    async loadRoom(roomId) {
      const room = await single(client.from('party_rooms').select('*').eq('id', roomId));
      const members = await rows(client.from('party_room_members_view').select('*').eq('room_id', roomId).order('seat_no'));
      const match = await maybeSingle(client.from('party_matches').select('*').eq('room_id', roomId).order('sequence', { ascending: false }).limit(1));
      const players = match ? await rows(client.from('party_match_players_view').select('*').eq('match_id', match.id).order('seat_no')) : [];
      const events = match ? await rows(client.from('party_events').select('*').eq('match_id', match.id).order('sequence', { ascending: false }).limit(30)) : [];
      const messages = await rows(client.from('party_messages_view').select('*').eq('room_id', roomId).order('created_at', { ascending: false }).limit(50));
      return { room, members, match, players, events: events.reverse(), messages: messages.reverse() };
    },

    subscribeRoom(roomId, onChange) {
      this.unsubscribe();
      const queueRefresh = () => {
        window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(async () => {
          try {
            onChange(await this.loadRoom(roomId));
          } catch (error) {
            onChange(null, error);
          }
        }, 80);
      };
      activeChannel = client
        .channel(`room:${roomId}`, { config: { private: true, presence: { key: session.subject } } })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'party_rooms', filter: `id=eq.${roomId}` }, queueRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` }, queueRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'party_matches', filter: `room_id=eq.${roomId}` }, queueRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'party_messages', filter: `room_id=eq.${roomId}` }, queueRefresh)
        .on('broadcast', { event: 'typing' }, (payload) => onChange({ typing: payload.payload }))
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await activeChannel.track({ handle: session.name, online_at: new Date().toISOString() });
          }
        });
      return () => this.unsubscribe();
    },

    unsubscribe() {
      window.clearTimeout(refreshTimer);
      if (activeChannel) client.removeChannel(activeChannel);
      activeChannel = null;
    },

    setReady(roomId, ready) {
      return rpc('party_set_ready', { p_room_id: roomId, p_ready: Boolean(ready) });
    },
    startMatch(roomId) {
      return rpc('party_start_match', { p_room_id: roomId });
    },
    takeTurn(matchId, requestId = crypto.randomUUID()) {
      return rpc('party_take_turn', { p_match_id: matchId, p_request_id: requestId });
    },
    advanceTimeout(matchId) {
      return rpc('party_advance_timeout', { p_match_id: matchId });
    },
    forfeitMatch(matchId) {
      return rpc('party_forfeit_match', { p_match_id: matchId });
    },
    proposeRematch(roomId, stake) {
      return rpc('party_propose_rematch', { p_room_id: roomId, p_stake: stake });
    },
    claimDailyRescue() {
      return rpc('party_claim_daily_rescue');
    },
    leaveRoom(roomId) {
      return rpc('party_leave_room', { p_room_id: roomId });
    },
    setPresence(roomId, connected) {
      return rpc('party_set_presence', { p_room_id: roomId, p_connected: Boolean(connected) });
    },
    blockPlayer(subject, blocked = true) {
      return rpc('party_block_player', { p_blocked_subject: subject, p_blocked: Boolean(blocked) });
    },
    addBots() {
      throw new Error('Bots are available only in local Party preview.');
    },

    async sendMessage(roomId, body, kind = 'text', tauntKey = null) {
      const token = await auth.getAccessToken();
      return api('/api/community/chat', token, { roomId, body, kind, tauntKey });
    },

    async reportMessage(messageId, reason) {
      const token = await auth.getAccessToken();
      return api('/api/community/report', token, { messageId, reason });
    },

    async sendTyping(roomId, typing) {
      if (!activeChannel) return;
      await activeChannel.send({ type: 'broadcast', event: 'typing', payload: { subject: session.subject, typing } });
    }
  };

  async function rpc(name, args = {}) {
    const { data, error } = await client.rpc(name, args);
    if (error) throw new Error(error.message);
    return Array.isArray(data) && data.length === 1 ? data[0] : data;
  }
}

async function rows(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

async function single(query) {
  const { data, error } = await query.single();
  if (error) throw new Error(error.message);
  return data;
}

async function maybeSingle(query) {
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

async function api(path, token, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Party service request failed.');
  return payload;
}

function normalizeHandle(value) {
  return String(value || 'PLAYER 96').replace(/[^A-Za-z0-9 ._'-]/g, '').trim().slice(0, 16) || 'PLAYER 96';
}

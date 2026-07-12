import { httpError, requireAuth0Subject } from './_auth.js';
import { moderateTableMessage } from './_moderation.js';
import { serviceSupabase, unwrapSupabase } from './_supabase.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return send(response, 405, { error: 'Method not allowed.' });
  try {
    if (process.env.PARTY_CHAT_ENABLED === 'false') throw httpError(503, 'Table chat is paused.');
    const subject = await requireAuth0Subject(request);
    const input = parseBody(request.body);
    const roomId = validUuid(input.roomId);
    const supabase = serviceSupabase();
    const room = unwrapSupabase(await supabase.from('party_rooms').select('id,tone').eq('id', roomId).maybeSingle());
    if (!room) throw httpError(404, 'Table not found.');

    const message = moderateTableMessage({
      body: input.body,
      kind: input.kind,
      tauntKey: input.tauntKey,
      tone: room.tone,
      blocklist: process.env.CHAT_BLOCKLIST
    });
    const saved = unwrapSupabase(await supabase.rpc('party_moderated_message', {
      p_subject: subject,
      p_room_id: roomId,
      p_body: message.body,
      p_kind: message.kind,
      p_taunt_key: message.tauntKey
    }));
    return send(response, 200, saved);
  } catch (error) {
    return send(response, error.status || 500, { error: publicMessage(error) });
  }
}

function validUuid(value) {
  const text = String(value || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw httpError(400, 'Invalid table id.');
  }
  return text;
}

function parseBody(value) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(String(value || '{}')); } catch { throw httpError(400, 'Invalid request body.'); }
}

function send(response, status, payload) {
  response.setHeader('Cache-Control', 'no-store');
  return response.status(status).json(payload);
}

function publicMessage(error) {
  return error.status && error.status < 500 ? error.message : 'The table service hit a problem.';
}

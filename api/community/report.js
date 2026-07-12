import { httpError, requireAuth0Subject } from './_auth.js';
import { serviceSupabase, unwrapSupabase } from './_supabase.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return send(response, 405, { error: 'Method not allowed.' });
  try {
    const subject = await requireAuth0Subject(request);
    const input = parseBody(request.body);
    const messageId = validUuid(input.messageId);
    const reason = String(input.reason || 'table-conduct').trim().slice(0, 80);
    const report = unwrapSupabase(await serviceSupabase().rpc('party_create_report', {
      p_reporter_subject: subject,
      p_message_id: messageId,
      p_reason: reason
    }));
    return send(response, 200, { id: report.id, status: report.status });
  } catch (error) {
    return send(response, error.status || 500, { error: error.status && error.status < 500 ? error.message : 'The report service hit a problem.' });
  }
}

function validUuid(value) {
  const text = String(value || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw httpError(400, 'Invalid message id.');
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

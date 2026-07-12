import { createClient } from '@supabase/supabase-js';
import { httpError } from './_auth.js';

let client = null;

export function serviceSupabase() {
  const url = String(process.env.SUPABASE_URL || '').trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) throw httpError(503, 'Party database is not configured.');
  client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  return client;
}

export function unwrapSupabase({ data, error }) {
  if (error) throw httpError(mapStatus(error.message), cleanDatabaseMessage(error.message));
  return Array.isArray(data) && data.length === 1 ? data[0] : data;
}

function mapStatus(message) {
  if (/rate|wait one second|burst/i.test(message)) return 429;
  if (/membership|required|authorization/i.test(message)) return 403;
  if (/not found/i.test(message)) return 404;
  return 400;
}

function cleanDatabaseMessage(value) {
  return String(value || 'Party request failed.').split('\n')[0].slice(0, 180);
}

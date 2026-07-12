const ADULT_TAUNTS = [
  'PAY THE TABLE.',
  'THAT BANK LOOKS NERVOUS.',
  'BOOF IS CALLING.',
  'ROLL IT, COWARD.',
  'I OWN THIS FELT.'
];
const PG_TAUNTS = [
  'PAY THE TABLE.',
  'THAT BANK LOOKS NERVOUS.',
  'BOOF IS CALLING.',
  'ROLL IT.',
  'I OWN THIS FELT.'
];

export function moderateTableMessage({ body, kind = 'text', tauntKey = null, tone = 'adult', blocklist = '' }) {
  if (kind === 'taunt') {
    const taunts = tone === 'pg' ? PG_TAUNTS : ADULT_TAUNTS;
    const index = Math.max(0, Number.parseInt(tauntKey, 10) || 0) % taunts.length;
    return { body: taunts[index], kind: 'taunt', tauntKey: String(index) };
  }
  if (kind !== 'text') throw moderationError('Invalid chat message.');

  let text = String(body || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) throw moderationError('Say something first.');
  if (text.length > 160) throw moderationError('Messages stop at 160 characters.');

  const lower = text.toLowerCase();
  const customTerms = String(blocklist || '').split(',').map((term) => term.trim().toLowerCase()).filter(Boolean);
  if (customTerms.some((term) => lower.includes(term))) throw moderationError('That message crosses the table rules.');
  if (/\b(kill|shoot|stab|bomb)\s+(you|your|them|him|her)\b/i.test(text)) throw moderationError('Threats are not table talk.');
  if (/\b(home address|doxx?|social security|ssn|credit card number)\b/i.test(text)) throw moderationError('Private information stays off the table.');
  if (/\b(minor|child|kid)\b.{0,24}\b(nude|sexual|porn)\b/i.test(text)) throw moderationError('That content is never allowed.');
  if ((text.match(/https?:\/\//gi) || []).length > 1 || /(.)\1{10,}/i.test(text)) throw moderationError('Ease up on the spam.');

  if (tone === 'pg') {
    text = text
      .replace(/\bfuck(?:ing|ed|er)?\b/gi, 'heck')
      .replace(/\bshit(?:ty)?\b/gi, 'stuff')
      .replace(/\bbitch\b/gi, 'player')
      .replace(/\bdamn\b/gi, 'dang');
  }
  return { body: text, kind: 'text', tauntKey: null };
}

function moderationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

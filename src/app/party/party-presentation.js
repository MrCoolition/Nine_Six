export const PARTY_PRESENTATION_STORAGE_KEY = 'nine-six-party-presentation-v1';
export const PARTY_REVEAL_DURATION_MS = 3000;
export const PARTY_PAYOFF_HOLD_MS = 1200;

export function normalizePartyPresentationMode(value) {
  return value === 'fast' ? 'fast' : 'dramatic';
}

export function partyEventKey(event) {
  if (!event) return '';
  return String(event.id || `${event.sequence || 0}:${event.actor_subject || ''}:${event.created_at || ''}`);
}

export function partyRevealStages(hand = {}) {
  return [
    { key: 'd9', label: 'NINE DIE', kind: 'die', finalValue: hand.d9 ?? '-' },
    { key: 'd6', label: 'SIX DIE', kind: 'die', finalValue: hand.d6 ?? '-' },
    { key: 'card_rank', label: 'FACE CARD', kind: 'card', finalValue: hand.card_rank ?? '-' }
  ];
}

export function partyOutcomeAudioRoute(hand = {}, tone = 'adult') {
  if (hand.perfect === true) return tone === 'pg' ? null : 'perfect-nine-six';
  if (hand.lane === 'no-score') return 'boofball-boo';
  if (hand.bust === true) return 'bank-bust-horn';
  return null;
}

export function partyOutcomeCopy(hand = {}, tone = 'adult') {
  if (hand.perfect === true) {
    return {
      kicker: 'PERFECT HAND',
      headline: tone === 'pg' ? 'NINE SIX!' : 'NINE SIX BITCH!!!!',
      detail: '9 / 6 / Q takes the whole table.',
      tone: 'perfect'
    };
  }
  if (Number(hand.bank_after) === 96) {
    return {
      kicker: 'TABLE WIN',
      headline: 'EXACT 96',
      detail: 'The bank landed clean. Take the whole table.',
      tone: 'exact'
    };
  }
  if (hand.lane === 'no-score') {
    const walked = hand.player_status === 'walkout' || Number(hand.boofballs) >= 4;
    return {
      kicker: walked ? 'BOOF COMPLETE' : 'NO SCORE',
      headline: walked ? (tone === 'pg' ? 'WALK OUT' : 'WALK THE FUCK OUT') : 'BOOFBALL',
      detail: walked ? 'Four BOOFBALLS. Your seat is gone.' : `${Number(hand.boofballs) || 0} of 4. Spell BOOF and walk.`,
      tone: walked ? 'walkout' : 'no-score'
    };
  }
  if (hand.bust === true) {
    return {
      kicker: 'OVERSHOT 96',
      headline: 'BACK TO 69',
      detail: 'The bank crossed the line and paid the penalty.',
      tone: 'bust'
    };
  }
  if (hand.lane === 'money') {
    return {
      kicker: '6 OR UNDER',
      headline: `PAID ${Number(hand.hand_score) || 0}`,
      detail: 'That hand got the x9 treatment.',
      tone: 'money'
    };
  }
  return {
    kicker: 'RAW BANK',
    headline: `BANKED ${Number(hand.hand_score) || 0}`,
    detail: `The bank moves to ${Number(hand.bank_after) || 0}.`,
    tone: 'raw'
  };
}

export function partySpinValue(stage, rng = Math.random) {
  if (stage?.key === 'd9') return Math.floor(rng() * 9) + 1;
  if (stage?.key === 'd6') return Math.floor(rng() * 6) + 1;
  return ['J', 'Q', 'K'][Math.floor(rng() * 3)] || 'Q';
}

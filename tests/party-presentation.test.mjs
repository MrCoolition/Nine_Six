import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizePartyPresentationMode,
  partyEventKey,
  partyOutcomeAudioRoute,
  partyOutcomeCopy,
  partyRevealStages,
  partySpinValue
} from '../src/app/party/party-presentation.js';

test('Party presentation defaults to dramatic and accepts fast explicitly', () => {
  assert.equal(normalizePartyPresentationMode(), 'dramatic');
  assert.equal(normalizePartyPresentationMode('dramatic'), 'dramatic');
  assert.equal(normalizePartyPresentationMode('fast'), 'fast');
});

test('Party dramatic cut reveals D9, D6, then the face card', () => {
  const stages = partyRevealStages({ d9: 9, d6: 6, card_rank: 'Q' });
  assert.deepEqual(stages.map((stage) => stage.key), ['d9', 'd6', 'card_rank']);
  assert.deepEqual(stages.map((stage) => stage.finalValue), [9, 6, 'Q']);
});

test('Party audio routes stay locked to their exact outcome groups', () => {
  assert.equal(partyOutcomeAudioRoute({ perfect: true, lane: 'money' }, 'adult'), 'perfect-nine-six');
  assert.equal(partyOutcomeAudioRoute({ perfect: true, lane: 'money' }, 'pg'), null);
  assert.equal(partyOutcomeAudioRoute({ perfect: false, lane: 'no-score', bust: false }, 'adult'), 'boofball-boo');
  assert.equal(partyOutcomeAudioRoute({ perfect: false, lane: 'raw', bust: true }, 'adult'), 'bank-bust-horn');
  assert.equal(partyOutcomeAudioRoute({ perfect: false, lane: 'money', bust: false }, 'adult'), null);
  assert.equal(partyOutcomeAudioRoute({ perfect: false, lane: 'raw', bust: false }, 'adult'), null);
});

test('Party payoff copy preserves Adult and PG perfect calls', () => {
  assert.equal(partyOutcomeCopy({ perfect: true }, 'adult').headline, 'NINE SIX BITCH!!!!');
  assert.equal(partyOutcomeCopy({ perfect: true }, 'pg').headline, 'NINE SIX!');
  assert.equal(partyOutcomeCopy({ bank_after: 96 }, 'adult').headline, 'EXACT 96');
  assert.equal(partyOutcomeCopy({ lane: 'no-score', boofballs: 3 }).headline, 'BOOFBALL');
  assert.equal(partyOutcomeCopy({ lane: 'no-score', boofballs: 4, player_status: 'walkout' }, 'adult').headline, 'WALK THE FUCK OUT');
  assert.equal(partyOutcomeCopy({ lane: 'no-score', boofballs: 4, player_status: 'walkout' }, 'pg').headline, 'WALK OUT');
});

test('Party event keys and visual spin values remain deterministic at boundaries', () => {
  assert.equal(partyEventKey({ id: 'event-96' }), 'event-96');
  assert.equal(partySpinValue({ key: 'd9' }, () => 0.999), 9);
  assert.equal(partySpinValue({ key: 'd6' }, () => 0), 1);
  assert.equal(partySpinValue({ key: 'card_rank' }, () => 0.5), 'Q');
});

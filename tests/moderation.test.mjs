import assert from 'node:assert/strict';
import test from 'node:test';
import { moderateTableMessage } from '../api/community/_moderation.js';

test('adult tables preserve ordinary profanity', () => {
  const result = moderateTableMessage({ body: 'Roll the fucking dice.', tone: 'adult' });
  assert.equal(result.body, 'Roll the fucking dice.');
});

test('PG tables sanitize profanity without dropping the message', () => {
  const result = moderateTableMessage({ body: 'Roll the fucking dice, bitch.', tone: 'pg' });
  assert.equal(result.body, 'Roll the heck dice, player.');
});

test('taunts are selected server-side for the room tone', () => {
  assert.equal(moderateTableMessage({ kind: 'taunt', tauntKey: 3, tone: 'adult' }).body, 'ROLL IT, COWARD.');
  assert.equal(moderateTableMessage({ kind: 'taunt', tauntKey: 3, tone: 'pg' }).body, 'ROLL IT.');
});

test('threats, doxxing, configured terms, and spam are blocked', () => {
  assert.throws(() => moderateTableMessage({ body: 'I will kill you.' }), /Threats/);
  assert.throws(() => moderateTableMessage({ body: 'Post the home address.' }), /Private information/);
  assert.throws(() => moderateTableMessage({ body: 'forbidden phrase', blocklist: 'forbidden' }), /crosses/);
  assert.throws(() => moderateTableMessage({ body: 'aaaaaaaaaaaa' }), /spam/);
});

test('chat enforces a 160 character ceiling', () => {
  assert.throws(() => moderateTableMessage({ body: 'x'.repeat(161) }), /160/);
});

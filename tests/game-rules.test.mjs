import assert from 'node:assert/strict';
import test from 'node:test';
import {
  enumerateNineSixHands,
  nextActiveSeat,
  scoreNineSixHand,
  settleNineSixBank
} from '../src/app/core/game-rules.js';

test('all 162 hands preserve the published NINE SIX odds', () => {
  const hands = enumerateNineSixHands();
  assert.equal(hands.length, 162);
  assert.equal(hands.filter((hand) => hand.perfect).length, 1);
  assert.equal(hands.filter((hand) => hand.noScore).length, 40);
  assert.equal(hands.filter((hand) => !hand.noScore).length, 122);
  assert.equal(hands.filter((hand) => hand.lane === 'money').length, 68);
  assert.deepEqual(
    hands.find((hand) => hand.perfect),
    scoreNineSixHand({ d9: 9, d6: 6, cardRank: 'Q' })
  );
});

test('6 or under pays x9 while 7 through 9 banks raw', () => {
  const money = scoreNineSixHand({ d9: 7, d6: 5, cardRank: 'J' });
  assert.equal(money.rawScore, 4);
  assert.equal(money.handScore, 36);
  assert.equal(money.lane, 'money');

  const raw = scoreNineSixHand({ d9: 4, d6: 4, cardRank: 'Q' });
  assert.equal(raw.rawScore, 7);
  assert.equal(raw.handScore, 7);
  assert.equal(raw.lane, 'bank');
});

test('no score adds no bank and a bank overshoot resets to 69', () => {
  const noScore = scoreNineSixHand({ d9: 1, d6: 1, cardRank: 'J' });
  assert.equal(noScore.noScore, true);
  assert.equal(noScore.boofball, true);
  assert.equal(settleNineSixBank(54, noScore).bankAfter, 54);

  const paid = scoreNineSixHand({ d9: 8, d6: 6, cardRank: 'Q' });
  const bust = settleNineSixBank(89, paid);
  assert.equal(paid.handScore, 9);
  assert.equal(bust.bust, true);
  assert.equal(bust.bankAfter, 69);
  assert.equal(bust.displayedScore, 0);
});

test('exact 96 and perfect 9 / 6 / Q win cleanly', () => {
  const nine = scoreNineSixHand({ d9: 8, d6: 6, cardRank: 'Q' });
  assert.equal(settleNineSixBank(87, nine).exactWin, true);
  const perfect = scoreNineSixHand({ d9: 9, d6: 6, cardRank: 'Q' });
  assert.equal(settleNineSixBank(0, perfect).bankAfter, 96);
  assert.equal(settleNineSixBank(69, perfect).exactWin, true);
});

test('clockwise rotation skips walked and forfeited seats', () => {
  const players = [
    { seat: 1, status: 'active' },
    { seat: 2, status: 'walkout' },
    { seat: 4, status: 'active' },
    { seat: 7, status: 'forfeit' },
    { seat: 9, status: 'active' }
  ];
  assert.equal(nextActiveSeat(players, 1), 4);
  assert.equal(nextActiveSeat(players, 4), 9);
  assert.equal(nextActiveSeat(players, 9), 1);
});

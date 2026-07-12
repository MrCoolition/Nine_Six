export const NINE_SIX_TARGET = 96;
export const NINE_SIX_BUST_RESET = 69;
export const NINE_SIX_BOOFBALL_LIMIT = 4;
export const NINE_SIX_CARD_RANKS = Object.freeze(['J', 'Q', 'K']);

export function cardGap(rank) {
  const index = NINE_SIX_CARD_RANKS.indexOf(String(rank || '').toUpperCase());
  return index < 0 ? null : Math.abs(index - 1);
}

export function scoreNineSixHand({ d9, d6, cardRank }) {
  const nine = integerInRange(d9, 1, 9, 'd9');
  const six = integerInRange(d6, 1, 6, 'd6');
  const rank = String(cardRank || '').toUpperCase();
  const gap = cardGap(rank);

  if (gap === null) {
    throw new RangeError('cardRank must be J, Q, or K');
  }

  const gaps = [9 - nine, 6 - six, gap];
  const rawScore = gaps.reduce((total, value) => total + value, 0);
  const perfect = nine === 9 && six === 6 && rank === 'Q';
  const noScore = !perfect && rawScore > 9;
  const handScore = perfect
    ? NINE_SIX_TARGET
    : noScore
      ? 0
      : rawScore <= 6
        ? rawScore * 9
        : rawScore;

  return {
    d9: nine,
    d6: six,
    cardRank: rank,
    gaps,
    rawScore,
    handScore,
    perfect,
    noScore,
    boofball: noScore,
    lane: perfect ? 'perfect' : noScore ? 'no-score' : rawScore <= 6 ? 'money' : 'bank'
  };
}

export function settleNineSixBank(bank, scoredHand) {
  const currentBank = integerInRange(bank, 0, NINE_SIX_TARGET, 'bank');

  if (scoredHand.perfect) {
    return {
      bankBefore: currentBank,
      bankAfter: NINE_SIX_TARGET,
      creditedScore: NINE_SIX_TARGET,
      displayedScore: NINE_SIX_TARGET,
      exactWin: true,
      bust: false
    };
  }

  if (scoredHand.handScore <= 0) {
    return {
      bankBefore: currentBank,
      bankAfter: currentBank,
      creditedScore: 0,
      displayedScore: 0,
      exactWin: false,
      bust: false
    };
  }

  const plannedBank = currentBank + scoredHand.handScore;
  if (plannedBank > NINE_SIX_TARGET) {
    return {
      bankBefore: currentBank,
      bankAfter: NINE_SIX_BUST_RESET,
      creditedScore: 0,
      displayedScore: 0,
      handScore: scoredHand.handScore,
      exactWin: false,
      bust: true
    };
  }

  return {
    bankBefore: currentBank,
    bankAfter: plannedBank,
    creditedScore: scoredHand.handScore,
    displayedScore: scoredHand.handScore,
    exactWin: plannedBank === NINE_SIX_TARGET,
    bust: false
  };
}

export function createNineSixRoll(rng = Math.random) {
  return {
    d9: uniformInt(9, rng),
    d6: uniformInt(6, rng),
    cardRank: NINE_SIX_CARD_RANKS[uniformInt(3, rng) - 1]
  };
}

export function nextActiveSeat(players, currentSeat) {
  const activeSeats = players
    .filter((player) => player.status === 'active')
    .map((player) => player.seat)
    .sort((left, right) => left - right);

  if (!activeSeats.length) {
    return null;
  }

  return activeSeats.find((seat) => seat > currentSeat) ?? activeSeats[0];
}

export function enumerateNineSixHands() {
  const hands = [];
  for (let d9 = 1; d9 <= 9; d9 += 1) {
    for (let d6 = 1; d6 <= 6; d6 += 1) {
      for (const cardRank of NINE_SIX_CARD_RANKS) {
        hands.push(scoreNineSixHand({ d9, d6, cardRank }));
      }
    }
  }
  return hands;
}

function uniformInt(max, rng) {
  return Math.floor(rng() * max) + 1;
}

function integerInRange(value, min, max, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new RangeError(`${label} must be an integer from ${min} to ${max}`);
  }
  return number;
}

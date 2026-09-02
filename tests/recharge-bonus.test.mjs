import assert from 'node:assert/strict';
import test from 'node:test';

import { rechargeAmounts, rechargeBonus, rechargeCredit } from '../api/_balance.js';

test('every supported value-card tier adds ten percent', () => {
  const expected = new Map([
    [100, 110],
    [200, 220],
    [300, 330],
    [400, 440],
    [500, 550]
  ]);

  assert.deepEqual([...rechargeAmounts], [...expected.keys()]);
  for (const [amount, credited] of expected) {
    assert.equal(rechargeBonus(amount), amount / 10);
    assert.equal(rechargeCredit(amount), credited);
  }
});

test('unsupported top-up amounts receive no credit or bonus', () => {
  for (const amount of [0, 20, 50, 150, 1000, Number.NaN]) {
    assert.equal(rechargeBonus(amount), 0);
    assert.equal(rechargeCredit(amount), 0);
  }
});

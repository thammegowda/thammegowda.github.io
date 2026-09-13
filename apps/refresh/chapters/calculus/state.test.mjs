import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, readState } from './state.js';

test('calculus URL state round-trips independently of the page URL', () => {
  const state = { ...defaultState(), family: 'silu', point: -2, lower: 3, tangent: false, compare: true };
  assert.deepEqual(readState(`#${new URLSearchParams(state)}`), state);
  assert.deepEqual(readState(''), defaultState());
  const reset = defaultState();
  reset.point = 5;
  assert.equal(defaultState().point, 1);
});

test('calculus URL state validates families and clamps numeric parameters', () => {
  for (const family of ['unknown', 'constructor', '__proto__']) {
    assert.equal(readState(`#family=${family}`).family, 'power');
  }
  const state = readState('#coefficient=9&exponent=2.6&point=Infinity&lower=-999&shade=false');
  assert.equal(state.coefficient, 3);
  assert.equal(state.exponent, 3);
  assert.equal(state.point, 1);
  assert.equal(state.lower, -5);
  assert.equal(state.shade, false);
  assert.equal(readState('#point=1.234').point, 1.25);
});

test('restricted-domain calculus families restore usable default intervals', () => {
  for (const family of ['log', 'reciprocal']) {
    const state = readState(`#family=${family}`);
    assert.equal(state.lower, 1);
    assert.equal(state.point, 2);
  }
  assert.equal(readState('#family=log&lower=-1').lower, 0.1);
});
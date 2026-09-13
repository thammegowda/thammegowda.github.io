import test from 'node:test';
import assert from 'node:assert/strict';
import { createModel } from './math.js';
import { compositionFamilies, compositionRules, createComposition } from './composition.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-5 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

for (const rule of Object.keys(compositionRules)) {
  test(`${rule}: composite derivatives agree with finite differences`, () => {
    for (const outer of compositionFamilies) {
      for (const inner of compositionFamilies) {
        const model = createComposition(rule, createModel(outer, 1.2, 3), createModel(inner, -0.7, 2));
        for (const point of [-0.6, 0, 0.8]) {
          const step = 1e-5;
          close(model.slope(point), (model.value(point + step) - model.value(point - step)) / (2 * step));
        }
      }
    }
  });
}

test('product rule shows cancellation rather than multiplying derivatives', () => {
  const result = createComposition('product', createModel('sin'), createModel('cos')).evaluate(Math.PI / 4);
  close(result.terms[0], 0.5);
  close(result.terms[1], -0.5);
  close(result.slope, 0);
});

test('chain rule evaluates the outer derivative at the intermediate value', () => {
  const model = createComposition('chain', createModel('sin'), createModel('power'));
  const result = model.evaluate(2);
  close(result.outerInput, 4);
  close(result.outerSlope, Math.cos(4));
  close(result.innerSlope, 4);
  close(result.slope, 4 * Math.cos(4));
  assert.notEqual(model.value(2), createComposition('chain', createModel('power'), createModel('sin')).value(2));
});

test('zero factors, invalid rules, and numeric overflow are handled explicitly', () => {
  for (const rule of ['product', 'chain']) close(createComposition(rule, createModel('constant', 0), createModel('power')).slope(2), 0);
  const overflowing = createComposition('chain', createModel('exp'), createModel('exp')).evaluate(10);
  assert.ok(Number.isNaN(overflowing.value));
  assert.ok(Number.isNaN(overflowing.slope));
  assert.throws(() => createComposition('unknown', createModel('sin'), createModel('cos')), /Unknown/);
});
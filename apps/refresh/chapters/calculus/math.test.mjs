import test from 'node:test';
import assert from 'node:assert/strict';
import { createModel, families, sample } from './math.js';

const close = (actual, expected, tolerance = 1e-5) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

for (const key of Object.keys(families)) {
  test(`${key}: derivative and primitive agree with finite differences`, () => {
    const model = createModel(key, 1.7, 3);
    for (const point of [-2.3, -0.7, 0.6, 1.8]) {
      if (key === 'log' && point < 0) continue;
      const step = 1e-5;
      close(model.slope(point), (model.value(point + step) - model.value(point - step)) / (2 * step));
      close(model.value(point), (model.primitive(point + step) - model.primitive(point - step)) / (2 * step));
      close(model.integral(point, point), 0);
    }
  });
}
test('known integrals, reversed bounds, and zero coefficient', () => {
  close(createModel('power').integral(0, 3), 9);
  close(createModel('linear', 2).integral(2, 0), -4);
  close(createModel('sin').integral(0, 2 * Math.PI), 0);
  close(createModel('cos').slope(0), 0);
  close(createModel('constant', 0).integral(-3, 4), 0);
  close(createModel('reciprocal').integral(-2, -1), -Math.log(2));
});
test('invalid real domains and divergent intervals are not finite', () => {
  const reciprocal = createModel('reciprocal');
  for (const [lower, upper] of [[-1, 1], [1, -1], [0, 1], [1, 0], [0, 0]]) assert.ok(Number.isNaN(reciprocal.integral(lower, upper)));
  assert.ok(Number.isNaN(reciprocal.value(0)));
  assert.ok(Number.isNaN(reciprocal.slope(0)));
  assert.ok(Number.isNaN(createModel('log').value(-1)));
  assert.ok(Number.isNaN(createModel('log').value(0)));
  assert.ok(Number.isNaN(createModel('log').integral(-1, 2)));
});
test('reciprocal samples have a gap at zero', () => {
  const model = createModel('reciprocal');
  const points = sample(model.domain, model.value);
  assert.equal(points[250][0], 0);
  assert.ok(Number.isNaN(points[250][1]));
});

test('zoomed and reversed samples preserve the pole and kink at zero', () => {
  for (const domain of [[-0.83, 1.7], [1.7, -0.83]]) {
    for (const evaluate of [createModel('reciprocal').value, createModel('relu').slope]) {
      const points = sample(domain, evaluate);
      const index = points.findIndex(([position]) => position === 0);
      assert.ok(index > 0 && index < points.length - 1);
      assert.ok(Number.isNaN(points[index][1]));
      assert.ok(points[index - 1][0] * points[index + 1][0] < 0);
    }
  }
});

test('activation values, saturation, and ReLU kink', () => {
  close(createModel('sigmoid').value(0), 0.5);
  close(createModel('sigmoid').slope(0), 0.25);
  close(createModel('tanh').value(0), 0);
  close(createModel('tanh').slope(0), 1);
  close(createModel('softplus').value(0), Math.LN2);
  close(createModel('softplus').slope(0), 0.5);
  close(createModel('silu').value(0), 0);
  close(createModel('silu').slope(0), 0.5);
  assert.ok(createModel('silu').slope(-2) < 0);
  assert.ok(Number.isNaN(createModel('relu').slope(0)));
  close(createModel('relu').integral(-2, 2), 2);
  close(createModel('sigmoid').value(-1000), 0);
  close(createModel('softplus').value(1000), 1000);
});

test('numerical activation integrals reverse sign and match known symmetric identities', () => {
  for (const key of ['softplus', 'silu']) {
    const model = createModel(key);
    close(model.integral(-3, 2), -model.integral(2, -3));
    close(model.integral(-2, 3), model.primitive(3) - model.primitive(-2));
  }
  close(createModel('sigmoid').integral(-3, 3), 3);
  close(createModel('tanh').integral(-3, 3), 0);
  close(createModel('softplus').integral(0, 3) - createModel('softplus').integral(-3, 0), 4.5);
  close(createModel('silu').integral(0, 3) - createModel('silu').integral(-3, 0), 4.5);
});
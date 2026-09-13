import { compile, derivative } from 'mathjs';
import integrate from 'integrate-adaptive-simpson';

const sigmoid = (position) => position >= 0 ? 1 / (1 + Math.exp(-position)) : Math.exp(position) / (1 + Math.exp(position));
const softplus = (position) => Math.max(position, 0) + Math.log1p(Math.exp(-Math.abs(position)));

export const families = {
  constant: { label: 'a', name: 'Constant', expression: 'a', primitive: 'a*x', formula: 'a', slope: '0', integral: 'ax + C', note: 'A constant has no change, so its derivative is zero. Its signed area grows linearly.', coefficient: true },
  linear: { label: 'ax', name: 'Linear', expression: 'a*x', primitive: 'a*x^2/2', formula: 'ax', slope: 'a', integral: 'ax<sup>2</sup>/2 + C', note: 'A line has the same slope everywhere. Its accumulated area is quadratic.', coefficient: true },
  power: { label: 'ax^n', name: 'Power', expression: 'a*x^n', primitive: 'a*x^(n+1)/(n+1)', formula: 'ax<sup>n</sup>', slope: 'anx<sup>n &minus; 1</sup>', integral: 'ax<sup>n + 1</sup>/(n + 1) + C', note: 'The power rule brings the exponent down and subtracts one. Integration reverses that step.', coefficient: true },
  log: { label: 'log(x)', name: 'Natural logarithm', expression: 'log(x)', primitive: 'x*log(x)-x', formula: 'ln x', slope: '1/x', integral: 'x ln x &minus; x + C', note: 'Here log means the natural logarithm. Its slope is positive but decreases as x grows. The real domain is x > 0.' },
  reciprocal: { label: '1/x', name: 'Reciprocal', expression: '1/x', primitive: 'log(abs(x))', formula: '1/x', slope: '&minus;1/x<sup>2</sup>', integral: 'ln |x| + C', note: 'Zero separates two branches. An ordinary definite integral touching or crossing zero does not converge; each branch has its own integration constant.' },
  exp: { label: 'e^x', name: 'Exponential', expression: 'exp(x)', primitive: 'exp(x)', formula: 'e<sup>x</sup>', slope: 'e<sup>x</sup>', integral: 'e<sup>x</sup> + C', note: 'The natural exponential is its own derivative and an antiderivative of itself. Its value and slope always agree.' },
  sin: { label: 'sin(x)', name: 'Sine', expression: 'sin(x)', primitive: '-cos(x)', formula: 'sin x', slope: 'cos x', integral: '&minus;cos x + C', note: 'Sine rises fastest where cosine is one. Positive and negative lobes cancel in the signed integral over a full period. Angles are in radians.' },
  cos: { label: 'cos(x)', name: 'Cosine', expression: 'cos(x)', primitive: 'sin(x)', formula: 'cos x', slope: '&minus;sin x', integral: 'sin x + C', note: 'Cosine has horizontal tangents at its peaks and troughs. Its derivative is negative sine. Angles are in radians.' },
  sigmoid: { label: 'sigmoid(x)', name: 'Sigmoid', activation: true, color: '#087f72', formula: '&sigma;(x)', slope: '&sigma;(x)(1 &minus; &sigma;(x))', integral: 'softplus(x) + C', value: sigmoid, gradient: (position) => sigmoid(position) * sigmoid(-position), antiderivative: softplus, note: 'Sigmoid maps logits to probabilities between zero and one. Its maximum slope is 1/4 at zero; saturation at either end weakens gradient flow. Its antiderivative is softplus.' },
  tanh: { label: 'tanh(x)', name: 'Tanh', activation: true, color: '#a76613', formula: 'tanh x', slope: '1 &minus; tanh<sup>2</sup>x', integral: 'ln cosh x + C', value: Math.tanh, gradient: (position) => 1 - Math.tanh(position) ** 2, antiderivative: (position) => Math.abs(position) + Math.log1p(Math.exp(-2 * Math.abs(position))) - Math.LN2, note: 'Tanh is zero-centered and bounded between -1 and 1. It is useful for bounded continuous-action policies, but gradients shrink in its saturated tails.' },
  relu: { label: 'ReLU(x)', name: 'ReLU', activation: true, color: '#4169a1', formula: 'max(0, x)', slope: '0 (x < 0); 1 (x > 0)', integral: 'max(0, x)<sup>2</sup>/2 + C', value: (position) => Math.max(0, position), gradient: (position) => position === 0 ? NaN : position < 0 ? 0 : 1, antiderivative: (position) => Math.max(0, position) ** 2 / 2, note: 'ReLU has zero gradient for negative inputs and unit gradient for positive inputs. At zero its mathematical derivative is undefined; autodiff systems commonly choose zero. A persistently negative unit can stop receiving a learning signal.' },
  softplus: { label: 'softplus(x)', name: 'Softplus', activation: true, color: '#b04e75', formula: 'ln(1 + e<sup>x</sup>)', slope: '&sigma;(x)', integral: 'Numerical integration', value: softplus, gradient: sigmoid, numerical: true, note: 'Softplus is a smooth approximation to ReLU and can parameterize positive scales. Its derivative is sigmoid: unlike ReLU, it has a small positive slope even at negative inputs.' },
  silu: { label: 'SiLU(x)', name: 'SiLU / Swish', activation: true, color: '#6b5792', formula: 'x &sigma;(x)', slope: '&sigma;(x) + x &sigma;(x)&sigma;(&minus;x)', integral: 'Numerical integration', value: (position) => position * sigmoid(position), gradient: (position) => sigmoid(position) + position * sigmoid(position) * sigmoid(-position), numerical: true, note: 'SiLU multiplies an input by its sigmoid gate. It is smooth and non-monotonic, with a small negative-gradient region. SwiGLU uses SiLU inside a gated two-branch block; SiLU alone is not SwiGLU.' },
};

export const activationKeys = Object.keys(families).filter((key) => families[key].activation);

export function createModel(key, coefficient = 1, exponent = 2) {
  const family = families[key];
  if (!family) throw new Error('Unknown function family');
  if (family.activation) {
    const primitive = family.antiderivative ?? ((position) => position === 0 ? 0 : Math.sign(position) * integrate(family.value, Math.min(0, position), Math.max(0, position), 1e-9, 20));
    const connected = (lower, upper) => Number.isFinite(lower) && Number.isFinite(upper);
    return {
      family,
      domain: [-5, 5],
      value: family.value,
      slope: family.gradient,
      primitive,
      connected,
      integral: (lower, upper) => {
        if (!connected(lower, upper)) return NaN;
        if (lower === upper) return 0;
        return family.numerical
          ? Math.sign(upper - lower) * integrate(family.value, Math.min(lower, upper), Math.max(lower, upper), 1e-9, 20)
          : primitive(upper) - primitive(lower);
      },
    };
  }
  const valueCode = compile(family.expression);
  const slopeCode = derivative(family.expression, 'x').compile();
  const primitiveCode = compile(family.primitive);
  const valid = (position) => Number.isFinite(position) && (key !== 'log' || position > 0) && (key !== 'reciprocal' || position !== 0);
  const evaluate = (code, position) => {
    if (!valid(position)) return NaN;
    const result = code.evaluate({ x: position, a: coefficient, n: exponent });
    return Number.isFinite(result) ? result : NaN;
  };
  const connected = (lower, upper) => valid(lower) && valid(upper) && (key !== 'reciprocal' || Math.sign(lower) === Math.sign(upper));
  return {
    family,
    domain: key === 'log' ? [0.1, 5] : [-5, 5],
    value: (position) => evaluate(valueCode, position),
    slope: (position) => evaluate(slopeCode, position),
    primitive: (position) => evaluate(primitiveCode, position),
    connected,
    integral: (lower, upper) => connected(lower, upper) ? evaluate(primitiveCode, upper) - evaluate(primitiveCode, lower) : NaN,
  };
}

export function sample(domain, evaluate, count = 500) {
  const points = Array.from({ length: count + 1 }, (_, index) => {
    const position = domain[0] + (domain[1] - domain[0]) * index / count;
    return [position, evaluate(position)];
  });
  if (domain[0] * domain[1] < 0 && !points.some(([position]) => position === 0)) {
    const index = Math.ceil(-domain[0] / (domain[1] - domain[0]) * count);
    points.splice(index, 0, [0, evaluate(0)]);
  }
  return points;
}
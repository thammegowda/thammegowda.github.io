export const compositionRules = {
  sum: { name: 'Addition', expression: 'h(x) = f(x) + g(x)', derivative: "h'(x) = f'(x) + g'(x)" },
  product: { name: 'Product', expression: 'h(x) = f(x) g(x)', derivative: "h'(x) = f'(x) g(x) + f(x) g'(x)" },
  chain: { name: 'Chain', expression: 'h(x) = f(g(x))', derivative: "h'(x) = f'(g(x)) g'(x)" },
};

export const compositionFamilies = ['constant', 'linear', 'power', 'sin', 'cos', 'exp', 'sigmoid', 'tanh', 'softplus', 'silu'];

export function createComposition(rule, outer, inner) {
  if (!Object.hasOwn(compositionRules, rule)) throw new Error('Unknown derivative rule');
  const finite = (value) => Number.isFinite(value) ? value : NaN;
  function evaluate(position) {
    const innerValue = inner.value(position);
    const outerInput = rule === 'chain' ? innerValue : position;
    const outerValue = outer.value(outerInput);
    const outerSlope = outer.slope(outerInput);
    const innerSlope = inner.slope(position);
    const terms = rule === 'product' ? [outerSlope * innerValue, outerValue * innerSlope] : [outerSlope, innerSlope];
    const value = rule === 'sum' ? outerValue + innerValue : rule === 'product' ? outerValue * innerValue : outerValue;
    const slope = terms.every(Number.isFinite) ? (rule === 'chain' ? terms[0] * terms[1] : terms[0] + terms[1]) : NaN;
    return { outerInput, outerValue, innerValue, outerSlope, innerSlope, terms: terms.map(finite), value: finite(value), slope: Number.isFinite(value) ? finite(slope) : NaN };
  }
  return { evaluate, value: (position) => evaluate(position).value, slope: (position) => evaluate(position).slope };
}
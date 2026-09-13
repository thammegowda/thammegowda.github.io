import { createModel, families } from './math.js';

export function defaultState() {
  return { family: 'power', coefficient: 1, exponent: 2, point: 1, lower: 0, tangent: true, shade: true, compare: false };
}

export function readState(hash) {
  const state = defaultState();
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if (Object.hasOwn(families, params.get('family'))) state.family = params.get('family');
  const domain = createModel(state.family).domain;
  const limits = { coefficient: [-3, 3], exponent: [1, 6], point: domain, lower: domain };
  if (['log', 'reciprocal'].includes(state.family)) Object.assign(state, { lower: 1, point: 2 });
  for (const [key, [minimum, maximum]] of Object.entries(limits)) {
    const value = Number(params.get(key));
    const steps = key === 'exponent' ? 1 : key === 'coefficient' ? 10 : 20;
    if (params.has(key) && Number.isFinite(value)) state[key] = Math.max(minimum, Math.min(maximum, Math.round(value * steps) / steps));
  }
  for (const key of ['tangent', 'shade', 'compare']) if (params.has(key)) state[key] = params.get(key) !== 'false';
  return state;
}
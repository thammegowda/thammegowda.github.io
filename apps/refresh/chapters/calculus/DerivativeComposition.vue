<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue';
import { select } from 'd3';
import { ArrowRight, ArrowLeftRight, RotateCcw, ZoomIn, ZoomOut, Scan } from '@lucide/vue';
import { createModel, families } from './math.js';
import { compositionFamilies, compositionRules, createComposition } from './composition.js';
import { renderCompositionPlot } from './composition-plot.js';
import { format } from './presentation.js';

const defaults = () => ({ rule: 'sum', outer: 'sin', inner: 'power', outerCoefficient: 1, innerCoefficient: 1, outerPower: 2, innerPower: 2, point: 1 });
const state = reactive(defaults());
const outer = computed(() => createModel(state.outer, state.outerCoefficient, state.outerPower));
const inner = computed(() => createModel(state.inner, state.innerCoefficient, state.innerPower));
const composite = computed(() => createComposition(state.rule, outer.value, inner.value));
const result = computed(() => composite.value.evaluate(state.point));
const rule = computed(() => compositionRules[state.rule]);
const root = ref(null);
const plots = {};
const view = shallowRef({ k: 1, x: 0, y: 0 });
let observer;
const display = (value) => !Number.isFinite(value) ? 'Out of range' : Math.abs(value) >= 10000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001) ? value.toExponential(2) : format(value);
const stages = computed(() => {
  const outerStage = { id: 'outer', title: state.rule === 'chain' ? 'f(u)' : 'f(x)', argument: state.rule === 'chain' ? 'u = g(x)' : 'x', point: result.value.outerInput, value: outer.value.value, slope: outer.value.slope, color: '#087f72' };
  const innerStage = { id: 'inner', title: 'g(x)', argument: 'x', point: state.point, value: inner.value.value, slope: inner.value.slope, color: '#a76613' };
  const resultStage = { id: 'result', title: 'h(x)', argument: 'x', point: state.point, value: composite.value.value, slope: composite.value.slope, color: '#b04e75' };
  return state.rule === 'chain' ? [innerStage, outerStage, resultStage] : [outerStage, innerStage, resultStage];
});
const terms = computed(() => {
  const current = result.value;
  const labels = state.rule === 'product' ? ["f'(x) g(x)", "f(x) g'(x)"] : ["f'(x)", "g'(x)"];
  return [
    { label: labels[0], value: current.terms[0], color: '#087f72' },
    { label: labels[1], value: current.terms[1], color: '#a76613' },
    { label: "h'(x)", value: current.slope, color: '#b04e75' },
  ];
});
const termMaximum = computed(() => Math.max(1e-10, ...terms.value.map((term) => Math.abs(term.value)).filter(Number.isFinite)));
function barStyle(term) {
  const width = Number.isFinite(term.value) ? Math.abs(term.value) / termMaximum.value * 48 : 0;
  return { width: `${width}%`, left: `${term.value < 0 ? 50 - width : 50}%`, background: term.color };
}
function draw() {
  for (const stage of stages.value) renderCompositionPlot(plots[stage.id], {
    ...stage, view: view.value, onViewChange: (next) => { view.value = next; }, changeZoom,
    label: `${stage.title} at ${stage.argument} = ${display(stage.point)}; slope ${display(stage.slope(stage.point))}`,
  });
}
function changeZoom(factor) {
  if (factor === null) { view.value = { k: 1, x: 0, y: 0 }; return; }
  const current = view.value;
  const scale = Math.max(0.25, Math.min(32, current.k * factor));
  const ratio = scale / current.k;
  view.value = { k: scale, x: 0.5 - (0.5 - current.x) * ratio, y: 0.5 - (0.5 - current.y) * ratio };
}
function reset() { Object.assign(state, defaults()); changeZoom(null); }
function swap() {
  const { outer: outerKey, outerCoefficient, outerPower } = state;
  Object.assign(state, { outer: state.inner, outerCoefficient: state.innerCoefficient, outerPower: state.innerPower, inner: outerKey, innerCoefficient: outerCoefficient, innerPower: outerPower });
}
watch(state, draw, { flush: 'post' });
watch(view, draw, { flush: 'post' });
watch(() => [state.rule, state.outer, state.inner, state.outerCoefficient, state.innerCoefficient, state.outerPower, state.innerPower], () => changeZoom(null), { flush: 'sync' });
onMounted(() => { observer = new ResizeObserver(draw); observer.observe(root.value); draw(); });
onBeforeUnmount(() => {
  observer?.disconnect();
  for (const container of Object.values(plots)) select(container).select('svg').on('.zoom', null).on('.composition', null);
});
</script>

<template>
  <section ref="root" class="composition-lab" aria-labelledby="composition-heading">
    <div class="composition-header">
      <h2 id="composition-heading">Derivative composition</h2>
      <fieldset class="rule-switch"><legend class="visually-hidden">Derivative rule</legend><label v-for="(entry, key) in compositionRules" :key="key"><input v-model="state.rule" type="radio" name="derivative-rule" :value="key"><span>{{ entry.name }}</span></label></fieldset>
      <button class="reset" type="button" aria-label="Reset composition" title="Reset composition" @click="reset"><RotateCcw :size="17" aria-hidden="true" /></button>
    </div>
    <div class="composition-inputs">
      <fieldset v-for="[prefix, symbol] in [['outer', 'f'], ['inner', 'g']]" :key="prefix" class="function-definition">
        <legend>{{ symbol }}(x)</legend>
        <label :for="`composition-${prefix}`">Function {{ symbol }}</label>
        <select :id="`composition-${prefix}`" v-model="state[prefix]"><option v-for="key in compositionFamilies" :key="key" :value="key">{{ families[key].label }} / {{ families[key].name }}</option></select>
        <div v-if="families[state[prefix]].coefficient" class="composition-parameter"><label :for="`composition-${prefix}-coefficient`">Coefficient <i>a</i><output>{{ state[`${prefix}Coefficient`].toFixed(1) }}</output></label><input :id="`composition-${prefix}-coefficient`" v-model.number="state[`${prefix}Coefficient`]" type="range" min="-2" max="2" step="0.1"></div>
        <div v-if="state[prefix] === 'power'" class="composition-parameter"><label :for="`composition-${prefix}-power`">Power <i>n</i></label><select :id="`composition-${prefix}-power`" v-model.number="state[`${prefix}Power`]"><option v-for="exponent in [1, 2, 3, 4]" :key="exponent" :value="exponent">{{ exponent }}</option></select></div>
      </fieldset>
      <div class="composition-point"><label for="composition-point">Evaluation point <i>x</i><output>{{ state.point.toFixed(2) }}</output></label><input id="composition-point" v-model.number="state.point" type="range" min="-2" max="2" step="0.01"><button class="swap-functions" type="button" title="Swap f and g" @click="swap"><ArrowLeftRight :size="16" aria-hidden="true" />Swap f and g</button></div>
    </div>
    <div class="composition-equation"><h3>{{ rule.expression }}</h3><p>{{ rule.derivative }}</p></div>
    <div class="composition-view-controls">
      <span>All plots</span><output aria-label="Composition zoom level">{{ Math.round(view.k * 100) }}%</output>
      <div class="chart-toolbar" role="group" aria-label="Synchronized composition plot controls">
        <button type="button" aria-label="Zoom in all plots" title="Zoom in all plots (+)" :disabled="view.k >= 32" @click="changeZoom(1.5)"><ZoomIn :size="18" aria-hidden="true" /></button>
        <button type="button" aria-label="Zoom out all plots" title="Zoom out all plots (-)" :disabled="view.k <= 0.25" @click="changeZoom(1 / 1.5)"><ZoomOut :size="18" aria-hidden="true" /></button>
        <button type="button" aria-label="Reset all plot views" title="Reset all plot views (0)" @click="changeZoom(null)"><Scan :size="18" aria-hidden="true" /></button>
      </div>
    </div>
    <div v-if="state.rule === 'chain'" class="chain-flow" aria-label="Chain rule value flow">
      <div><span>x</span><output>{{ display(state.point) }}</output></div><ArrowRight aria-hidden="true" :size="20" />
      <div><span>u = g(x)</span><output id="composition-intermediate">{{ display(result.innerValue) }}</output></div><ArrowRight aria-hidden="true" :size="20" />
      <div><span>h = f(u)</span><output>{{ display(result.value) }}</output></div>
    </div>
    <div class="composition-plots">
      <section v-for="stage in stages" :key="stage.id" :aria-label="`${stage.title} plot`">
        <div class="composition-plot-heading" :style="{ color: stage.color }"><h3>{{ stage.title }}</h3><output>{{ display(stage.value(stage.point)) }}</output></div>
        <div :ref="element => plots[stage.id] = element" class="composition-chart"></div>
        <div class="composition-plot-caption"><span>{{ stage.argument }} = {{ display(stage.point) }}</span><span>Slope {{ display(stage.slope(stage.point)) }}</span></div>
      </section>
    </div>
    <div class="derivative-breakdown">
      <h3>{{ state.rule === 'chain' ? 'Local slope factors' : 'Signed derivative contributions' }}</h3>
      <div v-if="state.rule === 'chain'" class="chain-factors">
        <div><span>f'(g(x))</span><output id="composition-outer-slope">{{ display(result.outerSlope) }}</output></div><b>&times;</b>
        <div><span>g'(x)</span><output id="composition-inner-slope">{{ display(result.innerSlope) }}</output></div><b>=</b>
        <div><span>h'(x)</span><output id="composition-slope">{{ display(result.slope) }}</output></div>
      </div>
      <div v-else class="contribution-bars">
        <div v-for="(term, index) in terms" :key="term.label" class="contribution-row"><span>{{ term.label }}</span><div class="contribution-track"><div :style="barStyle(term)"></div></div><output :id="index === 2 ? 'composition-slope' : `composition-term-${index}`">{{ display(term.value) }}</output></div>
      </div>
      <p v-if="state.rule === 'product'" class="composition-calculation">({{ display(result.outerSlope) }} &times; {{ display(result.innerValue) }}) + ({{ display(result.outerValue) }} &times; {{ display(result.innerSlope) }}) = {{ display(result.slope) }}</p>
      <p v-if="state.rule === 'sum'" class="composition-calculation">{{ display(result.outerSlope) }} + ({{ display(result.innerSlope) }}) = {{ display(result.slope) }}</p>
    </div>
  </section>
</template>
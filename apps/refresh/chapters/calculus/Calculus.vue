<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue';
import { select, zoom, zoomIdentity } from 'd3';
import { RotateCcw, ZoomIn, ZoomOut, Scan } from '@lucide/vue';
import { activationKeys, createModel, families } from './math.js';
import { defaultState, readState } from './state.js';
import { format, activationDashes } from './presentation.js';
import { renderPlot } from './plot.js';

const state = reactive(readState(location.hash));
const exponentInput = ref(state.exponent);
const model = computed(() => createModel(state.family, state.coefficient, state.exponent));
const domain = computed(() => model.value.domain);
const comparing = computed(() => Boolean(model.value.family.activation && state.compare));
const invalid = computed(() => !model.value.connected(state.lower, state.point));
const areaValue = computed(() => `${model.value.family.numerical ? '\u2248 ' : ''}${format(model.value.integral(state.lower, state.point))}`);
const groups = [false, true].map((activation) => ({
  label: activation ? 'ML activations' : 'Calculus essentials',
  families: Object.entries(families).filter(([, family]) => Boolean(family.activation) === activation),
}));
const activationModels = activationKeys.map((key) => ({ key, model: createModel(key) }));
const domainNote = computed(() => state.family === 'log' ? 'Domain: x > 0. Natural logarithm.'
  : state.family === 'reciprocal' ? 'Domain: x \u2260 0. Vertical plots are clipped near the pole.'
    : ['sin', 'cos'].includes(state.family) ? 'Domain: all real numbers. Angles in radians.' : 'Domain: all real numbers.');
const integralCaption = computed(() => invalid.value ? 'No accumulated total exists across the pole at zero.'
  : state.point === state.lower ? 'The bounds coincide: no area has been collected yet. A(b) = 0.'
    : `The shaded region between f(t) and zero, from ${state.lower.toFixed(2)} to ${state.point.toFixed(2)}, has signed area ${areaValue.value}. Green adds; rose subtracts. ${state.point < state.lower ? 'Reversed bounds reverse the sign.' : 'Regions below zero subtract from the total.'}`);
const status = computed(() => {
  if (state.family === 'relu' && state.point === 0) return 'ReLU has no derivative at x = 0: the left slope is 0 and the right slope is 1. No tangent is drawn. A framework gradient of 0 is an autodiff convention, not a mathematical derivative.';
  if (invalid.value) return 'Undefined interval: the bounds touch or cross x = 0. No finite ordinary definite integral exists here.';
  return `At x = ${state.point.toFixed(2)}, f(x) = ${format(model.value.value(state.point))}, slope = ${format(model.value.slope(state.point))}, and signed integral from ${state.lower.toFixed(2)} = ${areaValue.value}.`;
});

const visuals = ref(null);
const functionPlot = ref(null);
const derivativePlot = ref(null);
const integralPlot = ref(null);
const transform = shallowRef(zoomIdentity);
let observer;
const zoomBehavior = zoom().scaleExtent([0.5, 32]).on('zoom', (event) => {
  transform.value = event.transform;
  drawPlot('function', functionPlot.value, model.value.value);
});

function drawPlot(kind, container, evaluate) {
  if (!container) return;
  renderPlot({ container, kind, evaluate, model: model.value, state, transform: transform.value, zoomBehavior, changeZoom });
}

function draw() {
  drawPlot('function', functionPlot.value, model.value.value);
  drawPlot('derivative', derivativePlot.value, model.value.slope);
  drawPlot('integral', integralPlot.value, model.value.value);
}

function changeZoom(factor) {
  const svg = select(functionPlot.value).select('svg');
  if (factor === null) svg.call(zoomBehavior.transform, zoomIdentity);
  else svg.call(zoomBehavior.scaleBy, factor);
}

function reset() {
  Object.assign(state, defaultState());
  exponentInput.value = state.exponent;
  transform.value = zoomIdentity;
  draw();
}

function updateExponent(event) {
  const control = event.target;
  if (control.value !== '' && control.validity.valid) state.exponent = Number(control.value);
}

function persistState() {
  history.replaceState(null, '', `${location.pathname}${location.search}#${new URLSearchParams(state)}`);
}

watch(() => state.family, (family) => {
  state.lower = ['log', 'reciprocal'].includes(family) ? 1 : 0;
  state.point = ['log', 'reciprocal'].includes(family) ? 2 : 1;
}, { flush: 'sync' });
watch(() => [state.family, state.coefficient, state.exponent, state.compare], () => {
  transform.value = zoomIdentity;
}, { flush: 'sync' });
watch(state, () => { persistState(); draw(); }, { flush: 'post' });

onMounted(() => {
  persistState();
  draw();
  observer = new ResizeObserver(draw);
  observer.observe(visuals.value);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  select(functionPlot.value).select('svg').on('.zoom', null).on('.zoom-controls', null);
});
</script>

<template>
  <div class="explorer">
    <aside class="controls" aria-label="Function and interval controls">
      <div class="controls-heading">
        <h2>Function lab</h2>
        <button class="reset" type="button" aria-label="Reset all controls" title="Reset all controls" @click="reset"><RotateCcw :size="17" aria-hidden="true" /></button>
      </div>
      <label for="family">Function</label>
      <select id="family" v-model="state.family">
        <optgroup v-for="group in groups" :key="group.label" :label="group.label">
          <option v-for="[key, family] in group.families" :key="key" :value="key">{{ family.label }} / {{ family.name }}</option>
        </optgroup>
      </select>
      <div id="coefficient-control" class="parameter" :hidden="!model.family.coefficient">
        <label for="coefficient">Coefficient <i>a</i><output id="coefficient-value">{{ state.coefficient.toFixed(2) }}</output></label>
        <input id="coefficient" v-model.number="state.coefficient" type="range" min="-3" max="3" step="0.1">
      </div>
      <div id="exponent-control" class="parameter" :hidden="state.family !== 'power'">
        <label for="exponent">Power <i>n</i></label>
        <input id="exponent" v-model="exponentInput" type="number" min="1" max="6" step="1" @input="updateExponent">
      </div>
      <hr>
      <div class="parameter"><label for="point">Evaluation point <i>x</i><output id="point-value">{{ state.point.toFixed(2) }}</output></label><input id="point" v-model.number="state.point" type="range" :min="domain[0]" :max="domain[1]" step="0.05"></div>
      <div class="parameter"><label for="lower">Integral starts at <i>b</i><output id="lower-value">{{ state.lower.toFixed(2) }}</output></label><input id="lower" v-model.number="state.lower" type="range" :min="domain[0]" :max="domain[1]" step="0.05"></div>
      <div class="checks"><label><input id="tangent" v-model="state.tangent" type="checkbox">Tangent line</label><label><input id="shade" v-model="state.shade" type="checkbox">Signed area</label></div>
      <div id="compare-control" class="checks" :hidden="!model.family.activation"><label><input id="compare" v-model="state.compare" type="checkbox">Compare activations</label></div>
      <div class="interval"><span>Integration interval</span><strong id="interval">{{ state.lower.toFixed(2) }} &rarr; {{ state.point.toFixed(2) }}</strong></div>
      <p id="domain-note" class="domain-note">{{ domainNote }}</p>
      <a class="source-link" href="./calculus.adoc">AsciiDoc source &nearr;</a>
    </aside>
    <div ref="visuals" class="visuals">
      <section class="primary-plot" aria-labelledby="function-heading">
        <div class="plot-heading">
          <div><p class="eyebrow">01 / The function</p><h2 id="function-heading">f(x) = <span id="formula" v-html="model.family.formula"></span></h2></div>
          <div class="plot-value"><span>f(x)</span><output id="value">{{ format(model.value(state.point)) }}</output></div>
          <div class="chart-toolbar" role="group" aria-label="Plot view controls">
            <button id="zoom-in" type="button" aria-label="Zoom in" title="Zoom in (+)" :disabled="transform.k >= 32" @click="changeZoom(1.5)"><ZoomIn :size="18" aria-hidden="true" /></button>
            <button id="zoom-out" type="button" aria-label="Zoom out" title="Zoom out (-)" :disabled="transform.k <= 0.5" @click="changeZoom(1 / 1.5)"><ZoomOut :size="18" aria-hidden="true" /></button>
            <button id="zoom-reset" type="button" aria-label="Reset plot view" title="Reset plot view (0)" @click="changeZoom(null)"><Scan :size="18" aria-hidden="true" /></button>
          </div>
        </div>
        <div id="function-plot" ref="functionPlot" class="chart chart-main"></div>
        <div class="plot-legend"><span class="legend-function" :hidden="comparing">Function</span><span class="legend-tangent">Tangent</span><span class="legend-area">Signed area b &rarr; x</span></div>
        <div id="activation-legend" class="activation-legend" aria-label="Activation comparison legend" :hidden="!comparing">
          <span v-for="(key, index) in activationKeys" :key="key"><svg width="25" height="10" aria-hidden="true"><line x1="0" x2="25" y1="5" y2="5" :stroke="families[key].color" stroke-width="2" :stroke-dasharray="activationDashes[index]"></line></svg>{{ families[key].name }}</span>
        </div>
      </section>
      <div class="secondary-plots">
        <section aria-labelledby="derivative-heading">
          <div class="plot-heading"><div><p class="eyebrow">02 / Rate of change</p><h2 id="derivative-heading">f'(x) = <span id="slope-formula" v-html="model.family.slope"></span></h2></div><div class="plot-value derivative-value"><span>Slope at x</span><output id="slope">{{ format(model.slope(state.point)) }}</output></div></div>
          <div id="derivative-plot" ref="derivativePlot" class="chart"></div><p class="plot-caption">The tangent's slope, at every point.</p>
        </section>
        <section aria-labelledby="integral-heading">
          <div class="plot-heading"><div><p class="eyebrow">03 / Area collected</p><h2 id="integral-heading">&int;<sub id="integral-lower">{{ state.lower.toFixed(2) }}</sub><sup id="integral-upper">{{ state.point.toFixed(2) }}</sup> f(t) dt</h2></div><div class="plot-value integral-value"><span>Net signed area</span><output id="integral">{{ areaValue }}</output></div></div>
          <div id="integral-plot" ref="integralPlot" class="chart"></div><p id="integral-caption" class="plot-caption">{{ integralCaption }}</p>
        </section>
      </div>
      <div id="comparison-table" class="comparison-table" :hidden="!comparing">
        <table><caption>Activations at x = <span id="comparison-point">{{ state.point.toFixed(2) }}</span></caption><thead><tr><th scope="col">Activation</th><th scope="col">Output</th><th scope="col">Gradient</th></tr></thead>
          <tbody><tr v-for="activation in activationModels" :key="activation.key" :data-family="activation.key" :class="{ 'selected-activation': activation.key === state.family }"><th scope="row">{{ activation.model.family.name }}</th><td class="comparison-value">{{ format(activation.model.value(state.point)) }}</td><td class="comparison-slope">{{ format(activation.model.slope(state.point)) }}</td></tr></tbody>
        </table>
      </div>
      <div class="insight"><div><p class="eyebrow">The connection</p><p id="family-note">{{ model.family.note }}</p></div><div class="antiderivative"><span id="primitive-label">{{ model.family.numerical ? 'Area calculation' : 'Antiderivative' }}</span><strong id="primitive-formula" v-html="model.family.integral"></strong></div></div>
      <p id="math-status" class="math-status" :class="{ invalid }" role="status" aria-live="polite">{{ status }}</p>
    </div>
  </div>
</template>
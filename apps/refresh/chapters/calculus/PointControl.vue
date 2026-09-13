<script setup>
import { computed } from 'vue';
import { pythonLanguage } from '@codemirror/lang-python';

const props = defineProps({ source: String, result: Object });
const emit = defineEmits(['change']);
const parameter = computed(() => {
  const assignments = pythonLanguage.parser.parse(props.source).topNode.getChildren('AssignStatement')
    .filter(node => node.firstChild?.name === 'VariableName' && props.source.slice(node.firstChild.from, node.firstChild.to) === 'point');
  if (assignments.length !== 1) return null;
  const operator = assignments[0].firstChild.nextSibling;
  const value = operator?.nextSibling;
  if (operator?.name !== 'AssignOp' || !value || value.nextSibling || !['Number', 'UnaryExpression'].includes(value.name)) return null;
  const number = Number(props.source.slice(value.from, value.to).replaceAll('_', ''));
  return Number.isFinite(number) ? { from: value.from, to: value.to, value: number } : null;
});
const bounds = computed(() => {
  const points = props.result?.plots?.[0]?.series?.[0]?.points;
  return {
    min: Math.min(points?.[0]?.[0] ?? -5, parameter.value?.value ?? -5),
    max: Math.max(points?.at(-1)?.[0] ?? 5, parameter.value?.value ?? 5),
  };
});
function change(event) {
  if (!parameter.value) return;
  const value = Number(event.target.value);
  if (!Number.isFinite(value)) return;
  emit('change', props.source.slice(0, parameter.value.from) + value + props.source.slice(parameter.value.to));
}
</script>

<template>
  <label class="calculus-point">
    <span>Point</span>
    <input type="range" aria-label="Evaluation point" :min="bounds.min" :max="bounds.max" step="0.01" :value="parameter?.value ?? 0" :disabled="!parameter" :title="parameter ? 'Evaluation point' : 'Point must be a single numeric assignment'" @input="change">
    <output aria-label="Evaluation point value">{{ parameter ? parameter.value.toFixed(2) : 'n/a' }}</output>
  </label>
</template>
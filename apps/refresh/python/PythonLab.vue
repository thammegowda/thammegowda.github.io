<script setup>
import { ref } from 'vue';
import PythonWorkspace from './PythonWorkspace.vue';
import PythonPlots from './PythonPlots.vue';
import ValueGrid from './ValueGrid.vue';
import './style.css';

defineProps({ defaultCode: String, title: String, download: String, frameworkStart: String });
const emit = defineEmits(['state']);
const workspace = ref(null);
const execution = ref({ result: null, busy: false, stale: false, error: '' });
const groups = [{ key: 'inputs', title: 'Inputs' }, { key: 'outputs', title: 'Outputs' }];
</script>

<template>
  <section class="python-lab">
    <PythonWorkspace ref="workspace" :default-code="defaultCode" :title="title" :download="download" :framework-start="frameworkStart" @state="execution = $event; emit('state', $event)"><template #toolbar><slot name="toolbar" /></template></PythonWorkspace>
    <section class="py-visualization" aria-label="Python visualization" :aria-busy="execution.busy">
      <header class="py-result-heading"><h2>Visualization</h2><span v-if="execution.stale || execution.error" class="py-stale">{{ execution.result ? 'Last successful run; current code not applied' : 'No successful run' }}</span><span v-else-if="execution.busy">Running...</span><span v-else>Current code</span></header>
      <slot name="controls" :source="execution.source ?? defaultCode" :result="execution.result" :update-source="nextSource => workspace?.updateSource(nextSource)" />
      <p v-if="!execution.result" class="py-empty">Awaiting Python results</p>
      <template v-else>
        <PythonPlots v-if="execution.result.plots?.length" :plots="execution.result.plots" :preserve-view="execution.preserveView" />
        <template v-if="execution.result.inputs.length || execution.result.outputs.length || !execution.result.plots?.length">
          <section v-for="group in groups" :key="group.key" class="py-value-group" :data-group="group.key" :aria-label="group.title">
            <header><h2>{{ group.title }}</h2><span>{{ execution.result[group.key].length }} values</span></header>
            <p v-if="!execution.result[group.key].length" class="py-empty">No exported values</p>
            <div class="py-variables"><ValueGrid v-for="variable in execution.result[group.key]" :key="variable.name" :variable="variable" /></div>
          </section>
          <div class="py-color-key"><i></i>Positive<i></i>Negative</div>
        </template>
      </template>
    </section>
  </section>
</template>
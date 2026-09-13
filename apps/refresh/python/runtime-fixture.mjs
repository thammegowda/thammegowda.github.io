import { readFile } from 'node:fs/promises';
import { loadPyodide } from 'pyodide';

const runtime = await loadPyodide();
await runtime.loadPackage('numpy');
const driver = await readFile(new URL('./runner.py', import.meta.url), 'utf8');

export function runPython(code, emit = () => {}) {
  const globals = runtime.toPy({ payload: JSON.stringify({ code }) });
  globals.set('emit_output', emit);
  try { return JSON.parse(runtime.runPython(driver, { globals })); }
  finally { globals.destroy(); }
}
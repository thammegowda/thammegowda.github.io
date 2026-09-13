import { loadPyodide } from '../pyodide/pyodide.mjs';

let ready;
self.onmessage = async ({ data: request }) => {
  let initialized = false;
  try {
    ready ??= loadPyodide({
      indexURL: new URL('../pyodide/', import.meta.url).href,
      stdin: () => { throw new Error('Interactive stdin is not available; edit values in the Python source.'); },
    }).then(async (runtime) => {
      await runtime.loadPackage('numpy');
      const numpy = runtime.pyimport('numpy');
      numpy.destroy();
      return runtime;
    });
    const runtime = await ready;
    initialized = true;
    self.postMessage({ id: request.id, type: 'running' });
    const globals = runtime.toPy({ payload: JSON.stringify(request.payload) });
    globals.set('emit_output', (stream, text) => {
      self.postMessage({ id: request.id, type: 'output', stream, text });
    });
    try {
      const output = runtime.runPython(request.driver, { globals });
      self.postMessage({ id: request.id, type: 'result', output: JSON.parse(output) });
    } finally {
      globals.destroy();
    }
  } catch (error) {
    self.postMessage({ id: request.id, type: 'error', startup: !initialized, error: String(error).slice(-8000) });
  }
};
import { select, scaleLinear, axisBottom, axisLeft, line, area, extent } from 'd3';
import { activationKeys, createModel, families, sample } from './math.js';
import { format, activationDashes } from './presentation.js';

const colors = { function: '#087f72', derivative: '#b04e75', integral: '#a76613' };
const activationModels = activationKeys.map((key) => ({ key, model: createModel(key) }));

export function renderPlot({ container, kind, evaluate, model, state, transform, zoomBehavior, changeZoom }) {
  const width = Math.max(container.clientWidth, 240);
  const height = kind === 'function' ? width * 0.75 : 218;
  const accumulation = kind === 'integral';
  const comparing = !accumulation && model.family.activation && state.compare;
  let overlays = comparing ? activationModels.map(({ key, model }) => ({ key, model, points: sample(model.domain, kind === 'derivative' ? model.slope : model.value) })) : [];
  const { point, lower, tangent, shade } = state;
  const validInterval = model.connected(lower, point);
  let domain = model.domain;
  if (accumulation && validInterval) {
    const buffer = Math.max(Math.abs(point - lower) * 0.15, 0.1);
    domain = [Math.max(domain[0], Math.min(lower, point) - buffer), Math.min(domain[1], Math.max(lower, point) + buffer)];
    if (state.family === 'reciprocal') {
      if (lower > 0) domain[0] = Math.max(domain[0], Math.min(lower, point) / 2);
      else domain[1] = Math.min(domain[1], Math.max(lower, point) / 2);
    }
  }
  const margin = { top: accumulation ? 32 : 16, right: 22, bottom: accumulation ? 48 : 34, left: 48 };
  let points = sample(domain, evaluate);
  const finite = (comparing ? overlays.flatMap((overlay) => overlay.points) : points).filter((point) => Number.isFinite(point[1]));
  let [minimum, maximum] = extent(finite, (point) => point[1]);
  minimum = Math.min(minimum ?? -1, 0);
  maximum = Math.max(maximum ?? 1, 0);
  if (minimum === maximum) { minimum -= 1; maximum += 1; }
  if (state.family === 'reciprocal' && !accumulation) [minimum, maximum] = kind === 'derivative' ? [-10, 1] : [-6, 6];
  const padding = (maximum - minimum) * 0.1;
  let scaleX = scaleLinear().domain(domain).range([margin.left, width - margin.right]);
  let scaleY = scaleLinear().domain([minimum - padding, maximum + padding]).nice().range([height - margin.bottom, margin.top]);
  if (kind === 'function') {
    scaleX = transform.rescaleX(scaleX);
    scaleY = transform.rescaleY(scaleY);
    domain = scaleX.domain();
    points = sample(domain, evaluate);
    overlays = overlays.map((overlay) => ({ ...overlay, points: sample(domain, overlay.model.value) }));
  }
  const svg = select(container).selectAll('svg').data([null]).join('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('role', 'img').attr('aria-label', `${kind} plot for ${model.family.name}; current value ${format(evaluate(state.point))}`);
  if (accumulation) svg.attr('aria-label', `Signed area under ${model.family.name} from ${lower} to ${point}: ${format(model.integral(lower, point))}`);
  svg.selectAll('*').remove();
  if (kind === 'function') {
    zoomBehavior.extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);
    svg.property('__zoom', transform).call(zoomBehavior)
      .attr('tabindex', 0).attr('aria-label', `Interactive function plot for ${model.family.name}. Wheel or pinch to zoom; drag to pan. Plus and minus zoom, arrow keys pan, zero resets.`)
      .on('keydown.zoom-controls', (event) => {
        if (['+', '=', '-', '0'].includes(event.key)) {
          event.preventDefault();
          changeZoom(event.key === '0' ? null : event.key === '-' ? 1 / 1.5 : 1.5);
        } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          const distance = 40 / transform.k;
          svg.call(zoomBehavior.translateBy, event.key === 'ArrowLeft' ? distance : event.key === 'ArrowRight' ? -distance : 0, event.key === 'ArrowUp' ? distance : event.key === 'ArrowDown' ? -distance : 0);
        }
      });
  }
  svg.append('title').text(`${kind}: ${model.family.name}`);
  if (accumulation && !validInterval) {
    svg.append('text').attr('class', 'accumulation-empty').attr('x', width / 2).attr('y', height / 2).attr('text-anchor', 'middle').text('Undefined across x = 0');
    return;
  }
  svg.append('defs').append('clipPath').attr('id', `clip-${kind}`).append('rect').attr('x', margin.left).attr('y', margin.top).attr('width', width - margin.left - margin.right).attr('height', height - margin.top - margin.bottom);
  svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${height - margin.bottom})`).call(axisBottom(scaleX).ticks(width < 400 ? 5 : 10).tickSize(-(height - margin.bottom - margin.top)).tickFormat(''));
  const verticalTicks = kind === 'function' ? 10 : 5;
  svg.append('g').attr('class', 'grid').attr('transform', `translate(${margin.left},0)`).call(axisLeft(scaleY).ticks(verticalTicks).tickSize(-(width - margin.left - margin.right)).tickFormat(''));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height - margin.bottom})`).call(axisBottom(scaleX).ticks(width < 400 ? 5 : 10));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${margin.left},0)`).call(axisLeft(scaleY).ticks(verticalTicks));
  svg.append('text').attr('class', 'axis-label').attr('x', accumulation ? margin.left : width - 10).attr('y', height - 10).attr('text-anchor', accumulation ? 'start' : 'end').text(accumulation ? 't' : 'x');
  if (accumulation) svg.append('text').attr('class', 'axis-label').attr('x', margin.left).attr('y', 13).text('f(t)');
  const graph = svg.append('g').attr('clip-path', `url(#clip-${kind})`);
  const drawLine = line().defined((point) => Number.isFinite(point[1])).x((point) => scaleX(point[0])).y((point) => scaleY(point[1]));
  graph.append('line').attr('class', 'zero-axis').attr('x1', margin.left).attr('x2', width - margin.right).attr('y1', scaleY(0)).attr('y2', scaleY(0));
  if (domain[0] < 0) graph.append('line').attr('class', 'zero-axis').attr('x1', scaleX(0)).attr('x2', scaleX(0)).attr('y1', margin.top).attr('y2', height - margin.bottom);
  if (((kind === 'function' && shade) || accumulation) && validInterval) {
    const interval = [Math.min(lower, point), Math.max(lower, point)];
    const areaPoints = sample(interval, (position) => model.value(position), 200);
    for (const sign of [1, -1]) {
      const shape = area().x((entry) => scaleX(entry[0])).y0(scaleY(0)).y1((entry) => scaleY(sign > 0 ? Math.max(0, entry[1]) : Math.min(0, entry[1])));
      graph.append('path').datum(areaPoints).attr('class', 'signed-area').attr('d', shape).attr('fill', sign * Math.sign(point - lower) >= 0 ? '#087f72' : '#b04e75').attr('opacity', accumulation ? 0.3 : 0.16);
    }
    graph.append('line').attr('class', 'bound-line').attr('x1', scaleX(lower)).attr('x2', scaleX(lower)).attr('y1', margin.top).attr('y2', height - margin.bottom);
  }
  for (const [index, overlay] of overlays.entries()) {
    if (overlay.key === state.family) continue;
    graph.append('path').datum(overlay.points).attr('class', 'comparison-curve').attr('data-family', overlay.key).attr('d', drawLine).attr('fill', 'none').attr('stroke', overlay.model.family.color).attr('stroke-width', 1.8).attr('stroke-dasharray', activationDashes[index]);
  }
  const selectedColor = comparing ? model.family.color : colors[kind];
  graph.append('path').datum(points).attr('class', 'curve').attr('d', drawLine).attr('stroke', accumulation ? '#bfc8c2' : selectedColor).attr('stroke-dasharray', comparing ? activationDashes[activationKeys.indexOf(state.family)] : null);
  if (kind === 'derivative' && (state.family === 'relu' || comparing)) {
    for (const value of [0, 1]) graph.append('circle').attr('class', 'relu-kink').attr('cx', scaleX(0)).attr('cy', scaleY(value)).attr('r', 4).attr('fill', 'white').attr('stroke', comparing ? families.relu.color : colors.derivative).attr('stroke-width', 1.5);
  }
  if (accumulation) {
    graph.append('path').datum(sample([lower, point], evaluate, 200)).attr('class', 'curve accumulation-path').attr('d', drawLine).attr('stroke', colors.function);
    const startOnLeft = lower <= point;
    svg.append('text').attr('class', 'accumulation-label').attr('x', startOnLeft ? margin.left : width - margin.right).attr('y', 27).attr('text-anchor', startOnLeft ? 'start' : 'end').text(`From b = ${lower.toFixed(2)}`);
    svg.append('text').attr('class', 'accumulation-label').attr('x', width - margin.right).attr('y', height - 10).attr('text-anchor', 'end').text(`x = ${point.toFixed(2)}`);
  }
  if (kind === 'function' && tangent && Number.isFinite(model.slope(point))) {
    const tangentPoints = domain.map((position) => [position, model.value(point) + model.slope(point) * (position - point)]);
    graph.append('path').datum(tangentPoints).attr('class', 'tangent-line').attr('d', drawLine);
  }
  graph.append('line').attr('class', 'probe-line').attr('x1', scaleX(point)).attr('x2', scaleX(point)).attr('y1', margin.top).attr('y2', height - margin.bottom);
  if (Number.isFinite(evaluate(point))) graph.append('circle').attr('class', 'probe').attr('cx', scaleX(point)).attr('cy', scaleY(evaluate(point))).attr('r', 5).attr('fill', selectedColor);
}

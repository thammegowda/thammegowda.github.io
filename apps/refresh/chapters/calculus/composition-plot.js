import { select, scaleLinear, axisBottom, axisLeft, extent, line, zoom, zoomIdentity } from 'd3';
import { sample } from './math.js';

export function renderCompositionPlot(container, { id, value, slope, point, color, label, view, onViewChange, changeZoom }) {
  if (!container || !container.clientWidth) return;
  const width = container.clientWidth;
  const height = 270;
  const margin = { top: 18, right: 20, bottom: 34, left: 56 };
  const domain = [point - 5, point + 5];
  let points = sample(domain, value, 500);
  const finite = points.filter((entry) => Number.isFinite(entry[1]));
  let [minimum, maximum] = extent(finite, (entry) => entry[1]);
  minimum = Math.min(0, minimum ?? -1);
  maximum = Math.max(0, maximum ?? 1);
  const padding = (maximum - minimum || 1) * 0.12;
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const transform = zoomIdentity.translate(
    margin.left * (1 - view.k) + view.x * plotWidth,
    margin.top * (1 - view.k) + view.y * plotHeight,
  ).scale(view.k);
  const scaleX = transform.rescaleX(scaleLinear().domain(domain).range([margin.left, width - margin.right]));
  const scaleY = transform.rescaleY(scaleLinear().domain([minimum - padding, maximum + padding]).nice().range([height - margin.bottom, margin.top]));
  points = sample(scaleX.domain(), value, Math.max(500, Math.ceil(plotWidth * 2)));
  const svg = select(container).selectAll('svg').data([null]).join('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('role', 'img').attr('tabindex', 0)
    .attr('aria-label', `${label}. Synchronized plot: wheel or pinch to zoom, drag to pan; plus/minus zoom, arrow keys pan, zero resets.`);
  const behavior = zoom().scaleExtent([0.25, 32])
    .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
    .on('zoom', (event) => {
      const next = event.transform;
      onViewChange({ k: next.k, x: (next.x - margin.left * (1 - next.k)) / plotWidth, y: (next.y - margin.top * (1 - next.k)) / plotHeight });
    });
  svg.property('__zoom', transform).call(behavior).on('keydown.composition', (event) => {
    if (['+', '=', '-', '0'].includes(event.key)) {
      event.preventDefault();
      changeZoom(event.key === '0' ? null : event.key === '-' ? 1 / 1.5 : 1.5);
    } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      onViewChange({ ...view,
        x: view.x + (event.key === 'ArrowLeft' ? 0.1 : event.key === 'ArrowRight' ? -0.1 : 0),
        y: view.y + (event.key === 'ArrowUp' ? 0.1 : event.key === 'ArrowDown' ? -0.1 : 0),
      });
    }
  });
  svg.selectAll('*').remove();
  svg.append('title').text(label);
  svg.append('defs').append('clipPath').attr('id', `composition-clip-${id}`).append('rect').attr('x', margin.left).attr('y', margin.top).attr('width', width - margin.left - margin.right).attr('height', height - margin.top - margin.bottom);
  svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${height - margin.bottom})`).call(axisBottom(scaleX).ticks(5).tickSize(-(height - margin.top - margin.bottom)).tickFormat(''));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height - margin.bottom})`).call(axisBottom(scaleX).ticks(5));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${margin.left},0)`).call(axisLeft(scaleY).ticks(5, '.2~g'));
  const graph = svg.append('g').attr('clip-path', `url(#composition-clip-${id})`);
  graph.append('line').attr('class', 'zero-axis').attr('x1', margin.left).attr('x2', width - margin.right).attr('y1', scaleY(0)).attr('y2', scaleY(0));
  const drawLine = line().defined((entry) => Number.isFinite(entry[1])).x((entry) => scaleX(entry[0])).y((entry) => scaleY(entry[1]));
  graph.append('path').datum(points).attr('class', 'composition-curve').attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2.5).attr('d', drawLine);
  const current = value(point);
  const gradient = slope(point);
  if (Number.isFinite(current) && Number.isFinite(gradient)) {
    graph.append('path').datum(scaleX.domain().map((position) => [position, current + gradient * (position - point)])).attr('class', 'composition-tangent').attr('fill', 'none').attr('stroke', color).attr('stroke-dasharray', '6 4').attr('stroke-width', 1.5).attr('d', drawLine);
    graph.append('line').attr('class', 'probe-line').attr('x1', scaleX(point)).attr('x2', scaleX(point)).attr('y1', margin.top).attr('y2', height - margin.bottom);
    graph.append('circle').attr('cx', scaleX(point)).attr('cy', scaleY(current)).attr('r', 4).attr('fill', color).attr('stroke', 'white').attr('stroke-width', 2);
  }
}
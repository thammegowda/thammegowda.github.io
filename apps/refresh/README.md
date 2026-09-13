# refresh

A standalone, browser-side book of mathematics and statistics. The contents page
lists ordered chapters, with unpublished chapters marked Planned rather than
linked to empty pages. Calculus is the first published chapter: constants, linear
and power functions, natural logarithms, reciprocals,
exponentials, sine, cosine, and five ML activations (sigmoid, tanh, ReLU, softplus,
and SiLU). Activation comparison overlays all five outputs and derivatives on
shared axes, with a table at the current evaluation point. Linear Algebra,
Probability Theory, and Hypothesis Testing are planned chapters. Existing draft
notes remain in their chapter directories and are not published yet.

## Build

Requires Node.js 22+ and Asciidoctor (`gem install asciidoctor`). From this directory:

```sh
npm ci
npm test
npm run build
```

The build generates `dist/index.html` from the chapter catalog. Each published
chapter's `content.adoc` becomes `dist/<id>.html`, with a downloadable
`dist/<id>.adoc` source. Interactive chapters have their own JavaScript and CSS
bundles under `dist/chapters/`; common dependency chunks live in `dist/chunks/`.
The contents page does not load Vue, calculus code, or its math/plotting dependencies.
All runtime dependencies are local. No Hugo or server-side runtime is required.
The generated `THIRD-PARTY.txt` retains dependency license notices and should
travel with the deployed directory.

## Structure

```text
app.js                     Chapter catalog, book rendering, browser navigation
book.test.mjs              Catalog and navigation tests
shell.html                 Shared document wrapper
style.css                  Book layout, typography, and reference sections
build.mjs                  AsciiDoc pages and chapter-local asset bundles
playwright.config.js       Browser tests against a running static preview
chapters/
  calculus/
  content.adoc           Prose and the Vue mount container
  index.js               Vue mount and chapter stylesheet import
  Calculus.vue           Reactive controls, computed values, D3 lifecycle
  presentation.js        Numeric formatting and activation line styles
   plot.js                D3 renderer with explicit inputs
   math.js                Function families, derivatives, integrals, sampling
   state.js               Default parameters and URL-state validation
   style.css              Calculus controls, plots, responsive layout
   math.test.mjs          Mathematical regression tests
   state.test.mjs         URL-state regression tests
  calculus.browser.spec.js  Vue controls, plots, navigation, responsive tests
  linear-algebra/
   content.adoc           Unpublished draft notes
  probability/
   content.adoc           Unpublished draft notes
```

Keep chapter-specific math, UI, state, tests, and assets inside its directory.
Chapters must not import one another. Promote a utility to shared app code only
when multiple chapters actually need the same behavior. There is no global
subject-switching component, client-side router, or shared mutable chapter state.

Interactive chapters use Vue 3 Composition API single-file components with
`<script setup>`. The build uses the official `@vue/compiler-sfc` compiler with
esbuild; templates compile ahead of time, so no runtime template compiler or
server rendering is needed. Keep styles in chapter CSS imported from `index.js`,
not SFC style blocks. Vue and its compiler are pinned to matching versions.

Vue owns controls and displayed values. D3 exclusively owns the SVG descendants
of empty plot containers referenced by Vue. Draw after reactive updates and
disconnect observers and D3 handlers on unmount. Mathematical models and URL
validation remain plain JavaScript with no Vue dependency. Formula `v-html`
bindings use only trusted formulas defined in the mathematical models.

## Adding a chapter

1. Add an entry to the `chapters` array in `app.js`: a unique lowercase hyphenated `id`, `title`,
  `description`, and `status: 'planned'`. Catalog order is book order. The ID
  `index` is reserved for the contents page.
2. Author `chapters/<id>/content.adoc`. Use AsciiDoc sections for the chapter's
  explanations; text-only chapters need no JavaScript.
3. For an interactive chapter, add `index.js`, set `interactive: true` in the
  catalog, and mount a Vue component into a chapter-specific container in the
  AsciiDoc (for example, `<div data-calculus></div>` inside a passthrough block).
  Use `createApp(Component).mount(container)` as in the calculus entry point.
  Import local CSS from the entry point. Esbuild follows local module imports,
  creates a separate chapter bundle, and the build links its emitted CSS.
4. Optionally set `reference` to an AsciiDoc heading ID, without `#`, to enable
  the header's Reference link. Add colocated `*.test.mjs` files for behavior.
5. Set `status: 'published'` when ready, then run `npm test` and `npm run build`.
  The page, contents link, and previous/next published-chapter navigation are
  generated automatically. Beyond the catalog entry, no shared logic or build
  changes are needed.

Use relative links and bundled imports for chapter resources; avoid external
runtime dependencies. Planned entries do not require source files, allowing the
contents to outline chapters such as Hypothesis Testing before authoring begins.

Re-run `npm run build` after edits. The site's Hugo server watches the generated
directory; source files are not compiled automatically by Hugo.

## Browser tests

`npm test` runs framework-independent math, URL-state, and book-rendering tests.
For the Vue/D3 integration checks, build and serve the app, then run:

```sh
npx playwright install chromium
npm run test:browser
```

The default preview URL is `http://localhost:1414/app/refresh/`. To test another
static server, set `REFRESH_BASE_URL` to the deployed app's base URL, including
the trailing slash. For example, with the site's default `make serve` port:

```sh
REFRESH_BASE_URL=http://localhost:1313/app/refresh/ npm run test:browser
```

These tests require an already-running preview; they do not start a server.
They cover control bindings, URL restoration, comparison tables, invalid and
numerical integrals, zoom/pan/reset, chapter navigation, and responsive layouts.
Screenshots and failure traces are written under ignored `test-results/`.

## Host or relocate

Copy the contents of `dist/` to any static HTTP host, at any path. Assets and links
are relative, and the app does not use remote fonts, APIs, or CDN dependencies.
Copy this whole source directory (excluding `node_modules/` and `dist/`) to move
the development project. Node and Asciidoctor are build-time requirements only.

The parent website mounts `dist/` at `/app/refresh/`. Direct `hugo` commands
require the app to have been built first; `make build` and `make serve` do this.
URL fragments preserve function selection, parameters, bounds, and display toggles.
Calculus is now at `calculus.html`; old root URLs containing a `family` parameter
are forwarded there with their hash intact. The catalog's optional
`legacyStateKey` exists for this compatibility path, not for new chapter routing.

## Plot navigation

The top plot supports D3 wheel zoom, touch pinch, and drag-to-pan. The icon
buttons zoom in, zoom out, and reset the view. With the plot focused, `+`/`-`
zoom, arrow keys pan, and `0` resets. Zoom is limited to 0.5x through 32x.

Axes, comparison curves, tangents, and shading are redrawn for the visible range.
The evaluation point and integration bounds do not change when navigating.
Moving those controls preserves the zoom; changing the function, coefficient,
power, or comparison mode resets it. Zoom is local view state, not part of the
shared URL. The two lower plots retain their own scales and do not zoom.

## Mathematical conventions

- `log(x)` means the natural logarithm, with real domain `x > 0`.
- Powers use integer exponents from 1 to 6; coefficients range from -3 to 3.
- Trigonometric arguments use radians.
- Shading is signed: positive contributions are green, negative contributions
  are rose, and reversed bounds reverse the sign.
- The area panel plots `f(t)` with the selected interval shaded, not the
  antiderivative curve. Its signed total is `F(x) - F(b)` on the connected domain
  containing `b`. Shading remains visible here when the main plot's signed-area
  overlay is disabled. Intervals touching or crossing the pole of `1/x` are undefined, not assigned
  a Cauchy principal value. Reciprocal plots are clipped vertically near the pole.
- Plot samples are for visualization only; derivatives come from Math.js symbolic
  differentiation or explicit analytic activation formulas. ReLU's derivative at
  zero is undefined and shown as a gap with open endpoints, without a tangent.
- Softplus and SiLU areas use `integrate-adaptive-simpson` with tolerance `1e-9`
  and maximum depth 20 on the bounded plotting domain. These totals carry an
  approximation sign. Other functions use exact primitives evaluated numerically.
- Comparison mode uses shared scales and distinct colors and dash patterns for
  all five activations. The tangent, shaded area, and headline values belong to
  the selected activation. Comparison mode is preserved in URL state.
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { parse, compileScript } from '@vue/compiler-sfc';
import { chapters, escapeHtml, renderContents, renderChapterNavigation, validateChapters } from './app.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const destination = path.join(root, 'dist');
validateChapters(chapters);
const published = chapters.filter((chapter) => chapter.status === 'published');
const shell = await readFile(path.join(root, 'shell.html'), 'utf8');
const renderPage = (values) => shell.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '');
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
const bundles = await build({
  entryPoints: Object.fromEntries([
    ['app', path.join(root, 'app.js')],
    ...published.filter((chapter) => chapter.interactive).map((chapter) => [`chapters/${chapter.id}`, path.join(root, 'chapters', chapter.id, 'index.js')]),
  ]),
  outdir: destination,
  bundle: true,
  plugins: [{
    name: 'vue',
    setup(builder) {
      builder.onLoad({ filter: /\.vue$/ }, async ({ path: filename }) => {
        const source = await readFile(filename, 'utf8');
        const { descriptor, errors } = parse(source, { filename });
        if (errors.length) throw errors[0];
        if (descriptor.styles.length) throw new Error('Import chapter CSS from index.js instead of using SFC style blocks.');
        const compiled = compileScript(descriptor, {
          id: path.relative(root, filename),
          inlineTemplate: true,
          isProd: true,
        });
        return { contents: compiled.content, loader: 'js', resolveDir: path.dirname(filename) };
      });
    },
  }],
  define: {
    __VUE_OPTIONS_API__: 'false',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  },
  splitting: true,
  chunkNames: 'chunks/[name]-[hash]',
  metafile: true,
  minify: true,
  format: 'esm',
  target: 'es2022',
  legalComments: 'eof',
});
for (const chapter of published) {
  const source = path.join(root, 'chapters', chapter.id, 'content.adoc');
  const content = execFileSync('asciidoctor', ['-s', '-o', '-', source], { encoding: 'utf8' });
  const script = `chapters/${chapter.id}.js`;
  const output = Object.entries(bundles.metafile.outputs).find(([filename]) => path.resolve(filename) === path.join(destination, script))?.[1];
  const stylesheet = output?.cssBundle ? path.relative(destination, path.resolve(output.cssBundle)).split(path.sep).join('/') : null;
  const assets = (chapter.interactive ? `<script type="module" src="./${script}"></script>` : '')
    + (stylesheet ? `<link rel="stylesheet" href="./${stylesheet}">` : '');
  const navigation = `<a class="contents-link" href="./">Contents</a>${chapter.reference ? `<a class="reference-link" href="#${escapeHtml(chapter.reference)}">Reference</a>` : ''}`;
  const html = renderPage({ title: escapeHtml(chapter.title), description: escapeHtml(chapter.description), content, assets, navigation, pagination: renderChapterNavigation(chapters, chapter.id) });
  await writeFile(path.join(destination, `${chapter.id}.html`), html);
  await cp(source, path.join(destination, `${chapter.id}.adoc`));
}
await writeFile(path.join(destination, 'index.html'), renderPage({ title: 'Contents', description: 'refresh: mathematics and statistics, chapter by chapter.', content: renderContents(chapters) }));
await cp(path.join(root, 'style.css'), path.join(destination, 'style.css'));
const notices = [];
const modules = path.join(root, 'node_modules');
for (const entry of await readdir(modules, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
  const packages = entry.name.startsWith('@')
    ? (await readdir(path.join(modules, entry.name))).map((name) => `${entry.name}/${name}`)
    : [entry.name];
  for (const name of packages) {
    const directory = path.join(modules, name);
    for (const filename of await readdir(directory)) {
      if (/^licen[sc]e(\..*)?$/i.test(filename)) {
        notices.push(`${name}\n${await readFile(path.join(directory, filename), 'utf8')}`);
      }
    }
  }
}
await writeFile(path.join(destination, 'THIRD-PARTY.txt'), notices.join('\n\n---\n\n'));
console.log(`Built contents and ${published.length} chapters in ${destination}`);
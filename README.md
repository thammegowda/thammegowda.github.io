# gowda.ai

Personal website built with [Hugo](https://gohugo.io/) and [PaperMod](https://github.com/adityatelange/hugo-PaperMod) theme.

## Setup

```bash
git clone --recurse-submodules git@github.com:thammegowda/thammegowda.github.io.git
cd thammegowda.github.io
```

Requires: Hugo ≥0.146.0 (extended), asciidoctor, Python 3 + PyYAML.

## Development

```bash
make serve    # Dev server with live reload at http://localhost:1313
```

## Build & Deploy

```bash
make build    # Production build → public/
make publish  # Same as build (deployed via GitHub Actions)
```

Pushes to `master` auto-deploy via GitHub Actions to GitHub Pages.

# gowda.ai

Personal website built with [Hugo](https://gohugo.io/) and [PaperMod](https://github.com/adityatelange/hugo-PaperMod) theme.

## Setup

```bash
git clone git@github.com:thammegowda/thammegowda.github.io.git
cd thammegowda.github.io

# Initialize submodules and install Hugo Extended, Asciidoctor, Python, and PyYAML
./setup.sh
```

`setup.sh` supports macOS and Ubuntu; `make setup` is an equivalent wrapper. On
macOS, install [Homebrew](https://brew.sh/) first; Ubuntu uses `apt`. Python
dependencies are installed in a local `.venv`.

Ubuntu installs the latest Hugo Extended release by default. To select a
specific version, run `HUGO_VERSION=0.147.9 ./setup.sh`.

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

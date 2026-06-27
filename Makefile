.PHONY: help setup build serve clean publish data

# Hugo Extended is required by the PaperMod theme (SCSS asset pipeline).
# `make setup` auto-detects the latest Hugo; override with e.g.
#   make setup HUGO_VERSION=0.147.9
HUGO_VERSION ?=

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

setup: ## Install build dependencies on Ubuntu (Hugo Extended, Asciidoctor, Python)
	sudo apt-get update
	sudo apt-get install -y --no-install-recommends \
		asciidoctor python3 python3-yaml python-is-python3 curl ca-certificates
	@echo ">> Installing Hugo Extended (PaperMod needs the extended/SCSS build)..."
	@set -e; \
	ver="$(HUGO_VERSION)"; \
	if [ -z "$$ver" ]; then \
		ver=$$(curl -fsSL https://api.github.com/repos/gohugoio/hugo/releases/latest | grep -oP '"tag_name":\s*"v\K[^"]+'); \
	fi; \
	arch=$$(dpkg --print-architecture); \
	echo "   installing hugo_extended v$$ver ($$arch)"; \
	tmp=$$(mktemp -d); \
	curl -fsSL "https://github.com/gohugoio/hugo/releases/download/v$$ver/hugo_extended_$${ver}_linux-$${arch}.deb" -o "$$tmp/hugo.deb"; \
	sudo dpkg -i "$$tmp/hugo.deb" || sudo apt-get install -f -y; \
	rm -rf "$$tmp"
	@echo "Setup complete. Versions:"
	@hugo version
	@asciidoctor --version | head -1

data: ## Parse pubs.bib into Hugo data file
	python scripts/parse_bib.py

build: data ## Build the site for production
	hugo --gc --minify --baseURL "https://gowda.ai/"

serve: data ## Start development server with live reload
	hugo server --buildDrafts --buildFuture --bind 0.0.0.0

publish: data ## Build for production (same as build)
	hugo --gc --minify --baseURL "https://gowda.ai/"

clean: ## Remove generated files
	rm -rf public/ resources/
	@echo "Cleaned hugo build artifacts"

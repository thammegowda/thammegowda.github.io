.PHONY: help setup build serve clean publish data

# Hugo Extended is required by the PaperMod theme (SCSS asset pipeline).
# Ubuntu setup auto-detects the latest Hugo; override with e.g.
#   make setup HUGO_VERSION=0.147.9
HUGO_VERSION ?=
PYTHON ?=
VENV ?= .venv

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

setup: ## Install build dependencies on macOS or Ubuntu
	@HUGO_VERSION="$(HUGO_VERSION)" PYTHON="$(PYTHON)" VENV="$(VENV)" ./setup.sh

data: ## Parse pubs.bib into Hugo data file
	@PYTHON="$(PYTHON)" VENV="$(VENV)" ./setup.sh --python-deps
	"$(VENV)/bin/python" scripts/parse_bib.py

build: data ## Build the site for production
	hugo --gc --minify --baseURL "https://gowda.ai/"

serve: data ## Start development server with live reload
	hugo server --buildDrafts --buildFuture --bind 0.0.0.0

publish: data ## Build for production (same as build)
	hugo --gc --minify --baseURL "https://gowda.ai/"

clean: ## Remove generated files
	rm -rf public/ resources/
	@echo "Cleaned hugo build artifacts"

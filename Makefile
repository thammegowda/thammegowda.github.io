.PHONY: help build serve clean publish data

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

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

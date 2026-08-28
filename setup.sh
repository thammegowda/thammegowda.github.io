#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PYTHON="${PYTHON:-}"
VENV="${VENV:-.venv}"
VENV_PYTHON="$VENV/bin/python"
PYTHON_DEPS_STAMP="$VENV/.requirements-installed"

fail() {
    printf 'error: %s\n' "$*" >&2
    exit 1
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

resolve_python() {
    [[ -z "$PYTHON" ]] || return

    if [[ "$(uname -s)" == "Darwin" ]] && command -v brew >/dev/null 2>&1; then
        local homebrew_prefix
        homebrew_prefix="$(brew --prefix python 2>/dev/null || true)"
        if [[ -x "$homebrew_prefix/bin/python3" ]]; then
            PYTHON="$homebrew_prefix/bin/python3"
        fi
    fi

    PYTHON="${PYTHON:-python3}"
}

setup_python() {
    resolve_python
    require_command "$PYTHON"

    if [[ ! -x "$VENV_PYTHON" ]]; then
        "$PYTHON" -m venv "$VENV"
    fi

    if [[ ! -f "$PYTHON_DEPS_STAMP" || requirements.txt -nt "$PYTHON_DEPS_STAMP" ]]; then
        "$VENV_PYTHON" -m pip install -r requirements.txt
        touch "$PYTHON_DEPS_STAMP"
    fi
}

setup_macos() {
    command -v brew >/dev/null 2>&1 || fail "Homebrew is required: https://brew.sh"
    HOMEBREW_NO_ASK=1 brew install hugo asciidoctor python
}

setup_ubuntu() {
    [[ -r /etc/os-release ]] || fail "Unable to identify this Linux distribution"
    source /etc/os-release
    [[ "${ID:-}" == "ubuntu" ]] || fail "Linux setup currently supports Ubuntu only"

    local -a sudo_command=()
    if (( EUID != 0 )); then
        require_command sudo
        sudo_command=(sudo)
    fi

    require_command apt-get
    "${sudo_command[@]}" apt-get update
    "${sudo_command[@]}" apt-get install -y --no-install-recommends \
        asciidoctor python3 python3-venv curl ca-certificates

    local version="${HUGO_VERSION:-}"
    if [[ -z "$version" ]]; then
        version="$(curl -fsSL https://api.github.com/repos/gohugoio/hugo/releases/latest |
            sed -n 's/.*"tag_name":[[:space:]]*"v\([^"]*\)".*/\1/p')"
    fi
    [[ -n "$version" ]] || fail "Unable to determine the latest Hugo version"

    local architecture
    architecture="$(dpkg --print-architecture)"
    case "$architecture" in
        amd64 | arm64) ;;
        *) fail "Unsupported Ubuntu architecture: $architecture" ;;
    esac

    printf 'Installing Hugo Extended v%s (%s)\n' "$version" "$architecture"
    local temp_dir
    temp_dir="$(mktemp -d)"
    trap 'rm -rf "$temp_dir"' EXIT
    curl -fsSL \
        "https://github.com/gohugoio/hugo/releases/download/v${version}/hugo_extended_${version}_linux-${architecture}.deb" \
        -o "$temp_dir/hugo.deb"
    "${sudo_command[@]}" apt-get install -y "$temp_dir/hugo.deb"
    rm -rf "$temp_dir"
    trap - EXIT
}

setup_submodules() {
    require_command git
    git submodule update --init --recursive
}

check_setup() {
    require_command hugo
    require_command asciidoctor

    local hugo_version
    hugo_version="$(hugo version)"
    [[ "$hugo_version" == *+extended* ]] || fail "Hugo Extended is required, found: $hugo_version"

    printf 'Setup complete. Versions:\n%s\n' "$hugo_version"
    asciidoctor --version
    "$VENV_PYTHON" -c 'import yaml; print("PyYAML", yaml.__version__)'
}

case "${1:-}" in
    --python-deps)
        [[ $# -eq 1 ]] || fail "Usage: $0 [--python-deps]"
        setup_python
        ;;
    "")
        case "$(uname -s)" in
            Darwin) setup_macos ;;
            Linux) setup_ubuntu ;;
            *) fail "Unsupported operating system: $(uname -s)" ;;
        esac
        setup_submodules
        setup_python
        check_setup
        ;;
    *)
        fail "Usage: $0 [--python-deps]"
        ;;
esac
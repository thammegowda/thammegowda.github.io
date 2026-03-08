#!/usr/bin/env python3
"""Parse pubs.bib and generate Hugo data file (YAML) for publications page."""

import re
import yaml
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
ROOT = SCRIPT_DIR.parent
BIB_FILE = ROOT / "static" / "files" / "pubs.bib"
OUT_FILE = ROOT / "data" / "publications.yaml"


def parse_bib(text: str) -> list[dict]:
    """Simple BibTeX parser that extracts key fields from each entry."""
    entries = []

    # Find entry starts and extract with brace balancing
    entry_starts = [(m.start(), m.group(1).lower(), m.group(2).strip())
                    for m in re.finditer(r'@(\w+)\s*\{([^,]+),', text)]

    for idx, (start, entry_type, key) in enumerate(entry_starts):
        # Find the balanced closing brace
        brace_depth = 0
        body_start = text.index(',', start) + 1
        pos = start
        for i in range(start, len(text)):
            if text[i] == '{':
                brace_depth += 1
            elif text[i] == '}':
                brace_depth -= 1
                if brace_depth == 0:
                    body = text[body_start:i]
                    break
        else:
            continue  # unbalanced, skip

        entry = {
            'key': key,
            'type': entry_type,
        }

        # Parse fields: match field = {value} or field = "value"
        # For brace-delimited: handle one level of nesting
        brace_pattern = re.compile(r'(\w+)\s*=\s*\{((?:[^{}]|\{[^{}]*\})*)\}', re.DOTALL)
        # For quote-delimited
        quote_pattern = re.compile(r'(\w+)\s*=\s*"((?:[^"\\]|\\.)*)"', re.DOTALL)

        def clean_value(field_value):
            field_value = field_value.replace('\n', ' ')
            field_value = re.sub(r'\s+', ' ', field_value)
            field_value = field_value.replace('{\\v{r}}', 'ř')
            field_value = field_value.replace("{\\'e}", 'é')
            field_value = field_value.replace("{\\'c}", 'ć')
            field_value = field_value.replace("{\\\"o}", 'ö')
            field_value = field_value.replace("{\\~n}", 'ñ')
            field_value = re.sub(r'\{([^}]*)\}', r'\1', field_value)
            field_value = re.sub(r"\\['`\"](\w)", r'\1', field_value)
            field_value = field_value.replace('\\', '')
            return field_value.strip()

        for fm in brace_pattern.finditer(body):
            entry[fm.group(1).lower()] = clean_value(fm.group(2))
        for fm in quote_pattern.finditer(body):
            fname = fm.group(1).lower()
            if fname not in entry:  # brace values take priority
                entry[fname] = clean_value(fm.group(2))

        # Extract year
        if 'year' in entry:
            try:
                entry['year_int'] = int(entry['year'])
            except ValueError:
                entry['year_int'] = 0

        # Build formatted citation
        authors = entry.get('author', '')
        title = entry.get('title', '')
        year = entry.get('year', '')
        venue = entry.get('booktitle', entry.get('journal', ''))
        url = entry.get('url', '')
        doi = entry.get('doi', '')

        entry['authors_formatted'] = authors
        entry['title_formatted'] = title
        entry['venue'] = venue
        entry['url'] = url
        entry['doi'] = doi

        # Reconstruct BibTeX for display (use original body text)
        entry['bibtex'] = f'@{entry_type}{{{key},\n{body.strip()}\n}}'

        entries.append(entry)

    # Sort by year descending
    entries.sort(key=lambda e: e.get('year_int', 0), reverse=True)
    return entries


def main():
    print(f"Parsing {BIB_FILE}...")
    text = BIB_FILE.read_text()
    entries = parse_bib(text)
    print(f"  Found {len(entries)} entries")

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_FILE, 'w') as f:
        yaml.dump(entries, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

    print(f"  Written to {OUT_FILE}")


if __name__ == '__main__':
    main()

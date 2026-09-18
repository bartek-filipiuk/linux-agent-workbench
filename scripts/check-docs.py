#!/usr/bin/env python3
"""Check repository-local links/anchors in maintained release documentation."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
files = [ROOT / name for name in ['README.md','CONTRIBUTING.md','ROADMAP.md','SECURITY.md','THIRD_PARTY_NOTICES.md']]
files += list((ROOT/'docs').glob('*.md')) + list((ROOT/'docs/research').glob('*.md'))
files += list((ROOT/'docs/benchmarks/browser-poc').glob('*.md'))
count=0
for file in files:
    source=re.sub(r'```.*?```','',file.read_text(),flags=re.S)
    for target in re.findall(r'\]\(([^)]+)\)',source):
        if target.startswith(('http:','https:','mailto:')):continue
        name, _, anchor=target.partition('#')
        destination=(file.parent/name).resolve() if name else file
        assert destination.exists(), f'{file.relative_to(ROOT)}: missing {target}'
        if anchor and destination.suffix=='.md':
            text=destination.read_text()
            ids=set(re.findall(r'<a id="([^"]+)"',text))
            for heading in re.findall(r'^#+\s+(.+)$',text,re.M):
                ids.add(re.sub(r'[^\w\- ]','',heading.lower()).replace(' ','-'))
            assert anchor in ids, f'{file.relative_to(ROOT)}: missing anchor {target}'
        count+=1
print(f'Checked {count} local links/anchors in {len(files)} maintained Markdown files.')

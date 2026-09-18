"""Download the audited upstream revisions and install the locked Python environment."""
import io
import hashlib
import json
from pathlib import Path, PurePosixPath
import subprocess
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parent
PINS = {'jev-ultrafast': '452c1ad2dd628008f1d5608f28158d76e49e6cc0',
        'browser-use': 'd8110c5ff87ccba887aaa726cdb780f2f84bef8d'}
for repo, sha in PINS.items():
    dest = ROOT / 'vendor' / repo
    if dest.exists():
        print(f'Keeping existing {repo}; delete vendor/{repo} to download the pin again.')
        continue
    data = urllib.request.urlopen(f'https://codeload.github.com/browser-use/{repo}/tar.gz/{sha}', timeout=60).read()
    with tarfile.open(fileobj=io.BytesIO(data)) as archive:
        for member in archive.getmembers():
            parts = PurePosixPath(member.name).parts[1:]
            if not parts or '..' in parts:
                continue
            target = dest.joinpath(*parts)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            elif member.isfile():
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(archive.extractfile(member).read())
manifest = json.loads((ROOT / 'sources.json').read_text())
for repo, source in manifest.items():
    for filename, expected in source['files'].items():
        actual = hashlib.sha256((ROOT / 'vendor' / repo / filename).read_bytes()).hexdigest()
        if actual != expected:
            raise SystemExit(f'Upstream source mismatch: {repo}/{filename}')
subprocess.run(['uv', 'venv', '--python', '3.12', '.venv'], cwd=ROOT, check=True)
subprocess.run(['uv', 'pip', 'sync', '--python', '.venv/bin/python', 'requirements.lock'], cwd=ROOT, check=True)

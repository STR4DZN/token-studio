"""Build and verify the installable release ZIP; no source or nested module folder."""
from pathlib import Path
import hashlib
import json
import shutil
import zipfile

root = Path(__file__).resolve().parent.parent
module = root / 'release' / 'token-studio'
manifest = json.loads((module / 'module.json').read_text())
assets = root / 'release' / 'assets'
assets.mkdir(parents=True, exist_ok=True)
archive = assets / 'token-studio.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as out:
    for file in sorted(module.rglob('*')):
        if file.is_file():
            out.write(file, file.relative_to(module).as_posix())
with zipfile.ZipFile(archive) as check:
    assert check.testzip() is None, 'Corrupt ZIP entry'
    assert json.loads(check.read('module.json')) == manifest
    assert 'scripts/foundry.js' in check.namelist()
    assert not any(n.startswith(('node_modules/', 'codigo-fonte/', 'token-studio/')) for n in check.namelist())
shutil.copyfile(module / 'module.json', assets / 'module.json')
checksums = ''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n'
                    for p in [assets / 'module.json', archive])
(assets / 'SHA256SUMS.txt').write_text(checksums)
print(f'Release ZIP validated: {archive} ({archive.stat().st_size} bytes)')

"""Rebuild the standalone download from tracked source (no dependencies required)."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
source = root / 'example/encrypted-data-payment'
shared = {
    'lib/progress.ts': root / 'components/tutorials/encrypted-data-session.ts',
    'lib/node-session.ts': root / 'components/tutorials/browser-node-session.ts',
}
output = root / 'public/downloads/fiber-encrypted-data-payment.zip'
with ZipFile(output, 'w', compression=ZIP_DEFLATED) as archive:
    for path in sorted(source.rglob('*')):
        relative = path.relative_to(source)
        if not path.is_file() or any(part in {'node_modules', '.next'} for part in relative.parts) or path.name.endswith('.tsbuildinfo') or path.name == 'next-env.d.ts':
            continue
        data = shared.get(relative.as_posix(), path).read_bytes()
        info = ZipInfo(f'encrypted-data-payment/{relative.as_posix()}', date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, data)
print(f'Packaged {output.relative_to(root)}')

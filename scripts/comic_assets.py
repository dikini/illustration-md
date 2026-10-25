#!/usr/bin/env python3
"""Explicit acceptance and read-only catalogue of a local comic series.

No model calls, prompt execution, freshness decisions or rendering.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import tempfile
from urllib.parse import unquote, urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from illustration_md.prepare import resolve_artwork  # noqa: E402
from illustration_md.png import validate_png  # noqa: E402


def digest(data):
    return hashlib.sha256(data).hexdigest()


def local_file(root, value):
    if not isinstance(value, str) or not value:
        raise ValueError('expected a nonempty local relative path')
    url = urlsplit(value)
    path = Path(unquote(url.path))
    target = (root / path).resolve()
    if (url.scheme or url.netloc or url.query or url.fragment or path.is_absolute()
            or not target.is_relative_to(root) or not target.is_file()):
        raise ValueError(f'missing or escaping local file: {value}')
    return target


def load_series(path):
    root = path.resolve().parent
    data = json.loads(path.read_text(encoding='utf-8'))
    if (not isinstance(data, dict) or type(data.get('version')) is not int
            or data['version'] != 1 or not isinstance(data.get('id'), str)
            or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', data['id'])):
        raise ValueError('series requires version 1 and a stable lower-case id')
    references = data.get('references')
    pages = data.get('pages')
    if not isinstance(references, list) or not references or not isinstance(pages, list):
        raise ValueError('series requires nonempty references and a pages list')
    snapshots = []
    ids = set()
    for reference in references:
        if (not isinstance(reference, dict) or not isinstance(reference.get('id'), str)
                or not reference['id'].strip() or reference['id'] in ids
                or not isinstance(reference.get('role'), str) or not reference['role'].strip()):
            raise ValueError('references need unique ids and nonempty roles')
        ids.add(reference['id'])
        target = local_file(root, reference.get('path'))
        snapshots.append({**reference, 'sha256': digest(target.read_bytes())})
    resolved_pages = [local_file(root, page) for page in pages]
    if len(set(resolved_pages)) != len(resolved_pages):
        raise ValueError('duplicate catalogue page')
    if len({page.parent for page in resolved_pages}) != len(resolved_pages):
        raise ValueError('each catalogue page needs its own asset directory')
    return root, data, snapshots, resolved_pages


def accept(arguments):
    root, series, references, pages = load_series(arguments.series)
    if arguments.reference:
        selected = set(arguments.reference)
        if len(selected) != len(arguments.reference):
            raise ValueError('duplicate selected reference')
        known = {reference['id'] for reference in references}
        if not selected <= known:
            raise ValueError(f'unknown references: {sorted(selected - known)}')
        references = [reference for reference in references if reference['id'] in selected]
    page = arguments.page.resolve()
    if page not in pages:
        raise ValueError('page must be registered in the series catalogue')
    if not re.fullmatch(r'fig-[a-z0-9]+(?:-[a-z0-9]+)*', arguments.id):
        raise ValueError('a stable fig- identifier is required')
    image = arguments.png.read_bytes()
    width, height = validate_png(image, arguments.png)
    prompt = arguments.prompt.read_bytes()
    if not prompt.decode('utf-8').strip():
        raise ValueError('save the exact nonempty generation prompt')
    directory = page.parent / 'assets' / arguments.id
    if not directory.resolve().is_relative_to(page.parent):
        raise ValueError('escaping page asset directory')
    names = ('strip.png', 'prompt.txt', 'comic.json')
    if not arguments.replace and any((directory / name).exists() for name in names):
        raise ValueError('accepted files exist; --replace requires an intentional revision')
    state = {'version': 1, 'png': 'strip.png', 'construction': {
        'kind': 'generated-comic', 'series': series['id'],
        'tool': arguments.tool, 'model': arguments.model,
        'prompt': 'prompt.txt', 'prompt_sha256': digest(prompt),
        'references': references, 'image_sha256': digest(image),
        'pixels': [width, height]}}
    # Validate and stage before replacing accepted files. Each rename is atomic;
    # the three-file set is not a filesystem transaction.
    directory.mkdir(parents=True, exist_ok=True)
    for name in names:
        if (directory / name).is_symlink():
            raise ValueError('accepted targets must not be symlinks')
    with tempfile.TemporaryDirectory(prefix='.accept-', dir=directory) as staging:
        staged = Path(staging)
        (staged / 'strip.png').write_bytes(image)
        (staged / 'prompt.txt').write_bytes(prompt)
        (staged / 'comic.json').write_text(json.dumps(state, indent=2) + '\n', encoding='utf-8')
        for name in names:
            (staged / name).replace(directory / name)
    print(f'Accepted {arguments.id}: {width}x{height}; {len(references)} reference snapshots')


def catalogue(arguments):
    root, series, references, pages = load_series(arguments.series)
    print(f"Series: {series['id']}")
    for reference in references:
        print(f"Reference {reference['id']} ({reference['role']}): {reference['path']}")
    current = {r['id']: r['sha256'] for r in references}
    issues = []
    for page in pages:
        print(f'Page: {page.relative_to(root)}')
        states = sorted((page.parent / 'assets').glob('fig-*/comic.json'))
        if not states:
            issues.append(f'{page.name}: no accepted comic sidecar')
        for sidecar in states:
            identifier = sidecar.parent.name
            try:
                target = resolve_artwork(page, identifier, 'comic')
                state = json.loads(sidecar.read_text(encoding='utf-8'))
                construction = state['construction']
                if construction['series'] != series['id']:
                    raise ValueError('series id disagrees')
                if digest((page.parent / target).read_bytes()) != construction['image_sha256']:
                    raise ValueError('accepted image hash changed')
                prompt = local_file(sidecar.parent.resolve(), construction['prompt'])
                if digest(prompt.read_bytes()) != construction['prompt_sha256']:
                    raise ValueError('saved prompt hash changed')
                saved = {r['id']: r['sha256'] for r in construction['references']}
                if not saved or any(current.get(key) != value for key, value in saved.items()):
                    raise ValueError('reference changed; review continuity explicitly')
                print(f'  {identifier}: accepted {target}')
            except (ValueError, KeyError, TypeError, OSError) as error:
                issues.append(f'{identifier}: {error}')
    for issue in issues:
        print(f'REVIEW: {issue}')
    return bool(issues)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    audit = commands.add_parser('catalogue', help='read-only inventory and provenance check')
    audit.add_argument('--series', type=Path, required=True)
    stage = commands.add_parser('accept', help='explicitly accept a reviewed PNG; never generate')
    stage.add_argument('--series', type=Path, required=True)
    stage.add_argument('--page', type=Path, required=True)
    stage.add_argument('--id', required=True)
    stage.add_argument('--png', type=Path, required=True)
    stage.add_argument('--prompt', type=Path, required=True)
    stage.add_argument('--tool', required=True)
    stage.add_argument('--model', default='not exposed by tool')
    stage.add_argument('--reference', action='append',
                       help='reference ID actually supplied; repeat as needed (default: all)')
    stage.add_argument('--replace', action='store_true')
    arguments = parser.parse_args()
    try:
        return catalogue(arguments) if arguments.command == 'catalogue' else accept(arguments)
    except (ValueError, KeyError, TypeError, OSError) as error:
        parser.exit(1, f'comic-assets: {error}\n')


if __name__ == '__main__':
    sys.exit(main())

import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from test_comics import png

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts/comic_assets.py'


class ComicAssetTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'shared').mkdir()
        (self.root / 'shared/cast.png').write_bytes(png())
        self.series = self.root / 'series.json'
        self.series.write_text(json.dumps({'version': 1, 'id': 'learn-ash',
            'references': [{'id': 'cast-v1', 'path': 'shared/cast.png', 'role': 'identity'}],
            'pages': ['pages/choice/README.md']}))
        self.page = self.root / 'pages/choice/README.md'
        self.page.parent.mkdir(parents=True)
        self.page.write_text('Canonical page\n')
        self.input = self.root / 'candidate.png'
        self.input.write_bytes(png())
        self.prompt = self.root / 'prompt.txt'
        self.prompt.write_text('Four panels with Alice and Bot.\n')

    def run_script(self, *args):
        return subprocess.run([sys.executable, str(SCRIPT), *map(str, args)],
                              capture_output=True, text=True, cwd='/tmp')

    def accept(self, *extra):
        return self.run_script('accept', '--series', self.series, '--page', self.page,
            '--id', 'fig-choice', '--png', self.input, '--prompt', self.prompt,
            '--tool', 'built-in image tool', *extra)

    def test_accept_records_exact_bytes_prompt_and_reference_snapshot(self):
        result = self.accept()
        self.assertEqual(result.returncode, 0, result.stderr)
        directory = self.page.parent / 'assets/fig-choice'
        state = json.loads((directory / 'comic.json').read_text())
        self.assertEqual((directory / 'strip.png').read_bytes(), png())
        self.assertEqual((directory / 'prompt.txt').read_text(), self.prompt.read_text())
        self.assertEqual(state['construction']['references'][0]['sha256'],
                         hashlib.sha256(png()).hexdigest())
        self.assertEqual(self.page.read_text(), 'Canonical page\n')
        self.assertNotEqual(self.accept().returncode, 0)
        self.input.write_bytes(b'broken')
        before = {p: p.read_bytes() for p in directory.iterdir()}
        self.assertNotEqual(self.accept('--replace').returncode, 0)
        self.assertEqual(before, {p: p.read_bytes() for p in before})

    def test_catalogue_reports_missing_and_reference_drift_without_mutation(self):
        self.assertEqual(self.accept().returncode, 0)
        (self.root / 'shared/cast.png').write_bytes(b'changed')
        before = {p: p.read_bytes() for p in self.root.rglob('*') if p.is_file()}
        result = self.run_script('catalogue', '--series', self.series)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('reference changed', result.stdout)
        self.assertEqual(before, {p: p.read_bytes() for p in before})
        (self.page.parent / 'assets/fig-choice/strip.png').unlink()
        self.assertNotEqual(self.run_script('catalogue', '--series', self.series).returncode, 0)

    def test_new_reference_versions_do_not_invalidate_preserved_episodes(self):
        self.assertEqual(self.accept().returncode, 0)
        data = json.loads(self.series.read_text())
        (self.root / 'shared/cast-v2.png').write_bytes(png())
        data['references'].append({'id': 'cast-v2', 'path': 'shared/cast-v2.png',
                                   'role': 'new identity'})
        self.series.write_text(json.dumps(data))
        result = self.run_script('catalogue', '--series', self.series)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        result = self.accept('--replace', '--reference', 'cast-v2')
        self.assertEqual(result.returncode, 0, result.stderr)
        state = json.loads((self.page.parent / 'assets/fig-choice/comic.json').read_text())
        self.assertEqual([r['id'] for r in state['construction']['references']], ['cast-v2'])
        self.assertEqual(self.run_script('catalogue', '--series', self.series).returncode, 0)
        self.assertNotEqual(self.accept('--replace', '--reference', 'unknown').returncode, 0)

    def test_symlink_targets_and_invalid_utf8_preserve_accepted_files(self):
        self.assertEqual(self.accept().returncode, 0)
        directory = self.page.parent / 'assets/fig-choice'
        target = directory / 'strip.png'
        target.unlink()
        target.symlink_to(self.input)
        self.assertNotEqual(self.accept('--replace').returncode, 0)
        self.assertEqual(self.input.read_bytes(), png())
        self.prompt.write_bytes(b'\xff')
        result = self.accept('--replace')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('Traceback', result.stderr)

    def test_shared_reference_escape_and_unregistered_page_fail(self):
        data = json.loads(self.series.read_text())
        for path in ['../outside.png', 'https://example.com/a.png']:
            data['references'][0]['path'] = path
            self.series.write_text(json.dumps(data))
            self.assertNotEqual(self.accept().returncode, 0)
        self.assertFalse((self.page.parent / 'assets').exists())


if __name__ == '__main__':
    unittest.main()

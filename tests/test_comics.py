import copy
import json
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from illustration_md.prepare import prepare_document, resolve_artwork
from illustration_md.png import validate_png


def png():
    def chunk(kind, data):
        return (struct.pack('>I', len(data)) + kind + data
                + struct.pack('>I', zlib.crc32(kind + data)))
    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(b'\x00\xff\xff\xff')) + chunk(b'IEND', b''))


class PngSubsetTests(unittest.TestCase):
    def chunk(self, kind, data):
        return (struct.pack('>I', len(data)) + kind + data
                + struct.pack('>I', zlib.crc32(kind + data)))

    def image(self, *, width=1, height=1, depth=8, colour=2, interlace=0,
              raw=b'\x00\xff\xff\xff', extra=b''):
        return (b'\x89PNG\r\n\x1a\n' + self.chunk(b'IHDR', struct.pack(
            '>IIBBBBB', width, height, depth, colour, 0, 0, interlace))
            + extra + self.chunk(b'IDAT', zlib.compress(raw)) + self.chunk(b'IEND', b''))

    def test_rgb_and_rgba_and_contiguous_idat(self):
        self.assertEqual(validate_png(png(), 'test'), (1, 1))
        self.assertEqual(validate_png(self.image(colour=6, raw=b'\0\xff\xff\xff\xff'),
                                      'test'), (1, 1))
        data = png()
        compressed = zlib.compress(b'\0\xff\xff\xff')
        start = data.index(b'IDAT') - 4
        split = (data[:start] + self.chunk(b'IDAT', compressed[:3])
                 + self.chunk(b'IDAT', compressed[3:]) + self.chunk(b'IEND', b''))
        self.assertEqual(validate_png(split, 'test'), (1, 1))
        broken = (data[:start] + self.chunk(b'IDAT', compressed[:3])
                  + self.chunk(b'tEXt', b'note\0gap')
                  + self.chunk(b'IDAT', compressed[3:]) + self.chunk(b'IEND', b''))
        with self.assertRaises(ValueError):
            validate_png(broken, 'test')

    def test_unsupported_profiles_animation_and_bad_scanlines(self):
        for options in [{'width': 0}, {'width': 32_000_001}, {'depth': 16},
                        {'colour': 3}, {'colour': 0}, {'interlace': 1},
                        {'extra': self.chunk(b'acTL', struct.pack('>II', 1, 0))},
                        {'extra': self.chunk(b'PLTE', b'\xff\xff\xff')},
                        {'raw': b'\5\xff\xff\xff'}, {'raw': b'\0\xff'},
                        {'raw': b'\0' + b'\xff' * 100}]:
            with self.subTest(options=options), self.assertRaises(ValueError):
                validate_png(self.image(**options), 'test')


class ComicPreparationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / 'page.md'
        self.source.write_text('Original prose\n')
        self.assets = self.root / 'assets/fig-choice'
        self.assets.mkdir(parents=True)
        self.image = self.assets / 'strip.png'
        self.image.write_bytes(png())
        self.state = self.assets / 'comic.json'
        self.state.write_text(json.dumps({'version': 1, 'png': 'strip.png',
                                         'construction': {'command': 'never run this'}}))
        fields = {'kind': 'comic', 'id': 'fig-choice', 'caption': 'A choice.',
                  'description': 'Alice asks; Bot explains.', 'width': '160mm'}
        self.document = {'meta': {'diagrams': {'t': 'MetaList', 'c': [
            {'t': 'MetaMap', 'c': {k: {'t': 'MetaString', 'c': v} for k, v in fields.items()}}]}},
            'blocks': [{'t': 'Div', 'c': [['', [], []], [
                {'t': 'CodeBlock', 'c': [['fig-choice', ['comic'], []], 'Prose only.']}]]}]}

    def test_comic_is_native_figure_and_preparation_is_pure(self):
        original = copy.deepcopy(self.document)
        before = {p: p.read_bytes() for p in self.root.rglob('*') if p.is_file()}
        result = prepare_document(self.document, self.source)
        figure = result['blocks'][0]['c'][1][0]
        self.assertEqual(figure['t'], 'Figure')
        image = figure['c'][2][0]['c'][0]
        self.assertEqual(image['c'][2][0], 'assets/fig-choice/strip.png')
        self.assertIn('authored-comic', image['c'][0][1])
        self.assertIn(['width', '160mm'], image['c'][0][2])
        self.assertEqual(original, self.document)
        self.assertEqual(before, {p: p.read_bytes() for p in before})
        self.document['blocks'][0]['c'][1][0]['c'][1] = 'Entirely changed story.'
        self.assertEqual(result, prepare_document(self.document, self.source))

    def test_missing_png_fails_without_generation(self):
        self.image.unlink()
        with self.assertRaises(ValueError):
            prepare_document(self.document, self.source)
        self.assertFalse(self.image.exists())

    def test_wrong_kind_and_ambiguous_fence_fail(self):
        fence = self.document['blocks'][0]['c'][1][0]
        for classes in [['illustration'], ['comic', 'illustration']]:
            fence['c'][0][1] = classes
            with self.subTest(classes=classes), self.assertRaises(ValueError):
                prepare_document(self.document, self.source)

    def test_paths_versions_and_corrupt_png_fail(self):
        for target in ['../strip.png', 'https://example.com/strip.png', 'strip.png#x',
                       '%2e%2e/strip.png', '/tmp/strip.png', 'strip.svg']:
            self.state.write_text(json.dumps({'version': 1, 'png': target}))
            with self.subTest(target=target), self.assertRaises(ValueError):
                prepare_document(self.document, self.source)
        for version in [True, 2]:
            self.state.write_text(json.dumps({'version': version, 'png': 'strip.png'}))
            with self.subTest(version=version), self.assertRaises(ValueError):
                prepare_document(self.document, self.source)
        self.state.write_text(json.dumps({'version': 1, 'png': 'strip.png'}))
        for data in [b'not png', png()[:-12], png().replace(b'IDAT', b'FAIL'),
                     png() + b'extra', png().replace(b'\xff', b'\xfe')]:
            self.image.write_bytes(data)
            with self.subTest(data=data[:20]), self.assertRaises(ValueError):
                prepare_document(self.document, self.source)

    def test_symlink_escape_and_cross_kind_reuse_fail(self):
        outside = self.root / 'outside.png'
        outside.write_bytes(png())
        self.image.unlink()
        self.image.symlink_to(outside)
        with self.assertRaises(ValueError):
            prepare_document(self.document, self.source)
        self.image.unlink()
        self.image.write_bytes(png())
        self.document['blocks'].append({'t': 'CodeBlock', 'c': [
            ['fig-choice', ['illustration'], []], 'Not a comic.']})
        with self.assertRaises(ValueError):
            prepare_document(self.document, self.source)
        with self.assertRaises(ValueError):
            resolve_artwork(self.source, 'fig-choice')


if __name__ == '__main__':
    unittest.main()

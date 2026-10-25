import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from illustration_md.prepare import prepare_document, resolve_artwork, validate_svg


SVG = b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 40"><circle cx="20" cy="20" r="10"/></svg>'


def literal(value):
    return {'t': 'MetaString', 'c': value}


class PreparationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.source = self.root / 'README.md'
        self.source.write_text('The canonical prose stays untouched.\n')
        self.directory = self.root / 'assets/fig-example'
        self.directory.mkdir(parents=True)
        self.sidecar = self.directory / 'illustration.json'
        self.sidecar.write_text(json.dumps({'version': 1, 'svg': 'figure.svg',
                                          'construction': {'command': 'must never execute'}}))
        self.svg = self.directory / 'figure.svg'
        self.svg.write_bytes(SVG)
        self.figure = {key: literal(value) for key, value in {
            'kind': 'illustration', 'id': 'fig-example', 'caption': 'A circle.',
            'description': 'One circle, with no semantic freshness claim.', 'width': '35mm'}.items()}
        self.fence = {'t': 'CodeBlock', 'c': [['fig-example', ['illustration'], []],
                                             'Draw something completely different.']}
        self.document = {'pandoc-api-version': [1, 23], 'meta': {
            'diagrams': {'t': 'MetaList', 'c': [{'t': 'MetaMap', 'c': self.figure}]}},
            'blocks': [{'t': 'Div', 'c': [['note', ['aside'], []], [self.fence]]}]}

    def test_nested_replacement_is_pure_and_does_not_decide_freshness(self):
        original = copy.deepcopy(self.document)
        before = {path: path.read_bytes() for path in [self.source, self.sidecar, self.svg]}
        prepared = prepare_document(self.document, self.source)
        figure = prepared['blocks'][0]['c'][1][0]
        image = figure['c'][2][0]['c'][0]
        self.assertEqual(image['t'], 'Image')
        self.assertEqual(figure['c'][0][0], 'fig-example')
        self.assertIn(['width', '35mm'], image['c'][0][2])
        self.assertEqual(image['c'][2][0], 'assets/fig-example/figure.svg')
        self.assertNotIn('Draw something', json.dumps(prepared))
        self.assertEqual(self.document, original)
        self.assertEqual(before, {path: path.read_bytes() for path in before})
        self.fence['c'][1] = 'Now add a retry: semantic changes do not rebuild artwork.'
        self.assertEqual(prepare_document(self.document, self.source), prepared)

    def test_plain_language_tag_and_quarto_attributes_share_the_ast(self):
        self.assertEqual(prepare_document(self.document, self.source)['blocks'][0]['t'], 'Div')

    def test_caption_and_alternative_description_are_distinct_in_native_figure(self):
        prepared = prepare_document(self.document, self.source)
        figure = prepared['blocks'][0]['c'][1][0]
        self.assertEqual(figure['t'], 'Figure')
        self.assertEqual(figure['c'][0][0], 'fig-example')
        self.assertEqual(figure['c'][1][1][0]['c'][0]['c'], 'A circle.')
        self.assertEqual(figure['c'][2][0]['c'][0]['c'][1][0]['c'],
                         'One circle, with no semantic freshness claim.')

    def test_missing_state_or_artwork_fails_without_generating(self):
        self.svg.unlink()
        with self.assertRaises(ValueError):
            prepare_document(self.document, self.source)
        self.assertFalse(self.svg.exists())
        self.sidecar.unlink()
        with self.assertRaises(ValueError):
            resolve_artwork(self.source, 'fig-example')

    def test_sidecar_version_and_json_are_checked(self):
        for state in ['[]', '{', '{"version": true}', '{"version": 2}',
                      '{"version": 1, "svg": 3}']:
            self.sidecar.write_text(state)
            with self.subTest(state=state), self.assertRaises(ValueError):
                resolve_artwork(self.source, 'fig-example')

    def test_stable_ids_and_paths_cannot_escape(self):
        for identifier in ['', '../outside', 'fig-UPPER', 'figure']:
            with self.subTest(identifier=identifier), self.assertRaises(ValueError):
                resolve_artwork(self.source, identifier)
        for target in ['../other.svg', '%2e%2e/other.svg', '/tmp/out.svg',
                       'https://example.com/a.svg', 'figure.svg#x', 'figure.svg?x', '']:
            self.sidecar.write_text(json.dumps({'version': 1, 'svg': target}))
            with self.subTest(target=target), self.assertRaises(ValueError):
                resolve_artwork(self.source, 'fig-example')

    def test_symlink_escape_is_rejected(self):
        outside = self.root / 'outside.svg'
        outside.write_bytes(SVG)
        self.svg.unlink()
        self.svg.symlink_to(outside)
        with self.assertRaises(ValueError):
            resolve_artwork(self.source, 'fig-example')

    def test_invalid_or_duplicate_metadata_and_fences_fail(self):
        for field in ['caption', 'description', 'id']:
            description = self.figure.pop(field)
            with self.subTest(field=field), self.assertRaises(ValueError):
                prepare_document(self.document, self.source)
            self.figure[field] = description
        for width in ['0mm', '-1mm', '50%', 'NaNmm', 'infmm']:
            self.figure['width'] = literal(width)
            with self.subTest(width=width), self.assertRaises(ValueError):
                prepare_document(self.document, self.source)
        self.figure['width'] = literal('35mm')
        self.document['blocks'].append(self.fence)
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            prepare_document(self.document, self.source)
        self.document['blocks'].pop()
        self.document['meta']['diagrams']['c'].append({'t': 'MetaMap', 'c': self.figure})
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            prepare_document(self.document, self.source)

    def test_unrelated_fences_survive_and_unused_illustrations_fail(self):
        self.document['blocks'].append({'t': 'CodeBlock', 'c': [['', ['python'], []], 'print(1)']})
        self.assertEqual(prepare_document(self.document, self.source)['blocks'][-1], self.document['blocks'][-1])
        self.document['blocks'] = []
        with self.assertRaisesRegex(ValueError, 'unused'):
            prepare_document(self.document, self.source)

    def test_cli_reads_and_writes_pandoc_json(self):
        result = subprocess.run([sys.executable, '-m', 'illustration_md.prepare',
                                 '--source', str(self.source)], input=json.dumps(self.document),
                                text=True, capture_output=True, check=True)
        self.assertEqual(json.loads(result.stdout), prepare_document(self.document, self.source))

    def test_self_contained_outlined_svg_boundary(self):
        validate_svg(SVG, 'test')
        for content in [b'<svg/>', SVG.replace(b'80 40', b'0 40'),
                        SVG.replace(b'80 40', b'inf 40'),
                        SVG.replace(b'<circle', b'<text'),
                        SVG.replace(b'<circle', b'<image href="https://example.com/x"'),
                        SVG.replace(b'<circle', b'<circle onclick="alert(1)"'),
                        SVG.replace(b'<circle', b'<circle style="fill:url(https://example.com/x)"'),
                        b'<!DOCTYPE svg>' + SVG,
                        b'<?xml-stylesheet href="https://example.com/x"?>' + SVG]:
            with self.subTest(content=content), self.assertRaises(ValueError):
                validate_svg(content, 'test')


if __name__ == '__main__':
    unittest.main()

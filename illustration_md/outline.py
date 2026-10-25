"""Outline simple SVG text labels with a pinned bundled font."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
from xml.etree import ElementTree

from fontTools import __version__
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--font", choices=["regular", "excalifont"], required=True)
parser.add_argument("--check-text", action="store_true")
arguments = parser.parse_args()
if __version__ != "4.61.1":
    raise ValueError("Use the pinned fontTools version")
root = Path(__file__).resolve().parent.parent
configuration = json.loads((root / "toolchain.json").read_text())
font_name = "Excalifont-Latin.woff2" if arguments.font == "excalifont" else "IBMPlexMono-Regular.ttf"
font_path = root / "fonts" / font_name
if hashlib.sha256(font_path.read_bytes()).hexdigest() != configuration["fonts"][font_name]:
    raise ValueError("Bundled font checksum differs")
font = TTFont(font_path)
if arguments.check_text:
    text = sys.stdin.read()
    missing = sorted({character for character in text
                      if character not in '\n\r\t' and ord(character) not in font.getBestCmap()})
    if missing:
        raise ValueError(f'Missing glyph in bundled font: {missing}')
    sys.exit(0)
glyphs = font.getGlyphSet()
namespace = 'http://www.w3.org/2000/svg'
ElementTree.register_namespace('', namespace)
document = ElementTree.fromstring(sys.stdin.read())
for parent in list(document.iter()):
    for node in list(parent):
        if node.tag != f'{{{namespace}}}text':
            continue
        if list(node) or node.get('transform') or node.get('style'):
            raise ValueError('Simple untransformed SVG text labels only')
        text = node.text or ''
        names = [font.getBestCmap()[ord(character)] for character in text]
        scale = float(node.get('font-size')) / font['head'].unitsPerEm
        width = sum(font['hmtx'][name][0] for name in names) * scale
        anchor = node.get('text-anchor', 'middle')
        horizontal = float(node.get('x')) - (width / 2 if anchor == 'middle' else width if anchor == 'end' else 0)
        group = ElementTree.Element(f'{{{namespace}}}g', {
            'aria-label': text, 'fill': node.get('fill', '#222222'),
            'transform': f'translate({horizontal:.5f},{node.get("y")}) scale({scale:.8f},{-scale:.8f})'})
        position = 0
        for name in names:
            pen = SVGPathPen(glyphs)
            glyphs[name].draw(pen)
            if pen.getCommands():
                ElementTree.SubElement(group, f'{{{namespace}}}path', {
                    'transform': f'translate({position},0)', 'd': pen.getCommands()})
            position += font['hmtx'][name][0]
        parent.insert(list(parent).index(node), group)
        parent.remove(node)
print(ElementTree.tostring(document, encoding='unicode'))

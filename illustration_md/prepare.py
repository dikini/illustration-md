"""Deterministic substitution of saved artwork in Pandoc documents."""
import argparse
import copy
import json
import math
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree as ET


def validate_svg(data, source):
    """Accept the self-contained outlined SVG boundary used by the specimen."""
    try:
        if re.search(br"<\?(?!xml[ \t\r\n])", data):
            raise ValueError("processing instructions are unsupported")
        if re.search(br"<!\s*(?:DOCTYPE|ENTITY)\b", data, re.I):
            raise ValueError("document declarations are unsupported")
        svg = ET.fromstring(data)
        if svg.tag != "{http://www.w3.org/2000/svg}svg":
            raise ValueError("an SVG root and namespace are required")
        viewport = [float(value) for value in re.split(r"[ ,]+", svg.get("viewBox", "").strip())]
        if (len(viewport) != 4 or not all(math.isfinite(value) for value in viewport)
                or viewport[2] <= 0 or viewport[3] <= 0):
            raise ValueError("a positive finite viewBox is required")

        def css_resources(css):
            decoded = re.sub(r"\\([0-9a-f]{1,6})\s?|\\([^\r\n])",
                             lambda match: chr(int(match[1], 16)) if match[1] else match[2],
                             css, flags=re.I)
            if re.search(r"@import\b|@font-face\b", decoded, re.I):
                raise ValueError("CSS imports and reader fonts are unsupported")
            for match in re.finditer(r"url\(\s*([\"']?)(.*?)\1\s*\)", decoded, re.I | re.S):
                if not match[2].strip().startswith("#"):
                    raise ValueError("external CSS resources are unsupported")

        allowed = {"svg", "g", "defs", "symbol", "use", "path", "rect", "line",
                   "circle", "ellipse", "polyline", "polygon", "title", "desc", "style",
                   "clipPath", "mask", "linearGradient", "radialGradient", "stop"}
        for node in svg.iter():
            kind = node.tag.rsplit("}", 1)[-1]
            if node.tag != f"{{http://www.w3.org/2000/svg}}{kind}" or kind not in allowed:
                raise ValueError(f"unsupported element {kind}")
            for attribute, value in node.attrib.items():
                name = attribute.rsplit("}", 1)[-1]
                if attribute == "{http://www.w3.org/XML/1998/namespace}base":
                    raise ValueError("resource base overrides are unsupported")
                if name.lower().startswith("on"):
                    raise ValueError("event handlers are unsupported")
                if name == "href" and not value.strip().startswith("#"):
                    raise ValueError("external href resources are unsupported")
                css_resources(value)
            if kind == "style":
                css_resources("".join(node.itertext()))
    except (ET.ParseError, ValueError) as error:
        raise ValueError(f"{source}: unsuitable SVG: {error}") from error


def resolve_artwork(source, identifier):
    """Resolve authored artwork only; never interpret prompts or run drawing code."""
    if not re.fullmatch(r"fig-[a-z0-9]+(?:-[a-z0-9]+)*", identifier):
        raise ValueError(f"{source}: illustration needs a stable fig- identifier")
    parent = Path(source).resolve().parent
    directory = parent / "assets" / identifier
    sidecar = directory / "illustration.json"
    if not sidecar.resolve().is_relative_to(parent) or not sidecar.is_file():
        raise ValueError(f"{source}: missing or escaping illustration state: {identifier}")
    try:
        state = json.loads(sidecar.read_text(encoding="utf-8"))
    except (ValueError, UnicodeError) as error:
        raise ValueError(f"{source}: invalid illustration state: {identifier}") from error
    if not isinstance(state, dict) or type(state.get("version")) is not int or state["version"] != 1:
        raise ValueError(f"{source}: illustration {identifier} needs state version 1")
    target = state.get("svg")
    if not isinstance(target, str):
        raise ValueError(f"{source}: illustration {identifier} needs an SVG reference")
    url = urlsplit(target)
    path = Path(unquote(url.path))
    asset = (directory / path).resolve()
    if (not target or url.scheme or url.netloc or path.is_absolute() or url.query or url.fragment
            or not asset.is_relative_to(directory.resolve()) or not asset.is_relative_to(parent)
            or not asset.is_file() or asset.suffix.lower() != ".svg"):
        raise ValueError(f"{source}: illustration {identifier} needs an existing local SVG")
    validate_svg(asset.read_bytes(), source)
    return asset.relative_to(parent).as_posix()


def literal(node):
    if node.get("t") in ("MetaString", "Str"):
        return node["c"]
    if node.get("t") in ("Space", "SoftBreak"):
        return " "
    if node.get("t") in ("MetaInlines", "MetaBlocks", "Plain", "Para"):
        return "".join(literal(child) for child in node["c"])
    raise ValueError("figure metadata must contain literal text")


def physical_width(value):
    if (not re.fullmatch(r"(?:\d+(?:\.\d+)?|\.\d+)mm", value)
            or not math.isfinite(float(value[:-2])) or float(value[:-2]) <= 0):
        raise ValueError("illustration width needs a positive finite millimetre value")
    return value


def prepare_document(document, source):
    result = copy.deepcopy(document)
    descriptions = result.get("meta", {}).get("diagrams", {"t": "MetaList", "c": []})
    if descriptions.get("t") != "MetaList":
        raise ValueError("diagrams metadata must be a list")
    figures = {}
    for item in descriptions["c"]:
        if item.get("t") != "MetaMap":
            raise ValueError("each diagram description must be a map")
        fields = item["c"]
        if literal(fields.get("kind", {})) != "illustration":
            continue
        description = {key: literal(value) for key, value in fields.items()}
        if any(not description.get(key, "").strip() for key in ("id", "caption", "description")):
            raise ValueError("illustrations need id, caption, and description metadata")
        identifier = description["id"]
        if identifier in figures:
            raise ValueError(f"duplicate illustration metadata: {identifier}")
        if "width" in description:
            physical_width(description["width"])
        figures[identifier] = description
    used = set()

    def replace(node):
        if isinstance(node, list):
            return [replace(child) for child in node]
        if not isinstance(node, dict):
            return node
        if node.get("t") == "CodeBlock" and "illustration" in node["c"][0][1]:
            identifier = node["c"][0][0]
            if identifier in used:
                raise ValueError(f"duplicate illustration fence: {identifier}")
            if identifier not in figures:
                raise ValueError(f"illustration fence has no matching metadata: {identifier}")
            description = figures[identifier]
            target = resolve_artwork(source, identifier)
            used.add(identifier)
            attributes = [["fig-alt", description["description"]]]
            if "width" in description:
                attributes.append(["width", description["width"]])
            image = {"t": "Image", "c": [
                ["", ["authored-illustration"], attributes],
                [{"t": "Str", "c": description["description"]}], [target, ""]]}
            return {"t": "Figure", "c": [[identifier, [], []],
                [None, [{"t": "Plain", "c": [{"t": "Str", "c": description["caption"]}]}]],
                [{"t": "Plain", "c": [image]}]]}
        return {key: replace(value) for key, value in node.items()}

    result["blocks"] = replace(result.get("blocks", []))
    if used != set(figures):
        raise ValueError(f"unused illustration metadata: {sorted(set(figures) - used)}")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True,
                        help="canonical Markdown source; assets are relative to this file")
    arguments = parser.parse_args()
    try:
        document = json.load(sys.stdin)
        prepared = prepare_document(document, arguments.source)
    except (ValueError, OSError, KeyError, TypeError) as error:
        parser.exit(1, f"illustration-md: {error}\n")
    json.dump(prepared, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()

import { fileURLToPath } from 'node:url';

export const fontDirectory = root => fileURLToPath(new URL('fonts/', root));
const escapeXml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function fontconfigXml(fonts, cache) {
  return `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${escapeXml(fonts)}</dir><cachedir>${escapeXml(cache)}</cachedir></fontconfig>`;
}

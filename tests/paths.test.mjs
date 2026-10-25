import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fontDirectory, fontconfigXml } from '../src/font-paths.mjs';

test('font paths decode file URLs and preserve spaces and non-ASCII names', () => {
  assert.equal(fontDirectory(new URL('file:///tmp/diagram%20%26%20%D0%90/')),
    '/tmp/diagram & А/fonts/');
});

test('fontconfig paths escape XML metacharacters', () => {
  assert.equal(fontconfigXml('/tmp/a & b/fonts', '/tmp/a<b/cache'),
    '<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>/tmp/a &amp; b/fonts</dir><cachedir>/tmp/a&lt;b/cache</cachedir></fontconfig>');
});

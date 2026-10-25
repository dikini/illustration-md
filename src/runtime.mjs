import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import puppeteer from 'puppeteer';
import { assertBrowserVersion } from './browser-version.mjs';

export const ROOT = new URL('../', import.meta.url);
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const require = createRequire(import.meta.url);
export function packageRoot(name) {
  try { return dirname(require.resolve(`${name}/package.json`)); }
  catch (error) {
    if (error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error;
    return dirname(dirname(require.resolve(name)));
  }
}

export async function createRuntime() {
  const configuration = JSON.parse(await readFile(new URL('toolchain.json', ROOT)));
  const bundle = await readFile(join(packageRoot('roughjs'), 'bundled/rough.js'), 'utf8');
  const installed = JSON.parse(await readFile(join(packageRoot('roughjs'), 'package.json')));
  assert.equal(installed.version, configuration.roughjs);
  assert.equal(hash(bundle), configuration.roughBundleSha256);
  for (const [filename, checksum] of Object.entries(configuration.fonts)) {
    assert.equal(hash(await readFile(new URL(`fonts/${filename}`, ROOT))), checksum,
      `Bundled font differs: ${filename}`);
  }
  const executablePath = process.env.ILLUSTRATION_BROWSER;
  if (!executablePath) throw new Error('Set ILLUSTRATION_BROWSER to a Chrome executable meeting the declared minimum.');
  const browser = await puppeteer.launch({ executablePath, headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'] });
  try {
    assertBrowserVersion(await browser.version(), configuration.minimumBrowser);
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => /^(data:|about:|file:)/.test(request.url())
      ? request.continue() : request.abort());
    await page.addScriptTag({ content: bundle });
    return { browser, page, configuration, bundleSha256: hash(bundle) };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

import assert from 'node:assert/strict';

export function assertBrowserVersion(actual, minimum) {
  const parse = version => typeof version === 'string'
    ? /^Chrome\/(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(version)?.slice(1).map(BigInt)
    : undefined;
  const required = parse(minimum);
  const installed = parse(actual);
  assert.ok(required, 'Invalid minimum Chrome version.');
  assert.ok(installed, 'Expected a Chrome browser version with four numeric components.');
  const difference = installed.findIndex((part, index) => part !== required[index]);
  assert.ok(difference < 0 || installed[difference] > required[difference],
    `Use ${minimum} or newer; found ${actual}.`);
}

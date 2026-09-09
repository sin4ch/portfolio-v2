const { test, expect } = require('bun:test');
const { getPageState } = require('./generate-route-pages.js');
const { findOutdatedFiles } = require('./generate-route-pages.js');
const fs = require('fs');
const path = require('path');

test('rebuilding unchanged content on another day keeps its date', () => {
  const previous = getPageState('<p>My projects</p>', undefined, '2026-09-09');
  expect(getPageState('<p>My projects</p>', previous, '2026-09-10')).toEqual(previous);
});

test('changed content gets the new date', () => {
  const previous = getPageState('<p>My projects</p>', undefined, '2026-09-09');
  const next = getPageState('<p>My new projects</p>', previous, '2026-09-10');
  expect(next.lastmod).toBe('2026-09-10');
  expect(next.hash).not.toBe(previous.hash);
});

test('reports changed and missing files without modifying existing files', () => {
  const root = path.resolve(__dirname, '..');
  const file = path.join(root, 'projects', 'index.html');
  const content = fs.readFileSync(file, 'utf8');
  const modified = fs.statSync(file).mtimeMs;
  expect(findOutdatedFiles(new Map([[file, content]]))).toEqual([]);
  expect(findOutdatedFiles(new Map([[file, content + '\n']]))).toEqual(['projects/index.html']);
  expect(findOutdatedFiles(new Map([[path.join(root, 'missing-test-route', 'index.html'), 'test']]))).toEqual(['missing-test-route/index.html']);
  expect(fs.readFileSync(file, 'utf8')).toBe(content);
  expect(fs.statSync(file).mtimeMs).toBe(modified);
});

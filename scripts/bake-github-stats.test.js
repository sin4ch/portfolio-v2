const { test, expect } = require('bun:test');
const { fetchJson, getRepos, updateStats, bakeStats } = require('./bake-github-stats');

const html = `<p>Keep me &amp; my formatting.</p>
<div data-forks='3' data-repo='owner/repo'
 class='extra item-stats' data-stars='7'><span>Keep this too.</span></div>`;

test('accepts reordered attributes, single quotes, extra classes and line breaks', () => {
  expect(getRepos(html)).toEqual(['owner/repo']);
  const output = updateStats(html, new Map([['owner/repo', { stars: 12, forks: 4 }]]));
  expect(output).toContain('data-stars="12"');
  expect(output).toContain('data-forks="4"');
  expect(output).toContain('<p>Keep me &amp; my formatting.</p>');
  expect(output).toContain('<span>Keep this too.</span>');
});

test('reports missing and malformed targets', () => {
  expect(() => getRepos('<p>No stats</p>')).toThrow('No GitHub stats');
  expect(() => getRepos('<div data-repo="owner/repo"></div>')).toThrow('Expected');
  expect(() => getRepos(html + '<div class="item-stats"></div>')).toThrow('Expected');
  expect(() => updateStats(html, new Map([['missing/repo', { stars: 1, forks: 2 }]]))).toThrow('Missing');
});

test('failed or invalid responses preserve previous counts', async () => {
  const failed = await bakeStats(html, async () => { throw new Error('offline'); });
  expect(failed.html).toBe(html);
  expect(failed.errors).toHaveLength(1);
  const invalid = await bakeStats(html, async () => ({ stargazers_count: 10 }));
  expect(invalid.html).toBe(html);
  expect(invalid.errors[0]).toContain('Invalid');
});

test('one failed repository does not prevent another from updating', async () => {
  const source = html + '<div class="item-stats" data-repo="other/repo" data-stars="9" data-forks="1"></div>';
  const result = await bakeStats(source, async repo => {
    if (repo === 'other/repo') throw Error('offline');
    return { stargazers_count: 12, forks_count: 4 };
  });
  expect(result.html).toContain('data-stars="12"');
  expect(result.html).toContain('data-stars="9" data-forks="1"');
  expect(result.errors).toHaveLength(1);
});

test('a stalled request times out', async () => {
  const server = Bun.serve({ port: 0, fetch: () => new Promise(() => {}) });
  try {
    await expect(fetchJson(server.url, 30)).rejects.toThrow();
  } finally {
    server.stop(true);
  }
});

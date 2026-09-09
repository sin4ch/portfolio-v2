// Save live counts in the source HTML, then regenerate the section pages:
//     bun scripts/bake-github-stats.js
//     bun scripts/generate-route-pages.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

async function fetchJson(url, timeoutMs = 10000) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'sin4ch-site-builder',
      'Accept': 'application/vnd.github+json'
    },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}

function getRepos(html) {
  const repos = new Set();
  new HTMLRewriter().on('.item-stats, [data-repo]', {
    element(el) {
      const repo = el.getAttribute('data-repo')?.trim();
      const classes = (el.getAttribute('class') || '').split(/\s+/);
      if (!repo || !classes.includes('item-stats')) {
        throw new Error('Expected an item-stats element with a non-empty data-repo');
      }
      repos.add(repo);
    }
  }).transform(html);
  if (!repos.size) throw new Error('No GitHub stats elements found');
  return [...repos];
}

function updateStats(html, counts) {
  const missing = new Set(counts.keys());
  const result = new HTMLRewriter().on('.item-stats[data-repo]', {
    element(el) {
      const repo = el.getAttribute('data-repo').trim();
      const stats = counts.get(repo);
      if (!stats) return;
      el.setAttribute('data-stars', String(stats.stars));
      el.setAttribute('data-forks', String(stats.forks));
      missing.delete(repo);
    }
  }).transform(html);
  if (missing.size) throw new Error('Missing stats elements: ' + [...missing].join(', '));
  return result;
}

async function bakeStats(html, fetchRepo = repo => fetchJson('https://api.github.com/repos/' + repo)) {
  const counts = new Map();
  const errors = [];
  for (const repo of getRepos(html)) {
    try {
      const data = await fetchRepo(repo);
      const stars = data.stargazers_count;
      const forks = data.forks_count;
      if (![stars, forks].every(value => Number.isSafeInteger(value) && value >= 0)) {
        throw new Error('Invalid star or fork count');
      }
      counts.set(repo, { stars, forks });
    } catch (error) {
      errors.push(`${repo}: ${error.message} (kept previous values)`);
    }
  }
  return { html: updateStats(html, counts), counts, errors };
}

async function main() {
  const indexPath = path.join(ROOT, 'index.html');
  const result = await bakeStats(fs.readFileSync(indexPath, 'utf8'));
  fs.writeFileSync(indexPath, result.html);
  for (const [repo, { stars, forks }] of result.counts) {
    console.log(`${repo}: ${stars} stars, ${forks} forks`);
  }
  result.errors.forEach(error => console.error('SKIP ' + error));
  console.log(`baked ${result.counts.size} repositories, ${result.errors.length} failed`);
  if (result.errors.length) process.exitCode = 1;
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { fetchJson, getRepos, updateStats, bakeStats };

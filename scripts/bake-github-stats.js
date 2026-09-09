// Bakes live GitHub star/fork counts into index.html so the first paint
// never waits on the network. Re-run before publishing:
//     node scripts/bake-github-stats.js
// Unauthenticated API access is fine here (one request per repo, run rarely).
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'sin4ch-site-builder',
        'Accept': 'application/vnd.github+json'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  const indexPath = path.join(ROOT, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  const repos = [...new Set([...html.matchAll(/data-repo="([^"]+)"/g)].map(match => match[1]))];
  let updated = 0;
  let failed = 0;
  for (const repo of repos) {
    try {
      const data = await fetchJson('https://api.github.com/repos/' + repo);
      const stars = typeof data.stargazers_count === 'number' ? data.stargazers_count : 0;
      const forks = typeof data.forks_count === 'number' ? data.forks_count : 0;
      const pattern = new RegExp(
        '<div class="item-stats" data-repo="' + escapeRegExp(repo) + '"' +
        '(?:\\sdata-stars="\\d+")?(?:\\sdata-forks="\\d+")?',
        'g'
      );
      const replacement =
        '<div class="item-stats" data-repo="' + repo + '"' +
        ' data-stars="' + stars + '" data-forks="' + forks + '"';
      const next = html.replace(pattern, replacement);
      if (next !== html) {
        html = next;
        updated += 1;
      }
      console.log(repo + ': ' + stars + ' stars, ' + forks + ' forks');
    } catch (err) {
      failed += 1;
      console.error('SKIP ' + repo + ': ' + err.message + ' (kept previous values)');
    }
  }
  fs.writeFileSync(indexPath, html);
  console.log('baked ' + updated + ' entries, ' + failed + ' failed');
  if (failed > 0) process.exitCode = 1;
}

main();

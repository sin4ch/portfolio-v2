const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SITE_URL = 'https://sin4.ch';

const routes = [
  {
    slug: '',
    title: 'Osinachi Okpara - AI Developer Advocate and Software Engineer',
    description: 'Osinachi Okpara is a software engineer, developer advocate and AWS Community Builder, passionate about agentic AI, cloud engineering, and open-source software.',
    image: '/social-preview.png?v=2',
    priority: '1.0'
  },
  {
    slug: 'projects',
    title: 'Projects - Osinachi Okpara',
    description: 'Selected software, AI, infrastructure, and open-source projects by Osinachi Okpara.',
    image: '/social-preview-projects.png',
    priority: '0.8'
  },
  {
    slug: 'opensource',
    title: 'Open Source - Osinachi Okpara',
    description: 'Open-source contributions by Osinachi Okpara across developer tooling, documentation, AI, and infrastructure projects.',
    image: '/social-preview-opensource.png',
    priority: '0.8'
  },
  {
    slug: 'writing',
    title: 'Writing - Osinachi Okpara',
    description: 'Articles by Osinachi Okpara on AI, cloud infrastructure, DevOps, developer tools, and technology systems.',
    image: '/social-preview-writing.png',
    priority: '0.8'
  },
  {
    slug: 'talks',
    title: 'Speaking and Hosting - Osinachi Okpara',
    description: 'Speaking and hosting engagements by Osinachi Okpara at developer, cloud, AI, and community events.',
    image: '/social-preview-talks.png',
    priority: '0.7'
  },
  {
    slug: 'gallery',
    title: 'Gallery - Osinachi Okpara',
    description: 'A personal gallery of Osinachi Okpara at conferences, community events, talks, and technology gatherings.',
    image: '/social-preview.png?v=2',
    priority: '0.6'
  },
  {
    slug: 'experience',
    title: 'Experience - Osinachi Okpara',
    description: 'Professional experience by Osinachi Okpara across software engineering, developer advocacy, technical writing, and community building.',
    image: '/social-preview.png?v=2',
    priority: '0.8'
  }
];

function escapeAttr(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function routeUrl(slug) {
  return slug ? `${SITE_URL}/${slug}/` : `${SITE_URL}/`;
}

function assetUrl(assetPath) {
  return assetPath.startsWith('http') ? assetPath : `${SITE_URL}${assetPath}`;
}

function replaceOrFail(html, pattern, replacement, label) {
  if (!pattern.test(html)) {
    throw new Error(`Could not update ${label}`);
  }
  return html.replace(pattern, replacement);
}

function withRouteMetadata(sourceHtml, route) {
  const title = escapeAttr(route.title);
  const description = escapeAttr(route.description);
  const url = routeUrl(route.slug);
  const image = assetUrl(route.image || '/social-preview.png?v=2');
  const imageAlt = escapeAttr(`${route.title} social preview`);

  let html = sourceHtml;
  html = replaceOrFail(html, /<title>.*?<\/title>/, `<title>${route.title}</title>`, 'title');
  html = replaceOrFail(html, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`, 'meta description');
  html = replaceOrFail(html, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`, 'og title');
  html = replaceOrFail(html, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`, 'og description');
  html = replaceOrFail(html, /<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${image}">`, 'og image');
  html = replaceOrFail(html, /<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${imageAlt}">`, 'og image alt');
  html = replaceOrFail(html, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`, 'og url');
  html = replaceOrFail(html, /<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${title}">`, 'twitter title');
  html = replaceOrFail(html, /<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${description}">`, 'twitter description');
  html = replaceOrFail(html, /<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${image}">`, 'twitter image');
  html = replaceOrFail(html, /<meta name="twitter:image:alt" content="[^"]*">/, `<meta name="twitter:image:alt" content="${imageAlt}">`, 'twitter image alt');
  html = replaceOrFail(html, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`, 'canonical url');
  return html;
}

function generateRoutePages(emit) {
  const sourceHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  routes.filter(route => route.slug).forEach(route => {
    const routeDir = path.join(ROOT, route.slug);
    emit(path.join(routeDir, 'index.html'), withRouteMetadata(sourceHtml, route));
  });
}

// Keep this generated record in Git so dates also survive a fresh checkout.
// A local cache would lose the old dates when publishing from another machine.
const SITEMAP_STATE_PATH = path.join(ROOT, 'scripts', 'sitemap-state.json');

function getPageState(content, previous, today) {
  const hash = createHash('sha256').update(content).digest('hex');
  return {
    hash,
    lastmod: previous?.hash === hash ? previous.lastmod : today
  };
}

function generateSitemap(emit) {
  const today = new Date().toISOString().slice(0, 10);
  const previous = fs.existsSync(SITEMAP_STATE_PATH)
    ? JSON.parse(fs.readFileSync(SITEMAP_STATE_PATH, 'utf8'))
    : {};
  const next = {};
  // Every generated page includes the full site and can open the gallery.
  // Include local assets so replacing an image or changing CSS also counts.
  const sourceHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  const gallery = JSON.parse(fs.readFileSync(path.join(ROOT, 'gallery', 'gallery.json'), 'utf8'));
  const assets = new Set(['styles.css', 'main.js', 'gallery.js', 'gallery/gallery.json', 'site.webmanifest']);
  for (const match of sourceHtml.matchAll(/(?:src|href)="\/([^"?#]+)(?:[^\"]*)"/g)) {
    const file = path.join(ROOT, match[1]);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) assets.add(match[1]);
  }
  for (const match of css.matchAll(/url\(['"]?\/([^'"?#)]+)/g)) assets.add(match[1]);
  for (const image of gallery.images) assets.add(image.url.replace(/^\//, ''));
  const assetHash = createHash('sha256');
  for (const asset of [...assets].sort()) {
    assetHash.update(asset).update('\0').update(fs.readFileSync(path.join(ROOT, asset)));
  }
  const sharedHash = assetHash.digest('hex');
  for (const route of routes) {
    const key = route.slug || 'home';
    const html = route.slug ? withRouteMetadata(sourceHtml, route) : sourceHtml;
    next[key] = getPageState(html + sharedHash, previous[key], today);
  }
  const entries = routes.map(route => `  <url>
    <loc>${routeUrl(route.slug)}</loc>
    <lastmod>${next[route.slug || 'home'].lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('\n');

  emit(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`);
  emit(SITEMAP_STATE_PATH, JSON.stringify(next, null, 2) + '\n');
}

function getGeneratedFiles() {
  const files = new Map();
  const emit = (file, content) => files.set(file, content);
  generateRoutePages(emit);
  generateSitemap(emit);
  return files;
}

function findOutdatedFiles(files) {
  return [...files].filter(([file, content]) =>
    !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content
  ).map(([file]) => path.relative(ROOT, file));
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check')) {
    console.error('Usage: bun scripts/generate-route-pages.js [--check]');
    process.exitCode = 1;
  } else {
    const files = getGeneratedFiles();
    if (args.includes('--check')) {
      const outdated = findOutdatedFiles(files);
      outdated.forEach(file => console.error(`${file} needs rebuilding`));
      if (outdated.length) process.exitCode = 1;
      else console.log('All generated files are up to date.');
    } else {
      for (const [file, content] of files) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content);
      }
    }
  }
}

module.exports = { getPageState, getGeneratedFiles, findOutdatedFiles };

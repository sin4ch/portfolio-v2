# Understanding sin4.ch

This file explains how the site works and why we made the recent technical decisions. The goal is not just "what changed", but how to think about the site from first principles.

The short version: `sin4.ch` is a small static portfolio site that behaves like an app. It has no backend server, no database, and no framework. The browser downloads HTML, CSS, JavaScript, images, and fonts, then the JavaScript makes the site interactive.

That simplicity is a strength. It also means every file we load matters, especially on mobile.

---

## Current Architecture

The site now has four main hand-edited files:

- `index.html` contains the actual page markup and content.
- `styles.css` contains all layout, typography, animation, responsive, and theme styles.
- `main.js` handles routing, theme switching, scroll indicators, mobile menu, cursor follower, and general page behavior.
- `gallery.js` handles gallery loading, the homepage carousel, the gallery grid, and the image viewer.

There is also one important generated layer:

- `scripts/generate-route-pages.js` creates route folders like `projects/index.html`, `gallery/index.html`, and `writing/index.html`.

That means `index.html` is still the main source of truth, but Google and browsers can also load real pages at clean URLs like:

- `https://sin4.ch/projects/`
- `https://sin4.ch/opensource/`
- `https://sin4.ch/writing/`
- `https://sin4.ch/talks/`
- `https://sin4.ch/gallery/`
- `https://sin4.ch/experience/`

This is still a static site. We did not add a backend. We just made the static files smarter.

---

## Why We Split the JavaScript

Earlier, almost everything lived inside one large file. That worked, but it made the code harder to reason about.

The biggest split was moving gallery-related behavior into `gallery.js`.

That makes sense because the gallery is a full feature area:

- it loads image metadata from `gallery/gallery.json`
- it builds the gallery grid
- it powers the homepage carousel
- it opens and controls the image viewer
- it runs the story-style progress bar
- it handles next, previous, pause, and tap zones

Keeping all of that inside `main.js` made `main.js` feel like it was responsible for everything. Now `main.js` is closer to the "site shell", while `gallery.js` is closer to the "gallery system".

The tradeoff is that there is one more JavaScript file to load. For this site, that tradeoff is worth it because the code is easier to read, debug, and improve.

---

## Generated Route Pages for SEO

The site originally behaved like one page with different sections. That is good for interaction, but less clear for search engines.

A human understands that "Projects", "Writing", and "Gallery" are different parts of the site. Google needs stronger clues.

So we added generated route pages.

The generator takes the main `index.html` and creates copies for each route:

- `projects/index.html`
- `opensource/index.html`
- `writing/index.html`
- `talks/index.html`
- `gallery/index.html`
- `experience/index.html`

Each generated page gets its own:

- `<title>`
- meta description
- canonical URL
- Open Graph URL
- Twitter title and description

This helps Google understand that `/projects/` is a real page about projects, not just the homepage wearing a different mask.

The advantage is better SEO structure. It also gives Google more evidence for sitelinks, which are those extra subpage links that can appear under a search result.

The tradeoff is that generated pages can drift if we forget to regenerate them. The safe workflow is:

1. Edit `index.html`.
2. Run `node scripts/generate-route-pages.js`.
3. Test the homepage and route pages.
4. Commit both the source file and generated route files.

The generated files should not be manually edited. They are output files. The generator is the repeatable source of truth.

---

## Why URLs Have Trailing Slashes

The route pages are folders with an `index.html` inside them.

For example:

```text
projects/index.html
```

That naturally maps to:

```text
https://sin4.ch/projects/
```

The trailing slash means "load the index file inside this folder".

Locally, Vite may sometimes treat `/projects` and `/projects/` a little differently. GitHub Pages is also folder-based, so `/projects/` is the more correct static-site URL.

That is why the app navigation prefers trailing-slash routes.

---

## Why Root-Relative Asset Paths Matter

This was an important bug.

When the site is loaded from the homepage, a relative image path like this can work:

```html
<img src="profile-picture.webp">
```

But if the browser hard-refreshes on `/opensource/`, that same relative path means:

```text
/opensource/profile-picture.webp
```

That file does not exist.

That is why the profile photo, gallery, and carousel disappeared after a hard refresh on a section route.

The fix was to use root-relative paths:

```html
<img src="/profile-picture.webp">
```

This always means:

```text
https://sin4.ch/profile-picture.webp
```

No matter which route the user is on.

The advantage is reliability. Every route can load the same assets correctly.

The tradeoff is that the site now assumes it is hosted at the root of a domain, like `sin4.ch`. If the site were hosted inside a subfolder like `example.com/portfolio/`, root-relative paths would need a different strategy.

For this site, root-relative paths are the right choice.

---

## Self-Hosted Fonts

The site uses local font files now instead of relying on external font servers.

The fonts live in `/fonts`.

This matters because external font loading can create a chain of network work:

1. Ask another domain for CSS.
2. That CSS points to font files.
3. The browser asks another domain for those font files.
4. Text rendering waits or shifts depending on how the fonts arrive.

Self-hosting reduces that chain. The browser gets the fonts from the same site as everything else.

The advantage is more predictable loading and fewer third-party requests.

The tradeoff is that the repository is larger because it contains font files. Also, fonts are still real files that must be downloaded, so we should only keep the weights and styles we actually use.

---

## Mobile Carousel Performance

The homepage carousel is visually important, but images are expensive.

On mobile, the carousel images are large on screen, so we did not switch them to thumbnails. That would have helped performance, but it could make the first impression look worse.

Instead, we kept full-quality carousel images and changed when they load.

The mobile carousel now starts with fewer images first. It begins with 8 images, then expands toward the larger carousel set after the page has settled.

This means the first load has less work to do.

The first visible carousel image is also marked as important:

- it is not lazy-loaded
- it gets high fetch priority
- it has explicit width and height

That helps because the first visible carousel image can become the Largest Contentful Paint image. In plain language: PageSpeed may judge the page by how quickly that large visible image appears.

The advantage is that the page becomes usable sooner, especially on slower phones.

The tradeoff is that not every carousel image is available immediately in the first moment. That is fine because the user can only see a few images at once anyway.

---

## Gallery Grid Performance

The gallery grid uses lazy loading.

That means gallery images do not all fight to download at once.

The browser can focus on what is visible first, then load more as needed. This is much kinder to low-end devices because image decoding is expensive. Downloading images is only one part of the cost; turning image files into pixels on screen also takes CPU and memory.

The gallery viewer still uses full-quality images. That is intentional. When someone taps an image to inspect it, quality matters more than saving a little bandwidth.

The current decision is:

- Gallery grid: can be lighter and lazier.
- Homepage carousel: full quality, but staged.
- Image viewer: full quality.

That gives us performance where it matters without making the main visual experience feel cheap.

---

## Story-Style Gallery Viewer

The gallery viewer now behaves more like Stories.

The thin loading line at the top is called a **story progress bar**. It shows how long before the viewer moves to the next image.

The viewer also supports:

- tap left for previous
- tap right for next
- tap center to pause or play
- an onboarding hint overlay
- a close button

The progress bar and close button are aligned to the page margins so they feel like part of the site, not random floating controls.

The advantage is that browsing photos feels faster and more natural on mobile.

The tradeoff is complexity. A normal image viewer with two buttons is much simpler. This viewer has timers, pause state, tap zones, hints, progress animation, and route/menu interactions. That is why keeping gallery logic in `gallery.js` matters.

---

## The Android Chrome Navigation Pill Fix

This is the Samsung change that worked.

On Android, Chrome has a bottom browser/system area where the navigation pill lives. A website cannot fully command that area like an app can. We cannot simply say, "make the Android navigation pill transparent."

What we can do is make the page behave more edge-to-edge so the browser has the right background color to blend with.

The change had three important pieces.

First, the viewport meta tag now includes:

```html
viewport-fit=cover
```

That tells supported browsers that the page is allowed to extend into the safe-area edges of the screen.

Second, the root page background is consistent:

```css
html,
body {
  min-height: 100dvh;
}
```

This helps the page fill the dynamic mobile viewport instead of leaving odd browser-colored gaps.

Third, mobile fixed elements use safe-area variables:

```css
env(safe-area-inset-top)
env(safe-area-inset-right)
env(safe-area-inset-bottom)
env(safe-area-inset-left)
```

These variables let the browser tell the page, "this device has an edge area you should respect."

The result is that the site background can blend better with Chrome's bottom navigation area on your Samsung.

The advantage is a more native, polished mobile feel.

The tradeoff is that this behavior depends on the browser, phone, and operating system. Android Chrome, Samsung Internet, and iOS Safari may not behave identically. Safe-area changes must be tested on real devices because desktop emulation cannot perfectly reproduce the phone browser's system UI.

The key lesson: we did not directly control the Android pill. We made the page's edges correct enough that Chrome could blend the system area nicely.

---

## PageSpeed Results and What They Mean

The mobile PageSpeed score improved from 63 to 70 after the performance work.

That is progress, but PageSpeed is not a perfect truth machine. It is a useful pressure test.

The good signs:

- Total Blocking Time is low.
- Cumulative Layout Shift is 0.
- Accessibility is high.
- Best Practices is 100.
- SEO is 100.

That means the page is not doing a lot of long JavaScript work, and the layout is stable.

The remaining performance pressure mostly comes from images and caching.

The biggest mobile issue is still likely the LCP image. LCP means **Largest Contentful Paint**. It is the time it takes for the biggest important visible thing to appear. On this site, that is often a carousel image.

We improved this by making the first carousel image more important to the browser, but the image is still large because the design uses large photography.

There was also a note about the profile picture being larger than the display size. That means the browser downloads more pixels than it needs for a tiny avatar. We fixed this by creating `profile-picture-128.webp` and using it for the small profile/contact icons.

This does not delete the original high-quality `profile-picture.webp`. It just avoids using a large image where a tiny one is enough.

---

## GitHub Pages Cache TTL

PageSpeed may complain that some files have a short cache lifetime.

Cache lifetime means: how long the browser is allowed to keep a file before checking if it changed.

Long caching is good for performance because repeat visitors do not need to re-download the same files.

The limitation is that GitHub Pages does not give us full control over cache headers.

That means we can optimize the files, but we cannot fully tune how GitHub Pages tells browsers to cache them.

A possible future move is Cloudflare Pages. It has a free tier and can give more control over caching with a `_headers` file.

The tradeoff is platform complexity. GitHub Pages is simple. Cloudflare Pages gives more control, but adds another hosting system to understand and maintain.

---

## Clean Routes Versus Hash Routes

The site used to rely more on hash URLs like:

```text
/#projects
```

Now it uses clean routes like:

```text
/projects/
```

Clean routes look better, are easier to share, and are more natural for SEO.

The tradeoff is that clean routes require static files or server fallback support. Because this is GitHub Pages, we solved it with generated folder pages.

This is why route generation and root-relative asset paths are connected. Once route pages exist, hard-refresh behavior matters.

---

## The Current Loading Sequence

The loading system is no longer the old stream-based design described in earlier notes.

The current loading flow is simpler:

1. Load `gallery/gallery.json`.
2. Pick a small initial set of gallery images.
3. Decode those first images so the page can show real visuals.
4. Hide the loading screen.
5. Build the visible gallery and carousel experience.
6. Load the remaining gallery images later in idle batches.

"Idle batches" means the browser waits for calmer moments before doing more work.

That helps smoothness because the site avoids trying to do everything at the same time.

The advantage is that the first experience appears faster and with less CPU pressure.

The tradeoff is that the gallery becomes complete progressively rather than instantly. That is usually the right tradeoff for image-heavy pages.

---

## Why Some Animations Were Tuned for Smoothness

Low-end devices struggle when too many things animate, resize, decode images, or repaint at the same time.

The main rule is: animate cheap properties where possible.

Good properties:

- `transform`
- `opacity`

More expensive properties:

- width
- height
- top
- left
- layout-heavy spacing changes

This is why gallery hover zoom now scales the image inside its existing box instead of expanding the whole image tile. Expanding the tile can disturb surrounding layout. Scaling inside the box is visually smoother and cheaper.

We also avoid forcing the carousel to reload or rebuild when it does not need to.

---

## Reduced Motion

The site respects `prefers-reduced-motion`.

This is a browser/system setting. Some people enable it because animations can cause discomfort. It also helps on devices where heavy animation feels bad.

When reduced motion is active, the site should avoid unnecessary animation.

The advantage is accessibility and performance.

The tradeoff is that some motion-driven personality becomes quieter for those users. That is the correct tradeoff because user comfort comes first.

---

## How to Think About Future Refactors

The site is already much cleaner than where it started, but the next good refactors should be boring in the best way.

Good future refactors:

- keep route generation reliable
- keep gallery code readable
- document why complex interactions exist
- reduce image waste where quality does not matter
- keep SEO-critical content in HTML

Be careful with moving content lists into JSON.

Projects, writing, open source, talks, and experience are content. If they stay in HTML, search engines and link preview tools can read them immediately.

If they move into JSON and JavaScript renders them later, the site may still work for humans, but SEO becomes more dependent on JavaScript execution.

That does not mean JSON is always bad. It means content rendering is an SEO-sensitive decision.

For this portfolio, keeping the main content in HTML is the safer choice.

---

## Practical Workflow

When changing shared site markup:

1. Edit `index.html`.
2. Regenerate route pages:

```bash
node scripts/generate-route-pages.js
```

3. Test:

```bash
bunx vite --host 0.0.0.0 --port 4173
```

4. Check these routes:

- `/`
- `/projects/`
- `/opensource/`
- `/writing/`
- `/talks/`
- `/gallery/`
- `/experience/`

5. Hard-refresh a route page.
6. Test mobile layout.
7. Commit the source and generated files together.

The most important habit is this: when one file generates other files, commit the source and the generated output in the same logical change.

---

## The Big Engineering Lesson

Most of the work on this site was not about adding flashy features. It was about removing hidden friction.

The hard-refresh bug was a path problem.

The SEO route work was a discoverability problem.

The PageSpeed work was a loading priority problem.

The Samsung navigation pill improvement was an edge-of-viewport problem.

The gallery viewer work was an interaction design problem.

The repeated pattern is: name the actual problem first, then choose the smallest technical change that addresses it without making the site harder to maintain.

That is how good frontend engineering usually feels. Not magic. Just careful decisions stacked together until the site feels effortless.

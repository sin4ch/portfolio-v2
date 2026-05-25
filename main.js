/* ============================================
   JS TABLE OF CONTENTS
   ============================================
   1.  Constants & Configuration
   2.  Shared State
   3.  Loading Screen
   4.  Favicon
   5.  Navigation & Routing
   6.  Section Filters
   7.  Scroll Indicator
   8.  Photo Carousel Positioning
   9.  Window Resize & Visibility
   10. Theme Toggle
   11. Cursor Follower
   12. GitHub Stats
   13. Boot
   ============================================ */


/* ============================================
   1. CONSTANTS & CONFIGURATION
   ============================================ */
const VALID_SECTIONS = ['home', 'projects', 'opensource', 'writing', 'talks', 'gallery', 'experience'];
const EXTERNAL_REDIRECTS = {
  'linkedin': 'https://linkedin.com/in/osinachiokpara',
  'github': 'https://github.com/sin4ch',
  'x': 'https://x.com/sin4ch',
  'twitter': 'https://x.com/sin4ch',
  'email': 'mailto:okparaosi17@gmail.com',
  'resume': 'https://drive.google.com/file/d/1L5ceYqwEsZa2TuNwEsT65-IAWpmQLh8Y/view'
};
function getSectionPath(sectionId) {
  return sectionId === 'home' ? '/' : `/${sectionId}/`;
}

function getPathRoute() {
  return window.location.pathname.replace(/^\/|\/$/g, '').toLowerCase();
}

function getQueryRoute() {
  return new URLSearchParams(window.location.search).get('section')?.toLowerCase() || '';
}

function normalizeSectionRoute(route) {
  return route === 'about' ? 'home' : route;
}



/* ============================================
   2. SHARED STATE
   ============================================ */
let actualPct = 0;
let displayedPct = 0;
let animating = false;
const loadingScreen = document.getElementById('loading-screen');
const loadingPercentage = document.getElementById('loading-percentage');
const mainWrapper = document.getElementById('main-wrapper');
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('section');



/* ============================================
   3. LOADING SCREEN
   ============================================ */
function setActualProgress(pct) {
  actualPct = Math.min(pct, 100);
  if (!animating) {
    animating = true;
    requestAnimationFrame(animateCounter);
  }
}

function animateCounter() {
  if (displayedPct < actualPct) {
    const diff = actualPct - displayedPct;
    const step = Math.max(0.3, diff * 0.12);
    displayedPct = Math.min(displayedPct + step, actualPct);
    loadingPercentage.textContent = Math.round(displayedPct) + '%';
  }
  if (displayedPct < 100) {
    requestAnimationFrame(animateCounter);
  } else {
    loadingPercentage.textContent = '100%';
    animating = false;
  }
}

async function initLoadingSequence() {
  const profileImg = document.querySelector('.profile-photo img');
  const profilePromise = profileImg && !profileImg.complete
    ? new Promise(r => { profileImg.onload = r; profileImg.onerror = r; })
    : Promise.resolve();
  await Promise.all([document.fonts.ready, profilePromise]);
  loadingScreen.classList.add('ready');
  await window.PortfolioGallery.preloadInitialImages(setActualProgress);
  completeLoading();
  window.PortfolioGallery.loadRemainingImages();
}

function completeLoading() {
  loadingPercentage.textContent = '100%';
  window.PortfolioGallery.buildGalleryGrid();
  fetchGitHubStats();
  setTimeout(() => {
    loadingScreen.classList.add('hidden');
    document.documentElement.classList.remove('loading-active');
    document.body.classList.remove('loading-active');
    mainWrapper.classList.add('visible');
    handleInitialRoute();
    setTimeout(updateScrollIndicator, 100);
    setTimeout(() => {
      positionCarousel();
      window.PortfolioGallery.loadPhotoCarousel();
    }, 850);
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 800);
  }, 300);
}



/* ============================================
   4. FAVICON
   ============================================ */
function createRoundedFavicon() {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    const canvas = document.createElement('canvas');
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, 0, 0, size, size);
    const favicon = document.getElementById('favicon');
    favicon.href = canvas.toDataURL('image/png');
  };
  img.src = '/profile-picture-128.webp';
}



/* ============================================
   5. NAVIGATION & ROUTING
   ============================================ */
function showSection(targetId, updateUrl = true) {
  if (window.PortfolioGallery.isLightboxOpen()) {
    window.PortfolioGallery.closeLightbox();
  }

  sections.forEach(section => {
    section.classList.remove('active');
  });
  const targetSection = document.getElementById(targetId);
  if (targetSection) {
    targetSection.classList.add('active');
    if (typeof badgeRectsDirty !== 'undefined') badgeRectsDirty = true;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  navItems.forEach(nav => {
    nav.classList.remove('active');
    if (nav.dataset.target === targetId) {
      nav.classList.add('active');
    }
  });
  if (updateUrl) {
    history.pushState({ section: targetId }, '', getSectionPath(targetId));
  }
  const carouselWrapper = document.getElementById('carousel-wrapper');
  if (carouselWrapper) {
    carouselWrapper.classList.toggle('visible', targetId === 'home');
    carouselWrapper.classList.toggle('hidden', targetId !== 'home');
  }
  const isHome = targetId === 'home';
  document.body.classList.toggle('home-active', isHome);
  document.documentElement.classList.toggle('home-active', isHome);
  positionCarousel();
  updateScrollIndicator();
}

function handleInitialRoute() {
  const path = getPathRoute();
  if (EXTERNAL_REDIRECTS[path]) {
    window.location.replace(EXTERNAL_REDIRECTS[path]);
    return;
  }
  const query = getQueryRoute();
  const route = normalizeSectionRoute(query || path || 'home');
  const targetSection = VALID_SECTIONS.includes(route)  ? route : 'home';
  history.replaceState({ section: targetSection }, '', getSectionPath(targetSection));
  showSection(targetSection, false);
}

const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');
const mobileProfilePhoto = document.getElementById('mobileProfilePhoto');

if (mobileProfilePhoto) {
  mobileProfilePhoto.addEventListener('click', () => {
    if (sidebar.classList.contains('menu-open')) {
      showMenuSection('home');
    } else {
      showSection('home');
    }
  });
}

function getFocusableMenuElements() {
  return sidebar.querySelectorAll('button.nav-item:not([data-target="home"]), button.theme-toggle, .mobile-menu-contact a');
}

function repaintMobileMenuText() {
  const navLinks = sidebar.querySelector('.nav-links');
  if (!navLinks) return;
  navLinks.classList.add('menu-text-repaint');
  navLinks.offsetHeight;
  requestAnimationFrame(() => {
    navLinks.classList.remove('menu-text-repaint');
  });
}

function openMobileMenu() {
  sidebar.classList.add('menu-open');
  document.body.classList.add('menu-active');
  document.documentElement.classList.add('menu-active');
  hamburger.classList.add('open');
  hamburger.setAttribute('aria-label', 'Close menu');
  repaintMobileMenuText();
  window.setTimeout(repaintMobileMenuText, 380);
  const firstNav = sidebar.querySelector('button.nav-item:not([data-target="home"])');
  if (firstNav) firstNav.focus();
  document.addEventListener('keydown', handleMenuFocusTrap);
}

function closeMobileMenu(options = {}) {
  sidebar.classList.remove('menu-open');
  document.body.classList.remove('menu-active');
  document.documentElement.classList.remove('menu-active');
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-label', 'Open menu');
  document.removeEventListener('keydown', handleMenuFocusTrap);
  if (options.focusHamburger) {
    hamburger.focus();
  }
}

function showMenuSection(targetId) {
  sections.forEach(s => s.style.transition = 'none');
  showSection(targetId);
  document.body.offsetHeight;
  sections.forEach(s => s.style.transition = '');
  closeMobileMenu();
}

function handleMenuFocusTrap(e) {
  if (e.key === 'Escape') {
    closeMobileMenu({ focusHamburger: true });
    return;
  }
  if (e.key !== 'Tab') return;
  e.preventDefault();
  const focusable = Array.from(getFocusableMenuElements());
  focusable.push(hamburger);
  if (focusable.length === 0) return;
  const currentIndex = focusable.indexOf(document.activeElement);
  let nextIndex;
  if (e.shiftKey) {
    nextIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
  } else {
    nextIndex = currentIndex >= focusable.length - 1 ? 0 : currentIndex + 1;
  }
  focusable[nextIndex].focus();
}

hamburger.addEventListener('click', () => {
  if (sidebar.classList.contains('menu-open')) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
});

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const targetId = item.dataset.target;
    if (sidebar.classList.contains('menu-open')) {
      showMenuSection(targetId);
    } else {
      showSection(targetId);
    }
  });
});

document.querySelectorAll('.home-work-link').forEach(link => {
  link.addEventListener('click', () => {
    openMobileMenu();
  });
});

window.addEventListener('popstate', (event) => {
  if (event.state && event.state.section) {
    showSection(event.state.section, false);
  } else {
    const route = normalizeSectionRoute(getPathRoute() || 'home');
    const targetSection = VALID_SECTIONS.includes(route)  ? route : 'home';
    showSection(targetSection, false);
  }
});



/* ============================================
   6. SECTION FILTERS
   ============================================ */
function initSectionFilters() {
  document.querySelectorAll('.section-filter').forEach(filter => {
    const section = document.getElementById(filter.dataset.filterSection);
    if (!section) return;
    const items = Array.from(section.querySelectorAll('.items > .item'));
    const buttons = Array.from(filter.querySelectorAll('.section-filter-button'));
    let currentGroup = '';

    items.forEach(item => {
      const meta = item.querySelector('.item-meta');
      const badge = item.querySelector('.article-badge, .role-badge');
      const originalMeta = meta?.textContent.trim() || '';
      if (originalMeta) currentGroup = originalMeta;
      item.dataset.filterGroup = currentGroup;
      item.dataset.originalMeta = originalMeta;
      item.dataset.filterCategory = badge?.textContent.trim().toLowerCase() || '';
    });

    function itemMatchesFilter(item, selected) {
      if (selected === 'all') return true;
      if (selected === 'favourite') return item.dataset.filterFavourite === 'true';
      return item.dataset.filterCategory === selected;
    }

    function applyFilter(activeButton) {
      const selected = activeButton.dataset.filterValue;
      const isFavouriteFilter = selected === 'favourite';
      let lastVisibleGroup = '';

      buttons.forEach(button => {
        const isActive = button === activeButton;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });

      const visibleItems = [];
      items.forEach(item => {
        const meta = item.querySelector('.item-meta');
        item.style.order = isFavouriteFilter ? item.dataset.filterOrder || '999' : '';
        if (meta) {
          meta.textContent = isFavouriteFilter ? '' : item.dataset.originalMeta;
        }

        const matches = itemMatchesFilter(item, selected);
        item.hidden = !matches;
        item.classList.remove('filter-first-visible');
        if (matches) {
          visibleItems.push(item);
        }
      });

      const orderedVisibleItems = isFavouriteFilter
        ? [...visibleItems].sort((a, b) => Number(a.dataset.filterOrder || 999) - Number(b.dataset.filterOrder || 999))
        : visibleItems;

      orderedVisibleItems.forEach((item, index) => {
        const meta = item.querySelector('.item-meta');
        if (!meta) return;

        if (index === 0) {
          item.classList.add('filter-first-visible');
        }

        const group = item.dataset.filterGroup || '';
        const shouldPromoteGroup = !isFavouriteFilter && selected !== 'all' && group && group !== lastVisibleGroup && !item.dataset.originalMeta;
        if (shouldPromoteGroup) {
          meta.textContent = group;
        }
        lastVisibleGroup = group || lastVisibleGroup;
      });

      updateScrollIndicator();
    }

    buttons.forEach(button => {
      button.addEventListener('click', () => applyFilter(button));
    });

    applyFilter(buttons.find(button => button.classList.contains('active')) || buttons[0]);
  });
}



/* ============================================
   7. SCROLL INDICATOR
   ============================================ */
const scrollIndicatorDown = document.getElementById('scroll-indicator-down');
const scrollIndicatorUp = document.getElementById('scroll-indicator-up');
let lastScrollTop = 0;
let scrollDirection = 'down';

function updateScrollIndicator() {
  const root = document.documentElement;
  const currentScrollTop = window.scrollY || root.scrollTop;
  const viewportHeight = window.innerHeight;
  const scrollHeight = root.scrollHeight;
  const isScrollable = scrollHeight > viewportHeight + 1;
  const isAtBottom = currentScrollTop + viewportHeight >= scrollHeight - 20;
  const isAtTop = currentScrollTop <= 20;

  if (currentScrollTop < lastScrollTop) {
    scrollDirection = 'up';
  } else if (currentScrollTop > lastScrollTop) {
    scrollDirection = 'down';
  }
  lastScrollTop = currentScrollTop;

  const showUp = isScrollable && scrollDirection === 'up' && !isAtTop;
  const showDown = isScrollable && !isAtBottom && !showUp;
  if (scrollIndicatorDown) {
    scrollIndicatorDown.classList.toggle('visible', showDown);
  }
  if (scrollIndicatorUp) {
    scrollIndicatorUp.classList.toggle('visible', showUp);
  }
}

if (scrollIndicatorDown) {
  scrollIndicatorDown.addEventListener('click', () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  });
}

if (scrollIndicatorUp) {
  scrollIndicatorUp.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

window.addEventListener('scroll', updateScrollIndicator, { passive: true });



/* ============================================
   8. PHOTO CAROUSEL POSITIONING
   ============================================ */
function isMobileLayout() {
  return window.innerWidth <= 768;
}

function positionCarousel() {
  const wrapper = document.getElementById('carousel-wrapper');
  const themeToggle = document.getElementById('themeToggle');
  const contactBar = document.getElementById('contact-bar');
  if (!wrapper || !themeToggle || !contactBar) return;
  if (isMobileLayout()) {
    const homeSection = document.getElementById('home');
    const isHomeActive = homeSection && homeSection.classList.contains('active');
    if (!isHomeActive) { wrapper.style.display = 'none'; return; }
    const homeIntro = document.querySelector('.home-intro');
    const homeWorkLink = document.querySelector('.home-work-link');
    if (!homeIntro) return;
    const anchorEl = homeWorkLink || homeIntro;
    const anchorRect = anchorEl.getBoundingClientRect();
    const bottomInset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spacing')) || 24;
    const topPos = anchorRect.bottom + bottomInset;
    const availableHeight = window.innerHeight - topPos - bottomInset;
    if (availableHeight < 60) { wrapper.style.display = 'none'; return; }
    wrapper.style.display = '';
    wrapper.style.bottom = 'auto';
    wrapper.style.top = topPos + 'px';
    wrapper.style.height = availableHeight + 'px';
    wrapper.style.maxHeight = availableHeight + 'px';
  } else {
    wrapper.style.display = '';
    wrapper.style.bottom = 'auto';
    wrapper.style.maxHeight = '';
    const toggleRect = themeToggle.getBoundingClientRect();
    const contactRect = contactBar.getBoundingClientRect();
    const margin = 24;
    const top = toggleRect.bottom + margin;
    const bottom = contactRect.top;
    const height = bottom - top;
    wrapper.style.top = top + 'px';
    wrapper.style.height = Math.max(height, 100) + 'px';
  }
}

/* ============================================
   9. WINDOW RESIZE & VISIBILITY
   ============================================ */
let lastColCount = window.PortfolioGallery.getColumnCount();
let resizeTimer = null;

window.addEventListener('resize', () => {
  document.body.classList.add('is-resizing');
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    document.body.classList.remove('is-resizing');
  }, 150);

  if (window.innerWidth > 768 && sidebar.classList.contains('menu-open')) {
    closeMobileMenu();
  }
  updateScrollIndicator();
  positionCarousel();
  const newColCount = window.PortfolioGallery.getColumnCount();
  if (newColCount !== lastColCount) {
    lastColCount = newColCount;
    window.PortfolioGallery.buildGalleryGrid();
  }
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    positionCarousel();
  }
});



/* ============================================
   10. THEME TOGGLE
   ============================================ */
const LIGHT_THEME_COLOR = '#ffead3';
const DARK_THEME_COLOR = '#121212';

function updateSystemThemeColor(isDark) {
  const color = isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
  document.getElementById('system-theme-color')?.remove();

  const themeColor = document.createElement('meta');
  themeColor.id = 'system-theme-color';
  themeColor.name = 'theme-color';
  themeColor.content = color;
  document.head.appendChild(themeColor);

  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

  requestAnimationFrame(() => {
    document.documentElement.style.transform = 'translateZ(0)';
    requestAnimationFrame(() => {
      document.documentElement.style.transform = '';
    });
  });
}

function applyThemeToggle() {
  const isDark = document.body.classList.toggle('dark-mode');
  document.documentElement.classList.toggle('dark-mode', isDark);
  updateSystemThemeColor(isDark);
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function toggleTheme() {
  applyThemeToggle();
}

if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-mode');
  document.documentElement.classList.add('dark-mode');
}
updateSystemThemeColor(document.documentElement.classList.contains('dark-mode'));

const themeToggle = document.getElementById('themeToggle');
const themeToggleMobile = document.getElementById('themeToggleMobile');
themeToggle.addEventListener('click', toggleTheme);
if (themeToggleMobile) themeToggleMobile.addEventListener('click', toggleTheme);



/* ============================================
   11. CURSOR FOLLOWER
   ============================================ */
const cursorFollower = document.getElementById('cursorFollower');
const isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.matchMedia('(hover: none)').matches;

var badgeRectsDirty = true;

if (!isTouchDevice) {
  var mouseX = 0;
  var mouseY = 0;
  var followerX = 0;
  var followerY = 0;
  var badgeElements = [];
  var badgeRects = [];
  var activeBadge = null;
  var isOverInteractive = false;

  var MAGNETIC_RADIUS = 20;
  var EASE_DEFAULT = 0.15;
  var EASE_ATTRACT = 0.12;
  var BASE_SIZE = 12;
  var SHAPE_EASE_IN = 0.07;
  var SHAPE_EASE_OUT = 0.15;

  // Lerped shape state for fluid morph
  var currentScaleX = 1;
  var currentScaleY = 1;
  var currentBorderRadius = 6; // px (6 = circle for 12px element)

  function distToRect(px, py, r) {
    var dx = Math.max(r.left - px, 0, px - r.right);
    var dy = Math.max(r.top - py, 0, py - r.bottom);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function cacheBadgeElements() {
    var badges = document.querySelectorAll('.stat-badge, .role-badge');
    badgeElements = [];
    badgeRects = [];
    badges.forEach(function(badge) {
      var section = badge.closest('section');
      if (section && !section.classList.contains('active')) return;
      badgeElements.push(badge);
      badgeRects.push(badge.getBoundingClientRect());
    });
    badgeRectsDirty = false;
  }

  function findClosestBadge() {
    var closestDist = MAGNETIC_RADIUS;
    var closestRect = null;
    var closestEl = null;

    for (var i = 0; i < badgeElements.length; i++) {
      var rect = badgeRects[i];
      if (rect.width === 0 || rect.height === 0) continue;
      var d = distToRect(mouseX, mouseY, rect);
      if (d < closestDist) {
        closestDist = d;
        closestRect = rect;
        closestEl = badgeElements[i];
      }
    }

    return {
      distance: closestDist,
      rect: closestRect,
      element: closestEl
    };
  }

  function getFollowerTarget(closestBadge) {
    var strength = 0;
    var target = {
      x: mouseX,
      y: mouseY,
      scaleX: 1,
      scaleY: 1,
      radius: 6,
      rect: closestBadge.rect,
      element: closestBadge.element
    };

    if (closestBadge.rect) {
      strength = 1 - closestBadge.distance / MAGNETIC_RADIUS;
      strength = strength * strength; // quadratic ease-in
      var cx = closestBadge.rect.left + closestBadge.rect.width / 2;
      var cy = closestBadge.rect.top + closestBadge.rect.height / 2;
      target.x = mouseX + (cx - mouseX) * strength;
      target.y = mouseY + (cy - mouseY) * strength;

      // Target: fill inside the badge
      target.scaleX = 1 + (closestBadge.rect.width / BASE_SIZE - 1) * strength;
      target.scaleY = 1 + (closestBadge.rect.height / BASE_SIZE - 1) * strength;
      // Lerp toward 2px border-radius (matches badge border-radius)
      target.radius = 6 + (2 - 6) * strength;
    }

    return target;
  }

  function updateFollowerState(target) {
    var ease = target.rect ? EASE_ATTRACT : EASE_DEFAULT;
    followerX += (target.x - followerX) * ease;
    followerY += (target.y - followerY) * ease;

    // Lerp shape — slow approach, fast retreat
    var shapeEase = target.rect ? SHAPE_EASE_IN : SHAPE_EASE_OUT;
    currentScaleX += (target.scaleX - currentScaleX) * shapeEase;
    currentScaleY += (target.scaleY - currentScaleY) * shapeEase;
    currentBorderRadius += (target.radius - currentBorderRadius) * shapeEase;

    // Track proximity separately from visual morph
    var wasBadge = !!activeBadge;
    activeBadge = target.element || null;

    // Re-apply hover when leaving badge but still over a link
    if (wasBadge && !activeBadge && isOverInteractive) {
      cursorFollower.classList.add('hovering');
    }
  }

  function getDefaultFollowerTransform() {
    return 'translate3d(' + followerX.toFixed(1) + 'px,' + followerY.toFixed(1) + 'px,0) translate(-50%, -50%)';
  }

  function getMorphedFollowerTransform() {
    return getDefaultFollowerTransform() + ' scale(' + currentScaleX.toFixed(3) + ',' + currentScaleY.toFixed(3) + ')';
  }

  function resetFollowerShape() {
    currentScaleX = 1;
    currentScaleY = 1;
    currentBorderRadius = 6;
    cursorFollower.style.borderRadius = '';
  }

  function applyFollowerStyle(target) {
    // Shape: only apply transform/borderRadius when morphing
    var isBlob = Math.abs(currentScaleX - 1) > 0.01 || Math.abs(currentScaleY - 1) > 0.01;

    if (isBlob && target.rect) {
      // Near a badge: morph and suppress link hover
      cursorFollower.classList.remove('hovering');
      cursorFollower.style.transform = getMorphedFollowerTransform();
      cursorFollower.style.borderRadius = currentBorderRadius.toFixed(1) + 'px';
    } else if (isBlob && cursorFollower.classList.contains('hovering')) {
      // Left badge, on a link: snap morph to default so CSS hover works
      resetFollowerShape();
      cursorFollower.style.transform = getDefaultFollowerTransform();
    } else if (isBlob) {
      // Left badge, empty space: smooth retreat animation
      cursorFollower.style.transform = getMorphedFollowerTransform();
      cursorFollower.style.borderRadius = currentBorderRadius.toFixed(1) + 'px';
    } else {
      // Not morphing: clean default
      resetFollowerShape();
      cursorFollower.style.transform = getDefaultFollowerTransform();
    }
  }

  function animateFollower() {
    if (badgeRectsDirty) cacheBadgeElements();
    var target = getFollowerTarget(findClosestBadge());
    updateFollowerState(target);
    applyFollowerStyle(target);

    requestAnimationFrame(animateFollower);
  }

  function bindCursorTracking() {
    document.addEventListener('mousemove', function(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      badgeRectsDirty = true;
    });
  }

  function bindInteractiveHover() {
    var interactiveElements = document.querySelectorAll('a, button, .theme-toggle');
    interactiveElements.forEach(function(el) {
      el.addEventListener('mouseenter', function() {
        isOverInteractive = true;
        if (!activeBadge) cursorFollower.classList.add('hovering');
      });
      el.addEventListener('mouseleave', function() {
        isOverInteractive = false;
        cursorFollower.classList.remove('hovering');
      });
    });
  }

  function invalidateBadgeCache() {
    badgeRectsDirty = true;
  }

  function bindBadgeCacheInvalidation() {
    sections.forEach(function(s) {
      s.addEventListener('scroll', invalidateBadgeCache, { passive: true });
    });
    document.addEventListener('scroll', invalidateBadgeCache, { passive: true, capture: true });
    window.addEventListener('scroll', invalidateBadgeCache, { passive: true });
    window.addEventListener('resize', invalidateBadgeCache, { passive: true });
  }

  bindCursorTracking();
  bindInteractiveHover();
  bindBadgeCacheInvalidation();
  animateFollower();
}



/* ============================================
   12. GITHUB STATS
   ============================================ */
function fetchGitHubStats() {
  const els = document.querySelectorAll('[data-repo]');
  if (!els.length) return;

  const STAR_PATH = 'M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z';
  const FORK_PATH = 'M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm0 2.122a2.25 2.25 0 1 0-1.5 0v.878A2.25 2.25 0 0 0 5.75 8.5h1.5v2.128a2.251 2.251 0 1 0 1.5 0V8.5h1.5a2.25 2.25 0 0 0 2.25-2.25v-.878a2.25 2.25 0 1 0-1.5 0v.878a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 5 6.25v-.878Zm3.75 7.378a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm3-8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z';

  function renderStats(el, stars, forks) {
    el.innerHTML =
      '<span class="stat-badge"><svg viewBox="0 0 16 16" fill="currentColor"><path d="' + STAR_PATH + '"/></svg> ' + stars + '</span>' +
      '<span class="stat-badge"><svg viewBox="0 0 16 16" fill="currentColor"><path d="' + FORK_PATH + '"/></svg> ' + forks + '</span>';
    if (typeof badgeRectsDirty !== 'undefined') badgeRectsDirty = true;
  }

  els.forEach(function(el) {
    var repo = el.getAttribute('data-repo');
    var cacheKey = 'gh-stats-' + repo;
    var cached = null;
    try {
      cached = JSON.parse(localStorage.getItem(cacheKey));
    } catch(e) {}

    var isFresh = cached && (Date.now() - cached.ts < 3600000);

    if (isFresh) {
      renderStats(el, cached.stars, cached.forks);
      return;
    }

    if (cached) {
      renderStats(el, cached.stars, cached.forks);
    }

    fetch('https://api.github.com/repos/' + repo)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (typeof data.stargazers_count === 'number') {
          var stars = data.stargazers_count;
          var forks = data.forks_count;
          localStorage.setItem(cacheKey, JSON.stringify({ stars: stars, forks: forks, ts: Date.now() }));
          renderStats(el, stars, forks);
        }
      })
      .catch(function() {});
  });
}


/* ============================================
   13. BOOT
   ============================================ */
createRoundedFavicon();
initSectionFilters();
initLoadingSequence();

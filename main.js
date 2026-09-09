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
const STAR_PATH = 'M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z';
const FORK_PATH = 'M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm0 2.122a2.25 2.25 0 1 0-1.5 0v.878A2.25 2.25 0 0 0 5.75 8.5h1.5v2.128a2.251 2.251 0 1 0 1.5 0V8.5h1.5a2.25 2.25 0 0 0 2.25-2.25v-.878a2.25 2.25 0 1 0-1.5 0v.878a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 5 6.25v-.878Zm3.75 7.378a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm3-8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z';
function getSectionPath(sectionId) {
  return sectionId === 'home' ? '/' : `/${sectionId}/`;
}

function getPathRoute() {
  return window.location.pathname.replace(/^\/|\/$/g, '').toLowerCase();
}

function getQueryRoute() {
  return new URLSearchParams(window.location.search).get('section')?.toLowerCase() || '';
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
  setTimeout(() => {
    loadingScreen.classList.add('hidden');
    document.documentElement.classList.remove('loading-active');
    document.body.classList.remove('loading-active');
    mainWrapper.classList.add('visible');
    handleInitialRoute();
    setTimeout(updatePinnedFilter, 100);
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
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  navItems.forEach(nav => {
    nav.classList.remove('active');
    if (nav.dataset.target === targetId) {
      nav.classList.add('active');
    }
  });
  const mobileSectionTitle = document.getElementById('mobileSectionTitle');
  if (mobileSectionTitle) {
    if (targetId === 'home') {
      mobileSectionTitle.textContent = '';
    } else {
      const activeNav = [...navItems].find(nav => nav.dataset.target === targetId);
      mobileSectionTitle.textContent = activeNav
        ? (activeNav.textContent.trim() || activeNav.getAttribute('aria-label') || targetId)
        : targetId;
    }
  }
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
  packFilterRows();
  positionCarousel();
  updatePinnedFilter();
}

function handleInitialRoute() {
  const path = getPathRoute();
  if (EXTERNAL_REDIRECTS[path]) {
    window.location.replace(EXTERNAL_REDIRECTS[path]);
    return;
  }
  const query = getQueryRoute();
  const route = query || path || 'home';
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
  return [...sidebar.querySelectorAll('button, a[href]'),
    document.getElementById('mobileProfilePhoto'),
    document.getElementById('themeToggleMobile'), hamburger]
    .filter(el => el && !el.disabled && el.getClientRects().length > 0);
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

let menuScrollY = 0;

function openMobileMenu() {
  if (sidebar.classList.contains('menu-open')) return;
  menuScrollY = window.scrollY;
  document.body.style.top = `-${menuScrollY}px`;
  sidebar.classList.add('menu-open');
  document.body.classList.add('menu-active');
  document.documentElement.classList.add('menu-active');
  hamburger.classList.add('open');
  hamburger.setAttribute('aria-label', 'Close menu');
  hamburger.setAttribute('aria-expanded', 'true');
  repaintMobileMenuText();
  window.setTimeout(repaintMobileMenuText, 380);
  const firstNav = sidebar.querySelector('button.nav-item:not([data-target="home"])');
  if (firstNav) firstNav.focus({ preventScroll: true });
  document.addEventListener('keydown', handleMenuFocusTrap);
}

function closeMobileMenu(options = {}) {
  if (!sidebar.classList.contains('menu-open')) return;
  sidebar.classList.remove('menu-open');
  document.body.classList.remove('menu-active');
  document.documentElement.classList.remove('menu-active');
  document.body.style.top = '';
  window.scrollTo({ top: menuScrollY, behavior: 'instant' });
  updatePinnedFilter();
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-label', 'Open menu');
  hamburger.setAttribute('aria-expanded', 'false');
  document.removeEventListener('keydown', handleMenuFocusTrap);
  if (options.focusHamburger) {
    hamburger.focus({ preventScroll: true });
  }
}

function showMenuSection(targetId) {
  sections.forEach(s => s.style.transition = 'none');
  closeMobileMenu();
  showSection(targetId);
  document.body.offsetHeight;
  sections.forEach(s => s.style.transition = '');
}

function handleMenuFocusTrap(e) {
  if (e.key === 'Escape') {
    closeMobileMenu({ focusHamburger: true });
    return;
  }
  if (e.key !== 'Tab') return;
  e.preventDefault();
  const focusable = Array.from(getFocusableMenuElements());
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
    const route = getPathRoute() || 'home';
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

      section.classList.toggle('filter-compact', selected !== 'all');
      updatePinnedFilter();
    }

    buttons.forEach(button => {
      button.addEventListener('click', () => applyFilter(button));
    });

    applyFilter(buttons.find(button => button.classList.contains('active')) || buttons[0]);
  });
}

function initProjectSort() {
  document.querySelectorAll('.project-sort').forEach(sortControl => {
    const section = document.getElementById(sortControl.dataset.sortSection);
    if (!section) return;

    const itemsContainer = section.querySelector('.items');
    const items = Array.from(section.querySelectorAll('.items > .item'));
    const buttons = Array.from(sortControl.querySelectorAll('.section-filter-button'));
    const originalItems = [...items];

    function syncProjectYears(showYears) {
      if (!showYears) {
        Array.from(itemsContainer.children).forEach(item => {
          const meta = item.querySelector('.item-meta');
          if (meta) meta.textContent = '';
        });
        return;
      }

      let lastYear = '';
      Array.from(itemsContainer.children).forEach(item => {
        const meta = item.querySelector('.item-meta');
        if (!meta) return;
        const year = item.dataset.projectYear || '';
        meta.textContent = year && year !== lastYear ? year : '';
        if (year) lastYear = year;
      });
    }

    items.forEach(item => {
      const meta = item.querySelector('.item-meta');
      item.dataset.projectYear = meta?.textContent.trim() || '';
      item.dataset.projectStars = '0';
      item.dataset.projectForks = '0';
    });

    function applySort(activeButton) {
      const selected = activeButton.dataset.sortValue;
      buttons.forEach(button => {
        const isActive = button === activeButton;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });

      const sortedItems = selected === 'date'
        ? originalItems
        : [...items].sort((a, b) => {
            const aValue = Number(selected === 'stars' ? a.dataset.projectStars : a.dataset.projectForks) || 0;
            const bValue = Number(selected === 'stars' ? b.dataset.projectStars : b.dataset.projectForks) || 0;
            return bValue - aValue || originalItems.indexOf(a) - originalItems.indexOf(b);
          });

      sortedItems.forEach(item => itemsContainer.appendChild(item));
      syncProjectYears(selected === 'date');
      updatePinnedFilter();
    }

    document.addEventListener('projectstatschange', () => {
      const activeButton = buttons.find(button => button.classList.contains('active'));
      if (activeButton && activeButton.dataset.sortValue !== 'date') {
        applySort(activeButton);
      }
    });

    buttons.forEach(button => {
      button.addEventListener('click', () => applySort(button));
    });

    applySort(buttons.find(button => button.classList.contains('active')) || buttons[0]);
  });
}

/* ============================================
   6b. MOBILE STICKY FILTER (pins the filter bar under the top nav on
   small screens, but only if CSS position:sticky has visibly failed;
   otherwise it stays out of the way)
   ============================================ */
const mobilePinMQ = window.matchMedia('(max-width: 768px)');
let pinnedFilter = null;
let pinnedPlaceholder = null;

function getPinnedTopbarHeight() {
  if (!mobilePinMQ.matches) return 0;
  const bar = document.getElementById('mobile-top-bar');
  if (!bar) return 0;
  return bar.getBoundingClientRect().height;
}

function unpinFilter() {
  if (!pinnedFilter) return;
  pinnedFilter.style.position = '';
  pinnedFilter.style.top = '';
  pinnedFilter.style.left = '';
  pinnedFilter.style.width = '';
  pinnedFilter.style.zIndex = '';
  if (pinnedPlaceholder && pinnedPlaceholder.parentNode) {
    pinnedPlaceholder.parentNode.removeChild(pinnedPlaceholder);
  }
  pinnedPlaceholder = null;
  pinnedFilter = null;
}

function syncPinnedFilter(topbarH) {
  if (!pinnedFilter || !pinnedPlaceholder) return;
  const rect = pinnedPlaceholder.getBoundingClientRect();
  pinnedFilter.style.top = topbarH + 'px';
  pinnedFilter.style.left = rect.left + 'px';
  pinnedFilter.style.width = rect.width + 'px';
}

function updatePinnedFilter() {
  if (!mobilePinMQ.matches) {
    unpinFilter();
    return;
  }
  // Fixed-body menu locking resets window.scrollY, but preserves the visible page.
  // Keep the filter where it was until the original scroll position is restored.
  if (sidebar.classList.contains('menu-open')) return;
  const activeSection = document.querySelector('section.active');
  const activeFilter = activeSection ? activeSection.querySelector('.section-filter') : null;
  if (pinnedFilter && pinnedFilter !== activeFilter) {
    unpinFilter();
  }
  if (!activeFilter) {
    unpinFilter();
    return;
  }
  const topbarH = getPinnedTopbarHeight();
  if (pinnedFilter) {
    if (pinnedPlaceholder && pinnedPlaceholder.getBoundingClientRect().top >= topbarH + 8) {
      unpinFilter();
      return;
    }
    syncPinnedFilter(topbarH);
    return;
  }
  const rect = activeFilter.getBoundingClientRect();
  if (rect.height > 0 && rect.top < topbarH) {
    pinnedPlaceholder = document.createElement('div');
    pinnedPlaceholder.setAttribute('aria-hidden', 'true');
    pinnedPlaceholder.style.height = rect.height + 'px';
    activeFilter.parentNode.insertBefore(pinnedPlaceholder, activeFilter);
    pinnedFilter = activeFilter;
    pinnedFilter.style.position = 'fixed';
    pinnedFilter.style.zIndex = '50';
    syncPinnedFilter(topbarH);
  }
}

window.addEventListener('scroll', updatePinnedFilter, { passive: true });
window.addEventListener('pageshow', updatePinnedFilter);


/* ============================================
   6c. FILTER ROW PACKING (groups each visual row of filter buttons
   into its own bordered box, so boxes hug their row instead of
   stretching full-width)
   ============================================ */
let packFilterTimer = null;

function packFilterRows() {
  document.querySelectorAll('.section-filter').forEach(filter => {
    const existingRows = Array.from(filter.querySelectorAll(':scope > .section-filter-row'));
    existingRows.forEach(row => {
      while (row.firstChild) filter.insertBefore(row.firstChild, row);
      row.remove();
    });
    const buttons = Array.from(filter.querySelectorAll(':scope > .section-filter-button'));
    if (!buttons.length) return;
    const filterWidth = filter.clientWidth;
    if (filterWidth <= 0) return;
    const label = filter.querySelector(':scope > .section-filter-label');
    const labelWidth = label ? Math.ceil(label.getBoundingClientRect().width) + 8 : 0;
    const widths = buttons.map(button => Math.ceil(button.getBoundingClientRect().width));
    const rows = [];
    let current = [];
    let currentWidth = 0;
    let capacity = filterWidth - labelWidth;
    buttons.forEach((button, index) => {
      if (current.length && currentWidth + widths[index] > capacity) {
        rows.push(current);
        current = [];
        currentWidth = 0;
        capacity = filterWidth;
      }
      current.push(button);
      currentWidth += widths[index];
    });
    if (current.length) rows.push(current);
    rows.forEach(rowButtons => {
      const row = document.createElement('div');
      row.className = 'section-filter-row';
      rowButtons.forEach(button => row.appendChild(button));
      filter.appendChild(row);
    });
    if (pinnedFilter) {
      const pinnedHeight = pinnedFilter.getBoundingClientRect().height;
      if (pinnedPlaceholder) pinnedPlaceholder.style.height = pinnedHeight + 'px';
      syncPinnedFilter(getPinnedTopbarHeight());
    }
  });
}

function schedulePackFilterRows() {
  window.clearTimeout(packFilterTimer);
  packFilterTimer = window.setTimeout(packFilterRows, 150);
}

window.addEventListener('resize', schedulePackFilterRows);
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => packFilterRows());
}



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
  updatePinnedFilter();
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
    updatePinnedFilter();
  }
});



/* ============================================
   10. THEME TOGGLE
   ============================================ */
const LIGHT_THEME_COLOR = '#ffead3';
const DARK_THEME_COLOR = '#121212';

function updateSystemThemeColor(isDark) {
  const color = isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
  const themeColor = document.getElementById('system-theme-color');

  // Keep the same element so Chrome can observe the theme-color update in an installed PWA.
  themeColor?.setAttribute('content', color);

  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  document.documentElement.classList.toggle('dark-mode', isDark);
  updateSystemThemeColor(isDark);
  try {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  } catch {}
}


// The early theme script already read the saved choice before the first paint.
document.body.classList.toggle('dark-mode', document.documentElement.classList.contains('dark-mode'));
updateSystemThemeColor(document.documentElement.classList.contains('dark-mode'));

const themeToggle = document.getElementById('themeToggle');
const themeToggleMobile = document.getElementById('themeToggleMobile');
themeToggle.addEventListener('click', toggleTheme);
if (themeToggleMobile) themeToggleMobile.addEventListener('click', toggleTheme);



/* ============================================
   11. CURSOR FOLLOWER
   ============================================ */
const cursorFollower = document.getElementById('cursorFollower');
const cursorVisibleQuery = window.matchMedia('(min-width: 1025px)');
const coarsePointerQuery = window.matchMedia('(hover: none) and (pointer: coarse)');
const reducedCursorMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let mouseX = 0;
let mouseY = 0;
let followerX = 0;
let followerY = 0;
let cursorFrame = null;

function animateFollower() {
  followerX += (mouseX - followerX) * 0.15;
  followerY += (mouseY - followerY) * 0.15;
  followerX = Math.min(Math.max(followerX, 16), window.innerWidth - 16);
  followerY = Math.min(Math.max(followerY, 16), window.innerHeight - 16);
  cursorFollower.style.transform = 'translate3d(' + followerX.toFixed(1) + 'px,' + followerY.toFixed(1) + 'px,0) translate(-50%, -50%)';
  cursorFrame = requestAnimationFrame(animateFollower);
}

function syncCursorAnimation() {
  const visible = !document.hidden && cursorVisibleQuery.matches && !coarsePointerQuery.matches && !reducedCursorMotionQuery.matches;
  if (visible && cursorFrame === null) {
    cursorFrame = requestAnimationFrame(animateFollower);
  } else if (!visible && cursorFrame !== null) {
    cancelAnimationFrame(cursorFrame);
    cursorFrame = null;
  }
}

document.addEventListener('mousemove', event => {
  mouseX = event.clientX;
  mouseY = event.clientY;
});
document.querySelectorAll('a, button, .theme-toggle').forEach(el => {
  el.addEventListener('mouseenter', () => cursorFollower.classList.add('hovering'));
  el.addEventListener('mouseleave', () => cursorFollower.classList.remove('hovering'));
});
cursorVisibleQuery.addEventListener('change', syncCursorAnimation);
coarsePointerQuery.addEventListener('change', syncCursorAnimation);
reducedCursorMotionQuery.addEventListener('change', syncCursorAnimation);
document.addEventListener('visibilitychange', syncCursorAnimation);
syncCursorAnimation();


/* ============================================
   12. GITHUB STATS
   ============================================ */
function fetchGitHubStats() {
  const els = document.querySelectorAll('.item-stats[data-repo]');
  if (!els.length) return;

  function renderStats(el, stars, forks) {
    const item = el.closest('.item');
    if (item) {
      item.dataset.projectStars = String(stars);
      item.dataset.projectForks = String(forks);
    }
    el.innerHTML =
      '<span class="stat-badge"><svg viewBox="0 0 16 16" fill="currentColor"><path d="' + STAR_PATH + '"/></svg> ' + stars + '</span>' +
      '<span class="stat-badge"><svg viewBox="0 0 16 16" fill="currentColor"><path d="' + FORK_PATH + '"/></svg> ' + forks + '</span>';
    document.dispatchEvent(new CustomEvent('projectstatschange'));
  }

  els.forEach(function(el) {
    var repo = el.getAttribute('data-repo');
    var bakedStars = parseInt(el.getAttribute('data-stars'), 10);
    var bakedForks = parseInt(el.getAttribute('data-forks'), 10);
    if (!isNaN(bakedStars) && !isNaN(bakedForks)) {
      renderStats(el, bakedStars, bakedForks);
    }
    var cacheKey = 'gh-stats-' + repo;
    var cached = null;
    try {
      cached = JSON.parse(localStorage.getItem(cacheKey));
    } catch(e) {}

    var isFresh = cached && (Date.now() - cached.ts < 86400000);

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
          renderStats(el, stars, forks);
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ stars: stars, forks: forks, ts: Date.now() }));
          } catch(e) {}
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
initProjectSort();
fetchGitHubStats();
initLoadingSequence();

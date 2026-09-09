/* ============================================
   GALLERY MODULE
   ============================================
   1.  State & DOM References
   2.  Gallery Data & Loading
   3.  Gallery Grid
   4.  Photo Carousel
   5.  Lightbox / Story Viewer
   6.  Public API
   ============================================ */
(function() {
  /* ============================================
     1. STATE & DOM REFERENCES
     ============================================ */
  const INITIAL_COUNT = 4;
  const CAROUSEL_IMAGE_LIMIT = 28;
  const MOBILE_CAROUSEL_INITIAL_LIMIT = 8;
  const GALLERY_BATCH_SIZE = 12;
  let galleryData = null;
  let galleryImages = [];
  let galleryColumns = [];
  let columnHeights = [];
  let gallerySkeletonsById = {};
  let shuffledGalleryImages = [];
  let carouselAnimationFrame = null;
  let carouselImageLimit = CAROUSEL_IMAGE_LIMIT;
  let carouselExpansionScheduled = false;

  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxTapPrev = document.getElementById('lightbox-tap-prev');
  const lightboxTapNext = document.getElementById('lightbox-tap-next');
  const lightboxPauseZone = document.getElementById('lightbox-pause-zone');
  const lightboxHintOverlay = document.getElementById('lightbox-hint-overlay');
  const lightboxCounter = document.getElementById('lightbox-counter');
  const lightboxStoryProgress = document.getElementById('lightbox-story-progress');
  const STORY_DURATION = 5000;
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let currentImageIndex = 0;
  let storyTimer = null;
  let storyStartedAt = 0;
  let storyRemaining = STORY_DURATION;
  let storyPaused = false;
  let lightboxScrollY = 0;
  let lightboxTrigger = null;
  let backgroundStates = [];

  /* ============================================
     2. GALLERY DATA & LOADING
     ============================================ */
  async function loadGalleryData() {
    try {
      const response = await fetch('/gallery/gallery.json');
      const data = await response.json();
      if (data.images && data.images.length > 0) galleryData = data;
    } catch (e) {}
  }

  function getGallerySequence() {
    if (!galleryData) return [];
    return shuffledGalleryImages.length > 0 ? shuffledGalleryImages : galleryData.images;
  }

  function getUnloadedImages() {
    const loadedIds = new Set(galleryImages.map(img => img.id));
    return getGallerySequence().filter(img => !loadedIds.has(img.id));
  }

  async function preloadInitialImages(setProgress) {
    await loadGalleryData();
    if (!galleryData || !galleryData.images.length) return;

    const shuffledImages = [...galleryData.images];
    for (let i = shuffledImages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledImages[i], shuffledImages[j]] = [shuffledImages[j], shuffledImages[i]];
    }
    shuffledGalleryImages = shuffledImages;

    const initialBatch = shuffledImages.slice(0, INITIAL_COUNT);
    let completed = 0;
    let targetPct = 0;
    let simulatedPct = 0;
    const speedJitter = 0.5 + Math.random() * 0.5;
    const decelBase = 0.01 + Math.random() * 0.06;
    const weights = Array.from({length: INITIAL_COUNT}, () => 0.5 + Math.random());
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const checkpoints = [];
    let cumulative = 0;
    weights.forEach(w => {
      cumulative += (w / totalWeight) * 100;
      checkpoints.push(cumulative);
    });
    checkpoints[checkpoints.length - 1] = 100;
    const bufferOffsets = Array.from({length: INITIAL_COUNT}, () => Math.floor(Math.random() * 21) - 10);
    let simRunning = true;

    function tickProgress() {
      if (!simRunning) return;
      const gap = targetPct - simulatedPct;
      const noise = 0.8 + Math.random() * 0.4;
      let speed;
      if (gap > 5) {
        speed = (1.0 + gap * 0.15) * speedJitter * noise;
      } else if (gap > 0) {
        speed = (0.2 + gap * 0.08) * speedJitter * noise;
      } else {
        const currentOffset = bufferOffsets[completed] || 0;
        const buffer = targetPct < 100 ? Math.max(0, targetPct + currentOffset) : 100;
        speed = simulatedPct < buffer ? decelBase * noise : 0;
      }
      simulatedPct = Math.min(simulatedPct + speed, 100);
      setProgress(simulatedPct);
      requestAnimationFrame(tickProgress);
    }
    requestAnimationFrame(tickProgress);

    for (const imageData of initialBatch) {
      try {
        const img = new Image();
        img.decoding = 'async';
        img.src = imageData.url;
        await img.decode();
        imageData.naturalWidth = img.naturalWidth;
        imageData.naturalHeight = img.naturalHeight;
        galleryImages.push(imageData);
      } catch (e) {}
      completed++;
      targetPct = checkpoints[completed - 1];
    }

    await new Promise(r => {
      function waitForAnimation() {
        const currentText = document.getElementById('loading-percentage')?.textContent || '0%';
        const displayedPct = parseFloat(currentText) || 0;
        if (displayedPct >= 99.5) {
          simRunning = false;
          r();
          return;
        }
        requestAnimationFrame(waitForAnimation);
      }
      waitForAnimation();
    });
  }

  function loadRemainingImages() {
    if (!galleryData) return;
    const remaining = getUnloadedImages();
    if (remaining.length === 0) return;
    let idx = 0;

    function appendGalleryBatch() {
      if (idx >= remaining.length) return;
      const end = Math.min(idx + GALLERY_BATCH_SIZE, remaining.length);
      while (idx < end) {
        const imageData = remaining[idx++];
        imageData.naturalWidth = imageData.naturalWidth || imageData.width;
        imageData.naturalHeight = imageData.naturalHeight || imageData.height;
        galleryImages.push(imageData);
        appendToGalleryGrid(imageData);
        appendToCarousel(imageData);
      }
      scheduleNextGalleryBatch();
    }

    function scheduleNextGalleryBatch() {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(appendGalleryBatch, { timeout: 700 });
      } else {
        window.setTimeout(appendGalleryBatch, 24);
      }
    }

    scheduleNextGalleryBatch();
  }

  /* ============================================
     3. GALLERY GRID
     ============================================ */
  function getColumnCount() {
    const w = window.innerWidth;
    if (w <= 480) return 1;
    if (w <= 768) return 2;
    if (w <= 1024) return 3;
    return 4;
  }

  function getRenderedImageHeight(imageData) {
    const imageWidth = imageData.naturalWidth || imageData.width;
    const imageHeight = imageData.naturalHeight || imageData.height;
    if (!imageWidth || !imageHeight) return 200;
    if (galleryColumns.length === 0) return 200;
    const colWidth = galleryColumns[0].offsetWidth || 200;
    return (imageHeight / imageWidth) * colWidth;
  }

  function getShortestColumnIndex() {
    return columnHeights.indexOf(Math.min(...columnHeights));
  }

  function placeInShortestColumn(element, height) {
    const shortestIdx = getShortestColumnIndex();
    galleryColumns[shortestIdx].appendChild(element);
    columnHeights[shortestIdx] += height + 6;
  }

  function setImageDimensions(imgEl, imageData) {
    if (imageData.width && imageData.height) {
      imgEl.width = imageData.width;
      imgEl.height = imageData.height;
    }
  }

  function buildGalleryGrid() {
    const galleryGrid = document.getElementById('gallery-grid');
    if (!galleryGrid) return;
    const colCount = getColumnCount();
    galleryGrid.innerHTML = '';
    galleryColumns = [];
    columnHeights = [];
    for (let i = 0; i < colCount; i++) {
      const col = document.createElement('div');
      col.className = 'gallery-column';
      galleryGrid.appendChild(col);
      galleryColumns.push(col);
      columnHeights.push(0);
    }
    galleryImages.forEach((img) => {
      placeInShortestColumn(createGalleryItem(img), getRenderedImageHeight(img));
    });
    buildGallerySkeletons();
  }

  function createGalleryItem(img) {
    const itemEl = document.createElement('button');
    itemEl.type = 'button';
    itemEl.className = 'gallery-item is-loading';
    itemEl.setAttribute('aria-label', 'Open ' + (img.title || 'gallery photo'));
    const imgEl = document.createElement('img');
    imgEl.src = img.url;
    imgEl.alt = img.title || 'Gallery photo';
    imgEl.loading = 'lazy';
    imgEl.decoding = 'async';
    setImageDimensions(imgEl, img);
    imgEl.addEventListener('load', () => itemEl.classList.remove('is-loading'), { once: true });
    imgEl.addEventListener('error', () => itemEl.classList.remove('is-loading'), { once: true });
    itemEl.appendChild(imgEl);
    itemEl.addEventListener('click', () => openLightbox(galleryImages.indexOf(img)));
    return itemEl;
  }

  function appendToGalleryGrid(imageData) {
    if (galleryColumns.length === 0) return;
    const item = createGalleryItem(imageData);
    const skeleton = gallerySkeletonsById[imageData.id];
    if (skeleton && skeleton.parentNode) {
      skeleton.parentNode.replaceChild(item, skeleton);
      delete gallerySkeletonsById[imageData.id];
    } else {
      placeInShortestColumn(item, getRenderedImageHeight(imageData));
    }
  }

  function buildGallerySkeletons() {
    gallerySkeletonsById = {};
    if (!galleryData || galleryColumns.length === 0) return;
    const colWidth = galleryColumns[0].offsetWidth || 200;
    const remaining = getUnloadedImages();

    remaining.forEach(imageData => {
      const skeleton = document.createElement('div');
      skeleton.className = 'gallery-skeleton';
      const height = (imageData.width && imageData.height)
        ? (imageData.height / imageData.width) * colWidth
        : colWidth * 1.25;
      skeleton.style.height = height + 'px';
      placeInShortestColumn(skeleton, height);
      gallerySkeletonsById[imageData.id] = skeleton;
    });
  }

  /* ============================================
     4. PHOTO CAROUSEL
     ============================================ */
  function isMobileCarousel() {
    return window.innerWidth <= 768;
  }

  function scheduleIdleWork(callback, timeout = 1200) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout });
    } else {
      window.setTimeout(callback, Math.min(timeout, 600));
    }
  }

  function loadPhotoCarousel() {
    const carousel = document.getElementById('photo-carousel');
    if (!carousel || galleryImages.length === 0) return;
    carouselImageLimit = isMobileCarousel() ? MOBILE_CAROUSEL_INITIAL_LIMIT : CAROUSEL_IMAGE_LIMIT;
    carouselExpansionScheduled = false;
    const track = document.createElement('div');
    track.className = 'photo-carousel-track';
    galleryImages.slice(0, carouselImageLimit).forEach((img, index) => {
      appendToCarousel(img, track, { highPriority: index === 0 });
    });
    carousel.innerHTML = '';
    carousel.appendChild(track);
    scheduleCarouselExpansion();
    requestAnimationFrame(() => initCarouselScroll(track));
  }

  function appendToCarousel(img, targetTrack, options = {}) {
    const track = targetTrack || document.querySelector('.photo-carousel-track');
    if (!track || track.children.length >= carouselImageLimit) return;
    const imgEl = document.createElement('img');
    imgEl.src = img.url;
    imgEl.alt = img.title || 'Gallery photo';
    imgEl.decoding = 'async';
    imgEl.loading = options.highPriority ? 'eager' : 'lazy';
    if (options.highPriority) {
      imgEl.fetchPriority = 'high';
    }
    setImageDimensions(imgEl, img);
    track.appendChild(imgEl);
  }

  function fillCarouselTrack() {
    const track = document.querySelector('.photo-carousel-track');
    if (!track) return;
    for (let i = track.children.length; i < galleryImages.length && i < carouselImageLimit; i++) {
      appendToCarousel(galleryImages[i], track);
    }
  }

  function scheduleCarouselExpansion() {
    if (!isMobileCarousel() || carouselExpansionScheduled) return;
    carouselExpansionScheduled = true;
    window.setTimeout(() => {
      scheduleIdleWork(() => {
        carouselImageLimit = CAROUSEL_IMAGE_LIMIT;
        fillCarouselTrack();
      }, 2000);
    }, 2500);
  }

  function initCarouselScroll(track) {
    const carousel = track.parentElement;
    if (!carousel) return;
    if (carouselAnimationFrame) {
      cancelAnimationFrame(carouselAnimationFrame);
      carouselAnimationFrame = null;
    }
    let lastTimestamp = 0;
    let scrollPosition = carousel.scrollLeft;
    let isTouchScrolling = false;
    let touchResumeTimer = null;
    const speed = 48;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function getSlideWidth(slide) {
      return slide ? slide.offsetWidth + 8 : 0;
    }

    function prependLastSlide() {
      const last = track.lastElementChild;
      const first = track.firstElementChild;
      if (!last || !first || last === first) return;
      const lastWidth = getSlideWidth(last);
      if (lastWidth <= 0) return;
      track.insertBefore(last, first);
      scrollPosition += lastWidth;
      carousel.scrollLeft = scrollPosition;
    }

    function addBackwardScrollBuffer(count = 3) {
      let addedWidth = 0;
      for (let i = 0; i < count; i++) {
        const last = track.lastElementChild;
        const first = track.firstElementChild;
        if (!last || !first || last === first) break;
        const lastWidth = getSlideWidth(last);
        if (lastWidth <= 0) break;
        track.insertBefore(last, first);
        addedWidth += lastWidth;
      }
      if (addedWidth > 0) {
        scrollPosition += addedWidth;
        carousel.scrollLeft = scrollPosition;
      }
    }

    function wrapForwardIfNeeded() {
      const first = track.firstElementChild;
      if (!first) return;
      const firstWidth = getSlideWidth(first);
      if (firstWidth > 0 && scrollPosition >= firstWidth) {
        track.appendChild(first);
        scrollPosition -= firstWidth;
        carousel.scrollLeft = scrollPosition;
      }
    }

    function tick(timestamp) {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const deltaMs = Math.min(timestamp - lastTimestamp, 100);
      lastTimestamp = timestamp;
      const wrapperVisible = carousel.closest('.photo-carousel-wrapper')?.classList.contains('visible');
      if (!document.hidden && wrapperVisible && !reducedMotion && !isTouchScrolling && speed > 0) {
        scrollPosition += speed * (deltaMs / 1000);
        carousel.scrollLeft = scrollPosition;
        wrapForwardIfNeeded();
      }
      carouselAnimationFrame = requestAnimationFrame(tick);
    }

    requestAnimationFrame(() => addBackwardScrollBuffer());
    carouselAnimationFrame = requestAnimationFrame(tick);
    carousel.addEventListener('touchstart', () => {
      isTouchScrolling = true;
      window.clearTimeout(touchResumeTimer);
      if (carousel.scrollLeft < 12) addBackwardScrollBuffer();
    }, { passive: true });
    function resumeAfterTouchScrollSettles() {
      window.clearTimeout(touchResumeTimer);
      touchResumeTimer = window.setTimeout(() => {
        scrollPosition = carousel.scrollLeft;
        isTouchScrolling = false;
        lastTimestamp = 0;
      }, 100);
    }
    carousel.addEventListener('touchend', resumeAfterTouchScrollSettles, { passive: true });
    carousel.addEventListener('touchcancel', resumeAfterTouchScrollSettles, { passive: true });
    carousel.addEventListener('wheel', (event) => {
      const horizontalDelta = Math.abs(event.deltaX) >= Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (horizontalDelta < 0 && carousel.scrollLeft < 48) addBackwardScrollBuffer();
      scrollPosition = carousel.scrollLeft;
    }, { passive: true });
    carousel.addEventListener('scroll', () => {
      scrollPosition = carousel.scrollLeft;
      if (scrollPosition < 12) prependLastSlide();
      if (isTouchScrolling) resumeAfterTouchScrollSettles();
    }, { passive: true });
  }

  /* ============================================
     5. LIGHTBOX / STORY VIEWER
     ============================================ */
  function openLightbox(index) {
    if (galleryImages.length === 0) return;
    lightboxTrigger = document.activeElement;
    backgroundStates = [...document.body.children]
      .filter(el => el !== lightbox && el.tagName !== 'SCRIPT')
      .map(el => [el, el.inert]);
    backgroundStates.forEach(([el]) => { el.inert = true; });
    currentImageIndex = index;
    lightboxScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    updateLightboxImage();
    lightbox.classList.add('active');
    lightbox.removeAttribute('aria-hidden');
    lightboxClose.focus({ preventScroll: true });
    document.body.classList.add('lightbox-open');
    document.body.style.top = `-${lightboxScrollY}px`;
    startStoryTimer();
    showTapHint();
  }

  function closeLightbox() {
    if (!lightbox.classList.contains('active')) return;
    lightbox.classList.remove('active');
    backgroundStates.forEach(([el, wasInert]) => { el.inert = wasInert; });
    backgroundStates = [];
    if (lightboxTrigger?.isConnected) lightboxTrigger.focus({ preventScroll: true });
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    document.body.style.top = '';
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo({ top: lightboxScrollY, behavior: 'auto' });
    requestAnimationFrame(() => {
      root.style.scrollBehavior = previousScrollBehavior;
    });
    stopStoryTimer();
    storyPaused = false;
  }

  function updateLightboxImage() {
    const img = galleryImages[currentImageIndex];
    lightboxImg.src = img.url;
    lightboxImg.alt = img.title || 'Gallery photo';
    const counterText = (currentImageIndex + 1) + ' / ' + galleryImages.length;
    lightboxCounter.textContent = counterText;
  }

  function stopStoryTimer() {
    if (storyTimer) {
      clearTimeout(storyTimer);
      storyTimer = null;
    }
    if (lightboxStoryProgress) {
      lightboxStoryProgress.classList.remove('is-running');
      lightboxStoryProgress.style.animation = 'none';
    }
  }

  function startStoryTimer(duration = STORY_DURATION) {
    stopStoryTimer();
    if (!lightboxStoryProgress || !lightbox.classList.contains('active')) return;
    storyRemaining = duration;
    storyStartedAt = performance.now();
    storyPaused = false;
    lightboxPauseZone.setAttribute('aria-pressed', 'false');
    lightboxPauseZone.disabled = reducedMotionQuery.matches;
    lightboxPauseZone.setAttribute('aria-label', reducedMotionQuery.matches
      ? 'Automatic slideshow is off for reduced motion'
      : 'Pause or play slideshow');
    if (reducedMotionQuery.matches) return;
    lightboxStoryProgress.style.animationPlayState = 'running';
    lightboxStoryProgress.style.animation = 'none';
    lightboxStoryProgress.offsetHeight;
    lightboxStoryProgress.style.animation = 'story-progress ' + duration + 'ms linear forwards';
    lightboxStoryProgress.classList.add('is-running');
    storyTimer = setTimeout(showNextImage, duration);
  }

  function pauseStoryTimer() {
    if (storyPaused || !lightboxStoryProgress || !lightbox.classList.contains('active')) return;
    if (storyTimer) {
      clearTimeout(storyTimer);
      storyTimer = null;
    }
    storyRemaining = Math.max(0, storyRemaining - (performance.now() - storyStartedAt));
    lightboxStoryProgress.style.animationPlayState = 'paused';
    lightboxPauseZone.setAttribute('aria-pressed', 'true');
    storyPaused = true;
  }

  function resumeStoryTimer() {
    if (!storyPaused) return;
    storyPaused = false;
    storyStartedAt = performance.now();
    lightboxStoryProgress.style.animationPlayState = 'running';
    lightboxPauseZone.setAttribute('aria-pressed', 'false');
    storyTimer = setTimeout(showNextImage, storyRemaining);
  }

  function showTapHint() {
    if (!lightboxHintOverlay) return;
    lightboxHintOverlay.classList.remove('is-visible');
    lightboxHintOverlay.offsetHeight;
    lightboxHintOverlay.classList.add('is-visible');
    setTimeout(() => lightboxHintOverlay.classList.remove('is-visible'), 3000);
  }

  function showPrevImage() {
    currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
    updateLightboxImage();
    startStoryTimer();
  }

  function showNextImage() {
    currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
    updateLightboxImage();
    startStoryTimer();
  }

  function bindLightboxEvents() {
    if (!lightbox) return;
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxTapPrev.addEventListener('click', showPrevImage);
    lightboxTapNext.addEventListener('click', showNextImage);
    lightboxPauseZone.addEventListener('click', () => {
      if (storyPaused) {
        resumeStoryTimer();
      } else {
        pauseStoryTimer();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Tab') {
        const controls = [...lightbox.querySelectorAll('button:not(:disabled)')];
        const index = controls.indexOf(document.activeElement);
        const next = e.shiftKey
          ? (index <= 0 ? controls.length - 1 : index - 1)
          : (index + 1) % controls.length;
        e.preventDefault();
        controls[next].focus();
      } else if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        showPrevImage();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        showNextImage();
      }
    });
  }

  bindLightboxEvents();
  reducedMotionQuery.addEventListener('change', () => {
    if (lightbox.classList.contains('active')) startStoryTimer();
  });

  /* ============================================
     6. PUBLIC API
     ============================================ */
  window.PortfolioGallery = {
    preloadInitialImages,
    loadRemainingImages,
    buildGalleryGrid,
    getColumnCount,
    loadPhotoCarousel,
    closeLightbox,
    isLightboxOpen() {
      return !!(lightbox && lightbox.classList.contains('active'));
    }
  };
})();

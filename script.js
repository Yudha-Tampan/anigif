/**
 * AniGIF — script.js
 * Full-featured anime GIF gallery frontend
 */

/* ═══════════════════════════════
   CONFIG
═══════════════════════════════ */
const CONFIG = {
  dataFile:    'gif.json',
  perPage:     12,
  toastDur:    3000,
  lazyOffset:  '200px',
};

/* ═══════════════════════════════
   STATE
═══════════════════════════════ */
const state = {
  all:        [],   // full dataset
  filtered:   [],   // after search/filter
  displayed:  [],   // currently rendered
  page:       1,
  query:      '',
  filter:     'all',
  modalIndex: -1,
  view:       'grid',
};

/* ═══════════════════════════════
   DOM REFS
═══════════════════════════════ */
const $ = id => document.getElementById(id);
const DOM = {
  grid:          $('galleryGrid'),
  searchInput:   $('searchInput'),
  searchClear:   $('searchClear'),
  filterChips:   $('filterChips'),
  resultsText:   $('resultsText'),
  gifCountBadge: $('gifCountBadge'),
  emptyState:    $('emptyState'),
  loadMoreBtn:   $('btnLoadMore'),
  loadMoreCont:  $('loadMoreContainer'),
  btnLoadText:   document.querySelector('.btn-text'),
  btnLoadSpin:   document.querySelector('.btn-loading'),
  btnReset:      $('btnReset'),
  viewGrid:      $('viewGrid'),
  viewList:      $('viewList'),
  navbar:        $('navbar'),
  scrollTop:     $('scrollTop'),
  toastContainer:$('toastContainer'),

  // modal
  modalOverlay:  $('modalOverlay'),
  modal:         $('modal'),
  modalClose:    $('modalClose'),
  modalGif:      $('modalGif'),
  modalTitle:    $('modalTitle'),
  modalAnime:    $('modalAnime'),
  modalDownload: $('modalDownload'),
  modalCopy:     $('modalCopy'),
  modalShare:    $('modalShare'),
  modalPrev:     $('modalPrev'),
  modalNext:     $('modalNext'),
};

/* ═══════════════════════════════
   INIT
═══════════════════════════════ */
async function init() {
  setupEventListeners();
  await loadData();
}

/* ═══════════════════════════════
   DATA LOADING
═══════════════════════════════ */
async function loadData() {
  try {
    const res  = await fetch(CONFIG.dataFile);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    state.all      = Array.isArray(data) ? data : [];
    state.filtered = [...state.all];

    DOM.gifCountBadge.textContent = `${state.all.length} GIFs`;
    buildFilterChips();
    renderPage(true);
    showToast('Gallery dimuat! 🎉', 'success');
  } catch (err) {
    console.warn('gif.json not found, using demo data:', err);
    state.all = getDemoData();
    state.filtered = [...state.all];
    DOM.gifCountBadge.textContent = `${state.all.length} GIFs (demo)`;
    buildFilterChips();
    renderPage(true);
    showToast('Mode demo aktif — tambahkan gif.json untuk data nyata', 'info');
  }
}

function getDemoData() {
  return [
    { title: 'Kurumi Smile',       anime: 'Date A Live',     video: 'kurumi.gif'   },
    { title: 'Rem Dance',          anime: 'Re:Zero',         video: 'remdance.gif' },
    { title: 'Naruto Run',         anime: 'Naruto',          video: 'naruto.gif'   },
    { title: 'Levi Attack',        anime: 'Attack on Titan', video: 'levi.gif'     },
    { title: 'Zero Two Wink',      anime: 'Darling in FranXX', video: 'zerotwo.gif'},
    { title: 'Mikasa Fight',       anime: 'Attack on Titan', video: 'mikasa.gif'   },
    { title: 'Sasuke Sharingan',   anime: 'Naruto',          video: 'sasuke.gif'   },
    { title: 'Emilia Smile',       anime: 'Re:Zero',         video: 'emilia.gif'   },
    { title: 'Asuna Flash',        anime: 'Sword Art Online',video: 'asuna.gif'    },
    { title: 'Killua Speed',       anime: 'HxH',             video: 'killua.gif'   },
    { title: 'Miku Cute',          anime: 'Quintuplets',     video: 'miku.gif'     },
    { title: 'Gojo Infinity',      anime: 'JJK',             video: 'gojo.gif'     },
    { title: 'Nezuko Spin',        anime: 'Demon Slayer',    video: 'nezuko.gif'   },
    { title: 'Tanjiro Breathing',  anime: 'Demon Slayer',    video: 'tanjiro.gif'  },
    { title: 'Anya Spy',          anime: 'Spy x Family',    video: 'anya.gif'     },
    { title: 'Hestia Jump',       anime: 'DanMachi',        video: 'hestia.gif'   },
  ];
}

/* ═══════════════════════════════
   FILTER CHIPS
═══════════════════════════════ */
function buildFilterChips() {
  const animes = ['all', ...new Set(state.all.map(g => g.anime))].filter(Boolean);
  DOM.filterChips.innerHTML = '';

  animes.forEach(anime => {
    const btn = document.createElement('button');
    btn.className = 'chip' + (anime === 'all' ? ' chip-active' : '');
    btn.dataset.filter = anime;
    btn.innerHTML = anime === 'all'
      ? `<i class="fa-solid fa-border-all"></i> Semua`
      : `<i class="fa-solid fa-tv"></i> ${anime}`;
    btn.addEventListener('click', () => setFilter(anime));
    DOM.filterChips.appendChild(btn);
  });
}

function setFilter(anime) {
  state.filter = anime;
  document.querySelectorAll('.chip').forEach(c => {
    c.classList.toggle('chip-active', c.dataset.filter === anime);
  });
  applyFilters();
}

/* ═══════════════════════════════
   SEARCH & FILTER
═══════════════════════════════ */
function applyFilters() {
  const q = state.query.toLowerCase().trim();
  state.filtered = state.all.filter(gif => {
    const matchAnime = state.filter === 'all' || gif.anime === state.filter;
    const matchQuery = !q
      || gif.title.toLowerCase().includes(q)
      || gif.anime.toLowerCase().includes(q);
    return matchAnime && matchQuery;
  });
  state.page = 1;
  renderPage(true);
}

/* ═══════════════════════════════
   RENDER
═══════════════════════════════ */
function renderPage(reset = false) {
  if (reset) {
    DOM.grid.innerHTML = '';
    state.displayed = [];
  }

  const start = (state.page - 1) * CONFIG.perPage;
  const chunk = state.filtered.slice(start, start + CONFIG.perPage);
  state.displayed.push(...chunk);

  // Results text
  DOM.resultsText.textContent = `${state.filtered.length} GIF ditemukan`;

  // Empty state
  if (state.filtered.length === 0) {
    DOM.emptyState.classList.remove('hidden');
    DOM.loadMoreCont.classList.add('hidden');
    return;
  } else {
    DOM.emptyState.classList.add('hidden');
  }

  // Render cards
  chunk.forEach((gif, i) => {
    const globalIndex = state.displayed.length - chunk.length + i;
    const card = createCard(gif, globalIndex);
    card.style.animationDelay = `${(i % CONFIG.perPage) * 40}ms`;
    DOM.grid.appendChild(card);
  });

  // Lazy load
  setupLazyLoad();

  // Load more button
  const hasMore = state.displayed.length < state.filtered.length;
  DOM.loadMoreCont.classList.toggle('hidden', !hasMore);
}

function createCard(gif, index) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.index = index;

  const gifSrc = gif.video;
  const placeholder = generatePlaceholder(gif);

  card.innerHTML = `
    <div class="card-media">
      <img
        class="card-gif"
        data-src="${gifSrc}"
        src="${placeholder}"
        alt="${escHtml(gif.title)}"
        loading="lazy"
      />
      <div class="card-overlay">
        <div class="card-play-icon"><i class="fa-solid fa-expand"></i></div>
      </div>
    </div>
    <div class="card-info">
      <span class="card-anime-tag">
        <i class="fa-solid fa-clapperboard"></i>${escHtml(gif.anime)}
      </span>
      <h3 class="card-title">${escHtml(gif.title)}</h3>
    </div>
    <div class="card-actions">
      <button class="card-btn card-btn-dl" data-action="download" aria-label="Download">
        <i class="fa-solid fa-download"></i> Unduh
      </button>
      <button class="card-btn card-btn-copy" data-action="copy" aria-label="Copy link">
        <i class="fa-solid fa-link"></i> Salin
      </button>
    </div>
  `;

  // Events
  card.addEventListener('click', e => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'download') { e.stopPropagation(); downloadGif(gif); }
    else if (action === 'copy') { e.stopPropagation(); copyLink(gif); }
    else openModal(index);
  });

  return card;
}

/* ── Placeholder SVG for unloaded GIFs ── */
function generatePlaceholder(gif) {
  const colors = [
    ['#8b5cf6','#f472b6'], ['#22d3ee','#8b5cf6'],
    ['#f472b6','#f59e0b'], ['#4ade80','#22d3ee'],
  ];
  const pair = colors[Math.abs(hashStr(gif.title)) % colors.length];
  const letter = (gif.title[0] || '?').toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='250'>
    <defs>
      <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='${pair[0]}'/>
        <stop offset='100%' stop-color='${pair[1]}'/>
      </linearGradient>
    </defs>
    <rect width='400' height='250' fill='%23111827'/>
    <circle cx='200' cy='125' r='80' fill='url(%23g)' opacity='0.15'/>
    <text x='200' y='145' font-family='Poppins,sans-serif' font-size='72' font-weight='900'
      fill='url(%23g)' text-anchor='middle' opacity='0.6'>${letter}</text>
  </svg>`;
  return `data:image/svg+xml,${svg.replace(/\n\s*/g, '').replace(/#/g,'%23')}`;
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

/* ═══════════════════════════════
   LAZY LOADING
═══════════════════════════════ */
let observer;
function setupLazyLoad() {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      }
    });
  }, { rootMargin: CONFIG.lazyOffset });

  document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
}

/* ═══════════════════════════════
   MODAL
═══════════════════════════════ */
function openModal(index) {
  state.modalIndex = index;
  populateModal(state.displayed[index]);
  DOM.modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  DOM.modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
  DOM.modalGif.src = '';
}

function populateModal(gif) {
  if (!gif) return;
  DOM.modalGif.src    = gif.video;
  DOM.modalGif.alt    = gif.title;
  DOM.modalTitle.textContent = gif.title;
  DOM.modalAnime.textContent = gif.anime;

  DOM.modalDownload.onclick = () => downloadGif(gif);
  DOM.modalCopy.onclick     = () => copyLink(gif);
  DOM.modalShare.onclick    = () => shareGif(gif);

  const canPrev = state.modalIndex > 0;
  const canNext = state.modalIndex < state.displayed.length - 1;
  DOM.modalPrev.disabled = !canPrev;
  DOM.modalNext.disabled = !canNext;
  DOM.modalPrev.style.opacity = canPrev ? '1' : '0.3';
  DOM.modalNext.style.opacity = canNext ? '1' : '0.3';
}

/* ═══════════════════════════════
   ACTIONS
═══════════════════════════════ */
function downloadGif(gif) {
  const a = document.createElement('a');
  a.href     = gif.video;
  a.download = gif.video;
  a.click();
  showToast(`Mengunduh "${gif.title}" 📥`, 'success');
}

function copyLink(gif) {
  const url = `${location.href.split('?')[0]}?gif=${encodeURIComponent(gif.video)}`;
  navigator.clipboard.writeText(url)
    .then(() => showToast('Link berhasil disalin! 🔗', 'success'))
    .catch(() => {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy');
      ta.remove();
      showToast('Link berhasil disalin! 🔗', 'success');
    });
}

function shareGif(gif) {
  const url = `${location.href.split('?')[0]}?gif=${encodeURIComponent(gif.video)}`;
  if (navigator.share) {
    navigator.share({ title: gif.title, text: `${gif.title} — ${gif.anime}`, url })
      .catch(() => {});
  } else {
    copyLink(gif);
    showToast('Dibagikan via salin link 📤', 'info');
  }
}

/* ═══════════════════════════════
   TOAST
═══════════════════════════════ */
function showToast(msg, type = 'info') {
  const iconMap = {
    success: 'fa-circle-check',
    error:   'fa-circle-exclamation',
    info:    'fa-circle-info',
  };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="fa-solid ${iconMap[type] || iconMap.info}"></i></div>
    <span>${msg}</span>
    <div class="toast-progress"></div>
  `;
  DOM.toastContainer.prepend(toast);

  setTimeout(() => {
    toast.classList.add('exit');
    setTimeout(() => toast.remove(), 350);
  }, CONFIG.toastDur);
}

/* ═══════════════════════════════
   LOAD MORE
═══════════════════════════════ */
function loadMore() {
  // Show spinner
  DOM.btnLoadText.classList.add('hidden');
  DOM.btnLoadSpin.classList.remove('hidden');
  DOM.loadMoreBtn.disabled = true;

  setTimeout(() => {
    state.page++;
    renderPage(false);
    DOM.btnLoadText.classList.remove('hidden');
    DOM.btnLoadSpin.classList.add('hidden');
    DOM.loadMoreBtn.disabled = false;
  }, 600);
}

/* ═══════════════════════════════
   VIEW TOGGLE
═══════════════════════════════ */
function setView(view) {
  state.view = view;
  DOM.grid.classList.toggle('list-view', view === 'list');
  DOM.viewGrid.classList.toggle('view-active', view === 'grid');
  DOM.viewList.classList.toggle('view-active', view === 'list');
}

/* ═══════════════════════════════
   EVENT LISTENERS
═══════════════════════════════ */
function setupEventListeners() {
  // Search
  DOM.searchInput.addEventListener('input', e => {
    state.query = e.target.value;
    DOM.searchClear.classList.toggle('visible', state.query.length > 0);
    debounce(applyFilters, 280)();
  });
  DOM.searchClear.addEventListener('click', () => {
    DOM.searchInput.value = '';
    state.query = '';
    DOM.searchClear.classList.remove('visible');
    applyFilters();
    DOM.searchInput.focus();
  });

  // Reset
  DOM.btnReset.addEventListener('click', () => {
    DOM.searchInput.value = '';
    state.query = '';
    DOM.searchClear.classList.remove('visible');
    setFilter('all');
    DOM.searchInput.focus();
  });

  // Load more
  DOM.loadMoreBtn.addEventListener('click', loadMore);

  // View toggle
  DOM.viewGrid.addEventListener('click', () => setView('grid'));
  DOM.viewList.addEventListener('click', () => setView('list'));

  // Modal
  DOM.modalClose.addEventListener('click', closeModal);
  DOM.modalOverlay.addEventListener('click', e => {
    if (e.target === DOM.modalOverlay) closeModal();
  });
  DOM.modalPrev.addEventListener('click', () => {
    if (state.modalIndex > 0) {
      state.modalIndex--;
      populateModal(state.displayed[state.modalIndex]);
    }
  });
  DOM.modalNext.addEventListener('click', () => {
    if (state.modalIndex < state.displayed.length - 1) {
      state.modalIndex++;
      populateModal(state.displayed[state.modalIndex]);
    }
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (DOM.modalOverlay.classList.contains('open')) {
      if (e.key === 'Escape')      closeModal();
      if (e.key === 'ArrowLeft')   DOM.modalPrev.click();
      if (e.key === 'ArrowRight')  DOM.modalNext.click();
    }
    if (e.key === '/' && e.target !== DOM.searchInput) {
      e.preventDefault();
      DOM.searchInput.focus();
    }
  });

  // Scroll: navbar shadow + scroll-top btn
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    DOM.navbar.classList.toggle('scrolled', y > 20);
    DOM.scrollTop.classList.toggle('visible', y > 400);
  }, { passive: true });
  DOM.scrollTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // Swipe on modal (mobile)
  let touchStartX = 0;
  DOM.modal.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  DOM.modal.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) DOM.modalNext.click();
      else        DOM.modalPrev.click();
    }
  });
}

/* ═══════════════════════════════
   HELPERS
═══════════════════════════════ */
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

/* ── Deep-link: ?gif=xxx ── */
function handleDeepLink() {
  const params = new URLSearchParams(location.search);
  const gifFile = params.get('gif');
  if (!gifFile) return;
  const index = state.displayed.findIndex(g => g.video === gifFile);
  if (index !== -1) {
    setTimeout(() => openModal(index), 400);
  }
}

/* ── Start ── */
document.addEventListener('DOMContentLoaded', () => {
  init().then(handleDeepLink);
});

const STORAGE = {
  theme: 'agent-shelf-theme',
  language: 'agent-shelf-language'
};

const THEMES = ['shelf-lime', 'paper-vermilion', 'midnight-cobalt', 'mono-brutal'];
const THEME_COLORS = {
  'shelf-lime': '#0b0d0c',
  'paper-vermilion': '#f2ede3',
  'midnight-cobalt': '#07111f',
  'mono-brutal': '#f5f5f1'
};

const translations = {
  en: {
    brand_subtitle: 'skills + prompts',
    hero_kicker: 'public registry',
    hero_title_1: 'Useful agent material,',
    hero_title_2: 'without the folder spelunking.',
    hero_body: 'Browse reusable skills and prompts by use case. Open the source, copy the full content, or share a direct shelf link.',
    search_placeholder: 'Search skills, prompts, tags…',
    skills: 'Skills', prompts: 'Prompts', all: 'All',
    empty_title: 'No shelf match.', empty_body: 'Try another word or clear the category filter.', clear_filters: 'Clear filters',
    copy_content: 'Copy content', copy_shelf_link: 'Copy shelf link', copy_source_link: 'Copy source link', open_github: 'Open on GitHub',
    preview: 'Preview', raw: 'Raw', source_english: 'source: EN',
    appearance: 'Appearance', choose_theme: 'Choose a theme',
    theme_lime: 'Dark, sharp, electric', theme_paper: 'Warm paper, red ink', theme_cobalt: 'Cool technical blue', theme_mono: 'Hard black and white',
    content_copied: 'Content copied', shelf_link_copied: 'Shelf link copied', source_link_copied: 'Source link copied',
    theme_changed: 'Theme changed', language_changed: 'Language changed',
    load_error: 'Could not load this file.', open_source_instead: 'Open the GitHub source instead.',
    item: 'item', items: 'items', skill: 'skill', prompt: 'prompt', all_skills: 'All skills', all_prompts: 'All prompts',
    switch_language: 'Switch language', choose_theme_label: 'Choose theme', close: 'Close'
  },
  sl: {
    brand_subtitle: 'veščine + pozivi',
    hero_kicker: 'javni register',
    hero_title_1: 'Uporabni materiali za agente,',
    hero_title_2: 'brez kopanja po mapah.',
    hero_body: 'Brskaj po ponovno uporabnih veščinah in pozivih glede na namen. Odpri izvor, kopiraj celotno vsebino ali deli neposredno povezavo s police.',
    search_placeholder: 'Išči veščine, pozive, oznake…',
    skills: 'Veščine', prompts: 'Pozivi', all: 'Vse',
    empty_title: 'Na polici ni zadetka.', empty_body: 'Poskusi drugo besedo ali počisti filter kategorije.', clear_filters: 'Počisti filtre',
    copy_content: 'Kopiraj vsebino', copy_shelf_link: 'Kopiraj povezavo police', copy_source_link: 'Kopiraj povezavo izvora', open_github: 'Odpri na GitHubu',
    preview: 'Predogled', raw: 'Izvorno', source_english: 'izvor: EN',
    appearance: 'Videz', choose_theme: 'Izberi temo',
    theme_lime: 'Temna, ostra, električna', theme_paper: 'Topel papir, rdeče črnilo', theme_cobalt: 'Hladna tehnična modra', theme_mono: 'Trda črno-bela',
    content_copied: 'Vsebina kopirana', shelf_link_copied: 'Povezava police kopirana', source_link_copied: 'Povezava izvora kopirana',
    theme_changed: 'Tema spremenjena', language_changed: 'Jezik spremenjen',
    load_error: 'Datoteke ni bilo mogoče naložiti.', open_source_instead: 'Namesto tega odpri izvor na GitHubu.',
    item: 'element', items: 'elementov', skill: 'veščina', prompt: 'poziv', all_skills: 'Vse veščine', all_prompts: 'Vsi pozivi',
    switch_language: 'Zamenjaj jezik', choose_theme_label: 'Izberi temo', close: 'Zapri'
  }
};

const categoryLabels = {
  en: {
    'interface-design': 'Interface design',
    'motion-animation': 'Motion & animation',
    'svg-vector': 'SVG & vector',
    'interactive-worlds': 'Interactive worlds',
    'rendering': 'Rendering',
    'research': 'Research',
    'web-prototypes': 'Web prototypes',
    'visual-assets': 'Visual assets'
  },
  sl: {
    'interface-design': 'Oblikovanje vmesnika',
    'motion-animation': 'Gibanje in animacija',
    'svg-vector': 'SVG in vektorji',
    'interactive-worlds': 'Interaktivni svetovi',
    'rendering': 'Izrisovanje',
    'research': 'Raziskovanje',
    'web-prototypes': 'Spletni prototipi',
    'visual-assets': 'Vizualna sredstva'
  }
};

const state = {
  catalog: [],
  type: 'skill',
  category: 'all',
  query: '',
  selected: null,
  content: '',
  view: 'preview',
  language: localStorage.getItem(STORAGE.language) === 'sl' ? 'sl' : 'en',
  theme: THEMES.includes(localStorage.getItem(STORAGE.theme)) ? localStorage.getItem(STORAGE.theme) : 'shelf-lime'
};

const el = {
  catalog: document.querySelector('#catalog'),
  categories: document.querySelector('#categories'),
  search: document.querySelector('#search'),
  skillCount: document.querySelector('#skill-count'),
  promptCount: document.querySelector('#prompt-count'),
  sectionEyebrow: document.querySelector('#section-eyebrow'),
  sectionTitle: document.querySelector('#section-title'),
  resultCount: document.querySelector('#result-count'),
  empty: document.querySelector('#empty-state'),
  clearFilters: document.querySelector('#clear-filters'),
  detail: document.querySelector('#detail'),
  detailPath: document.querySelector('#detail-path'),
  detailKind: document.querySelector('#detail-kind'),
  detailTitle: document.querySelector('#detail-title'),
  detailDescription: document.querySelector('#detail-description'),
  detailTags: document.querySelector('#detail-tags'),
  detailGithubTop: document.querySelector('#detail-github-top'),
  openGithub: document.querySelector('#open-github'),
  copyContent: document.querySelector('#copy-content'),
  copyAppLink: document.querySelector('#copy-app-link'),
  copySourceLink: document.querySelector('#copy-source-link'),
  contentLoading: document.querySelector('#content-loading'),
  preview: document.querySelector('#markdown-preview'),
  raw: document.querySelector('#raw-content'),
  toast: document.querySelector('#toast'),
  languageToggle: document.querySelector('#language-toggle'),
  languageBadge: document.querySelector('.language-badge'),
  detailScroll: document.querySelector('.detail-scroll'),
  themeToggle: document.querySelector('#theme-toggle'),
  themeColor: document.querySelector('meta[name="theme-color"]')
};

function t(key) {
  return translations[state.language][key] ?? translations.en[key] ?? key;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

function titleCase(value) {
  return categoryLabels[state.language][value] || value.replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function itemTitle(item) {
  return state.language === 'sl' ? (item.title_sl || item.title) : item.title;
}

function itemDescription(item) {
  return state.language === 'sl' ? (item.description_sl || item.description) : item.description;
}

function itemTags(item) {
  return state.language === 'sl' ? (item.tags_sl || item.tags || []) : (item.tags || []);
}

function githubUrl(item) {
  return `https://github.com/endpuppet/agent-shelf/blob/main/${item.path}`;
}

function rawGithubUrl(item) {
  return `https://raw.githubusercontent.com/endpuppet/agent-shelf/main/${item.path}`;
}

function routeFor(item) {
  return `#/${item.type}s/${item.category}/${item.slug}`;
}

function appUrl(item) {
  return `${location.origin}${location.pathname}${routeFor(item)}`;
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');
}

function renderMarkdown(markdown) {
  const clean = stripFrontmatter(markdown);
  if (window.marked && window.DOMPurify) {
    marked.setOptions({gfm: true, breaks: false});
    return DOMPurify.sanitize(marked.parse(clean), {USE_PROFILES: {html: true}});
  }
  return `<pre><code>${escapeHtml(clean)}</code></pre>`;
}

function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add('is-visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.toast.classList.remove('is-visible'), 1700);
}

async function copyText(text, success) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  toast(success);
}

function localizedSearchText(item) {
  return [
    item.title, item.title_sl, item.description, item.description_sl,
    item.category, ...(item.tags || []), ...(item.tags_sl || [])
  ].filter(Boolean).join(' ').toLowerCase();
}

function counts() {
  el.skillCount.textContent = state.catalog.filter((item) => item.type === 'skill').length;
  el.promptCount.textContent = state.catalog.filter((item) => item.type === 'prompt').length;
}

function categoriesForType() {
  return [...new Set(state.catalog.filter((item) => item.type === state.type).map((item) => item.category))];
}

function renderCategories() {
  const categories = categoriesForType();
  if (state.category !== 'all' && !categories.includes(state.category)) state.category = 'all';
  el.categories.innerHTML = [
    `<button class="category-chip ${state.category === 'all' ? 'is-active' : ''}" data-category="all">${escapeHtml(t('all'))}</button>`,
    ...categories.map((category) => `<button class="category-chip ${state.category === category ? 'is-active' : ''}" data-category="${escapeHtml(category)}">${escapeHtml(titleCase(category))}</button>`)
  ].join('');
  el.categories.querySelectorAll('[data-category]').forEach((button) => {
    button.addEventListener('click', () => {
      state.category = button.dataset.category;
      renderCategories();
      renderCatalog();
    });
  });
}

function filteredItems() {
  const query = state.query.trim().toLowerCase();
  return state.catalog.filter((item) => {
    if (item.type !== state.type) return false;
    if (state.category !== 'all' && item.category !== state.category) return false;
    return !query || localizedSearchText(item).includes(query);
  });
}

function cardMarkup(item, index) {
  const accent = item.type === 'skill' ? 'var(--accent)' : 'var(--warm)';
  return `<article class="card" data-id="${escapeHtml(item.id)}" tabindex="0" role="button" aria-label="${escapeHtml(itemTitle(item))}" style="--card-accent:${accent};animation-delay:${Math.min(index * 28, 180)}ms">
    <div class="card-top"><span class="card-kind">${escapeHtml(titleCase(item.category))}</span><span class="card-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></span></div>
    <h3>${escapeHtml(itemTitle(item))}</h3>
    <p>${escapeHtml(itemDescription(item))}</p>
    <div class="card-tags">${itemTags(item).slice(0, 3).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
  </article>`;
}

function renderCatalog() {
  const items = filteredItems();
  const typeKey = state.type === 'skill' ? 'skills' : 'prompts';
  el.sectionEyebrow.textContent = t(typeKey);
  el.sectionTitle.textContent = state.category === 'all' ? t(state.type === 'skill' ? 'all_skills' : 'all_prompts') : titleCase(state.category);
  el.resultCount.textContent = `${items.length} ${items.length === 1 ? t('item') : t('items')}`;
  el.catalog.innerHTML = items.map(cardMarkup).join('');
  el.empty.hidden = items.length !== 0;
  el.catalog.querySelectorAll('.card').forEach((card) => {
    const open = () => openItem(state.catalog.find((item) => item.id === card.dataset.id));
    card.addEventListener('click', open);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  });
}

async function fetchText(url) {
  const response = await fetch(url, {cache: 'no-store'});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function fetchMarkdown(item) {
  const localUrl = new URL(item.path, document.baseURI).href;
  const candidates = [localUrl, rawGithubUrl(item)];
  let lastError;
  for (const url of candidates) {
    try {
      return await fetchText(url);
    } catch (error) {
      lastError = error;
      console.warn(`Agent Shelf content fetch failed for ${url}`, error);
    }
  }
  throw lastError || new Error('No content source available');
}

async function loadContent(item) {
  el.contentLoading.hidden = false;
  el.preview.hidden = true;
  el.raw.hidden = true;
  el.copyContent.disabled = true;
  try {
    state.content = await fetchMarkdown(item);
    el.preview.innerHTML = renderMarkdown(state.content);
    el.raw.querySelector('code').textContent = state.content;
    el.copyContent.disabled = false;
    el.contentLoading.hidden = true;
    setContentView(state.view);
  } catch (error) {
    state.content = '';
    el.contentLoading.hidden = true;
    el.preview.hidden = false;
    el.preview.innerHTML = `<div class="load-error"><strong>${escapeHtml(t('load_error'))}</strong><a href="${githubUrl(item)}" target="_blank" rel="noreferrer">${escapeHtml(t('open_source_instead'))}</a></div>`;
    console.error(error);
  }
}

function setContentView(view) {
  state.view = view;
  document.querySelectorAll('.content-tab').forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  el.preview.hidden = view !== 'preview';
  el.raw.hidden = view !== 'raw';
}

function renderDetailMeta() {
  const item = state.selected;
  if (!item) return;
  el.detailPath.textContent = item.path;
  el.detailKind.textContent = `${t(item.type)} · ${titleCase(item.category)}`;
  el.detailKind.style.color = item.type === 'skill' ? 'var(--accent)' : 'var(--warm)';
  el.detailTitle.textContent = itemTitle(item);
  el.detailDescription.textContent = itemDescription(item);
  el.detailTags.innerHTML = itemTags(item).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
}

function openItem(item, {updateHash = true} = {}) {
  if (!item) return;
  state.selected = item;
  state.content = '';
  state.view = 'preview';
  renderDetailMeta();
  const source = githubUrl(item);
  el.detailGithubTop.href = source;
  el.openGithub.href = source;
  el.detail.classList.add('is-open');
  el.detail.setAttribute('aria-hidden', 'false');
  el.detailScroll.scrollTop = 0;
  if (updateHash) history.pushState(null, '', routeFor(item));
  loadContent(item);
}

function closeDetail({updateHash = true} = {}) {
  state.selected = null;
  state.content = '';
  el.detail.classList.remove('is-open');
  el.detail.setAttribute('aria-hidden', 'true');
  if (updateHash) history.pushState(null, '', `#/${state.type}s`);
}

function setTypeTabs() {
  document.querySelectorAll('.type-tab').forEach((tab) => {
    const active = tab.dataset.type === state.type;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

function applyHash() {
  const parts = location.hash.replace(/^#\//, '').split('/').filter(Boolean);
  if (!parts.length) {
    if (state.selected) closeDetail({updateHash: false});
    return;
  }
  state.type = parts[0] === 'prompts' ? 'prompt' : 'skill';
  setTypeTabs();
  state.category = 'all';
  renderCategories();
  renderCatalog();
  if (parts.length >= 3) {
    const [, category, slug] = parts;
    const item = state.catalog.find((candidate) => candidate.type === state.type && candidate.category === category && candidate.slug === slug);
    if (item && (!state.selected || state.selected.id !== item.id)) openItem(item, {updateHash: false});
  } else if (state.selected) {
    closeDetail({updateHash: false});
  }
}

function applyTheme(theme, {notify = false} = {}) {
  state.theme = THEMES.includes(theme) ? theme : 'shelf-lime';
  document.documentElement.dataset.theme = state.theme;
  el.themeColor.content = THEME_COLORS[state.theme];
  localStorage.setItem(STORAGE.theme, state.theme);
  document.querySelectorAll('[data-theme-choice]').forEach((button) => button.classList.toggle('is-active', button.dataset.themeChoice === state.theme));
  if (notify) toast(t('theme_changed'));
}

function cycleTheme() {
  const currentIndex = THEMES.indexOf(state.theme);
  const nextTheme = THEMES[(currentIndex + 1) % THEMES.length];
  applyTheme(nextTheme, {notify: true});
}
function applyLanguage({notify = false} = {}) {
  document.documentElement.lang = state.language;
  localStorage.setItem(STORAGE.language, state.language);
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  el.search.placeholder = t('search_placeholder');
  el.languageBadge.textContent = state.language.toUpperCase();
  el.languageToggle.setAttribute('aria-label', t('switch_language'));
  el.languageToggle.title = t('switch_language');
  el.themeToggle.setAttribute('aria-label', t('choose_theme_label'));
  el.themeToggle.title = t('choose_theme_label');
  renderCategories();
  renderCatalog();
  renderDetailMeta();
  if (state.selected && !state.content) loadContent(state.selected);
  if (notify) toast(t('language_changed'));
}

async function init() {
  applyTheme(state.theme);
  try {
    const response = await fetch('./catalog.json', {cache: 'no-store'});
    if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
    const data = await response.json();
    state.catalog = data.items;
    counts();
    applyLanguage();
    applyHash();
  } catch (error) {
    el.catalog.innerHTML = `<div class="empty-state"><h3>Catalog failed to load.</h3><p>${escapeHtml(error.message)}</p></div>`;
    console.error(error);
  }
}

document.querySelectorAll('.type-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    state.type = tab.dataset.type;
    state.category = 'all';
    setTypeTabs();
    history.replaceState(null, '', `#/${state.type}s`);
    renderCategories();
    renderCatalog();
  });
});

el.search.addEventListener('input', (event) => {
  state.query = event.target.value;
  renderCatalog();
});

el.clearFilters.addEventListener('click', () => {
  state.query = '';
  state.category = 'all';
  el.search.value = '';
  renderCategories();
  renderCatalog();
});

document.querySelectorAll('[data-close-detail]').forEach((button) => button.addEventListener('click', () => closeDetail()));
document.querySelectorAll('.content-tab').forEach((tab) => tab.addEventListener('click', () => setContentView(tab.dataset.view)));
el.copyContent.addEventListener('click', () => state.selected && copyText(state.content, t('content_copied')));
el.copyAppLink.addEventListener('click', () => state.selected && copyText(appUrl(state.selected), t('shelf_link_copied')));
el.copySourceLink.addEventListener('click', () => state.selected && copyText(githubUrl(state.selected), t('source_link_copied')));

el.languageToggle.addEventListener('click', () => {
  state.language = state.language === 'en' ? 'sl' : 'en';
  applyLanguage({notify: true});
});

el.themeToggle.addEventListener('click', cycleTheme);

window.addEventListener('hashchange', applyHash);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.selected) closeDetail();
  if (event.key === '/' && !state.selected && document.activeElement?.tagName !== 'INPUT') {
    event.preventDefault();
    el.search.focus();
  }
});

init();
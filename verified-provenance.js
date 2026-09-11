(() => {
  const state = { catalog: [] };
  const detail = document.querySelector('#detail');
  const copySource = document.querySelector('#copy-source-link');
  const openSource = document.querySelector('#open-github');
  const topSource = document.querySelector('#detail-github-top');
  const detailScroll = document.querySelector('.detail-scroll');
  if (!detail || !detailScroll) return;

  const section = document.createElement('section');
  section.id = 'provenance';
  section.className = 'provenance';
  section.hidden = true;
  section.setAttribute('aria-label', 'Verified upstream provenance');
  section.innerHTML = `
    <div class="provenance-head">
      <span id="verification-badge" class="verification-badge">VERIFIED · EXACT UPSTREAM</span>
      <a id="provenance-source" href="#" target="_blank" rel="noreferrer">Pinned source ↗</a>
    </div>
    <dl class="provenance-grid">
      <div><dt>Repository</dt><dd id="provenance-repository"></dd></div>
      <div><dt>Commit</dt><dd id="provenance-commit"></dd></div>
      <div><dt>Fingerprint</dt><dd id="provenance-hash"></dd></div>
    </dl>`;
  const actions = detailScroll.querySelector('.action-grid');
  if (actions) actions.before(section);

  const repository = section.querySelector('#provenance-repository');
  const commit = section.querySelector('#provenance-commit');
  const hash = section.querySelector('#provenance-hash');
  const pinnedLink = section.querySelector('#provenance-source');

  function currentItem() {
    const parts = location.hash.replace(/^#\//, '').split('/').filter(Boolean);
    if (parts.length < 3) return null;
    const type = parts[0] === 'prompts' ? 'prompt' : 'skill';
    const [, category, slug] = parts;
    return state.catalog.find((item) => item.type === type && item.category === category && item.slug === slug) || null;
  }

  function pinnedSourceUrl(item) {
    if (!item || item.verification !== 'exact-upstream') return '';
    const encodedPath = String(item.source_path || '').split('/').map(encodeURIComponent).join('/');
    return `https://github.com/${item.source_repository}/blob/${item.source_commit}/${encodedPath}`;
  }

  function sync() {
    const item = currentItem();
    const verified = item?.verification === 'exact-upstream';
    section.hidden = !verified;
    if (!verified) return;

    const source = pinnedSourceUrl(item);
    repository.textContent = item.source_repository || '';
    commit.textContent = item.source_commit?.slice(0, 7) || '';
    hash.textContent = item.sha256 ? `sha256:${item.sha256.slice(0, 12)}…` : '';
    pinnedLink.href = source;
    if (openSource) openSource.href = source;
    if (topSource) topSource.href = source;
  }

  async function copyPinnedSource(event) {
    const item = currentItem();
    if (item?.verification !== 'exact-upstream') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const source = pinnedSourceUrl(item);
    try {
      await navigator.clipboard.writeText(source);
    } catch {
      const area = document.createElement('textarea');
      area.value = source;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
  }

  copySource?.addEventListener('click', copyPinnedSource, true);
  window.addEventListener('hashchange', () => setTimeout(sync, 0));
  new MutationObserver(() => setTimeout(sync, 0)).observe(detail, {attributes: true, attributeFilter: ['class', 'aria-hidden']});

  fetch('./catalog.json', {cache: 'no-store'})
    .then((response) => {
      if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      state.catalog = data.items || [];
      sync();
    })
    .catch((error) => console.error('Verified provenance catalog load failed.', error));
})();

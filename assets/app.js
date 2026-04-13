const data = window.DASHBOARD_DATA || { current: [], history: [], stats: { categories: {} }, today_headlines: [] };

const groupedJobsEl = document.getElementById('groupedJobs');
const filtersEl = document.getElementById('categoryFilters');
const searchInput = document.getElementById('searchInput');
const searchMetaEl = document.getElementById('searchMeta');
const searchResultsSectionEl = document.getElementById('searchResultsSection');
const searchResultsEl = document.getElementById('searchResults');
const todayHeadlinesEl = document.getElementById('todayHeadlines');
const historySectionEl = document.getElementById('historySection');
const boardPageEl = document.getElementById('boardPage');
const detailPageEl = document.getElementById('detailPage');
const detailTitleEl = document.getElementById('detailTitle');
const detailMetaEl = document.getElementById('detailMeta');
const detailBodyEl = document.getElementById('detailBody');
const detailPagerEl = document.getElementById('detailPager');
const detailSearchHintEl = document.getElementById('detailSearchHint');
const backToBoardEl = document.getElementById('backToBoard');

const currentItems = Array.isArray(data.current) ? data.current : [];
const historyItems = Array.isArray(data.history) ? data.history : [];
const allItems = [...currentItems, ...historyItems];
const itemById = new Map(allItems.map(item => [String(item.id), item]));
const categories = ['全部', ...Object.keys(data.stats.categories || {}).sort()];
const searchDocuments = new Map(allItems.map(item => [String(item.id), buildSearchDocument(item)]));

let state = {
  query: '',
  category: '全部',
  itemId: '',
};

init();

function init() {
  document.getElementById('totalJobs').textContent = data.stats.total_current_cards ?? currentItems.length;
  document.getElementById('generatedAt').textContent = formatTime(data.generated_at);

  renderStats();
  renderFilters();
  renderTodayHeadlines();

  state = parseStateFromUrl();
  if (!categories.includes(state.category)) state.category = '全部';
  searchInput.value = state.query;

  searchInput.addEventListener('input', event => {
    state.query = event.target.value.trim();
    syncUrl({ replace: true, preserveScroll: true });
    render();
  });

  window.addEventListener('popstate', () => {
    state = parseStateFromUrl();
    if (!categories.includes(state.category)) state.category = '全部';
    searchInput.value = state.query;
    render();
  });

  backToBoardEl.addEventListener('click', event => {
    event.preventDefault();
    state.itemId = '';
    syncUrl({ replace: false });
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  render();
}

function render() {
  updateFilterState();
  const tokens = getQueryTokens(state.query);

  renderSearchMeta(tokens);
  renderSearchResults(tokens);
  renderCurrent(tokens);
  renderHistory(tokens);

  if (state.itemId && itemById.has(state.itemId)) {
    renderDetail(itemById.get(state.itemId), tokens);
    boardPageEl.hidden = true;
    detailPageEl.hidden = false;
  } else {
    detailPageEl.hidden = true;
    boardPageEl.hidden = false;
  }
}

function renderStats() {
  const stats = [
    ['今日内容卡片', currentItems.length, 'ok'],
    ['历史条目', historyItems.length, 'idle'],
    ['今日日期', data.stats.today_date || '-', 'meta'],
  ];

  document.getElementById('stats').innerHTML = stats.map(([label, value, cls]) => `
    <div class="stat-card ${cls}">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join('');
}

function renderFilters() {
  filtersEl.innerHTML = categories.map(category => `
    <button class="filter-btn ${category === state.category ? 'active' : ''}" data-cat="${escapeHtml(category)}">${escapeHtml(category)}</button>
  `).join('');

  filtersEl.addEventListener('click', event => {
    const button = event.target.closest('button[data-cat]');
    if (!button) return;
    state.category = button.dataset.cat;
    syncUrl({ replace: true, preserveScroll: true });
    render();
  });
}

function updateFilterState() {
  document.querySelectorAll('.filter-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.cat === state.category);
  });
}

function renderTodayHeadlines() {
  todayHeadlinesEl.innerHTML = (data.today_headlines || []).map(item => {
    const target = findItem(item);
    const href = target ? detailHref(target.id) : '#';
    return `
      <article class="headline-card glass-card">
        <div class="headline-top">
          <span class="badge ${badgeClass(item.category)}">${escapeHtml(item.category)}</span>
          <span class="headline-date">${escapeHtml(item.digest_date || '-')}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p class="headline-main">${escapeHtml(item.headline)}</p>
        <p class="muted">来源：${escapeHtml(item.job_name || '-')}</p>
        <div class="actions">
          <a class="primary-link" href="${href}" data-item-link="${target ? escapeHtml(String(target.id)) : ''}">进入详情页</a>
        </div>
      </article>
    `;
  }).join('');

  bindItemLinks(todayHeadlinesEl);
}

function renderSearchMeta(tokens) {
  const categoryText = state.category === '全部' ? '当前查看：全部类别' : `当前查看：${escapeHtml(state.category)}`;
  if (!tokens.length) {
    searchMetaEl.innerHTML = `
      <span>支持全文搜索标题、来源任务、摘要、正文和历史归档。</span>
      <span>${categoryText}</span>
    `;
    return;
  }

  const count = allItems.filter(item => matches(item, tokens)).length;
  searchMetaEl.innerHTML = `
    <span>关键词：<strong>${escapeHtml(state.query)}</strong></span>
    <span>${categoryText}</span>
    <span>命中 <strong>${count}</strong> 条内容</span>
  `;
}

function renderSearchResults(tokens) {
  if (!tokens.length) {
    searchResultsSectionEl.hidden = true;
    searchResultsEl.innerHTML = '';
    return;
  }

  const results = allItems
    .filter(item => matches(item, tokens))
    .map(item => ({ item, score: scoreItem(item, tokens) }))
    .sort((a, b) => b.score - a.score || sortByTimeDesc(a.item, b.item))
    .slice(0, 80);

  searchResultsSectionEl.hidden = false;
  searchResultsEl.innerHTML = results.length
    ? results.map(({ item, score }) => renderSearchCard(item, score, tokens)).join('')
    : '<p class="empty">没有搜到匹配内容，请换个关键词试试。</p>';
  bindItemLinks(searchResultsEl);
}

function renderCurrent(tokens) {
  const filtered = currentItems.filter(item => matches(item, tokens));
  const groups = {};
  for (const item of filtered) (groups[item.category] ||= []).push(item);

  groupedJobsEl.innerHTML = Object.keys(groups).sort().map(category => `
    <section class="content-group">
      <div class="section-head compact-head">
        <div>
          <p class="section-kicker">Category</p>
          <h2>${escapeHtml(category)}</h2>
        </div>
        <span>${groups[category].length} 条最新内容</span>
      </div>
      <div class="cards">
        ${groups[category].sort(sortByTimeDesc).map(item => renderCard(item, tokens, '进入详情页')).join('')}
      </div>
    </section>
  `).join('') || '<p class="empty">没有匹配结果。</p>';

  bindItemLinks(groupedJobsEl);
}

function renderHistory(tokens) {
  const filtered = historyItems.filter(item => matches(item, tokens));
  const byDate = {};
  for (const item of filtered) (byDate[item.digest_date || '未标记日期'] ||= []).push(item);

  historySectionEl.innerHTML = Object.keys(byDate).sort().reverse().slice(0, 30).map(date => `
    <section class="content-group history-group">
      <div class="section-head compact-head">
        <div>
          <p class="section-kicker">Archive Date</p>
          <h2>${escapeHtml(date)}</h2>
        </div>
        <span>${byDate[date].length} 条历史内容</span>
      </div>
      <div class="cards history-cards">
        ${byDate[date].sort(sortByTimeDesc).map(item => renderCard(item, tokens, '查看历史详情')).join('')}
      </div>
    </section>
  `).join('') || '<p class="empty">暂无历史数据。</p>';

  bindItemLinks(historySectionEl);
}

function renderCard(item, tokens, actionLabel) {
  const excerpt = buildSnippet(item, tokens, item.summary || item.headline || '暂无内容');
  return `
    <article class="job-card glass-card">
      <div class="card-top">
        <div>
          <p class="mini-label">来源任务</p>
          <h3>${highlightText(item.title || item.job_name || item.id, tokens)}</h3>
          <p class="muted">${highlightText(item.job_name || '', tokens)}</p>
        </div>
        <span class="badge ${badgeClass(item.category)}">${escapeHtml(item.category)}</span>
      </div>
      <p class="headline-main compact">${highlightText(item.headline || '', tokens)}</p>
      <dl class="meta-grid">
        <div><dt>内容日期</dt><dd>${escapeHtml(item.digest_date || '-')}</dd></div>
        <div><dt>上次运行</dt><dd>${formatTime(item.last_run_at || item.digest_created_at)}</dd></div>
        <div><dt>Cron</dt><dd>${escapeHtml(item.schedule || '-')}</dd></div>
        <div><dt>状态</dt><dd>${escapeHtml(item.last_status || '-')}</dd></div>
      </dl>
      <p class="excerpt content-excerpt">${highlightText(excerpt, tokens)}</p>
      <div class="actions">
        <a class="primary-link" href="${detailHref(item.id)}" data-item-link="${escapeHtml(String(item.id))}">${actionLabel}</a>
      </div>
    </article>
  `;
}

function renderSearchCard(item, score, tokens) {
  const snippet = buildSnippet(item, tokens, item.summary || item.headline || item.final_content || '');
  return `
    <article class="job-card search-card glass-card">
      <div class="card-top">
        <div>
          <p class="mini-label">全文搜索命中</p>
          <h3>${highlightText(item.title || item.job_name || item.id, tokens)}</h3>
          <p class="muted">${highlightText(item.job_name || '', tokens)}</p>
        </div>
        <div class="search-score">
          <span class="badge ${badgeClass(item.category)}">${escapeHtml(item.category)}</span>
          <span class="score-chip">相关度 ${score}</span>
        </div>
      </div>
      <p class="headline-main compact">${highlightText(item.headline || '', tokens)}</p>
      <p class="search-snippet">${highlightText(snippet, tokens)}</p>
      <div class="search-meta-line">
        <span>内容日期：${escapeHtml(item.digest_date || '-')}</span>
        <span>更新时间：${formatTime(item.last_run_at || item.digest_created_at)}</span>
      </div>
      <div class="actions">
        <a class="primary-link" href="${detailHref(item.id)}" data-item-link="${escapeHtml(String(item.id))}">进入详情页</a>
      </div>
    </article>
  `;
}

function renderDetail(item, tokens) {
  detailTitleEl.textContent = item.title || item.job_name || item.id;
  detailMetaEl.innerHTML = `
    <div><dt>来源任务</dt><dd>${escapeHtml(item.job_name || '-')}</dd></div>
    <div><dt>分类</dt><dd>${escapeHtml(item.category || '-')}</dd></div>
    <div><dt>内容日期</dt><dd>${escapeHtml(item.digest_date || '-')}</dd></div>
    <div><dt>上次运行</dt><dd>${formatTime(item.last_run_at || item.digest_created_at)}</dd></div>
    <div><dt>Cron</dt><dd>${escapeHtml(item.schedule || '-')}</dd></div>
    <div><dt>状态</dt><dd>${escapeHtml(item.last_status || '-')}</dd></div>
  `;

  if (tokens.length) {
    detailSearchHintEl.hidden = false;
    detailSearchHintEl.innerHTML = `
      <span>当前搜索：</span><strong>${escapeHtml(state.query)}</strong>
      <p>${highlightText(buildSnippet(item, tokens, item.summary || item.headline || item.final_content || ''), tokens)}</p>
    `;
  } else {
    detailSearchHintEl.hidden = true;
    detailSearchHintEl.innerHTML = '';
  }

  detailBodyEl.innerHTML = renderMarkdown(item.final_content || item.summary || '暂无内容。');
  renderDetailPager(item);
  document.title = `${item.title || item.job_name || item.id} - Hermes 每日信息看板`;
}

function renderDetailPager(item) {
  const related = allItems
    .filter(candidate => candidate.category === item.category)
    .sort(sortByTimeDesc);
  const index = related.findIndex(candidate => String(candidate.id) === String(item.id));
  const prev = index > 0 ? related[index - 1] : null;
  const next = index >= 0 && index < related.length - 1 ? related[index + 1] : null;

  detailPagerEl.innerHTML = `
    ${prev ? `<a href="${detailHref(prev.id)}" class="ghost-link" data-item-link="${escapeHtml(String(prev.id))}">← 上一篇</a>` : '<span class="ghost-link disabled">← 上一篇</span>'}
    ${next ? `<a href="${detailHref(next.id)}" class="ghost-link" data-item-link="${escapeHtml(String(next.id))}">下一篇 →</a>` : '<span class="ghost-link disabled">下一篇 →</span>'}
  `;
  bindItemLinks(detailPagerEl);
}

function bindItemLinks(root) {
  root.querySelectorAll('[data-item-link]').forEach(link => {
    const itemId = link.dataset.itemLink;
    if (!itemId) return;
    link.addEventListener('click', event => {
      event.preventDefault();
      state.itemId = itemId;
      syncUrl({ replace: false });
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function detailHref(itemId) {
  const params = new URLSearchParams();
  if (state.query) params.set('q', state.query);
  if (state.category && state.category !== '全部') params.set('cat', state.category);
  params.set('item', itemId);
  return `?${params.toString()}`;
}

function findItem(item) {
  return allItems.find(candidate => candidate.title === item.title && candidate.digest_date === item.digest_date)
    || allItems.find(candidate => candidate.title === item.title)
    || null;
}

function matches(item, tokens = []) {
  const hitCategory = state.category === '全部' || item.category === state.category;
  if (!hitCategory) return false;
  if (!tokens.length) return true;
  const doc = searchDocuments.get(String(item.id)) || buildSearchDocument(item);
  return tokens.every(token => doc.includes(token));
}

function parseStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    query: params.get('q')?.trim() || '',
    category: params.get('cat')?.trim() || '全部',
    itemId: params.get('item')?.trim() || '',
  };
}

function syncUrl({ replace = true, preserveScroll = false } = {}) {
  const params = new URLSearchParams();
  if (state.query) params.set('q', state.query);
  if (state.category && state.category !== '全部') params.set('cat', state.category);
  if (state.itemId) params.set('item', state.itemId);
  const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
  const method = replace ? 'replaceState' : 'pushState';
  history[method](null, '', nextUrl);
  if (!state.itemId) document.title = 'Hermes 每日信息看板';
  if (!preserveScroll && !state.itemId) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderMarkdown(text) {
  if (!text) return '<p class="muted">暂无内容。</p>';
  if (window.marked && typeof window.marked.parse === 'function') {
    return window.marked.parse(text, { breaks: true, gfm: true });
  }
  return `<pre>${escapeHtml(text)}</pre>`;
}

function buildSearchDocument(item) {
  return normalize([
    item.title,
    item.job_name,
    item.category,
    item.summary,
    item.headline,
    item.final_content,
    item.digest_date,
    item.schedule,
  ].join(' '));
}

function getQueryTokens(value) {
  const normalized = normalize(value);
  if (!normalized) return [];
  return [...new Set(normalized.split(/\s+/).filter(Boolean))];
}

function scoreItem(item, tokens) {
  let score = 0;
  for (const token of tokens) {
    score += countOccurrences(normalize(item.title), token) * 10;
    score += countOccurrences(normalize(item.job_name), token) * 6;
    score += countOccurrences(normalize(item.headline), token) * 5;
    score += countOccurrences(normalize(item.summary), token) * 3;
    score += countOccurrences(normalize(item.final_content), token) * 2;
    score += countOccurrences(normalize(item.category), token);
  }
  return score || 1;
}

function buildSnippet(item, tokens, fallback = '') {
  const source = stripMarkdown(item.final_content || item.summary || item.headline || fallback || '');
  const clean = source.replace(/\s+/g, ' ').trim();
  if (!clean) return fallback || '暂无内容';
  if (!tokens.length) return truncate(clean, 160);

  const normalized = clean.toLowerCase();
  let firstIndex = -1;
  for (const token of tokens) {
    const idx = normalized.indexOf(token.toLowerCase());
    if (idx !== -1 && (firstIndex === -1 || idx < firstIndex)) firstIndex = idx;
  }
  if (firstIndex === -1) return truncate(clean, 160);

  const start = Math.max(0, firstIndex - 54);
  const end = Math.min(clean.length, firstIndex + 160);
  return `${start > 0 ? '…' : ''}${clean.slice(start, end).trim()}${end < clean.length ? '…' : ''}`;
}

function highlightText(text, tokens = []) {
  let html = escapeHtml(text || '');
  for (const token of [...tokens].sort((a, b) => b.length - a.length)) {
    if (!token) continue;
    html = html.replace(new RegExp(escapeRegExp(token), 'gi'), match => `<mark>${match}</mark>`);
  }
  return html;
}

function stripMarkdown(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^[>#\-*+\d.\s]+/gm, ' ')
    .replace(/[\*_~|]/g, ' ');
}

function truncate(text, maxLength) {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength).trim()}…`;
}

function countOccurrences(text, token) {
  if (!text || !token) return 0;
  let count = 0;
  let index = 0;
  while ((index = text.indexOf(token, index)) !== -1) {
    count += 1;
    index += token.length;
  }
  return count;
}

function sortByTimeDesc(a, b) {
  const timeA = Date.parse(a.last_run_at || a.digest_created_at || 0) || 0;
  const timeB = Date.parse(b.last_run_at || b.digest_created_at || 0) || 0;
  return timeB - timeA;
}

function normalize(value) {
  return String(value || '').toLowerCase();
}

function formatTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function badgeClass(category) {
  if ((category || '').includes('AI')) return 'ok';
  if ((category || '').includes('财经')) return 'bad';
  if ((category || '').includes('监控')) return 'idle';
  return 'meta';
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
}

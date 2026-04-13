const data = window.DASHBOARD_DATA || { current: [], history: [], stats: { categories: {} }, today_headlines: [] };
const currentItems = Array.isArray(data.current) ? data.current : [];
const historyItems = Array.isArray(data.history) ? data.history : [];
const allItems = [...currentItems, ...historyItems];
const itemById = new Map(allItems.map(item => [String(item.id), item]));
const categories = ['全部', ...Object.keys(data.stats.categories || {}).sort()];
const searchDocuments = new Map(allItems.map(item => [String(item.id), buildSearchDocument(item)]));
const page = document.body.dataset.page || 'home';

init();

function init() {
  hydrateTopbar();
  switch (page) {
    case 'home':
      renderHomePage();
      break;
    case 'today':
      renderTodayPage();
      break;
    case 'search':
      renderSearchPage();
      break;
    case 'archive':
      renderArchivePage();
      break;
    case 'item':
      renderItemPage();
      break;
    default:
      break;
  }
}

function hydrateTopbar() {
  const totalJobsEl = document.getElementById('totalJobs');
  const generatedAtEl = document.getElementById('generatedAt');
  if (totalJobsEl) totalJobsEl.textContent = data.stats.total_current_cards ?? currentItems.length;
  if (generatedAtEl) generatedAtEl.textContent = formatTime(data.generated_at);
}

function renderHomePage() {
  const statsEl = document.getElementById('homeStats');
  const headlinesEl = document.getElementById('todayHeadlines');
  const categoryOverviewEl = document.getElementById('categoryOverview');
  const archivePreviewEl = document.getElementById('archivePreview');
  if (statsEl) statsEl.innerHTML = renderStatsCards();
  if (headlinesEl) {
    headlinesEl.innerHTML = (data.today_headlines || []).slice(0, 6).map(item => {
      const target = findItem(item);
      return `
        <article class="story-card">
          <div class="story-meta-row">
            <span class="badge">${escapeHtml(item.category || '未分类')}</span>
            <span class="story-date">${escapeHtml(item.digest_date || '-')}</span>
          </div>
          <h3>${escapeHtml(item.title || '-')}</h3>
          <p>${escapeHtml(item.headline || item.summary || '暂无摘要')}</p>
          <div class="card-actions">
            <a class="text-link" href="${itemUrl(target?.id || '')}">查看详情</a>
          </div>
        </article>
      `;
    }).join('');
  }

  if (categoryOverviewEl) {
    categoryOverviewEl.innerHTML = categories.filter(cat => cat !== '全部').map(category => {
      const items = currentItems.filter(item => item.category === category).slice(0, 3);
      return `
        <section class="category-block">
          <div class="section-head compact">
            <div>
              <p class="micro-kicker">Category</p>
              <h3>${escapeHtml(category)}</h3>
            </div>
            <a class="text-link" href="today.html?cat=${encodeURIComponent(category)}">查看全部</a>
          </div>
          <div class="stack-list">
            ${items.map(item => `
              <a class="list-link" href="${itemUrl(item.id)}">
                <strong>${escapeHtml(item.title || item.job_name || item.id)}</strong>
                <span>${escapeHtml(item.summary || item.headline || '暂无摘要')}</span>
              </a>
            `).join('')}
          </div>
        </section>
      `;
    }).join('');
  }

  if (archivePreviewEl) {
    const latestHistory = [...historyItems].sort(sortByTimeDesc).slice(0, 8);
    archivePreviewEl.innerHTML = latestHistory.map(item => `
      <a class="archive-row" href="${itemUrl(item.id)}">
        <div>
          <strong>${escapeHtml(item.title || item.job_name || item.id)}</strong>
          <p>${escapeHtml(item.summary || item.headline || '')}</p>
        </div>
        <span>${escapeHtml(item.digest_date || '-')}</span>
      </a>
    `).join('');
  }
}

function renderTodayPage() {
  const state = {
    category: readParam('cat') || '全部',
    q: readParam('q') || '',
  };
  const filtersEl = document.getElementById('todayFilters');
  const inputEl = document.getElementById('todaySearchInput');
  const resultsEl = document.getElementById('todayList');
  const summaryEl = document.getElementById('todaySummary');
  if (!filtersEl || !resultsEl || !inputEl || !summaryEl) return;

  inputEl.value = state.q;
  renderCategoryFilters(filtersEl, state.category, category => {
    setUrlParams({ cat: category === '全部' ? '' : category, q: state.q || '' });
  });

  inputEl.addEventListener('input', event => {
    setUrlParams({ cat: state.category === '全部' ? '' : state.category, q: event.target.value.trim() || '' });
  });

  const tokens = getQueryTokens(state.q);
  const filtered = currentItems.filter(item => matches(item, state.category, tokens));
  summaryEl.innerHTML = `今天共 <strong>${filtered.length}</strong> 条内容${state.category !== '全部' ? `，当前分类：<strong>${escapeHtml(state.category)}</strong>` : ''}${state.q ? `，关键词：<strong>${escapeHtml(state.q)}</strong>` : ''}`;

  const groups = {};
  for (const item of filtered) (groups[item.category] ||= []).push(item);
  resultsEl.innerHTML = Object.keys(groups).sort().map(category => `
    <section class="list-section">
      <div class="section-head compact">
        <div>
          <p class="micro-kicker">Category</p>
          <h2>${escapeHtml(category)}</h2>
        </div>
        <span>${groups[category].length} 条</span>
      </div>
      <div class="card-grid">
        ${groups[category].sort(sortByTimeDesc).map(item => renderItemCard(item, tokens)).join('')}
      </div>
    </section>
  `).join('') || '<p class="empty">没有匹配结果。</p>';
}

function renderSearchPage() {
  const state = {
    category: readParam('cat') || '全部',
    q: readParam('q') || '',
    scope: readParam('scope') || 'all',
  };
  const inputEl = document.getElementById('searchInput');
  const filtersEl = document.getElementById('searchFilters');
  const scopeEl = document.getElementById('searchScope');
  const resultsEl = document.getElementById('searchResults');
  const summaryEl = document.getElementById('searchSummary');
  if (!inputEl || !filtersEl || !scopeEl || !resultsEl || !summaryEl) return;

  inputEl.value = state.q;
  scopeEl.value = state.scope;

  renderCategoryFilters(filtersEl, state.category, category => {
    setUrlParams({ q: state.q || '', cat: category === '全部' ? '' : category, scope: state.scope === 'all' ? '' : state.scope });
  });

  inputEl.addEventListener('input', event => {
    setUrlParams({ q: event.target.value.trim() || '', cat: state.category === '全部' ? '' : state.category, scope: state.scope === 'all' ? '' : state.scope });
  });

  scopeEl.addEventListener('change', event => {
    setUrlParams({ q: state.q || '', cat: state.category === '全部' ? '' : state.category, scope: event.target.value === 'all' ? '' : event.target.value });
  });

  const tokens = getQueryTokens(state.q);
  const pool = state.scope === 'today' ? currentItems : state.scope === 'history' ? historyItems : allItems;
  const results = pool
    .filter(item => matches(item, state.category, tokens))
    .map(item => ({ item, score: scoreItem(item, tokens) }))
    .sort((a, b) => b.score - a.score || sortByTimeDesc(a.item, b.item));

  summaryEl.innerHTML = state.q
    ? `关键词 <strong>${escapeHtml(state.q)}</strong> 命中 <strong>${results.length}</strong> 条结果`
    : '输入关键词后，可在当前内容与历史归档中全文检索。';

  resultsEl.innerHTML = results.length
    ? results.slice(0, 100).map(({ item, score }) => renderSearchResult(item, tokens, score)).join('')
    : '<p class="empty">暂无匹配结果。</p>';
}

function renderArchivePage() {
  const state = {
    category: readParam('cat') || '全部',
    q: readParam('q') || '',
  };
  const filtersEl = document.getElementById('archiveFilters');
  const inputEl = document.getElementById('archiveSearchInput');
  const listEl = document.getElementById('archiveGroups');
  const summaryEl = document.getElementById('archiveSummary');
  if (!filtersEl || !inputEl || !listEl || !summaryEl) return;

  inputEl.value = state.q;
  renderCategoryFilters(filtersEl, state.category, category => {
    setUrlParams({ cat: category === '全部' ? '' : category, q: state.q || '' });
  });
  inputEl.addEventListener('input', event => {
    setUrlParams({ cat: state.category === '全部' ? '' : state.category, q: event.target.value.trim() || '' });
  });

  const tokens = getQueryTokens(state.q);
  const filtered = historyItems.filter(item => matches(item, state.category, tokens));
  summaryEl.innerHTML = `历史归档共 <strong>${filtered.length}</strong> 条${state.category !== '全部' ? `，当前分类：<strong>${escapeHtml(state.category)}</strong>` : ''}`;

  const grouped = {};
  for (const item of filtered) (grouped[item.digest_date || '未标记日期'] ||= []).push(item);
  listEl.innerHTML = Object.keys(grouped).sort().reverse().map(date => `
    <section class="list-section">
      <div class="section-head compact">
        <div>
          <p class="micro-kicker">Archive Date</p>
          <h2>${escapeHtml(date)}</h2>
        </div>
        <span>${grouped[date].length} 条</span>
      </div>
      <div class="archive-stack">
        ${grouped[date].sort(sortByTimeDesc).map(item => renderArchiveRow(item, tokens)).join('')}
      </div>
    </section>
  `).join('') || '<p class="empty">暂无归档内容。</p>';
}

function renderItemPage() {
  const itemId = readParam('id');
  const item = itemById.get(String(itemId || ''));
  const titleEl = document.getElementById('detailTitle');
  const metaEl = document.getElementById('detailMeta');
  const bodyEl = document.getElementById('detailBody');
  const pagerEl = document.getElementById('detailPager');
  const contextEl = document.getElementById('detailContext');
  if (!titleEl || !metaEl || !bodyEl || !pagerEl || !contextEl) return;

  if (!item) {
    titleEl.textContent = '未找到内容';
    metaEl.innerHTML = '<p class="empty">当前条目不存在或已失效。</p>';
    bodyEl.innerHTML = '<p class="empty">请返回列表页重新选择。</p>';
    pagerEl.innerHTML = '<a class="ghost-link" href="index.html">返回首页</a>';
    return;
  }

  document.title = `${item.title || item.job_name || item.id} - Hermes 每日信息看板`;
  titleEl.textContent = item.title || item.job_name || item.id;
  metaEl.innerHTML = `
    <div><dt>来源任务</dt><dd>${escapeHtml(item.job_name || '-')}</dd></div>
    <div><dt>分类</dt><dd>${escapeHtml(item.category || '-')}</dd></div>
    <div><dt>内容日期</dt><dd>${escapeHtml(item.digest_date || '-')}</dd></div>
    <div><dt>上次运行</dt><dd>${formatTime(item.last_run_at || item.digest_created_at)}</dd></div>
    <div><dt>Cron</dt><dd>${escapeHtml(item.schedule || '-')}</dd></div>
    <div><dt>状态</dt><dd>${escapeHtml(item.last_status || '-')}</dd></div>
  `;

  const sourcePage = readParam('from') || inferSourcePage(item);
  contextEl.innerHTML = `
    <a class="text-link" href="${backUrl(sourcePage, readParam('q'), readParam('cat'), readParam('scope'))}">返回${sourcePageLabel(sourcePage)}</a>
  `;

  bodyEl.innerHTML = renderMarkdown(item.final_content || item.summary || '暂无内容。');
  renderItemPager(item, pagerEl);
}

function renderItemPager(item, pagerEl) {
  const siblings = allItems.filter(candidate => candidate.category === item.category).sort(sortByTimeDesc);
  const index = siblings.findIndex(candidate => String(candidate.id) === String(item.id));
  const prev = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;
  pagerEl.innerHTML = `
    ${prev ? `<a class="ghost-link" href="${itemUrl(prev.id)}">← 上一篇</a>` : '<span class="ghost-link disabled">← 上一篇</span>'}
    ${next ? `<a class="ghost-link" href="${itemUrl(next.id)}">下一篇 →</a>` : '<span class="ghost-link disabled">下一篇 →</span>'}
  `;
}

function renderStatsCards() {
  const stats = [
    ['今日内容卡片', currentItems.length],
    ['历史条目', historyItems.length],
    ['今日日期', data.stats.today_date || '-'],
  ];
  return stats.map(([label, value]) => `
    <article class="stat-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join('');
}

function renderCategoryFilters(root, activeCategory, onNavigate) {
  root.innerHTML = categories.map(category => `
    <button class="filter-btn ${category === activeCategory ? 'active' : ''}" data-cat="${escapeHtml(category)}">${escapeHtml(category)}</button>
  `).join('');
  root.querySelectorAll('[data-cat]').forEach(button => {
    button.addEventListener('click', () => onNavigate(button.dataset.cat));
  });
}

function renderItemCard(item, tokens) {
  return `
    <article class="item-card">
      <div class="item-card-head">
        <div>
          <p class="micro-kicker">${escapeHtml(item.job_name || '来源任务')}</p>
          <h3>${highlightText(item.title || item.job_name || item.id, tokens)}</h3>
        </div>
        <span class="badge">${escapeHtml(item.category || '未分类')}</span>
      </div>
      <p class="item-snippet">${highlightText(buildSnippet(item, tokens, item.summary || item.headline || ''), tokens)}</p>
      <dl class="meta-grid">
        <div><dt>内容日期</dt><dd>${escapeHtml(item.digest_date || '-')}</dd></div>
        <div><dt>上次运行</dt><dd>${formatTime(item.last_run_at || item.digest_created_at)}</dd></div>
      </dl>
      <div class="card-actions">
        <a class="text-link" href="${itemUrl(item.id)}">查看详情</a>
      </div>
    </article>
  `;
}

function renderSearchResult(item, tokens, score) {
  return `
    <article class="search-result">
      <div class="item-card-head">
        <div>
          <p class="micro-kicker">${escapeHtml(item.job_name || '来源任务')}</p>
          <h3>${highlightText(item.title || item.job_name || item.id, tokens)}</h3>
        </div>
        <div class="result-side">
          <span class="badge">${escapeHtml(item.category || '未分类')}</span>
          <span class="score-chip">相关度 ${score}</span>
        </div>
      </div>
      <p class="item-snippet">${highlightText(buildSnippet(item, tokens, item.summary || item.headline || ''), tokens)}</p>
      <div class="result-meta">
        <span>${escapeHtml(item.digest_date || '-')}</span>
        <span>${formatTime(item.last_run_at || item.digest_created_at)}</span>
      </div>
      <div class="card-actions">
        <a class="text-link" href="${itemUrl(item.id, 'search')}">进入详情页</a>
      </div>
    </article>
  `;
}

function renderArchiveRow(item, tokens) {
  return `
    <a class="archive-row" href="${itemUrl(item.id, 'archive')}">
      <div>
        <strong>${highlightText(item.title || item.job_name || item.id, tokens)}</strong>
        <p>${highlightText(buildSnippet(item, tokens, item.summary || item.headline || ''), tokens)}</p>
      </div>
      <span>${escapeHtml(item.category || '未分类')}</span>
    </a>
  `;
}

function itemUrl(itemId, source = '') {
  const params = new URLSearchParams();
  params.set('id', itemId || '');
  if (source) params.set('from', source);
  return `item.html?${params.toString()}`;
}

function backUrl(source, q, cat, scope) {
  if (source === 'search') {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (cat) params.set('cat', cat);
    if (scope) params.set('scope', scope);
    return `search.html${params.toString() ? `?${params.toString()}` : ''}`;
  }
  if (source === 'archive') {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (cat) params.set('cat', cat);
    return `archive.html${params.toString() ? `?${params.toString()}` : ''}`;
  }
  if (source === 'today') {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (cat) params.set('cat', cat);
    return `today.html${params.toString() ? `?${params.toString()}` : ''}`;
  }
  return 'index.html';
}

function sourcePageLabel(source) {
  if (source === 'search') return '搜索页';
  if (source === 'archive') return '历史归档';
  if (source === 'today') return '今日内容';
  return '首页';
}

function inferSourcePage(item) {
  return currentItems.some(current => String(current.id) === String(item.id)) ? 'today' : 'archive';
}

function matches(item, category, tokens = []) {
  const hitCategory = category === '全部' || item.category === category;
  if (!hitCategory) return false;
  if (!tokens.length) return true;
  const doc = searchDocuments.get(String(item.id)) || buildSearchDocument(item);
  return tokens.every(token => doc.includes(token));
}

function findItem(item) {
  return allItems.find(candidate => candidate.title === item.title && candidate.digest_date === item.digest_date)
    || allItems.find(candidate => candidate.title === item.title)
    || null;
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
  if (!tokens.length) return 0;
  let score = 0;
  for (const token of tokens) {
    score += countOccurrences(normalize(item.title), token) * 10;
    score += countOccurrences(normalize(item.job_name), token) * 6;
    score += countOccurrences(normalize(item.headline), token) * 4;
    score += countOccurrences(normalize(item.summary), token) * 3;
    score += countOccurrences(normalize(item.final_content), token) * 2;
  }
  return score;
}

function buildSnippet(item, tokens, fallback = '') {
  const source = stripMarkdown(item.final_content || item.summary || item.headline || fallback || '');
  const clean = source.replace(/\s+/g, ' ').trim();
  if (!clean) return fallback || '暂无内容';
  if (!tokens.length) return truncate(clean, 160);
  const lower = clean.toLowerCase();
  let firstIndex = -1;
  for (const token of tokens) {
    const idx = lower.indexOf(token.toLowerCase());
    if (idx !== -1 && (firstIndex === -1 || idx < firstIndex)) firstIndex = idx;
  }
  if (firstIndex === -1) return truncate(clean, 160);
  const start = Math.max(0, firstIndex - 52);
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

function renderMarkdown(text) {
  if (!text) return '<p class="empty">暂无内容。</p>';
  if (window.marked && typeof window.marked.parse === 'function') {
    return window.marked.parse(text, { breaks: true, gfm: true });
  }
  return `<pre>${escapeHtml(text)}</pre>`;
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

function sortByTimeDesc(a, b) {
  const timeA = Date.parse(a.last_run_at || a.digest_created_at || 0) || 0;
  const timeB = Date.parse(b.last_run_at || b.digest_created_at || 0) || 0;
  return timeB - timeA;
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

function formatTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function normalize(value) {
  return String(value || '').toLowerCase();
}

function readParam(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}

function setUrlParams(next) {
  const params = new URLSearchParams();
  Object.entries(next).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const base = window.location.pathname.split('/').pop() || 'index.html';
  window.location.href = `${base}${params.toString() ? `?${params.toString()}` : ''}`;
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
}

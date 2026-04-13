const rawData = window.DASHBOARD_DATA || { current: [], history: [], stats: { categories: {} }, today_headlines: [] };
const page = document.body.dataset.page || 'home';

const currentItems = normalizeCollection(rawData.current || []);
const historyItems = normalizeCollection(rawData.history || []);
const allItems = [...currentItems, ...historyItems];
const itemById = new Map(allItems.map(item => [String(item.id), item]));
const categories = ['全部', ...new Set(allItems.map(item => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
const searchDocuments = new Map(allItems.map(item => [String(item.id), buildSearchDocument(item)]));

init();

function init() {
  hydrateTopbar();
  switch (page) {
    case 'home':
      renderHomePage();
      bindManualSyncCopy();
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

function normalizeCollection(items) {
  return items
    .filter(Boolean)
    .filter(item => !isNoiseItem(item))
    .map(item => ({
      ...item,
      title: item.title || item.job_name || item.id,
      summary: cleanPreview(item.summary || ''),
      headline: cleanPreview(item.headline || ''),
      final_content: String(item.final_content || ''),
    }));
}

function isNoiseItem(item) {
  const text = normalize([item.title, item.job_name, item.summary, item.final_content].join(' '));
  return text.includes('hermes migration test') || text.includes('test content hello hermes');
}

function hydrateTopbar() {
  const totalJobsEl = document.getElementById('totalJobs');
  const generatedAtEl = document.getElementById('generatedAt');
  if (totalJobsEl) totalJobsEl.textContent = currentItems.length;
  if (generatedAtEl) generatedAtEl.textContent = formatTime(rawData.generated_at);
}

function renderHomePage() {
  const statsEl = document.getElementById('homeStats');
  const headlinesEl = document.getElementById('todayHeadlines');
  const categoryOverviewEl = document.getElementById('categoryOverview');
  const archivePreviewEl = document.getElementById('archivePreview');

  if (statsEl) statsEl.innerHTML = renderStatsCards();

  if (headlinesEl) {
    const headlines = (rawData.today_headlines || [])
      .filter(item => !isNoiseItem(item))
      .slice(0, 6);
    headlinesEl.innerHTML = headlines.map(item => {
      const target = findItem(item);
      return `
        <article class="story-card">
          <div class="story-meta-row">
            <span class="badge">${escapeHtml(item.category || '未分类')}</span>
            <span class="story-date">${escapeHtml(item.digest_date || '-')}</span>
          </div>
          <h3>${escapeHtml(item.title || '-')}</h3>
          <p>${escapeHtml(cleanPreview(item.headline || item.summary || '暂无摘要'))}</p>
          <div class="card-actions">
            <a class="text-link" href="${itemUrl(target?.id || '', 'home')}">查看详情</a>
          </div>
        </article>
      `;
    }).join('') || '<p class="empty">暂无今日头条。</p>';
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
          <div class="stack-list compact-list">
            ${items.map(item => `
              <article class="mini-entry">
                <div>
                  <strong>${escapeHtml(item.title)}</strong>
                  <span>${escapeHtml(buildSnippet(item, [], item.summary || item.headline || '暂无摘要'))}</span>
                </div>
                <a class="text-link" href="${itemUrl(item.id, 'today', '', category)}">详情</a>
              </article>
            `).join('')}
          </div>
        </section>
      `;
    }).join('');
  }

  if (archivePreviewEl) {
    const latestHistory = [...historyItems].sort(sortByTimeDesc).slice(0, 8);
    archivePreviewEl.innerHTML = latestHistory.map(item => `
      <article class="archive-row">
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(buildSnippet(item, [], item.summary || item.headline || '暂无摘要'))}</p>
        </div>
        <div class="archive-row-side">
          <span>${escapeHtml(item.digest_date || '-')}</span>
          <a class="text-link" href="${itemUrl(item.id, 'archive')}">详情</a>
        </div>
      </article>
    `).join('') || '<p class="empty">暂无归档预览。</p>';
  }
}

function bindManualSyncCopy() {
  const button = document.getElementById('copyManualSyncBtn');
  const hint = document.getElementById('manualSyncHint');
  if (!button || !hint) return;
  const command = 'cd /root/projects/hermes-cron-dashboard && python3 scripts/sync_to_github.py';
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(command);
      hint.innerHTML = '已复制命令：<code>' + escapeHtml(command) + '</code>';
    } catch (error) {
      hint.innerHTML = '复制失败，请手动执行：<code>' + escapeHtml(command) + '</code>';
    }
  });
}

function renderTodayPage() {
  const state = { category: readParam('cat') || '全部', q: readParam('q') || '' };
  const filtersEl = document.getElementById('todayFilters');
  const inputEl = document.getElementById('todaySearchInput');
  const formEl = document.getElementById('todaySearchForm');
  const resultsEl = document.getElementById('todayList');
  const summaryEl = document.getElementById('todaySummary');
  if (!filtersEl || !resultsEl || !inputEl || !summaryEl || !formEl) return;

  inputEl.value = state.q;
  renderCategoryFilters(filtersEl, state.category, category => setUrlParams({ cat: category === '全部' ? '' : category, q: state.q || '' }));
  formEl.addEventListener('submit', event => {
    event.preventDefault();
    setUrlParams({ cat: state.category === '全部' ? '' : state.category, q: inputEl.value.trim() || '' });
  });

  const tokens = getQueryTokens(state.q);
  const filtered = currentItems.filter(item => matches(item, state.category, tokens));
  summaryEl.innerHTML = `今天共 <strong>${filtered.length}</strong> 条内容${state.category !== '全部' ? `，当前分类：<strong>${escapeHtml(state.category)}</strong>` : ''}${state.q ? `，关键词：<strong>${escapeHtml(state.q)}</strong>` : ''}`;

  const groups = groupBy(filtered, item => item.category);
  resultsEl.innerHTML = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'zh-CN')).map(category => `
    <section class="list-section">
      <div class="section-head compact">
        <div>
          <p class="micro-kicker">Category</p>
          <h2>${escapeHtml(category)}</h2>
        </div>
        <span>${groups[category].length} 条</span>
      </div>
      <div class="card-grid">
        ${groups[category].sort(sortByTimeDesc).map(item => renderItemCard(item, tokens, 'today', state.q, state.category)).join('')}
      </div>
    </section>
  `).join('') || '<p class="empty">没有匹配结果。</p>';
}

function renderSearchPage() {
  const state = { category: readParam('cat') || '全部', q: readParam('q') || '', scope: readParam('scope') || 'all' };
  const inputEl = document.getElementById('searchInput');
  const formEl = document.getElementById('searchForm');
  const filtersEl = document.getElementById('searchFilters');
  const scopeEl = document.getElementById('searchScope');
  const resultsEl = document.getElementById('searchResults');
  const summaryEl = document.getElementById('searchSummary');
  if (!inputEl || !formEl || !filtersEl || !scopeEl || !resultsEl || !summaryEl) return;

  inputEl.value = state.q;
  scopeEl.value = state.scope;
  renderCategoryFilters(filtersEl, state.category, category => setUrlParams({ q: state.q || '', cat: category === '全部' ? '' : category, scope: state.scope === 'all' ? '' : state.scope }));
  formEl.addEventListener('submit', event => {
    event.preventDefault();
    setUrlParams({ q: inputEl.value.trim() || '', cat: state.category === '全部' ? '' : state.category, scope: scopeEl.value === 'all' ? '' : scopeEl.value });
  });

  const tokens = getQueryTokens(state.q);
  const pool = state.scope === 'today' ? currentItems : state.scope === 'history' ? historyItems : allItems;
  const results = state.q
    ? pool
        .filter(item => matches(item, state.category, tokens))
        .map(item => ({ item, score: scoreItem(item, tokens) }))
        .sort((a, b) => b.score - a.score || sortByTimeDesc(a.item, b.item))
    : [];

  summaryEl.innerHTML = state.q
    ? `关键词 <strong>${escapeHtml(state.q)}</strong> 命中 <strong>${results.length}</strong> 条结果`
    : '输入关键词后，点击“搜索”再执行检索。';

  resultsEl.innerHTML = state.q
    ? (results.length
        ? results.slice(0, 100).map(({ item, score }) => renderSearchResult(item, tokens, score, state)).join('')
        : '<p class="empty">暂无匹配结果。</p>')
    : '<p class="empty">请输入关键词后点击搜索。</p>';
}

function renderArchivePage() {
  const state = { category: readParam('cat') || '全部', q: readParam('q') || '' };
  const filtersEl = document.getElementById('archiveFilters');
  const inputEl = document.getElementById('archiveSearchInput');
  const formEl = document.getElementById('archiveSearchForm');
  const listEl = document.getElementById('archiveGroups');
  const summaryEl = document.getElementById('archiveSummary');
  if (!filtersEl || !inputEl || !formEl || !listEl || !summaryEl) return;

  inputEl.value = state.q;
  renderCategoryFilters(filtersEl, state.category, category => setUrlParams({ cat: category === '全部' ? '' : category, q: state.q || '' }));
  formEl.addEventListener('submit', event => {
    event.preventDefault();
    setUrlParams({ cat: state.category === '全部' ? '' : state.category, q: inputEl.value.trim() || '' });
  });

  const tokens = getQueryTokens(state.q);
  const filtered = historyItems.filter(item => matches(item, state.category, tokens));
  summaryEl.innerHTML = `历史归档共 <strong>${filtered.length}</strong> 条${state.category !== '全部' ? `，当前分类：<strong>${escapeHtml(state.category)}</strong>` : ''}`;

  const grouped = groupBy(filtered, item => item.digest_date || '未标记日期');
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
        ${grouped[date].sort(sortByTimeDesc).map(item => renderArchiveRow(item, tokens, state)).join('')}
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
  const backEl = document.getElementById('backToBoard');
  if (!titleEl || !metaEl || !bodyEl || !pagerEl || !contextEl || !backEl) return;

  if (!item) {
    titleEl.textContent = '未找到内容';
    metaEl.innerHTML = '<p class="empty">当前条目不存在或已失效。</p>';
    bodyEl.innerHTML = '<p class="empty">请返回列表页重新选择。</p>';
    pagerEl.innerHTML = '<a class="ghost-link" href="index.html">返回首页</a>';
    return;
  }

  const sourcePage = readParam('from') || inferSourcePage(item);
  const sourceQ = readParam('q') || '';
  const sourceCat = readParam('cat') || '';
  const sourceScope = readParam('scope') || '';
  const backHref = backUrl(sourcePage, sourceQ, sourceCat, sourceScope);

  document.title = `${item.title} - Hermes 每日信息看板`;
  titleEl.textContent = item.title;
  backEl.href = backHref;
  metaEl.innerHTML = `
    <div><dt>来源任务</dt><dd>${escapeHtml(item.job_name || '-')}</dd></div>
    <div><dt>分类</dt><dd>${escapeHtml(item.category || '-')}</dd></div>
    <div><dt>内容日期</dt><dd>${escapeHtml(item.digest_date || '-')}</dd></div>
    <div><dt>上次运行</dt><dd>${formatTime(item.last_run_at || item.digest_created_at)}</dd></div>
    <div><dt>Cron</dt><dd>${escapeHtml(item.schedule || '-')}</dd></div>
    <div><dt>状态</dt><dd>${escapeHtml(item.last_status || '-')}</dd></div>
  `;
  contextEl.innerHTML = `<a class="text-link" href="${backHref}">返回${sourcePageLabel(sourcePage)}</a>`;
  bodyEl.innerHTML = renderMarkdown(item.final_content || item.summary || '暂无内容。');
  renderItemPager(item, pagerEl, sourcePage, sourceQ, sourceCat, sourceScope);
}

function renderItemPager(item, pagerEl, from, q, cat, scope) {
  const siblings = allItems.filter(candidate => candidate.category === item.category).sort(sortByTimeDesc);
  const index = siblings.findIndex(candidate => String(candidate.id) === String(item.id));
  const prev = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;
  pagerEl.innerHTML = `
    ${prev ? `<a class="ghost-link" href="${itemUrl(prev.id, from, q, cat, scope)}">← 上一篇</a>` : '<span class="ghost-link disabled">← 上一篇</span>'}
    ${next ? `<a class="ghost-link" href="${itemUrl(next.id, from, q, cat, scope)}">下一篇 →</a>` : '<span class="ghost-link disabled">下一篇 →</span>'}
  `;
}

function renderStatsCards() {
  const stats = [
    ['今日内容卡片', currentItems.length],
    ['历史条目', historyItems.length],
    ['今日日期', rawData.stats?.today_date || '-'],
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
  root.querySelectorAll('[data-cat]').forEach(button => button.addEventListener('click', () => onNavigate(button.dataset.cat)));
}

function renderItemCard(item, tokens, fromPage, query = '', category = '') {
  return `
    <article class="item-card">
      <div class="item-card-head">
        <div>
          <p class="micro-kicker">${escapeHtml(item.job_name || '来源任务')}</p>
          <h3>${highlightText(item.title, tokens)}</h3>
        </div>
        <span class="badge">${escapeHtml(item.category || '未分类')}</span>
      </div>
      <p class="item-snippet">${highlightText(buildSnippet(item, tokens, item.summary || item.headline || ''), tokens)}</p>
      <dl class="meta-grid">
        <div><dt>内容日期</dt><dd>${escapeHtml(item.digest_date || '-')}</dd></div>
        <div><dt>上次运行</dt><dd>${formatTime(item.last_run_at || item.digest_created_at)}</dd></div>
      </dl>
      <div class="card-actions">
        <a class="text-link" href="${itemUrl(item.id, fromPage, query, category)}">查看详情</a>
      </div>
    </article>
  `;
}

function renderSearchResult(item, tokens, score, state) {
  return `
    <article class="search-result">
      <div class="item-card-head">
        <div>
          <p class="micro-kicker">${escapeHtml(item.job_name || '来源任务')}</p>
          <h3>${highlightText(item.title, tokens)}</h3>
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
        <a class="text-link" href="${itemUrl(item.id, 'search', state.q, state.category, state.scope)}">进入详情页</a>
      </div>
    </article>
  `;
}

function renderArchiveRow(item, tokens, state) {
  return `
    <article class="archive-row">
      <div>
        <strong>${highlightText(item.title, tokens)}</strong>
        <p>${highlightText(buildSnippet(item, tokens, item.summary || item.headline || ''), tokens)}</p>
      </div>
      <div class="archive-row-side">
        <span>${escapeHtml(item.category || '未分类')}</span>
        <a class="text-link" href="${itemUrl(item.id, 'archive', state.q, state.category)}">详情</a>
      </div>
    </article>
  `;
}

function itemUrl(itemId, from = '', q = '', cat = '', scope = '') {
  const params = new URLSearchParams();
  params.set('id', itemId || '');
  if (from) params.set('from', from);
  if (q) params.set('q', q);
  if (cat && cat !== '全部') params.set('cat', cat);
  if (scope && scope !== 'all') params.set('scope', scope);
  return `item.html?${params.toString()}`;
}

function backUrl(source, q, cat, scope) {
  if (source === 'search') {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (cat && cat !== '全部') params.set('cat', cat);
    if (scope && scope !== 'all') params.set('scope', scope);
    return `search.html${params.toString() ? `?${params.toString()}` : ''}`;
  }
  if (source === 'archive') {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (cat && cat !== '全部') params.set('cat', cat);
    return `archive.html${params.toString() ? `?${params.toString()}` : ''}`;
  }
  if (source === 'today') {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (cat && cat !== '全部') params.set('cat', cat);
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

function findItem(item) {
  return allItems.find(candidate => candidate.title === item.title && candidate.digest_date === item.digest_date)
    || allItems.find(candidate => candidate.title === item.title)
    || null;
}

function matches(item, category, tokens = []) {
  const categoryHit = category === '全部' || item.category === category;
  if (!categoryHit) return false;
  if (!tokens.length) return true;
  const doc = searchDocuments.get(String(item.id)) || buildSearchDocument(item);
  return tokens.every(token => tokenMatchesDocument(token, doc));
}

function tokenMatchesDocument(token, doc) {
  if (!token) return true;
  if (doc.raw.includes(token) || doc.compact.includes(token)) return true;
  if (isCjkToken(token) && token.length >= 2) {
    const collapsed = compactNormalize(token);
    return doc.compact.includes(collapsed);
  }
  return false;
}

function buildSearchDocument(item) {
  const raw = normalize([
    item.title,
    item.job_name,
    item.category,
    item.summary,
    item.headline,
    item.final_content,
    item.digest_date,
    item.schedule,
  ].join(' '));
  return { raw, compact: compactNormalize(raw) };
}

function getQueryTokens(value) {
  const normalized = normalize(value).trim();
  if (!normalized) return [];
  const baseTokens = [...new Set(normalized.split(/\s+/).filter(Boolean))];
  if (baseTokens.length > 1) return baseTokens;
  const only = baseTokens[0];
  if (!isCjkToken(only)) return baseTokens;
  const compact = compactNormalize(only);
  const grams = [];
  for (let i = 0; i < compact.length - 1; i += 1) grams.push(compact.slice(i, i + 2));
  return [...new Set([compact, ...grams])];
}

function scoreItem(item, tokens) {
  if (!tokens.length) return 0;
  let score = 0;
  const titleRaw = normalize(item.title);
  const titleCompact = compactNormalize(item.title);
  const jobRaw = normalize(item.job_name);
  const headlineRaw = normalize(item.headline);
  const summaryRaw = normalize(item.summary);
  const contentRaw = normalize(item.final_content);
  for (const token of tokens) {
    const compactToken = compactNormalize(token);
    score += countOccurrences(titleRaw, token) * 10;
    score += countOccurrences(titleCompact, compactToken) * 8;
    score += countOccurrences(jobRaw, token) * 6;
    score += countOccurrences(headlineRaw, token) * 4;
    score += countOccurrences(summaryRaw, token) * 3;
    score += countOccurrences(contentRaw, token) * 2;
  }
  return score;
}

function buildSnippet(item, tokens, fallback = '') {
  const source = stripMarkdown(item.final_content || item.summary || item.headline || fallback || '');
  const clean = cleanPreview(source);
  if (!clean) return fallback || '暂无内容';
  if (!tokens.length) return truncate(clean, 110);
  const lower = clean.toLowerCase();
  let firstIndex = -1;
  for (const token of tokens) {
    const idx = lower.indexOf(token.toLowerCase());
    if (idx !== -1 && (firstIndex === -1 || idx < firstIndex)) firstIndex = idx;
  }
  if (firstIndex === -1) return truncate(clean, 110);
  const start = Math.max(0, firstIndex - 40);
  const end = Math.min(clean.length, firstIndex + 120);
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

function cleanPreview(text) {
  return String(text || '').replace(/\s+/g, ' ').replace(/^#+\s*/g, '').trim();
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

function groupBy(items, fn) {
  return items.reduce((acc, item) => {
    const key = fn(item);
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
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

function compactNormalize(value) {
  return normalize(value).replace(/[\s\p{P}\p{S}]+/gu, '');
}

function isCjkToken(value) {
  return /[\u3400-\u9FFF\uF900-\uFAFF]/.test(String(value || ''));
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

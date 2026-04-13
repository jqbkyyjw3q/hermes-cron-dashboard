const data = window.DASHBOARD_DATA || { current: [], history: [], stats: { categories: {} }, today_headlines: [] };
const groupedJobsEl = document.getElementById('groupedJobs');
const filtersEl = document.getElementById('categoryFilters');
const searchInput = document.getElementById('searchInput');
const searchMetaEl = document.getElementById('searchMeta');
const searchResultsSectionEl = document.getElementById('searchResultsSection');
const searchResultsEl = document.getElementById('searchResults');
const detailDialog = document.getElementById('detailDialog');
const detailBody = document.getElementById('detailBody');
const todayHeadlinesEl = document.getElementById('todayHeadlines');
const historySectionEl = document.getElementById('historySection');

const currentItems = Array.isArray(data.current) ? data.current : [];
const historyItems = Array.isArray(data.history) ? data.history : [];
const allItems = [...currentItems, ...historyItems];

let activeCategory = '全部';
let query = '';

const categories = ['全部', ...Object.keys(data.stats.categories || {}).sort()];
const searchDocuments = new Map(allItems.map(item => [item.id, buildSearchDocument(item)]));

document.getElementById('totalJobs').textContent = data.stats.total_current_cards ?? currentItems.length;
document.getElementById('generatedAt').textContent = formatTime(data.generated_at);
renderStats();
renderTodayHeadlines();
renderFilters();

searchInput.addEventListener('input', (e) => {
  query = e.target.value.trim();
  renderAll();
});

document.getElementById('closeDialog').addEventListener('click', () => detailDialog.close());
detailDialog.addEventListener('click', (e) => { if (e.target === detailDialog) detailDialog.close(); });

renderAll();

function renderFilters() {
  filtersEl.innerHTML = categories.map(cat => `<button class="filter-btn ${cat === activeCategory ? 'active' : ''}" data-cat="${cat}">${cat}</button>`).join('');
  filtersEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-cat]');
    if (!btn) return;
    activeCategory = btn.dataset.cat;
    document.querySelectorAll('.filter-btn').forEach(el => el.classList.toggle('active', el.dataset.cat === activeCategory));
    renderAll();
  });
}

function renderAll() {
  const tokens = getQueryTokens(query);
  renderSearchMeta(tokens);
  renderSearchResults(tokens);
  renderCurrent(tokens);
  renderHistory(tokens);
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

function renderTodayHeadlines() {
  todayHeadlinesEl.innerHTML = (data.today_headlines || []).map(item => `
    <article class="headline-card" data-headline-title="${escapeHtml(item.title)}" data-headline-job="${escapeHtml(item.job_name || '')}">
      <div class="headline-top">
        <span class="badge ${badgeClass(item.category)}">${escapeHtml(item.category)}</span>
        <span class="headline-date">${escapeHtml(item.digest_date || '-')}</span>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="headline-main">${escapeHtml(item.headline)}</p>
      <p class="muted">来源：${escapeHtml(item.job_name || '-')}</p>
      <div class="actions"><button data-open-headline="${escapeHtml(item.title)}">查看详情</button></div>
    </article>
  `).join('');

  todayHeadlinesEl.querySelectorAll('[data-open-headline]').forEach(btn => {
    btn.addEventListener('click', () => {
      const title = btn.dataset.openHeadline;
      const item = currentItems.find(x => x.title === title) || historyItems.find(x => x.title === title);
      if (item) openDetail(item);
    });
  });
}

function renderSearchMeta(tokens) {
  if (!searchMetaEl) return;
  const categoryText = activeCategory === '全部' ? '全部类别' : `当前分类：${escapeHtml(activeCategory)}`;
  if (!tokens.length) {
    searchMetaEl.innerHTML = `<span>支持全文搜索标题、来源任务、摘要、正文和历史归档。</span><span>${categoryText}</span>`;
    return;
  }

  const resultCount = allItems.filter(item => matches(item, tokens)).length;
  searchMetaEl.innerHTML = `
    <span>全文搜索：<strong>${escapeHtml(query)}</strong></span>
    <span>${categoryText}</span>
    <span>命中 <strong>${resultCount}</strong> 条内容</span>
  `;
}

function renderSearchResults(tokens) {
  if (!searchResultsSectionEl || !searchResultsEl) return;
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
  bindDetailButtons(searchResultsEl, allItems);
}

function renderCurrent(tokens) {
  const filtered = currentItems.filter(item => matches(item, tokens));
  const groups = {};
  for (const item of filtered) (groups[item.category] ||= []).push(item);
  groupedJobsEl.innerHTML = Object.keys(groups).sort().map(category => `
    <section class="group">
      <div class="group-head">
        <h2>${escapeHtml(category)}</h2>
        <span>${groups[category].length} 条最新内容</span>
      </div>
      <div class="cards">
        ${groups[category].map(item => renderCard(item, tokens)).join('')}
      </div>
    </section>
  `).join('') || '<p class="empty">没有匹配结果。</p>';
  bindDetailButtons(groupedJobsEl, currentItems);
}

function renderHistory(tokens) {
  const filtered = historyItems.filter(item => matches(item, tokens));
  const byDate = {};
  for (const item of filtered) (byDate[item.digest_date || '未标记日期'] ||= []).push(item);
  historySectionEl.innerHTML = Object.keys(byDate).sort().reverse().slice(0, 30).map(date => `
    <section class="history-group">
      <div class="group-head">
        <h2>${escapeHtml(date)}</h2>
        <span>${byDate[date].length} 条历史内容</span>
      </div>
      <div class="cards history-cards">
        ${byDate[date].sort(sortByTimeDesc).map(item => renderHistoryCard(item, tokens)).join('')}
      </div>
    </section>
  `).join('') || '<p class="empty">暂无历史数据。</p>';
  bindDetailButtons(historySectionEl, historyItems);
}

function matches(item, tokens = []) {
  const hitCategory = activeCategory === '全部' || item.category === activeCategory;
  if (!hitCategory) return false;
  if (!tokens.length) return true;
  const doc = searchDocuments.get(item.id) || buildSearchDocument(item);
  return tokens.every(token => doc.includes(token));
}

function bindDetailButtons(root, source) {
  root.querySelectorAll('[data-item-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = source.find(x => x.id === btn.dataset.itemId);
      if (item) openDetail(item);
    });
  });
}

function renderCard(item, tokens = []) {
  const excerpt = buildSnippet(item, tokens, item.summary || item.headline || '暂无内容');
  return `
    <article class="job-card info-card">
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
        <div><dt>上次运行</dt><dd>${formatTime(item.last_run_at)}</dd></div>
        <div><dt>Cron</dt><dd>${escapeHtml(item.schedule || '-')}</dd></div>
        <div><dt>状态</dt><dd>${escapeHtml(item.last_status || '-')}</dd></div>
      </dl>
      <p class="excerpt content-excerpt">${highlightText(excerpt, tokens)}</p>
      <div class="actions"><button data-item-id="${item.id}">阅读全文</button></div>
    </article>
  `;
}

function renderHistoryCard(item, tokens = []) {
  const excerpt = buildSnippet(item, tokens, item.summary || item.headline || '暂无内容');
  return `
    <article class="job-card history-card">
      <div class="card-top">
        <div>
          <h3>${highlightText(item.title || item.job_name || item.id, tokens)}</h3>
          <p class="muted">${highlightText(item.job_name || '', tokens)}</p>
        </div>
        <span class="badge ${badgeClass(item.category)}">${escapeHtml(item.category)}</span>
      </div>
      <p class="headline-main compact">${highlightText(item.headline || '', tokens)}</p>
      <p class="excerpt content-excerpt">${highlightText(excerpt, tokens)}</p>
      <div class="actions"><button data-item-id="${item.id}">查看历史全文</button></div>
    </article>
  `;
}

function renderSearchCard(item, score, tokens) {
  const snippet = buildSnippet(item, tokens, item.summary || item.headline || item.final_content || '');
  return `
    <article class="job-card search-card">
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
      <div class="actions"><button data-item-id="${item.id}">打开全文</button></div>
    </article>
  `;
}

function openDetail(item) {
  const markdownHtml = renderMarkdown(item.final_content || '');
  const tokens = getQueryTokens(query);
  const searchHint = tokens.length
    ? `<div class="detail-search-hint"><span>当前搜索：</span><strong>${escapeHtml(query)}</strong><p>${highlightText(buildSnippet(item, tokens, item.summary || item.headline || item.final_content || ''), tokens)}</p></div>`
    : '';

  detailBody.innerHTML = `
    <h2>${escapeHtml(item.title || item.job_name || item.id)}</h2>
    <p class="detail-line"><strong>来源任务：</strong>${escapeHtml(item.job_name || '-')}</p>
    <p class="detail-line"><strong>分类：</strong>${escapeHtml(item.category)}</p>
    <p class="detail-line"><strong>内容日期：</strong>${escapeHtml(item.digest_date || '-')}</p>
    <p class="detail-line"><strong>上次运行：</strong>${formatTime(item.last_run_at || item.digest_created_at)}</p>
    <p class="detail-line"><strong>Cron：</strong>${escapeHtml(item.schedule || '-')}</p>
    ${searchHint}
    <div class="markdown-shell">
      <div class="markdown-body">${markdownHtml}</div>
    </div>
  `;
  detailDialog.showModal();
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
  const parts = normalized.split(/\s+/).filter(Boolean);
  return [...new Set(parts.length ? parts : [normalized])];
}

function scoreItem(item, tokens) {
  let score = 0;
  for (const token of tokens) {
    score += countOccurrences(normalize(item.title), token) * 8;
    score += countOccurrences(normalize(item.job_name), token) * 5;
    score += countOccurrences(normalize(item.headline), token) * 4;
    score += countOccurrences(normalize(item.summary), token) * 3;
    score += countOccurrences(normalize(item.category), token) * 2;
    score += countOccurrences(normalize(item.final_content), token);
  }
  return score || 1;
}

function buildSnippet(item, tokens, fallback = '') {
  const source = stripMarkdown(item.final_content || item.summary || item.headline || fallback || '');
  const clean = source.replace(/\s+/g, ' ').trim();
  if (!clean) return fallback || '暂无内容';
  if (!tokens.length) return truncate(clean, 140);

  const lower = clean.toLowerCase();
  let firstIndex = -1;
  for (const token of tokens) {
    const idx = lower.indexOf(token.toLowerCase());
    if (idx !== -1 && (firstIndex === -1 || idx < firstIndex)) firstIndex = idx;
  }
  if (firstIndex === -1) return truncate(clean, 140);

  const start = Math.max(0, firstIndex - 48);
  const end = Math.min(clean.length, firstIndex + 120);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < clean.length ? '…' : '';
  return `${prefix}${clean.slice(start, end).trim()}${suffix}`;
}

function highlightText(text, tokens = []) {
  let html = escapeHtml(text || '');
  for (const token of [...tokens].sort((a, b) => b.length - a.length)) {
    if (!token) continue;
    const escapedToken = escapeHtml(token);
    html = html.replace(new RegExp(escapeRegExp(escapedToken), 'gi'), match => `<mark>${match}</mark>`);
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

function formatTime(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString('zh-CN', { hour12: false });
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

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

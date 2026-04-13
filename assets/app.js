const data = window.DASHBOARD_DATA || { current: [], history: [], stats: { categories: {} }, today_headlines: [] };
const groupedJobsEl = document.getElementById('groupedJobs');
const filtersEl = document.getElementById('categoryFilters');
const searchInput = document.getElementById('searchInput');
const detailDialog = document.getElementById('detailDialog');
const detailBody = document.getElementById('detailBody');
const todayHeadlinesEl = document.getElementById('todayHeadlines');
const historySectionEl = document.getElementById('historySection');

document.getElementById('totalJobs').textContent = data.stats.total_current_cards ?? data.current.length;
document.getElementById('generatedAt').textContent = formatTime(data.generated_at);
renderStats();
renderTodayHeadlines();

let activeCategory = '全部';
let query = '';

const categories = ['全部', ...Object.keys(data.stats.categories || {}).sort()];
filtersEl.innerHTML = categories.map(cat => `<button class="filter-btn ${cat === activeCategory ? 'active' : ''}" data-cat="${cat}">${cat}</button>`).join('');
filtersEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-cat]');
  if (!btn) return;
  activeCategory = btn.dataset.cat;
  document.querySelectorAll('.filter-btn').forEach(el => el.classList.toggle('active', el.dataset.cat === activeCategory));
  renderAll();
});

searchInput.addEventListener('input', (e) => {
  query = e.target.value.trim().toLowerCase();
  renderAll();
});

document.getElementById('closeDialog').addEventListener('click', () => detailDialog.close());
detailDialog.addEventListener('click', (e) => { if (e.target === detailDialog) detailDialog.close(); });

renderAll();

function renderStats() {
  const stats = [
    ['今日内容卡片', data.current.length, 'ok'],
    ['历史条目', data.history.length, 'idle'],
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
  todayHeadlinesEl.innerHTML = data.today_headlines.map(item => `
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
      const item = data.current.find(x => x.title === title) || data.history.find(x => x.title === title);
      if (item) openDetail(item);
    });
  });
}

function renderAll() {
  renderCurrent();
  renderHistory();
}

function matches(item) {
  const hitCategory = activeCategory === '全部' || item.category === activeCategory;
  const haystack = [item.title, item.job_name, item.summary, item.final_content, item.headline].join(' ').toLowerCase();
  const hitQuery = !query || haystack.includes(query);
  return hitCategory && hitQuery;
}

function renderCurrent() {
  const filtered = data.current.filter(matches);
  const groups = {};
  for (const item of filtered) (groups[item.category] ||= []).push(item);
  groupedJobsEl.innerHTML = Object.keys(groups).sort().map(category => `
    <section class="group">
      <div class="group-head">
        <h2>${category}</h2>
        <span>${groups[category].length} 条最新内容</span>
      </div>
      <div class="cards">
        ${groups[category].map(renderCard).join('')}
      </div>
    </section>
  `).join('') || '<p class="empty">没有匹配结果。</p>';
  bindDetailButtons(groupedJobsEl, data.current);
}

function renderHistory() {
  const filtered = data.history.filter(matches);
  const byDate = {};
  for (const item of filtered) (byDate[item.digest_date || '未标记日期'] ||= []).push(item);
  historySectionEl.innerHTML = Object.keys(byDate).sort().reverse().slice(0, 30).map(date => `
    <section class="history-group">
      <div class="group-head">
        <h2>${escapeHtml(date)}</h2>
        <span>${byDate[date].length} 条历史内容</span>
      </div>
      <div class="cards history-cards">
        ${byDate[date].map(renderHistoryCard).join('')}
      </div>
    </section>
  `).join('') || '<p class="empty">暂无历史数据。</p>';
  bindDetailButtons(historySectionEl, data.history);
}

function bindDetailButtons(root, source) {
  root.querySelectorAll('[data-item-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = source.find(x => x.id === btn.dataset.itemId);
      if (item) openDetail(item);
    });
  });
}

function renderCard(item) {
  return `
    <article class="job-card info-card">
      <div class="card-top">
        <div>
          <p class="mini-label">来源任务</p>
          <h3>${escapeHtml(item.title || item.job_name || item.id)}</h3>
          <p class="muted">${escapeHtml(item.job_name || '')}</p>
        </div>
        <span class="badge ${badgeClass(item.category)}">${escapeHtml(item.category)}</span>
      </div>
      <p class="headline-main compact">${escapeHtml(item.headline || '')}</p>
      <dl class="meta-grid">
        <div><dt>内容日期</dt><dd>${escapeHtml(item.digest_date || '-')}</dd></div>
        <div><dt>上次运行</dt><dd>${formatTime(item.last_run_at)}</dd></div>
        <div><dt>Cron</dt><dd>${escapeHtml(item.schedule || '-')}</dd></div>
        <div><dt>状态</dt><dd>${escapeHtml(item.last_status || '-')}</dd></div>
      </dl>
      <p class="excerpt content-excerpt">${escapeHtml(item.summary || '暂无内容')}</p>
      <div class="actions"><button data-item-id="${item.id}">阅读全文</button></div>
    </article>
  `;
}

function renderHistoryCard(item) {
  return `
    <article class="job-card history-card">
      <div class="card-top">
        <div>
          <h3>${escapeHtml(item.title || item.job_name || item.id)}</h3>
          <p class="muted">${escapeHtml(item.job_name || '')}</p>
        </div>
        <span class="badge ${badgeClass(item.category)}">${escapeHtml(item.category)}</span>
      </div>
      <p class="headline-main compact">${escapeHtml(item.headline || '')}</p>
      <p class="excerpt content-excerpt">${escapeHtml(item.summary || '暂无内容')}</p>
      <div class="actions"><button data-item-id="${item.id}">查看历史全文</button></div>
    </article>
  `;
}

function openDetail(item) {
  const markdownHtml = renderMarkdown(item.final_content || '');
  detailBody.innerHTML = `
    <h2>${escapeHtml(item.title || item.job_name || item.id)}</h2>
    <p class="detail-line"><strong>来源任务：</strong>${escapeHtml(item.job_name || '-')}</p>
    <p class="detail-line"><strong>分类：</strong>${escapeHtml(item.category)}</p>
    <p class="detail-line"><strong>内容日期：</strong>${escapeHtml(item.digest_date || '-')}</p>
    <p class="detail-line"><strong>上次运行：</strong>${formatTime(item.last_run_at || item.digest_created_at)}</p>
    <p class="detail-line"><strong>Cron：</strong>${escapeHtml(item.schedule || '-')}</p>
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

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

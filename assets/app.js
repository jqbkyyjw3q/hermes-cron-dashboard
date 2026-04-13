const data = window.DASHBOARD_DATA || { jobs: [], stats: { categories: {}, statuses: {} } };
const groupedJobsEl = document.getElementById('groupedJobs');
const filtersEl = document.getElementById('categoryFilters');
const searchInput = document.getElementById('searchInput');
const detailDialog = document.getElementById('detailDialog');
const detailBody = document.getElementById('detailBody');

document.getElementById('totalJobs').textContent = data.stats.total_jobs ?? data.jobs.length;
document.getElementById('generatedAt').textContent = formatTime(data.generated_at);
renderStats();

let activeCategory = '全部';
let query = '';

const categories = ['全部', ...Object.keys(data.stats.categories || {}).sort()];
filtersEl.innerHTML = categories.map(cat => `<button class="filter-btn ${cat === activeCategory ? 'active' : ''}" data-cat="${cat}">${cat}</button>`).join('');
filtersEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-cat]');
  if (!btn) return;
  activeCategory = btn.dataset.cat;
  document.querySelectorAll('.filter-btn').forEach(el => el.classList.toggle('active', el.dataset.cat === activeCategory));
  renderJobs();
});

searchInput.addEventListener('input', (e) => {
  query = e.target.value.trim().toLowerCase();
  renderJobs();
});

document.getElementById('closeDialog').addEventListener('click', () => detailDialog.close());

detailDialog.addEventListener('click', (e) => {
  if (e.target === detailDialog) detailDialog.close();
});

renderJobs();

function renderStats() {
  const stats = [
    ['运行正常', data.stats.statuses?.ok || 0, 'ok'],
    ['异常/失败', (data.stats.statuses?.error || 0) + (data.stats.statuses?.failed || 0), 'bad'],
    ['未运行', data.stats.statuses?.['never-run'] || 0, 'idle'],
  ];
  document.getElementById('stats').innerHTML = stats.map(([label, value, cls]) => `
    <div class="stat-card ${cls}">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join('');
}

function renderJobs() {
  const filtered = data.jobs.filter(job => {
    const hitCategory = activeCategory === '全部' || job.category === activeCategory;
    const haystack = [job.name, job.prompt_preview, job.last_status, job.schedule].join(' ').toLowerCase();
    const hitQuery = !query || haystack.includes(query);
    return hitCategory && hitQuery;
  });

  const groups = {};
  for (const job of filtered) {
    (groups[job.category] ||= []).push(job);
  }

  groupedJobsEl.innerHTML = Object.keys(groups).sort().map(category => `
    <section class="group">
      <div class="group-head">
        <h2>${category}</h2>
        <span>${groups[category].length} 个任务</span>
      </div>
      <div class="cards">
        ${groups[category].map(renderCard).join('')}
      </div>
    </section>
  `).join('') || '<p class="empty">没有匹配结果。</p>';

  groupedJobsEl.querySelectorAll('[data-job-id]').forEach(btn => {
    btn.addEventListener('click', () => openDetail(btn.dataset.jobId));
  });
}

function renderCard(job) {
  return `
    <article class="job-card">
      <div class="card-top">
        <div>
          <h3>${escapeHtml(job.name || job.id)}</h3>
          <p class="muted">${escapeHtml(job.schedule || '未设置')}</p>
        </div>
        <span class="badge ${badgeClass(job.last_status)}">${escapeHtml(job.last_status || 'unknown')}</span>
      </div>
      <dl class="meta-grid">
        <div><dt>投递</dt><dd>${escapeHtml(job.deliver || '-')}</dd></div>
        <div><dt>下次运行</dt><dd>${formatTime(job.next_run_at)}</dd></div>
        <div><dt>上次运行</dt><dd>${formatTime(job.last_run_at)}</dd></div>
        <div><dt>状态</dt><dd>${job.enabled ? '启用' : '停用'} / ${escapeHtml(job.state || '-')}</dd></div>
      </dl>
      <p class="excerpt">${escapeHtml(job.latest_excerpt || '暂无输出')}</p>
      <div class="actions">
        <button data-job-id="${job.id}">查看详情</button>
      </div>
    </article>
  `;
}

function openDetail(jobId) {
  const job = data.jobs.find(x => x.id === jobId);
  if (!job) return;
  detailBody.innerHTML = `
    <h2>${escapeHtml(job.name || job.id)}</h2>
    <p class="detail-line"><strong>分类：</strong>${escapeHtml(job.category)}</p>
    <p class="detail-line"><strong>Cron：</strong>${escapeHtml(job.schedule || '-')}</p>
    <p class="detail-line"><strong>投递：</strong>${escapeHtml(job.deliver || '-')}</p>
    <p class="detail-line"><strong>任务说明预览：</strong></p>
    <pre>${escapeHtml(job.prompt_preview || '')}</pre>
    <p class="detail-line"><strong>最近一次结果 JSON：</strong></p>
    <pre>${escapeHtml(JSON.stringify(job.response_json || {}, null, 2))}</pre>
    <p class="detail-line"><strong>最近一次输出摘要：</strong></p>
    <pre>${escapeHtml(job.latest_content || '')}</pre>
  `;
  detailDialog.showModal();
}

function formatTime(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString('zh-CN', { hour12: false });
}

function badgeClass(status) {
  if (status === 'ok') return 'ok';
  if (status === 'error' || status === 'failed') return 'bad';
  return 'idle';
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

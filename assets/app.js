const data = window.DASHBOARD_DATA || { jobs: [], stats: { categories: {} } };
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
    ['信息卡片', data.jobs.length, 'ok'],
    ['分类数', Object.keys(data.stats.categories || {}).length, 'idle'],
    ['最近更新时间', formatTime(data.generated_at), 'meta'],
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
    const haystack = [job.title, job.job_name, job.summary, job.final_content].join(' ').toLowerCase();
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
        <span>${groups[category].length} 条内容</span>
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
    <article class="job-card info-card">
      <div class="card-top">
        <div>
          <p class="mini-label">来源任务</p>
          <h3>${escapeHtml(job.title || job.job_name || job.id)}</h3>
          <p class="muted">${escapeHtml(job.job_name || '')}</p>
        </div>
        <span class="badge ${badgeClass(job.category)}">${escapeHtml(job.category)}</span>
      </div>
      <dl class="meta-grid">
        <div><dt>内容日期</dt><dd>${escapeHtml(job.digest_date || '-')}</dd></div>
        <div><dt>上次运行</dt><dd>${formatTime(job.last_run_at)}</dd></div>
        <div><dt>Cron</dt><dd>${escapeHtml(job.schedule || '-')}</dd></div>
        <div><dt>状态</dt><dd>${escapeHtml(job.last_status || '-')}</dd></div>
      </dl>
      <p class="excerpt content-excerpt">${escapeHtml(job.summary || '暂无内容')}</p>
      <div class="actions">
        <button data-job-id="${job.id}">阅读全文</button>
      </div>
    </article>
  `;
}

function openDetail(jobId) {
  const job = data.jobs.find(x => x.id === jobId);
  if (!job) return;
  detailBody.innerHTML = `
    <h2>${escapeHtml(job.title || job.job_name || job.id)}</h2>
    <p class="detail-line"><strong>来源任务：</strong>${escapeHtml(job.job_name || '-')}</p>
    <p class="detail-line"><strong>分类：</strong>${escapeHtml(job.category)}</p>
    <p class="detail-line"><strong>内容日期：</strong>${escapeHtml(job.digest_date || '-')}</p>
    <p class="detail-line"><strong>上次运行：</strong>${formatTime(job.last_run_at)}</p>
    <p class="detail-line"><strong>Cron：</strong>${escapeHtml(job.schedule || '-')}</p>
    <p class="detail-line"><strong>最终内容：</strong></p>
    <pre>${escapeHtml(job.final_content || '')}</pre>
  `;
  detailDialog.showModal();
}

function formatTime(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString('zh-CN', { hour12: false });
}

function badgeClass(category) {
  if (category.includes('AI')) return 'ok';
  if (category.includes('财经')) return 'bad';
  if (category.includes('监控')) return 'idle';
  return 'meta';
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

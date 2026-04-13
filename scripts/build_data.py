import json
import re
import sqlite3
from pathlib import Path
from datetime import datetime

HERMES_HOME = Path('/root/.hermes')
JOBS_PATH = HERMES_HOME / 'cron' / 'jobs.json'
OUTPUT_ROOT = HERMES_HOME / 'cron' / 'output'
DIGEST_DB = HERMES_HOME / 'data' / 'news-archive' / 'data' / 'digests.db'
OUT_PATH = Path(__file__).resolve().parents[1] / 'assets' / 'dashboard-data.js'


def read_jobs():
    return json.loads(JOBS_PATH.read_text())['jobs']


def category_for(name: str) -> str:
    lower = (name or '').lower()
    if re.search(r'\bai\b', lower) or re.search(r'\bhn\b', lower):
        return 'AI / 技术'
    if any(k in lower for k in ['trump', '财经', 'bloomberg', 'ft']):
        return '财经 / 国际'
    if any(k in lower for k in ['早报', 'news briefing', 'morning latest news briefing', 'weekly', '周报']):
        return '综合简报'
    if any(k in lower for k in ['雷达', '情报']):
        return '监控 / 雷达'
    return '其他'


def normalize_name(name: str) -> str:
    name = (name or '').strip()
    name = re.sub(r'\s*\[hermes\]\s*$', '', name, flags=re.I)
    return name.strip()


def schedule_text(job: dict) -> str:
    sched = job.get('schedule') or {}
    if isinstance(sched, dict):
        return sched.get('display') or job.get('schedule_display') or ''
    return job.get('schedule_display') or str(sched)


def sanitize_text(text: str) -> str:
    text = text or ''
    text = re.sub(r'/root/[^\s)\]]+', '[local-path]', text)
    text = re.sub(r'\[SYSTEM:.*?\]', '[SYSTEM INSTRUCTIONS HIDDEN]', text, flags=re.S)
    return text.strip()


def collapse_text(text: str) -> str:
    return re.sub(r'\s+', ' ', sanitize_text(text)).strip()


def excerpt(text: str, n=260):
    text = collapse_text(text)
    return text[:n] + ('…' if len(text) > n else '')


def first_meaningful_line(text: str) -> str:
    for line in sanitize_text(text).splitlines():
        line = line.strip().lstrip('#').strip()
        if len(line) >= 8:
            return line
    return excerpt(text, 120)


def load_latest_output(job_id: str):
    job_dir = OUTPUT_ROOT / job_id
    if not job_dir.exists():
        return {'latest_file': None, 'content': '', 'response_json': None}
    files = sorted(job_dir.glob('*.md'))
    if not files:
        return {'latest_file': None, 'content': '', 'response_json': None}
    latest = files[-1]
    text = latest.read_text(encoding='utf-8', errors='ignore')
    response_json = None
    m = re.search(r'## Response\n\n(.*)\Z', text, re.S)
    if m:
        block = m.group(1).strip()
        if block.startswith('{') and block.endswith('}'):
            try:
                response_json = json.loads(block)
            except Exception:
                response_json = None
    return {'latest_file': str(latest), 'content': text, 'response_json': response_json}


def body_from_response(response_json):
    if not isinstance(response_json, dict):
        return ''
    body_file = response_json.get('body_file')
    if body_file:
        p = Path(body_file)
        if p.exists():
            try:
                return p.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                return ''
    return ''


def read_all_digests():
    rows = []
    if not DIGEST_DB.exists():
        return rows
    conn = sqlite3.connect(str(DIGEST_DB))
    cur = conn.cursor()
    for job_name, subject, digest_date, created_at, content, md_path in cur.execute(
        """
        SELECT job_name, subject, digest_date, created_at, content, md_path
        FROM digests
        ORDER BY digest_date DESC, created_at DESC
        """
    ).fetchall():
        rows.append({
            'job_name': job_name,
            'job_key': normalize_name(job_name),
            'title': subject or job_name,
            'category': category_for(job_name),
            'digest_date': digest_date,
            'created_at': created_at,
            'content': content or '',
            'md_path': md_path,
            'summary': excerpt(content or ''),
            'headline': first_meaningful_line(content or subject or job_name),
        })
    conn.close()
    return rows


jobs = read_jobs()
job_map = {normalize_name(job.get('name')): job for job in jobs}
all_digests = read_all_digests()
latest_by_job = {}
for item in all_digests:
    latest_by_job.setdefault(item['job_key'], item)

current_items = []
cat_counter = {}
for job_key, digest in latest_by_job.items():
    job = job_map.get(job_key, {})
    cat = digest['category']
    cat_counter[cat] = cat_counter.get(cat, 0) + 1
    out = load_latest_output(job.get('id', '')) if job.get('id') else {'latest_file': None, 'content': '', 'response_json': None}
    response = out['response_json'] or {}
    final_content = digest['content'] or body_from_response(response) or out['content']
    current_items.append({
        'id': job.get('id') or f"history::{job_key}",
        'job_name': job.get('name') or digest['job_name'],
        'title': digest['title'],
        'headline': first_meaningful_line(final_content),
        'category': cat,
        'schedule': schedule_text(job) if job else '',
        'deliver': job.get('deliver') if job else '',
        'enabled': job.get('enabled') if job else None,
        'state': job.get('state') if job else '',
        'last_status': job.get('last_status') if job else '',
        'next_run_at': job.get('next_run_at') if job else '',
        'last_run_at': job.get('last_run_at') if job else digest['created_at'],
        'digest_date': digest['digest_date'],
        'digest_created_at': digest['created_at'],
        'latest_output_file': out['latest_file'],
        'latest_digest_file': digest['md_path'],
        'summary': excerpt(final_content),
        'final_content': sanitize_text(final_content),
        'response_json': response,
    })

current_items.sort(key=lambda x: (x['category'], x['job_name'] or ''))

today = max((item['digest_date'] for item in current_items if item.get('digest_date')), default='')
today_items = [item for item in current_items if item.get('digest_date') == today] or current_items

today_headlines = []
for item in today_items:
    today_headlines.append({
        'title': item['title'],
        'category': item['category'],
        'job_name': item['job_name'],
        'headline': item['headline'],
        'summary': item['summary'],
        'digest_date': item['digest_date'],
    })

history_items = []
for idx, digest in enumerate(all_digests, 1):
    job = job_map.get(digest['job_key'], {})
    history_items.append({
        'id': f"hist-{idx}",
        'job_name': job.get('name') or digest['job_name'],
        'title': digest['title'],
        'headline': digest['headline'],
        'category': digest['category'],
        'schedule': schedule_text(job) if job else '',
        'last_run_at': job.get('last_run_at') if job else digest['created_at'],
        'digest_date': digest['digest_date'],
        'digest_created_at': digest['created_at'],
        'summary': digest['summary'],
        'final_content': sanitize_text(digest['content']),
        'latest_digest_file': digest['md_path'],
    })

payload = {
    'generated_at': datetime.now().isoformat(),
    'stats': {
        'total_current_cards': len(current_items),
        'total_history_cards': len(history_items),
        'categories': cat_counter,
        'today_date': today,
    },
    'today_headlines': today_headlines,
    'current': current_items,
    'history': history_items,
}
OUT_PATH.write_text('window.DASHBOARD_DATA = ' + json.dumps(payload, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
print(f'Wrote {OUT_PATH}')

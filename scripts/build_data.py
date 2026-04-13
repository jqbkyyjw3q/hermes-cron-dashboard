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


def excerpt(text: str, n=260):
    text = re.sub(r'\s+', ' ', sanitize_text(text)).strip()
    return text[:n] + ('…' if len(text) > n else '')


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


def latest_digest_map():
    result = {}
    if not DIGEST_DB.exists():
        return result
    conn = sqlite3.connect(str(DIGEST_DB))
    cur = conn.cursor()
    rows = cur.execute(
        """
        SELECT d.job_name, d.subject, d.digest_date, d.created_at, d.content, d.md_path
        FROM digests d
        INNER JOIN (
            SELECT job_name, MAX(created_at) AS max_created_at
            FROM digests
            GROUP BY job_name
        ) latest
        ON d.job_name = latest.job_name AND d.created_at = latest.max_created_at
        """
    ).fetchall()
    conn.close()
    for job_name, subject, digest_date, created_at, content, md_path in rows:
        result[normalize_name(job_name)] = {
            'subject': subject,
            'digest_date': digest_date,
            'created_at': created_at,
            'content': content or '',
            'md_path': md_path,
        }
    return result


jobs = read_jobs()
digests = latest_digest_map()
items = []
cat_counter = {}
for job in jobs:
    cat = category_for(job.get('name', ''))
    cat_counter[cat] = cat_counter.get(cat, 0) + 1
    out = load_latest_output(job['id'])
    response = out['response_json'] or {}
    digest = digests.get(normalize_name(job.get('name'))) or {}
    final_content = digest.get('content') or body_from_response(response) or out['content']
    title = digest.get('subject') or job.get('name')
    items.append({
        'id': job['id'],
        'job_name': job.get('name'),
        'title': title,
        'category': cat,
        'schedule': schedule_text(job),
        'deliver': job.get('deliver'),
        'enabled': job.get('enabled'),
        'state': job.get('state'),
        'last_status': job.get('last_status') or 'never-run',
        'next_run_at': job.get('next_run_at'),
        'last_run_at': job.get('last_run_at'),
        'digest_date': digest.get('digest_date'),
        'digest_created_at': digest.get('created_at'),
        'latest_output_file': out['latest_file'],
        'latest_digest_file': digest.get('md_path'),
        'summary': excerpt(final_content),
        'final_content': sanitize_text(final_content),
        'response_json': response,
    })

items.sort(key=lambda x: (x['category'], x['job_name'] or ''))
payload = {
    'generated_at': datetime.now().isoformat(),
    'stats': {
        'total_jobs': len(items),
        'categories': cat_counter,
    },
    'jobs': items,
}
OUT_PATH.write_text('window.DASHBOARD_DATA = ' + json.dumps(payload, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
print(f'Wrote {OUT_PATH}')

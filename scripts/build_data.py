import json
import re
from pathlib import Path
from datetime import datetime

HERMES_HOME = Path('/root/.hermes')
JOBS_PATH = HERMES_HOME / 'cron' / 'jobs.json'
OUTPUT_ROOT = HERMES_HOME / 'cron' / 'output'
OUT_PATH = Path(__file__).resolve().parents[1] / 'assets' / 'dashboard-data.js'


def read_jobs():
    return json.loads(JOBS_PATH.read_text())['jobs']


def category_for(name: str) -> str:
    lower = name.lower()
    if re.search(r'\bai\b', lower) or re.search(r'\bhn\b', lower):
        return 'AI / 技术'
    if any(k in lower for k in ['trump', '财经', 'bloomberg', 'ft']):
        return '财经 / 国际'
    if any(k in lower for k in ['早报', 'news briefing', 'morning latest news briefing', 'weekly', '周报']):
        return '综合简报'
    if any(k in lower for k in ['雷达', '情报']):
        return '监控 / 雷达'
    return '其他'


def schedule_text(job: dict) -> str:
    sched = job.get('schedule') or {}
    if isinstance(sched, dict):
        return sched.get('display') or job.get('schedule_display') or ''
    return job.get('schedule_display') or str(sched)


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


def excerpt(text: str, n=220):
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:n] + ('…' if len(text) > n else '')


def sanitize_text(text: str) -> str:
    text = text or ''
    text = re.sub(r'/root/[^\s)\]]+', '[local-path]', text)
    text = re.sub(r'\[SYSTEM:.*?\]', '[SYSTEM INSTRUCTIONS HIDDEN]', text, flags=re.S)
    return text.strip()


jobs = read_jobs()
items = []
status_counter = {}
cat_counter = {}
for job in jobs:
    out = load_latest_output(job['id'])
    cat = category_for(job.get('name', ''))
    cat_counter[cat] = cat_counter.get(cat, 0) + 1
    status = job.get('last_status') or 'never-run'
    status_counter[status] = status_counter.get(status, 0) + 1
    response = out['response_json'] or {}
    prompt_preview = sanitize_text((job.get('prompt') or '')[:240])
    latest_content = sanitize_text(out['content'])
    items.append({
        'id': job['id'],
        'name': job.get('name'),
        'category': cat,
        'prompt_preview': prompt_preview,
        'schedule': schedule_text(job),
        'deliver': job.get('deliver'),
        'enabled': job.get('enabled'),
        'state': job.get('state'),
        'last_status': status,
        'last_error': job.get('last_error'),
        'last_delivery_error': job.get('last_delivery_error'),
        'next_run_at': job.get('next_run_at'),
        'last_run_at': job.get('last_run_at'),
        'latest_output_file': out['latest_file'],
        'latest_excerpt': excerpt(latest_content),
        'latest_content': latest_content,
        'response_json': response,
    })

items.sort(key=lambda x: (x['category'], x['name'] or ''))
payload = {
    'generated_at': datetime.now().isoformat(),
    'source': str(JOBS_PATH),
    'stats': {
        'total_jobs': len(items),
        'categories': cat_counter,
        'statuses': status_counter,
    },
    'jobs': items,
}
OUT_PATH.write_text('window.DASHBOARD_DATA = ' + json.dumps(payload, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
print(f'Wrote {OUT_PATH}')

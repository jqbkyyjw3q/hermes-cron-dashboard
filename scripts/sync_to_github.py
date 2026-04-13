import json
import subprocess
from datetime import datetime
from pathlib import Path

REPO = Path('/root/projects/hermes-cron-dashboard')
TRACKED_SYNC_FILES = ['assets/dashboard-data.js']


def run(cmd):
    proc = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True)
    return {
        'cmd': cmd,
        'code': proc.returncode,
        'stdout': (proc.stdout or '').strip(),
        'stderr': (proc.stderr or '').strip(),
    }


build = run(['python3', 'scripts/build_data.py'])
if build['code'] != 0:
    print(json.dumps({'ok': False, 'stage': 'build', 'build': build}, ensure_ascii=False))
    raise SystemExit(1)

status = run(['git', 'status', '--porcelain', *TRACKED_SYNC_FILES])
if status['code'] != 0:
    print(json.dumps({'ok': False, 'stage': 'status', 'status': status}, ensure_ascii=False))
    raise SystemExit(1)

changed = [line for line in status['stdout'].splitlines() if line.strip()]
result = {
    'ok': True,
    'built_at': datetime.now().isoformat(),
    'build': build,
    'changed_files': changed,
    'committed': False,
    'pushed': False,
}

if not changed:
    print(json.dumps(result, ensure_ascii=False))
    raise SystemExit(0)

fetch = run(['git', 'fetch', 'origin'])
if fetch['code'] != 0:
    print(json.dumps({'ok': False, 'stage': 'fetch', 'result': result, 'fetch': fetch}, ensure_ascii=False))
    raise SystemExit(1)

add = run(['git', 'add', *TRACKED_SYNC_FILES])
if add['code'] != 0:
    print(json.dumps({'ok': False, 'stage': 'add', 'result': result, 'add': add}, ensure_ascii=False))
    raise SystemExit(1)

commit = run(['git', 'commit', '-m', 'chore: sync dashboard data'])
if commit['code'] != 0:
    print(json.dumps({'ok': False, 'stage': 'commit', 'result': result, 'commit': commit}, ensure_ascii=False))
    raise SystemExit(1)
result['committed'] = True
result['commit'] = commit

rebase = run(['git', 'pull', '--rebase', 'origin', 'main'])
if rebase['code'] != 0:
    print(json.dumps({'ok': False, 'stage': 'rebase', 'result': result, 'rebase': rebase}, ensure_ascii=False))
    raise SystemExit(1)
result['rebase'] = rebase

push = run(['git', 'push', 'origin', 'main'])
if push['code'] != 0:
    print(json.dumps({'ok': False, 'stage': 'push', 'result': result, 'push': push}, ensure_ascii=False))
    raise SystemExit(1)
result['pushed'] = True
result['push'] = push

print(json.dumps(result, ensure_ascii=False))

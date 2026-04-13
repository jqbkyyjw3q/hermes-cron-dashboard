# Hermes Cron Dashboard

Static dashboard for daily cron jobs managed by Hermes.

## Local refresh

```bash
python3 scripts/build_data.py
```

This reads local cron metadata from `/root/.hermes/cron/jobs.json` and `/root/.hermes/cron/output/`, then regenerates `assets/dashboard-data.js`.

## Sync to GitHub

```bash
python3 scripts/sync_to_github.py
# or
bash scripts/manual_sync.sh
```

This rebuilds `assets/dashboard-data.js`, commits that file only when data changed, rebases onto `origin/main`, and pushes to GitHub so Pages can redeploy.

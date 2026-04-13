# Hermes Cron Dashboard

Static dashboard for daily cron jobs managed by Hermes.

## Local refresh

```bash
python3 scripts/build_data.py
```

This reads local cron metadata from `/root/.hermes/cron/jobs.json` and `/root/.hermes/cron/output/`, then regenerates `assets/dashboard-data.js`.

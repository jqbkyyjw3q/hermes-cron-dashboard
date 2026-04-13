#!/usr/bin/env bash
set -euo pipefail
cd /root/projects/hermes-cron-dashboard
python3 scripts/sync_to_github.py

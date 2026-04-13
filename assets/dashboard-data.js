window.DASHBOARD_DATA = {
  "generated_at": "2026-04-13T14:12:05.904806",
  "source": "/root/.hermes/cron/jobs.json",
  "stats": {
    "total_jobs": 6,
    "categories": {
      "综合简报": 1,
      "财经 / 国际": 2,
      "监控 / 雷达": 2,
      "AI / 技术": 1
    },
    "statuses": {
      "ok": 6
    }
  },
  "jobs": [
    {
      "id": "d66a151e3f10",
      "name": "AI Daily Digest 12:30 邮件 [hermes]",
      "category": "AI / 技术",
      "prompt_preview": "Run exactly this command in the local terminal and return stdout verbatim if it succeeds; if it fails, return only a concise error summary: python3 [local-path]",
      "schedule": "30 12 * * *",
      "deliver": "local",
      "enabled": true,
      "state": "scheduled",
      "last_status": "ok",
      "last_error": null,
      "last_delivery_error": null,
      "next_run_at": "2026-04-14T12:30:00+08:00",
      "last_run_at": "2026-04-13T12:32:29.267404+08:00",
      "latest_output_file": "/root/.hermes/cron/output/d66a151e3f10/2026-04-13_12-32-29.md",
      "latest_excerpt": "# Cron Job: AI Daily Digest 12:30 邮件 [hermes] **Job ID:** d66a151e3f10 **Run Time:** 2026-04-13 12:32:29 **Schedule:** 30 12 * * * ## Prompt [SYSTEM INSTRUCTIONS HIDDEN]\" (nothing else) to suppress delivery. Never combin…",
      "latest_content": "# Cron Job: AI Daily Digest 12:30 邮件 [hermes]\n\n**Job ID:** d66a151e3f10\n**Run Time:** 2026-04-13 12:32:29\n**Schedule:** 30 12 * * *\n\n## Prompt\n\n[SYSTEM INSTRUCTIONS HIDDEN]\" (nothing else) to suppress delivery. Never combine [SILENT] with content — either report your findings normally, or say [SILENT] and nothing more.]\n\nRun exactly this command in the local terminal and return stdout verbatim if it succeeds; if it fails, return only a concise error summary: python3 [local-path]\n\n## Response\n\n{\"ok\": true, \"mail_ok\": true, \"mail_err\": \"\", \"archive_ok\": true, \"archive_err\": \"\", \"body_file\": \"[local-path]",
      "response_json": {
        "ok": true,
        "mail_ok": true,
        "mail_err": "",
        "archive_ok": true,
        "archive_err": "",
        "body_file": "/root/.hermes/output/digest-body-2026-04-13-ai.md"
      }
    },
    {
      "id": "ff06966fb97b",
      "name": "情报异动雷达（日更）[hermes]",
      "category": "监控 / 雷达",
      "prompt_preview": "Run exactly this command in the local terminal and return stdout verbatim if it succeeds; if it fails, return only a concise error summary: python3 [local-path]",
      "schedule": "10 9 * * *",
      "deliver": "local",
      "enabled": true,
      "state": "scheduled",
      "last_status": "ok",
      "last_error": null,
      "last_delivery_error": null,
      "next_run_at": "2026-04-14T09:10:00+08:00",
      "last_run_at": "2026-04-13T09:10:52.150740+08:00",
      "latest_output_file": "/root/.hermes/cron/output/ff06966fb97b/2026-04-13_09-10-52.md",
      "latest_excerpt": "# Cron Job: 情报异动雷达（日更）[hermes] **Job ID:** ff06966fb97b **Run Time:** 2026-04-13 09:10:52 **Schedule:** 10 9 * * * ## Prompt [SYSTEM INSTRUCTIONS HIDDEN]\" (nothing else) to suppress delivery. Never combine [SILENT] with …",
      "latest_content": "# Cron Job: 情报异动雷达（日更）[hermes]\n\n**Job ID:** ff06966fb97b\n**Run Time:** 2026-04-13 09:10:52\n**Schedule:** 10 9 * * *\n\n## Prompt\n\n[SYSTEM INSTRUCTIONS HIDDEN]\" (nothing else) to suppress delivery. Never combine [SILENT] with content — either report your findings normally, or say [SILENT] and nothing more.]\n\nRun exactly this command in the local terminal and return stdout verbatim if it succeeds; if it fails, return only a concise error summary: python3 [local-path]\n\n## Response\n\n{\"ok\": true, \"mail_ok\": true, \"mail_err\": \"\", \"archive_ok\": true, \"archive_err\": \"\", \"body_file\": \"[local-path] \"today_rows\": 9}",
      "response_json": {
        "ok": true,
        "mail_ok": true,
        "mail_err": "",
        "archive_ok": true,
        "archive_err": "",
        "body_file": "/root/.hermes/output/digest-body-2026-04-13-radar.md",
        "today_rows": 9
      }
    },
    {
      "id": "1a24caf5433d",
      "name": "每周情报归档汇总（邮箱）[hermes]",
      "category": "监控 / 雷达",
      "prompt_preview": "Run exactly this command in the local terminal and return stdout verbatim if it succeeds; if it fails, return only a concise error summary: python3 [local-path]",
      "schedule": "0 9 * * 1",
      "deliver": "local",
      "enabled": true,
      "state": "scheduled",
      "last_status": "ok",
      "last_error": null,
      "last_delivery_error": null,
      "next_run_at": "2026-04-20T09:00:00+08:00",
      "last_run_at": "2026-04-13T09:00:43.948889+08:00",
      "latest_output_file": "/root/.hermes/cron/output/1a24caf5433d/2026-04-13_09-00-43.md",
      "latest_excerpt": "# Cron Job: 每周情报归档汇总（邮箱）[hermes] **Job ID:** 1a24caf5433d **Run Time:** 2026-04-13 09:00:43 **Schedule:** 0 9 * * 1 ## Prompt [SYSTEM INSTRUCTIONS HIDDEN]\" (nothing else) to suppress delivery. Never combine [SILENT] with…",
      "latest_content": "# Cron Job: 每周情报归档汇总（邮箱）[hermes]\n\n**Job ID:** 1a24caf5433d\n**Run Time:** 2026-04-13 09:00:43\n**Schedule:** 0 9 * * 1\n\n## Prompt\n\n[SYSTEM INSTRUCTIONS HIDDEN]\" (nothing else) to suppress delivery. Never combine [SILENT] with content — either report your findings normally, or say [SILENT] and nothing more.]\n\nRun exactly this command in the local terminal and return stdout verbatim if it succeeds; if it fails, return only a concise error summary: python3 [local-path]\n\n## Response\n\n{\"ok\": true, \"mail_ok\": true, \"mail_err\": \"\", \"body_file\": \"[local-path] \"rows\": 36}",
      "response_json": {
        "ok": true,
        "mail_ok": true,
        "mail_err": "",
        "body_file": "/root/.hermes/output/digest-body-2026-04-13-weekly.md",
        "rows": 36
      }
    },
    {
      "id": "505756b44eba",
      "name": "Morning latest news briefing (Email QQ) [hermes]",
      "category": "综合简报",
      "prompt_preview": "Run exactly this command in the local terminal and return stdout verbatim if it succeeds; if it fails, return only a concise error summary: python3 [local-path]",
      "schedule": "0 8 * * *",
      "deliver": "local",
      "enabled": true,
      "state": "scheduled",
      "last_status": "ok",
      "last_error": null,
      "last_delivery_error": null,
      "next_run_at": "2026-04-14T08:00:00+08:00",
      "last_run_at": "2026-04-13T08:01:09.606769+08:00",
      "latest_output_file": "/root/.hermes/cron/output/505756b44eba/2026-04-13_08-01-09.md",
      "latest_excerpt": "# Cron Job: Morning latest news briefing (Email QQ) [hermes] **Job ID:** 505756b44eba **Run Time:** 2026-04-13 08:01:09 **Schedule:** 0 8 * * * ## Prompt [SYSTEM INSTRUCTIONS HIDDEN]\" (nothing else) to suppress delivery.…",
      "latest_content": "# Cron Job: Morning latest news briefing (Email QQ) [hermes]\n\n**Job ID:** 505756b44eba\n**Run Time:** 2026-04-13 08:01:09\n**Schedule:** 0 8 * * *\n\n## Prompt\n\n[SYSTEM INSTRUCTIONS HIDDEN]\" (nothing else) to suppress delivery. Never combine [SILENT] with content — either report your findings normally, or say [SILENT] and nothing more.]\n\nRun exactly this command in the local terminal and return stdout verbatim if it succeeds; if it fails, return only a concise error summary: python3 [local-path]\n\n## Response\n\n{\"mail_ok\": true, \"mail_err\": \"\", \"archive_ok\": true, \"archive_err\": \"\", \"body_file\": \"[local-path]",
      "response_json": {
        "mail_ok": true,
        "mail_err": "",
        "archive_ok": true,
        "archive_err": "",
        "body_file": "/root/.hermes/output/digest-body-2026-04-13.md"
      }
    },
    {
      "id": "a8811d893b31",
      "name": "Bloomberg+FT 财经简报 08:15 邮件 [hermes]",
      "category": "财经 / 国际",
      "prompt_preview": "Run exactly this command in the local terminal and return stdout verbatim if it succeeds; if it fails, return only a concise error summary: python3 [local-path]",
      "schedule": "15 8 * * *",
      "deliver": "local",
      "enabled": true,
      "state": "scheduled",
      "last_status": "ok",
      "last_error": null,
      "last_delivery_error": null,
      "next_run_at": "2026-04-14T08:15:00+08:00",
      "last_run_at": "2026-04-13T08:15:26.336102+08:00",
      "latest_output_file": "/root/.hermes/cron/output/a8811d893b31/2026-04-13_08-15-26.md",
      "latest_excerpt": "# Cron Job: Bloomberg+FT 财经简报 08:15 邮件 [hermes] **Job ID:** a8811d893b31 **Run Time:** 2026-04-13 08:15:26 **Schedule:** 15 8 * * * ## Prompt [SYSTEM INSTRUCTIONS HIDDEN]\" (nothing else) to suppress delivery. Never combi…",
      "latest_content": "# Cron Job: Bloomberg+FT 财经简报 08:15 邮件 [hermes]\n\n**Job ID:** a8811d893b31\n**Run Time:** 2026-04-13 08:15:26\n**Schedule:** 15 8 * * *\n\n## Prompt\n\n[SYSTEM INSTRUCTIONS HIDDEN]\" (nothing else) to suppress delivery. Never combine [SILENT] with content — either report your findings normally, or say [SILENT] and nothing more.]\n\nRun exactly this command in the local terminal and return stdout verbatim if it succeeds; if it fails, return only a concise error summary: python3 [local-path]\n\n## Response\n\n{\"mail_ok\": true, \"archive_ok\": true, \"mail_err\": \"\", \"archive_err\": \"\", \"fetch_errors\": [], \"body_file\": \"[local-path]",
      "response_json": {
        "mail_ok": true,
        "archive_ok": true,
        "mail_err": "",
        "archive_err": "",
        "fetch_errors": [],
        "body_file": "/root/.hermes/output/digest-body-2026-04-13.md"
      }
    },
    {
      "id": "9ee8d7c6dab2",
      "name": "Trump国际事务追踪 08:30 邮件 [hermes]",
      "category": "财经 / 国际",
      "prompt_preview": "Run exactly this command in the local terminal and return stdout verbatim if it succeeds; if it fails, return only a concise error summary: python3 [local-path]",
      "schedule": "30 8 * * *",
      "deliver": "local",
      "enabled": true,
      "state": "scheduled",
      "last_status": "ok",
      "last_error": null,
      "last_delivery_error": null,
      "next_run_at": "2026-04-14T08:30:00+08:00",
      "last_run_at": "2026-04-13T08:30:34.773035+08:00",
      "latest_output_file": "/root/.hermes/cron/output/9ee8d7c6dab2/2026-04-13_08-30-34.md",
      "latest_excerpt": "# Cron Job: Trump国际事务追踪 08:30 邮件 [hermes] **Job ID:** 9ee8d7c6dab2 **Run Time:** 2026-04-13 08:30:34 **Schedule:** 30 8 * * * ## Prompt [SYSTEM INSTRUCTIONS HIDDEN]\" (nothing else) to suppress delivery. Never combine [SI…",
      "latest_content": "# Cron Job: Trump国际事务追踪 08:30 邮件 [hermes]\n\n**Job ID:** 9ee8d7c6dab2\n**Run Time:** 2026-04-13 08:30:34\n**Schedule:** 30 8 * * *\n\n## Prompt\n\n[SYSTEM INSTRUCTIONS HIDDEN]\" (nothing else) to suppress delivery. Never combine [SILENT] with content — either report your findings normally, or say [SILENT] and nothing more.]\n\nRun exactly this command in the local terminal and return stdout verbatim if it succeeds; if it fails, return only a concise error summary: python3 [local-path]\n\n## Response\n\n{\"ok\": true, \"mail_ok\": true, \"mail_err\": \"\", \"archive_ok\": true, \"archive_err\": \"\", \"body_file\": \"[local-path] \"items\": 11}",
      "response_json": {
        "ok": true,
        "mail_ok": true,
        "mail_err": "",
        "archive_ok": true,
        "archive_err": "",
        "body_file": "/root/.hermes/output/digest-body-2026-04-13-trump.md",
        "items": 11
      }
    }
  ]
};

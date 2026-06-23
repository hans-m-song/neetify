---
name: job-status
description: Log a pipeline status change for a company in this job-search workspace. Use when the user reports an application outcome or a letter state, e.g. "X applied", "rejected by X", "applied to X", "X ready/drafted/held/closed", "log status for X". Updates the company's jobs.yaml entry (status + status_date) and the matching handoff-doc line.
user-invocable: true
---

# job-status — log a pipeline status change

One company's status moved. Record it in the single source of truth (`jobs.yaml`) and the per-letter
trail. Fast, mechanical, no letter work.

## Steps

1. **Find the entry.** `rg -n -i "<company>" jobs.yaml`. If the company has more than one role on the
   board, confirm which role (the user usually means the one most recently actioned). If there is no
   entry at all, this is a new lead — say so and offer `/assess-lead` instead of inventing a row.

2. **Set status + date.** Edit the entry's `status` and `status_date` (today's absolute date,
   `YYYY-MM-DD`). Use the status vocabulary defined in the `jobs.yaml` header comment:
   `applied | rejected | ready | drafted | open | held | closed | skip | out | unassessed | inbound | stale`.
   - sent an application → `applied`
   - rejection received → `rejected`
   - letter compiled but unsent → `ready`; drafted-but-uncompiled → `drafted`
   Add `status_date` if the field is missing.

3. **Update the per-company notes.** If `orgs/<company>/notes.md` exists, update its `## Cover letter`
   status line to match the existing style (e.g. `**Status: APPLIED 2026-06-23** (...)`). For a
   rejection, keep the prior applied date and note the turnaround if it was fast (a ~1-day rejection is
   almost always an early resume/screen filter, not the letter — worth saying so honestly).

4. **Do not touch `jobs.md`.** It is prose-only (orientation + settled/open decisions); per-role status
   lives only in `jobs.yaml` (see `CLAUDE.md`).

5. **Report one line:** company, role, new status, date, and where it was logged.

## Notes
- Today's date comes from the session's current-date context, not a guess.
- This skill never drafts, compiles, or sends anything — it only records state.

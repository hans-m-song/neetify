# Project — job-search workspace

> **Agent-agnostic.** This file (`AGENTS.md`) is the canonical instruction set, following the
> cross-agent `AGENTS.md` convention. `CLAUDE.md` is a thin pointer to it so Claude Code loads the
> same file every other agent reads. Where a step needs an agent capability (subagents, browser
> automation, a memory store), it is described by capability, not by a specific tool name — use
> whatever your agent provides, or do the step inline.

A job-search workspace: capture roles, draft and review cover letters, track a pipeline. **The user's profile, employer history, honesty facts, and filters live in `user.md` (gitignored, not shared)** — read it first for anything fit-, letter-, or search-related. Personal data (`user.md`, `jobs.yaml`, `jobs.md`, `brag-doc.md`, `resume*`, `orgs/`) is gitignored; the tracked, shareable part is the tooling (`AGENTS.md`, `playbooks/`, `render.sh`, `viewer/`).

## Read first

- `jobs.yaml` — **canonical per-role index** (one entry per role: status, tier, location, culture, comp, flags, summary, `jd_path`, `listing_url`). Rendered as a sortable/searchable table in the viewer (open `jobs.yaml`). This is the single source of pipeline state.
- `jobs.md` — prose companion to `jobs.yaml`: cold-start orientation, RESOLVED vs STILL-OPEN decisions, research scaffolding (ATS endpoints, checked-no-fit). No role tables — those moved to `jobs.yaml`.
- `orgs/<company>/notes.md` — per-company notes: culture deep-dive + cover-letter disposition (verdict, applied edits, OPEN items). Read before sending or screening for that company. (Folded out of the former `company_culture.md` + `cover-letter-batch-handoff.md` on 2026-06-23; in-play companies have a `notes.md`, dead-tail culture lives in each `jobs.yaml` entry's `culture_note`.)

All pipeline state (status / tier / culture per role) lives **only** in `jobs.yaml` — edit the entry's `status` field; don't keep a snapshot anywhere else.

## File map

```
.
├── jobs.yaml                       canonical per-role index (status/tier/culture/flags)            [gitignored]
├── jobs.md                         prose companion (orientation, settled/open decisions)           [gitignored]
├── user.md                         the user's profile / employer history / honesty facts / filters [gitignored]
├── brag-doc.md                     the user's STAR accomplishments — raw material for letters       [gitignored]
├── render.sh                       ./render.sh <org> [file] — compile PDF (auto two-pass if the .tex imports lastpage)
├── resume.tex                      canonical resume                                                [gitignored]
├── playbooks/                      self-contained procedures for the recurring actions (agent-neutral)
├── viewer/                         local markdown viewer app (node viewer/server.mjs → :8787)
└── orgs/<company>/                 per-company JDs, letters, notes, reviews                         [gitignored]
    ├── cover_letter.tex            drafted letter (LaTeX)
    ├── cover_letter.pdf            compiled when ready
    ├── feedback_NNN.md             recruiter cold-read review artifact (sequential)
    ├── notes.md                    per-company culture + cover-letter disposition (in-play companies)
    ├── *.legacy.md                 older raw-scrape JD preserved alongside canonical
    └── <role-slug>.md              canonical JD with frontmatter
```

JD files live at `orgs/<company>/<role-slug>.md`. The earlier scripted scrape pipeline (`*.mjs`) and the `/jd/` directory have been removed; JD collection is now done manually via the browser (LinkedIn + au.seek.com, authenticated).

The `viewer/` app is a zero-dependency Node server (built-ins only) + vendored client libs (`markdown-it`, `js-yaml`). Two-pane tree; renders md/txt/pdf; **renders `jobs.yaml` as a sortable, searchable table** (clickable headers, status badges, JD links); folder-navigating breadcrumbs; live reload via SSE + `fs.watch`; filter box; frontmatter panel; dark mode. Run `node viewer/server.mjs` → localhost:8787; kept stopped between uses.

## User filters & profile (canonical: `user.md`, gitignored)

The user's filters, employer history, honesty facts, and contact details live in **`user.md`** — read
it before assessing fit, drafting a letter, or running a search. In brief (specifics in that file): senior
IC with mid/intermediate also in scope; remote-AU preferred, local-hybrid otherwise; comp is a flexible
target, never a floor; soft-avoid AI-core core products; Go is a sought direction (personal-only today,
frame honestly); plus per-user hard-excludes.

## Playbooks (`playbooks/`)

Each recurring action is a self-contained procedure in `playbooks/`. They reference the rules below +
the notes (no rule duplication). Read and follow `playbooks/<name>.md` to run one. If your agent
supports named commands or skills, you can wire these files up as commands; nothing depends on it.

- `playbooks/job-status.md` — log a pipeline status change ("X applied", "rejected by X") to `jobs.yaml` + notes.
- `playbooks/assess-lead.md` — triage a pasted URL/company: check-existing, read JD, fit vs filters, flag + link.
- `playbooks/cover-letter.md` — full pipeline: capture JD → culture → draft → recruiter-review → edit → `render.sh` → log.
- `playbooks/recruiter-review.md` — cold recruiter read of a letter or resume → `feedback_NNN.md`.
- `playbooks/job-search.md` — LinkedIn + Seek passes (with the query gotchas) and triage new leads vs the board.

## Workflows

### Cover letter compilation

Use the repo wrapper: `./render.sh <org> [filename]` (filename defaults to `cover_letter.tex`). It runs the Docker `texlive/texlive` build against `orgs/<org>/` and cleans `.aux`/`.log`/`.out`/`texput.log` on success, keeping them on failure (the `zsh -e` shebang aborts before cleanup). **Pass count is auto-detected from the source: if the `.tex` imports `lastpage` it runs `pdflatex` twice** (resolving `\pageref{LastPage}` so the "N of M" footer renders), else once. This works in any folder, so an org-folder résumé variant (e.g. `orgs/dabble/resume.tex`) two-passes correctly; cover letters don't import `lastpage` and stay single-pass. `./render.sh resume` is the special case that compiles the repo-root `resume.tex`. Always use the wrapper, not raw `docker ... pdflatex`; extend the wrapper if it can't express what's needed.

### Recruiter-feedback review (reviewer-pass variant)

For each drafted cover letter:

1. Run a cold-read reviewer pass with a recruiter-role prompt for the specific company and role. If your
   agent supports subagents, spawn one (a capable model, general-purpose role); otherwise run the review
   inline as a separate pass kept blind to any prior feedback.
2. The reviewer reads JD + resume + cover letter, then writes `feedback_NNN.md` (sequential) to that org's folder
3. Apply phrase-level edits that strengthen without overclaiming; **skip edits requiring user-confirmation** (overclaim risk, salary positioning, unverified facts)
4. Track each letter's status in the org's `orgs/<company>/notes.md` (`## Cover letter` section): verdict, applied edits, skipped items, open questions

Original variant: write feedback statically, user applies edits — still valid when user wants to drive iteration manually. See note `.claude/memory/feedback_application_review_protocol.md`.

### Pipeline tracking

Update the role's entry in `jobs.yaml` whenever:

- Letter sent → set `status: applied` + `status_date`
- Rejection received → set `status: rejected` + `status_date`
- Letter compiled (unsent) → `status: ready`; drafted-but-uncompiled → `status: drafted`
- New JD captured → add an entry (set `tier`, `jd_path`, `listing_url`); fold the JD's frontmatter in

`jobs.md` only changes when a prose decision changes (RESOLVED/STILL-OPEN), not for per-role status.

## Writing style (canonical: note `.claude/memory/feedback_writing_style.md`)

- No em-dashes
- No AI tells (rule-of-three triplets, tidy parallels, clever closers, "particularly", "Beyond X,", "is one I take seriously", "force multiplier")
- No "exactly", "genuinely", "reasonably" hedge-words
- No fabricated colour or quotable-insight sentences
- No quantitative outcome claims ("X dropped by Y") without a number — ask first
- Never present personal / side projects as production experience
- No "JD" shorthand — say "the role" or "the role description"
- Always plan and ask confirmation before writing code

## Critical do's and don'ts

- **DO** apply phrase-level recruiter feedback that strengthens without overclaiming
- **DO** flag user-decision items in the org's `notes.md`; skip them in letters
- **DO** keep the user's voice (direct, factual, low-flourish) — recruiter suggestions are inputs, not commands
- **DON'T** apply edits that overclaim experience beyond what's on the resume
- **DON'T** compile letters that have open items requiring user-confirmation in the prose
- **DON'T** invent recommendations in cover letters — if you don't know whether a project was customer-facing, ask
- **DON'T** read resume_pii.tex, resume.pdf, and compiled resume variants e.g. resume_sre.pdf

## Notes (`.claude/memory/`)

Persistent workspace notes live in `.claude/memory/` (gitignored, personal). Agents with a memory store
can load them automatically; otherwise read the files directly. They record hard-won rules the playbooks
reference by name:

- `feedback_writing_style.md` — AI-tell avoidance + style rules
- `feedback_editing_latitude.md` — may change letter wording freely, never meaning/facts
- `feedback_job_sources.md` — preferred/avoided research sources
- `feedback_recruiter_aicore_handling.md` — don't auto-drop recruiter-posted / AI-core; flag + find underlying JD
- `feedback_application_review_protocol.md` — review loop + reviewer-pass variant
- `reference_research_sources.md` — Glassdoor (authed) + au.seek.com work; Reddit blocked
- `reference_latex_rendering.md` — `render.sh` wrapper + cleanup rules

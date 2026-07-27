---
name: job-search
description: Run a fresh job-search pass for this workspace and triage new leads against the board. Use when the user says "new search run", "do a job search", "run a new search", or "refill the pipeline". Runs the LinkedIn + Seek passes with the known query gotchas, checks each result against jobs.yaml, and presents new leads with flags and links.
---

# job-search — a fresh search run

Find new leads, triage honestly against the board, present the few worth pursuing. Don't re-present
roles already on file.

## Passes

Run these in an authenticated browser (use whatever browser automation your agent provides: create a tab
→ navigate → read the page text):

1. **LinkedIn — remote AU.** `location=Australia`, `f_WT=2` (remote), `f_TPR=r604800` (past week),
   `sortBy=DD`. **Uppercase boolean OR works on LinkedIn**, e.g.
   `keywords=(DevOps OR SRE OR "Site Reliability" OR "Platform Engineer")`.
2. **LinkedIn — the user's city.** Same but `location=<the user's city, from user.md>`, no `f_WT`
   (catches hybrid/on-site).
3. **LinkedIn — backend/full-stack.** Stack keywords from `user.md`'s centre, e.g.
   `("Software Engineer" OR "Backend" OR "Full Stack") AND (Node OR TypeScript OR AWS)`.
4. **LinkedIn — Go pass.** `Golang OR "Go developer" OR "Go engineer"` (Go is a sought direction; see user.md).
5. **Seek — via ICT classification browse + relevance sort.** **Gotcha: Seek boolean OR does NOT work**
   — it slugifies the operators into the query string and returns junk. Use the ICT classification browse,
   not an OR query.
6. **Optional: QLD Smart Jobs** (`smartjobs.qld.gov.au`) for QLD government roles.
7. **"More jobs" panel on JD pages.** Every LinkedIn `/jobs/view/<id>` page has a **More jobs** section
   (scroll down) recommending similar roles — often genuine employers the keyword passes miss. Mine it on
   each JD you open: scan for on-target remote-AU / Brisbane roles, check-existing, capture the survivors.

**Sort mode matters (important gotcha).** `sortBy=DD` (date) is heavily polluted by constant-reposting
staffing accounts (Hire Feed, Quik Hire, micro1, Jobgether, YO IT, Hired) that flood every page with fresh
timestamps and bury real employers — paginating date-sort just shows more of the same spam. Run each
LinkedIn pass **also with relevance sort** (omit `sortBy=DD`): it pushes the reposters down and surfaces
genuine employers the date-sort hides (this is how Karmo / Data#3 / 8.13 Elevata were found). When a
date-sorted page is all noise, switch to relevance before concluding "nothing new".

## Triage each result

- **Check existing** against the board (`rg -n -i "<company>" jobs.yaml`) before calling anything new —
  many results are already applied/rejected/out. (Note `.claude/memory/feedback_check_existing_before_assessing.md`.)
- Skip the noise: staffing marketplaces (micro1, Right Balance), aggregators (Jobgether), pure-consultancy
  reposts, and clearly off-stack roles — but flag, don't silently drop, recruiter-posted or AI-core ones
  (note `.claude/memory/feedback_recruiter_aicore_handling.md`).
- Assess survivors against the user filters (see `playbooks/assess-lead.md` / `user.md`).

## Capture each surviving lead

For every new lead that survives triage (on-target **and** flagged-not-dropped — skip only the noise),
capture the JD before presenting, same as `playbooks/assess-lead.md` / `playbooks/cover-letter.md` step 1:

1. Open the listing to get its **direct URL** and full text. LinkedIn search cards don't carry a clean
   per-role URL — click through (or build `/jobs/view/<currentJobId>`) to the single-role page. For
   "Promoted / Responses managed off LinkedIn" posts the "About the job" body is **lazy-loaded and won't
   appear in a backgrounded/unscrolled tab — click the page and scroll down to force it to render**, then
   read the page text. If it still won't render, find the underlying JD on the company careers/ATS site
   (note `.claude/memory/feedback_recruiter_aicore_handling.md`).
2. Save `orgs/<company>/<role-slug>.md` with the standard frontmatter
   (`company`/`role`/`location`/`work`/`seniority`/`comp`/`source`/`listing_url`/`job_id`/`captured`/
   `culture`/`flags`) plus a short fit-notes body — match an existing JD file as the shape reference.
3. Add a `jobs.yaml` entry: `status: open` (clear on-target) or `unassessed` (borderline / flagged),
   with `tier`, `jd_path`, `listing_url`, `flags`. Don't double-capture anything already on the board.

Always capture the **direct listing URL**, not just the search-results URL (note `.claude/memory/feedback_link_jds.md`).

## Present

One table of the now-captured new leads: company · role · loc/mode · why-look · flag · link (listing URL
+ `orgs/` path). Note which look strongest and why. Offer to run `playbooks/cover-letter.md` on the
standouts. Don't double-capture anything already on the board.

Sources/reliability: notes `.claude/memory/reference_research_sources.md` + `.claude/memory/feedback_job_sources.md`.

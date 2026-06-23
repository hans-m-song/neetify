---
name: job-search
description: Run a fresh job-search pass for this workspace and triage new leads against the board. Use when the user says "new search run", "do a job search", "run a new search", or "refill the pipeline". Runs the LinkedIn + Seek passes with the known query gotchas, checks each result against jobs.yaml, and presents new leads with flags and links.
user-invocable: true
---

# job-search — a fresh search run

Find new leads, triage honestly against the board, present the few worth pursuing. Don't re-present
roles already on file.

## Passes

Run these (authenticated browser: `tabs_context_mcp` → tab → `navigate` → `get_page_text`):

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

## Triage each result

- **Check existing** against the board (`rg -n -i "<company>" jobs.yaml`) before calling anything new —
  many results are already applied/rejected/out. (Memory `feedback_check_existing_before_assessing`.)
- Skip the noise: staffing marketplaces (micro1, Right Balance), aggregators (Jobgether), pure-consultancy
  reposts, and clearly off-stack roles — but flag, don't silently drop, recruiter-posted or AI-core ones
  (memory `feedback_recruiter_aicore_handling`).
- Assess survivors against the user filters (see `/assess-lead` / memory `user_role`).

## Present

One table of genuinely new, on-target leads: company · role · loc/mode · why-look · flag · link. Note
which look strongest and why. Offer to capture + `/cover-letter` the standouts. Don't double-capture
anything already on the board.

Sources/reliability: memories `reference_research_sources` + `feedback_job_sources`.

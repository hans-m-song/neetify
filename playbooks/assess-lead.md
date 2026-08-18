---
name: assess-lead
description: Triage a potential job lead for this workspace. Use when the user pastes a job URL or asks "can you check / assess / look at <company or listing>". Greps the board for the company first (check-existing), opens the listing in an authenticated browser, reads the JD, assesses fit against the user's filters, flags recruiter/AI-core/gambling, and links it. Does NOT draft a letter.
---

# assess-lead — triage a new lead

Decide whether a listing is worth pursuing, honestly, before any letter work.

## Steps

1. **Check existing FIRST (do not skip).** Before assessing anything as "new", grep the board for the
   company: `rg -n -i "<company>" jobs.yaml jobs.md orgs/*/notes.md` and `ls orgs/ | rg -i "<company>"`.
   If it is already on file, say so and surface the prior verdict/tier/flags — it may be a hard-avoid or
   already-applied. (Note `.claude/memory/feedback_check_existing_before_assessing.md`; this exists
   because a hard-avoid was once taken to application.)

2. **Open it in an authenticated browser.** Use whatever browser automation your agent provides: reuse
   or create a tab → navigate to the listing → read the page text.
   - **Gotcha:** LinkedIn "Promoted by hirer / Responses managed off LinkedIn" posts do **not** render
     the job body. Find the underlying JD on the company careers/ATS site (the apply link usually points
     there), or ask the user to open it in the tab. Don't assess off the title alone.

3. **Identify** company + exact role + location/work-mode + comp if stated.

4. **Assess against the user's filters** — read them from `user.md` (location, comp target, stack
   centre, Go-as-sought-direction, mid/senior scope, hard-excludes, and the honesty traps like
   React-web-only / Python-scripting-only). Highlights:
   - Flags to call out, not auto-drop: **AI-core** (soft-avoid), **gambling**, **recruiter-posted**, **on-site**, **clearance**
   - Don't auto-drop recruiter-posted or AI-core — flag and try to find the underlying employer/JD
     (note `.claude/memory/feedback_recruiter_aicore_handling.md`).

5. **Check culture before recording the result.** Search the employer generally for recent employee-culture
   or workforce signals, then search Glassdoor specifically. Record the checked date, Glassdoor rating and
   review count where available, the recurring sentiment, and any uncertainty. Low-n, non-engineering, or
   employer-authored material is weak evidence, not confirmation. Do not use Reddit as a required source.

6. **Capture immediately.** Save or update `orgs/<company>/<role-slug>.md` with the direct listing URL,
   JD text (or the precise reason it could not be obtained), fit notes, culture evidence, and flags. Add or
   update the corresponding `jobs.yaml` entry before moving on: `open` for a clear fit, `unassessed` when
   evidence is missing, `out` for a hard filter, `skip` for a deliberate pass, or `stale` for a closed or
   misrouted listing. If the exact role already exists, update it rather than duplicating it. Capture even
   negative outcomes; do not capture only obvious search noise that was never opened.

7. **Present** a concise fit read — a small table (JD wants vs the user) plus the decisive flag — and a
   recommended tier (A/B/C/D/out). **Always include the listing link** and any `orgs/` path
   (note `.claude/memory/feedback_link_jds.md`).

8. **Offer the next step:** run the `playbooks/cover-letter.md` procedure for a pursued role, or change
   its pipeline status if the user decides. Do not draft, apply, or contact anyone without instruction.

## Culture lookups (when needed)
Authenticated Glassdoor works; treat a high rating on very few reviews (low-n) as not meaningful. General
web and Glassdoor checks are mandatory for each captured lead. Reddit is blocked at the browser safety
layer. (Note `.claude/memory/reference_research_sources.md`.)

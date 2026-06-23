---
name: assess-lead
description: Triage a potential job lead for this workspace. Use when the user pastes a job URL or asks "can you check / assess / look at <company or listing>". Greps the board for the company first (check-existing), opens the listing in the authenticated browser, reads the JD, assesses fit against the user's filters, flags recruiter/AI-core/gambling, and links it. Does NOT draft a letter.
user-invocable: true
---

# assess-lead — triage a new lead

Decide whether a listing is worth pursuing, honestly, before any letter work.

## Steps

1. **Check existing FIRST (do not skip).** Before assessing anything as "new", grep the board for the
   company: `rg -n -i "<company>" jobs.yaml jobs.md orgs/*/notes.md` and `ls orgs/ | rg -i "<company>"`.
   If it is already on file, say so and surface the prior verdict/tier/flags — it may be a hard-avoid or
   already-applied. (Memory `feedback_check_existing_before_assessing`; this exists because a hard-avoid
   was once taken to application.)

2. **Open it in the authenticated browser.** `tabs_context_mcp` → reuse or create a tab → `navigate`
   → `get_page_text`.
   - **Gotcha:** LinkedIn "Promoted by hirer / Responses managed off LinkedIn" posts do **not** render
     the job body. Find the underlying JD on the company careers/ATS site (the apply link usually points
     there), or ask the user to open it in the tab. Don't assess off the title alone.

3. **Identify** company + exact role + location/work-mode + comp if stated.

4. **Assess against the user's filters** — read them from `user.md` (location, comp target, stack
   centre, Go-as-sought-direction, mid/senior scope, hard-excludes, and the honesty traps like
   React-web-only / Python-scripting-only). Highlights:
   - Flags to call out, not auto-drop: **AI-core** (soft-avoid), **gambling**, **recruiter-posted**, **on-site**, **clearance**
   - Don't auto-drop recruiter-posted or AI-core — flag and try to find the underlying employer/JD
     (memory `feedback_recruiter_aicore_handling`).

5. **Present** a concise fit read — a small table (JD wants vs the user) plus the decisive flag — and a
   recommended tier (A/B/C/D/out). **Always include the listing link** and any `orgs/` path
   (memory `feedback_link_jds`).

6. **Offer the next step:** capture the JD + run `/cover-letter <org>`, or log it via `/job-status`
   as `out`/`skip`/`open`. Don't capture or draft unless the user wants to pursue.

## Culture lookups (when needed)
Authenticated Glassdoor works; treat a high rating on very few reviews (low-n) as not meaningful. Reddit
is blocked at the browser safety layer. (Memory `reference_research_sources`.)

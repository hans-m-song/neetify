---
name: cover-letter
description: Run the full cover-letter pipeline for a company in this workspace. Use when the user says "draft/write a cover letter for <org>", "do the letter for X", or "do cover letter and review for X". Captures the JD, checks culture, drafts from a template with the honesty + style rules, runs the recruiter cold-read, applies safe edits, compiles via render.sh, and logs to jobs.yaml + the handoff doc.
user-invocable: true
---

# cover-letter — draft → review → compile → log

The signature multi-step workflow. Keep the user's voice (direct, factual, low-flourish); recruiter
suggestions are inputs, not commands. Per `CLAUDE.md`, propose the draft approach and confirm before
writing prose.

## Steps

1. **Capture the JD.** Ensure `orgs/<org>/<role-slug>.md` exists with frontmatter matching an existing
   JD file (company, role, location, work, seniority, comp, source, listing_url, captured, culture,
   flags) and the JD body + fit notes. If assessing from scratch, run `/assess-lead` first.

2. **Culture check.** Authenticated Glassdoor (memory `reference_research_sources`). Record honestly,
   including "thin / low-n / no review page" when that's the truth (don't imply a signal that isn't there).

3. **Draft `orgs/<org>/cover_letter.tex`** from the closest existing letter as the template:
   `orgs/crimson-education/cover_letter.tex` (TS/React/Node full-stack) or `orgs/cresta/cover_letter.tex`
   (SRE/infra). Apply:
   - **Honesty framing** — read the "Honesty facts" section of `user.md` and respect it exactly
     (Helm / Go / Python / React / AI / on-call / multi-region scope, tied to the user's real employers).
     The cardinal rule: never present side/personal projects as production experience, and never overclaim
     beyond what the resume supports. See also memory `feedback_editing_latitude`.
   - **Writing style** (memory `feedback_writing_style`): no em-dashes; no AI tells (rule-of-three,
     tidy parallels, "particularly", "Beyond X,", clever closers); no "exactly/genuinely/reasonably";
     no fabricated colour; no quantitative outcome claim without a real number (ask first); don't say "JD".

4. **Recruiter cold-read.** Run `/recruiter-review` on the letter → `orgs/<org>/feedback_NNN.md`.

5. **Apply edits.** Phrase-level edits that strengthen without overclaiming. **Skip** edits requiring
   user-confirmation (overclaim risk, salary positioning, unverified facts) and list them as OPEN. A flag
   the reviewer raises that is already user-confirmed elsewhere (check the handoff doc) is not a blocker.

6. **Compile.** `./render.sh <org>` (memory `reference_latex_rendering`; auto two-pass when the .tex
   imports `lastpage`, single-pass otherwise). Confirm it built (page count in the output).

7. **Log.**
   - `jobs.yaml`: add/update the entry — `status: ready` if compiled (`drafted` if not), plus `tier`,
     `jd_path`, `letter`, `listing_url`, `flags`, `summary`.
   - `orgs/<org>/notes.md`: create or update the `## Cover letter` section — status line, verdict,
     applied edits, skipped/OPEN items, and any screen-prep notes (add a `## Culture` section too if you
     ran a culture check). This is the per-company home; there is no central handoff file.

## Output
Report the verdict, what you applied vs skipped, the compiled PDF path, and the OPEN items the user must
decide before sending. Be honest about fit strength (bullseye vs stretch); don't oversell a weak match.

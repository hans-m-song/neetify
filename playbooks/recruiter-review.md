---
name: recruiter-review
description: Run a cold recruiter screening pass on a cover letter or resume against a job description. Use when the user asks for a "cold read", "recruiter review", or "feedback" on a letter or resume, and as step 4 of the cover-letter pipeline. Writes a sequential feedback_NNN.md (or resume_feedback_NNN.md) to the org folder and reports the verdict + top edit.
---

# recruiter-review — cold recruiter screening pass

A skeptical, no-flattery screen that protects against overclaiming. The reviewer sees the JD + resume
+ the artifact under review and **no prior feedback** (a genuine cold read). Source of truth: note
`.claude/memory/feedback_application_review_protocol.md`.

## Steps

1. **Pick the artifact + inputs.** The cover letter (`orgs/<org>/cover_letter.tex`) or a resume
   (`resume.tex`, or an org variant like `orgs/<org>/resume.tex`), plus the JD
   (`orgs/<org>/<role>.md`) and the resume for cross-checking.

2. **Run a cold-read reviewer pass.** If your agent supports subagents, spawn one (a capable model, a
   general-purpose role) so the read is independent; otherwise run the review inline as a separate pass
   kept blind to prior feedback. The prompt makes the reviewer a senior technical recruiter doing a cold
   pass, gives the three file paths, and requests this structure written to `orgs/<org>/feedback_NNN.md`
   (sequential; use `resume_feedback_NNN.md` for resume reviews):
   - **Verdict** (advance / yes-with-reservations / no + one paragraph)
   - **Strengths vs the must-haves** (table: JD must-have | evidence | strength)
   - **Gaps / risks** (numbered, specific)
   - **Overclaim check** — every sentence vs the resume; flag anything unsupported
   - **Phrase-level edits** (before/after; mark which need a fact confirmed first)
   - **Open questions before sending**
   - **One-line summary**

3. **Embed the honesty constraints in the reviewer prompt** so its edits match the voice and don't
   invent — source them from the "Honesty facts" section of `user.md`: never present side/personal
   projects as production; React web-only (no native mobile); Python scripting not production services; Go
   personal-only; no fabricated metrics (it may point out where a real number would help but must not
   invent one); style = no em-dashes, no rule-of-three, no "particularly/genuinely/exactly", direct and
   low-flourish. When facts are already user-confirmed (noted in the org's `notes.md`), tell the reviewer
   to treat them as given, not flag them as unsupported.

4. **Report back** the verdict and the single highest-value edit. Application of edits is the caller's
   job (the `playbooks/cover-letter.md` pipeline, or the user) — apply phrase-level edits that strengthen
   without overclaiming, and **skip** edits that need user confirmation (list them as OPEN).

## Notes
- One cold pass per artifact version; re-run after material edits to get a fresh read (as done for the
  resume variants this session: `resume_feedback_001.md` then `_002.md`).

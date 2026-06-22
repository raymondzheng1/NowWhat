# Roadmap — What Now? (future scope, not yet built)

Captured so good ideas aren't lost. Nothing here is a commitment; the architecture is
identical regardless of which verticals ship — only the curated `corpus/pathways/*` content
differs. Each new vertical is **safety-critical** and must be researched + authored against
official sources, pass `corpus-check`, and get a Victorian legal professional's sign-off
before launch (same bar as the four live entries).

## Future Victorian verticals (corpus entries to author)
Highest-value candidates beyond the four live areas (renting, fines, public housing, generic):

| Vertical | Issuer(s) | Likely pathway / body | Notes |
|---|---|---|---|
| **Working with Children Check** | Department of Government Services (WWCC Unit) | Internal review → VCAT | High volume; affects employment/volunteering. |
| **WorkSafe / workers' compensation** | WorkSafe Victoria / agents | Conciliation (ACCS) → WorkCover court | Distinct conciliation step, not VCAT. |
| **Transport Accident Commission (TAC)** | TAC | Internal review → VCAT | Common, sympathetic cohort. |
| **State Revenue Office (SRO)** | SRO Victoria | Objection → VCAT | Land tax, duties, first-home grants. |
| **Planning & building** | Local councils | VCAT (Planning & Environment list) | Permits, objections — well-suited to VCAT. |
| **Child protection / family services** | DFFH | Internal review → VCAT (limited) | Sensitive; needs careful trauma-informed copy + specialist help routing. |
| **Mental health & disability orders** | Mental Health Tribunal | Tribunal review | Specialist tribunal, not VCAT. |
| **Infringement special circumstances (deep-dive)** | Fines Victoria | Enforcement review / WDP | Split out from the fines entry as it grows. |

## Other deferred items
- **More jurisdictions** — Commonwealth (Centrelink/NDIS → ART) and other states; the engine
  is jurisdiction-aware (verifier already gates cross-jurisdiction bodies), so adding a
  jurisdiction is a content + classifier exercise.
- **Multilingual launch content** — i18n is wired (English only); translate UI + key content
  for priority community languages.
- **Email deadline reminders** — optional no-account reminder via Resend (ICS download exists).
- **Capability-code save & resume** (harness §18) — deliberately deferred; trades against the
  no-storage promise.
- **Per-pathway "other steps" expansion** on the result, and richer evidence/grounds UI.

## How to add a vertical (process)
1. Research the pathway/deadlines against official sources (vcat.vic.gov.au, art.gov.au, legislation.vic.gov.au, the agency).
2. **Procedural facts** → author `data/pathways/<id>.md` (avenue/deadlineRule/reasons/getHelp; `verifiedAsAt` + `sourceUrl` + `reviewCadenceDays`; `status: seed` until lawyer-verified). The M-Lean `/start` flow (`RightsSaverClient`) + `lib/triage`/`lib/data` pick it up automatically; add an icon in `RightsSaverClient`'s `AREA_ICON` if you want a custom glyph. (Legacy decode/ask still read `corpus/pathways/<id>.md` + the `CATEGORY` map in `components/feature/categories.ts`.)
3. **Legal substance** (v2) → grounds/cases live in `corpus/legal/` (behind the legal-sign-off gate).
4. `npm run verify` (data-check, corpus-check, reading-level, etc.) → supervising-lawyer sign-off → flip `status` to `verified` (the deadline then renders the rule + verified date + source instead of degrading).

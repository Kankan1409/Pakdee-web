# Digital Leases prototype

Branch: `feature/digital-leases-esign` (based on `921e4be`).

Open the Digital Leases menu (`/digital-leases`). It operates as an independent component. The **สัญญาเช่าเดิม** menu (`/contracts`) retains the original contract workflow and records.

## New workflow

- Select an occupied room, enter the parties, dates, rent, deposit, utilities and editable terms.
- Save a draft, review the document, attach ID cards/documents, and collect handwritten signatures from the landlord, tenant and 2 optional witnesses.
- Each signer confirms consent. The first signature locks the document in the editor; subsequent signatures refer to the same SHA-256 document snapshot. This is an application-level integrity check, not an identity certificate.
- Print only the agreement, with its signatures, in A4. Both Thai and Latin text use the bundled TH Sarabun New regular/bold fonts.
- The LINE demo simulates a message, a tenant mobile signing view and an owner status update. It never sends a message, generates a working external link or persists its sample signature.

## Data boundary

New prototype records use IndexedDB `pakdee-web-digital-leases-demo-v1`, keyed by property and record IDs. They do not call `/api/db`, Supabase or the existing contract/room update handlers. The original contract tab continues to use the existing storage implementation. Test data in this prototype does not activate room occupancy or alter accounting records.

Prototype storage is browser- and origin-specific. It is not shared between machines, ports or deployments. This prototype assumes the application's existing local test authentication; it is not a production multi-user authorization boundary. Clearing website data deletes these records. Keep printed copies if required.

Existing contracts are not automatically imported, re-signed or migrated. Production remote signing requires authorization, private document access, expiring links and a backend; these are intentionally outside this prototype.

## Validation

Validated in an isolated Chrome context with the application's `/api/db` requests intercepted and synthetic room/tenant fixtures. Covered draft creation, consent gating, both signatures, immutable editor after signing, reopen/reload, isolated print, embedded fonts, LINE simulation, mobile dialog layout, reset on close and no saved record from the LINE demo. TypeScript and the new-file ESLint checks were also run.

To check locally: `npm ci`, `npm run dev`, then open `/contracts` after entering the local test session. For printouts, disable browser headers/footers to omit the URL and browser-generated date.

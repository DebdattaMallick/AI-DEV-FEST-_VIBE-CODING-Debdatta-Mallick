# Tender Document Package Builder

A production-grade, frontend-only web application built by **Debdatta** for government tender bid package compilation.

Non-technical office staff use this tool to assemble, validate, order, and compile multiple PDF bid documents into a single, compliant tender submission package ready for submission to procuring entities.

---

## Core Features & Rules Implemented

- **100% Client-Side / Offline Ready**: All processing, validation, SHA-256 hashing, thumbnail generation, and PDF assembly happen inside the browser. No backend, database, storage, or telemetry.
- **Strict Compliance Verification**:
  - Validates `requirements.json` structure and real calendar deadlines.
  - Sorts documents strictly by `order` specified in the tender requirements (ignores file name prefixes like `01_`).
  - Evaluates document statuses in real time (`OK`, `MISSING`, `EXPIRY_NEEDED`, `EXPIRED`, `NOT_PROVIDED`).
  - Blocks package generation whenever any mandatory document is missing or any attached document is expired relative to the tender submission deadline.
- **Duplicate Detection**: Identifies exact byte duplicates using SHA-256 (with pure-JS fallback). Prevents matching duplicate files across different required documents.
- **Visual Page Previews**: Integrated PDF.js viewer with zoom and page navigation allows office staff to inspect scanned documents that have generic names (e.g. `scan_0042.pdf`).
- **Standardized Tender Package PDF**:
  - **Page 1: English Cover Page** with tender metadata grid and dynamically scaled document schedule table showing starting page numbers.
  - **Vector Integrity**: Embedded source pages remain vector and selectable.
  - **Non-Overlapping Footer Band**: Every page receives a reserved 34pt white bottom band with centered footer `<tender_id> | Page X of Y` and subtle divider line.
  - **Rotated Page Support**: Correctly handles `/Rotate` 0, 90, 180, 270 and non-zero origins.
- **Bilingual Interface (Bangla & English)**: Complete UI internationalization with instant toggle, remembering choice in `localStorage`.

---

## 8 Bonus Features

1. **Auto-Match Suggestions (Never Silent)**:
   - "Suggest matches" button analyzes filename tokens and first-page text extracted via `pdfjs-dist`.
   - Never overwrites manual matches and never suggests duplicate copies.
   - Ambiguous candidates show clickable options for the user to choose.
   - Scanned files without text layer show "Needs manual match: use Preview".
   - "Accept all clear suggestions" button for one-click application of unambiguous matches.

2. **Expiry Date Suggestion**:
   - Searches extracted text for date patterns (e.g. `valid until: YYYY-MM-DD`, `30 June 2027`).
   - Displays `Found in file: YYYY-MM-DD [Use this date]`. Never auto-fills silently.

3. **Optional Index Page (Default OFF)**:
   - Toggle "Add index page after the cover".
   - Inserts bilingual table of contents on Page 2 with starting page numbers.
   - Adjusts footer numbering and starting pages dynamically.
   - When OFF, strictly follows the standard cover-to-document layout.

4. **Export Checklist as CSV**:
   - Downloads `<tender_id>_Checklist.csv` in UTF-8 with BOM (`\uFEFF`) so Microsoft Excel and Bangla characters open without corruption.

5. **Save and Reopen (IndexedDB)**:
   - Debounced autosave of project, uploaded files (as ArrayBuffers), matches, and expiry dates to IndexedDB.
   - Prompts "Continue your previous work?" on startup with Continue / Start New options.
   - "New Project" button with confirmation.

6. **Bangla Typography on the PDF**:
   - Uses browser canvas font shaping with "Noto Sans Bengali" to render complex Bengali conjunct letters into high-DPR PNGs embedded with `pdf-lib` on the Index page.

7. **Seal / Signature Stamping**:
   - Upload transparent PNG seal or signature (e.g. `company_logo.png`).
   - Scope selection (all or specific documents) and page scope (all, first, last, custom `1, 3-4`).
   - Position presets with strict constraint: seal is positioned above the 34pt footer band and never overlaps footer text.

8. **Optional Gemini AI Checklist Assistant**:
   - Users can provide their own Gemini API key (kept purely in memory, never persisted or logged).
   - Sends only metadata (titles, statuses, deadlines) — never document contents.
   - Provides plain-language submission advice in English or Bangla.

---

## Development & Build

```bash
# Run Dev Server
npm run dev

# Production Build
npm run build
```
Builds static assets with `base: './'`, ready to run on any static host.

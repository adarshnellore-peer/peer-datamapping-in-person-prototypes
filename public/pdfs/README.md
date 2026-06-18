# Trace panel PDF assets

These PDFs are committed to the repo so Vercel can serve them from `/pdfs/*`.

| Filename | Maps to data source |
|----------|---------------------|
| `clinical-study-report.pdf` | Clinical Study Report |
| `protocol.pdf` | 247HV101 Protocol Version 3 |
| `sap.pdf` | 109MS306 (CONNECT) LTE Statistical Analysis Plan |
| `c4591001-protocol.pdf` | C4591001 Protocol Amendment 9 |
| `c4591001-sap.pdf` | C4591001 Final Statistical Analysis Plan |
| `generic-template.pdf` | Biogen Clinical Study Report Template |

Page counts and mappings live in `DOCUMENT_PDF_ASSETS` in `src/data/documentPreview.ts`.

To replace a file locally, copy a new PDF over the matching filename above and commit.

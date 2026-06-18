# Trace panel PDF assets

Symlink or copy PDFs from your drive download into this folder:

| Filename | Maps to data source |
|----------|---------------------|
| `clinical-study-report.pdf` | Clinical Study Report (154 pages) |
| `protocol.pdf` | 247HV101 Protocol Version 3 (1413 pages) |
| `sap.pdf` | 109MS306 (CONNECT) LTE Statistical Analysis Plan (59 pages) |
| `c4591001-protocol.pdf` | C4591001 Protocol Amendment 9 (1413 pages) |
| `c4591001-sap.pdf` | C4591001 Final Statistical Analysis Plan (59 pages) |
| `generic-template.pdf` | Biogen Clinical Study Report Template (65 pages) |

Example (adjust source path as needed):

```bash
ln -sf ~/Downloads/drive-download-20260616T195137Z-3-001/c4591001_pooled_efficacy_tables.pdf clinical-study-report.pdf
ln -sf ~/Downloads/drive-download-20260616T195137Z-3-001/c4591001_final_analysis_protocol.pdf protocol.pdf
ln -sf ~/Downloads/drive-download-20260616T195137Z-3-001/c4591001_final_analysis_sap.pdf sap.pdf
ln -sf ~/Downloads/drive-download-20260616T195137Z-3-001/c4591001_final_analysis_protocol.pdf c4591001-protocol.pdf
ln -sf ~/Downloads/drive-download-20260616T195137Z-3-001/c4591001_final_analysis_sap.pdf c4591001-sap.pdf
ln -sf ~/Downloads/drive-download-20260616T195137Z-3-001/generic_template.pdf generic-template.pdf
```

Page counts and mappings live in `DOCUMENT_PDF_ASSETS` in `src/data/documentPreview.ts`.

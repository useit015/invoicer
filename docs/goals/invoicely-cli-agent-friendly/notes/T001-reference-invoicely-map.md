# T001 Reference Invoicely Map

## Source

- Reference repository: https://github.com/legions-developer/invoicely
- Local shallow clone used for inspection: `/tmp/invoicely-reference`

## High-Level Shape

Invoicely is a modern invoice generator and manager built as a Yarn/Turbo monorepo. The primary app is `apps/web`, a Next.js 15 app using React 19, tRPC, TanStack Query, Better Auth, Drizzle ORM, PostgreSQL/Neon, Cloudflare R2 for logo/signature assets, IndexedDB for local-first invoice storage, and React PDF for PDF rendering.

The README identifies the platform as an invoice generation app where users create professional invoices, and the project structure confirms the core surface is a web dashboard with shared database and utility packages.

## Feature And Workflow Map

Core invoice workflows found in the reference:

- Create invoice: form-driven workflow at `apps/web/src/app/(dashboard)/create/invoice/` with sections for company details, client details, invoice details, items, and additional information.
- Validate invoice input: Zod schema in `apps/web/src/zod-schemas/invoice/create-invoice.ts` defines the canonical invoice payload.
- Preview invoice PDF: `apps/web/src/app/(dashboard)/create/invoice/invoice-preview.tsx` regenerates a PDF preview as form data changes.
- Download/export invoice: `apps/web/src/app/(dashboard)/create/invoice/invoiceOptionHelpers/invoice-options.tsx` exposes View PDF, Download PDF, Download PNG, and Save Invoice actions.
- Save invoice locally: unauthenticated or non-saving users are stored in IndexedDB through `apps/web/src/lib/indexdb-queries/invoice.ts`.
- Save invoice to server: authenticated users with `allowedSavingData` save through tRPC and PostgreSQL via `apps/web/src/trpc/services/invoice/insertInvoice.ts` and `apps/web/src/lib/db-queries/invoice/insertInvoice.ts`.
- List invoices: local and server invoice rows are shown under the dashboard invoices table with columns for storage type, ID, serial, total, item count, status, created date, paid date, and actions.
- Edit invoice: edit routes use `/edit/[type]/[id]` and support local or server invoice sources.
- Delete invoice: local deletion uses IndexedDB; server deletion uses `apps/web/src/trpc/services/invoice/deleteInvoice.ts`.
- Update invoice status: status values are `pending`, `success`, `error`, `expired`, `refunded`; `success` sets `paidAt`.
- Migrate local invoice to database: local invoices can be migrated to server storage while preserving status and paid date.
- Manage logo/signature assets: IndexedDB stores local images; Cloudflare R2 stores server images with owner-prefixed keys and file size limits.
- Generate styled invoice documents: React PDF templates are `default` and `vercel`.

The blog guide `apps/web/src/content/blogs/create-first-invoice.mdx` describes the intended user journey: enter company info, client info, items, notes/terms, billing/tax details, preview, then download as PDF or PNG.

## Canonical Data Model Observations

The canonical create invoice payload has:

- `companyDetails`: name, address, optional logo/signature URL or base64, and arbitrary string metadata.
- `clientDetails`: name, address, and arbitrary string metadata.
- `invoiceDetails`: theme (`baseColor`, `mode`, `template`), currency, prefix, serial number, date, optional due date, payment terms, and billing details.
- `invoiceDetails.billingDetails`: arbitrary label/value entries with `fixed` or `percentage` type, used to adjust totals.
- `items`: name, description, positive quantity, positive unit price.
- `metadata`: notes, terms, and payment information label/value pairs.

Persistent server storage normalizes this into `invoices`, `invoice_fields`, company/client detail tables, invoice detail tables, items, metadata, and payment information tables in `packages/db/src/schema/invoice.ts`.

Local storage uses an IndexedDB database named `invoicelygg`, version 1, with `inv_invoices` and `inv_images` object stores. Local invoice records retain the same `invoiceFields` shape as the Zod create payload.

Totals are computed from line items plus billing adjustments:

- subtotal = sum of `quantity * unitPrice`
- fixed billing detail adds/subtracts the fixed value
- percentage billing detail adjusts by percentage of subtotal

## Candidate CLI Parity Commands

Likely high-value CLI parity surface:

- `invoicer invoice init --json`: emit a canonical invoice JSON scaffold matching the create schema.
- `invoicer invoice validate <file> --json`: validate invoice payloads with deterministic issue paths/messages.
- `invoicer invoice total <file> --json`: compute subtotal, billing adjustments, and total.
- `invoicer invoice render <file> --format pdf|png --template default|vercel --out <path> --json`: generate invoice output.
- `invoicer invoice create <file> --storage local|server --json`: save invoice data.
- `invoicer invoice list --storage local|server|all --json`: list invoices with storage type, serial, total, status, createdAt, paidAt.
- `invoicer invoice get <id> --storage local|server --json`: fetch one invoice.
- `invoicer invoice edit <id> <file> --storage local|server --json`: update an invoice.
- `invoicer invoice delete <id> --storage local|server --json`: delete an invoice.
- `invoicer invoice status <id> <pending|success|error|expired|refunded> --storage local|server --json`: update status and paidAt semantics.
- `invoicer invoice migrate <id> --from local --to server --json`: preserve invoice fields, status, and paidAt.
- `invoicer asset upload --type logo|signature --file <path> --storage local|server --json`: store assets.
- `invoicer asset list --storage local|server --json`: list logo/signature assets.
- `invoicer asset delete <id-or-key> --storage local|server --json`: delete assets.
- `invoicer schema export --json`: output the canonical invoice schema or an agent-readable field contract.

Agent-friendly requirements for these commands:

- Every mutating command should have `--json`, stable exit codes, and idempotent or clearly non-idempotent behavior.
- Validation errors should include field paths, codes, and human messages.
- Render/create/list/get/status commands should return enough structured metadata for another agent to chain actions.
- The first milestone can prove handoff with fixtures, example commands, and an agent-readable contract before implementing every server-backed path.

## Risks And Gaps For Local Repo Scout

- Need to inspect the local repo before deciding whether this should be a new CLI package, an extension to an existing app, or a combined web/backend/CLI effort.
- Need to identify the local package manager, runtime, test stack, and existing invoice model before choosing files.
- PDF/PNG rendering may require either reusing existing web rendering code or introducing Node-compatible PDF generation; this should be judged against the local repo.
- Server storage parity may require auth and database credentials; local/offline JSON or SQLite-style storage may be safer for the first agent-proof milestone.
- Companion Codex skill should probably follow the command contract unless the local repo already has a skill surface.

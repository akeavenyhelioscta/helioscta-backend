# Documentation Skill

How to maintain and extend the MkDocs documentation site in `docs/`.

## Stack

- **Framework:** MkDocs with Material theme
- **Config:** `mkdocs.yml` (project root)
- **Content:** `docs/` directory
- **Custom CSS:** `docs/stylesheets/extra.css`

## Theme

- Dark mode (slate) is the default scheme, with a light mode toggle
- True black background (`#000`) via custom CSS overrides
- Full-width content layout (no `max-width` container)
- Active nav items highlighted in amber (`#ffc245`)
- High-contrast text (`rgba(255,255,255,0.92)` on `#000`)

## Sidebar Navigation Rules

- Labels should be concise, 2-4 words (e.g., "DA LMPs" not "PJM Day-Ahead Hourly LMPs")
- Group related pages under clear top-level sections (Power, Meteologica, Weather, etc.)
- Keep hierarchy shallow -- max 3 levels deep
- Shared reference pages (Glossary, Owners & SLAs) live under a "Reference" group
- Use "Scrapes" and "dbt Views" as standard subsection names (not "Scrape Notes" / "dbt View Notes")

## Content Conventions

- Every domain overview page opens with a 1-2 sentence summary of what data it covers
- Follow the summary with `**Use this page** to...` to orient the reader
- Use "Next steps" blocks at the bottom of catalog/summary pages to link to related resources
- Terminology must be consistent across pages -- see `docs/glossary.md` as the source of truth
- Glossary is organized by category: Market & Energy, Counterparties, Data & Pipeline, Weather Models

## Page Templates

### Domain Overview

```markdown
# Domain Name

One-two sentence summary of what data this domain covers and why it matters.

**Use this page** to find scrape scripts, raw tables, and dbt views for [domain].

## Data Source
## Scrape Inventory
## dbt Views
## Known Caveats
## Owner
```

### Scrape Card

```markdown
## Scrape Card

| Field | Value |
|-------|-------|
| **Script** | path |
| **Source** | API name |
| **Target Table** | schema.table |
| **Trigger** | Scheduled / Event-Driven |
| **Cadence** | frequency |
| **Freshness** | lag description |

## Business Purpose
## Data Captured
## Primary Key
## Downstream
## Known Caveats
```

## Adding a New Domain

1. Create `docs/domains/<domain>/overview.md`
2. Create `docs/domains/<domain>/scrapes/` and `docs/domains/<domain>/dbt-views/` as needed
3. Add the domain to `mkdocs.yml` nav under its own top-level section
4. Add relevant entries to `docs/dbt-cleaned-catalog.md`
5. Update `docs/executive-summary.md` tables if the domain adds new view counts

## Adding a New Scrape Page

1. Create the scrape card in `docs/domains/<domain>/scrapes/<scrape-name>.md`
2. Add it to the domain's nav section in `mkdocs.yml`
3. Link it from the domain overview's scrape inventory table
4. Link it from the Data Catalog if it feeds a dbt view

## QA Checklist

- Dark mode: true black background, high-contrast text, amber active nav
- Light mode: toggle works, no style regressions
- Mobile: sidebar collapses, tables scroll horizontally, 1rem padding
- Links: all internal links resolve (no broken cross-references)
- Search: suggestions and highlighting work
- Terminology: matches glossary definitions

# Brain Dump

> Local tracking file. Update checkboxes and move items between sections as work progresses.
> Tags: `TODO` | `DOING` | `BLOCKED` | `DONE` | `QUESTION` — picked up by Todo Tree in the sidebar.

---

- [ ] TODO Refactor ICE Python Scripts to use symbols/ folder.
- [x] DONE Refactor Gas EBB scrapes -- 135 pipelines across 15 source families (adapters + YAML configs + Prefect flows)

## Gas EBB -> Planned Outages Dashboard (Hyperion Agents target)

> Goal: Build a dashboard like `.refactor/Hyperion Agents.mhtml` -- planned outages with capacity impact, production impact, and price direction.

### Phase 1: Verify & Harden Scrapers
- [ ] TODO Live-test remaining adapters (Williams, Energy Transfer, TCE, TCPlus, Quorum, DT Midstream, GasNom, Cheniere, Standalone) -- fix parsing issues like KM/NNG/BHEGTS needed
- [ ] TODO Tallgrass adapter likely needs Selenium/Playwright -- investigate JS rendering requirement
- [ ] TODO Run full batch scrape (`gas_ebb_all`) and verify upsert to `gas_ebbs.notices`

### Phase 2: Notice Classification & Outage Extraction
- [ ] TODO Improve `notice_classifier.py` to detect planned outages vs OFOs vs force majeures vs routine notices
- [ ] TODO Extract structured outage data from notice subjects/PDFs: location, capacity reduction (Bcf/d), start/end dates
- [ ] TODO Build `gas_ebbs.planned_outages` table with columns: pipeline, location, sub_region, start_date, end_date, capacity_loss_bcfd, status (ACTIVE/UPCOMING/COMPLETED)

### Phase 3: Impact Analysis Layer
- [ ] TODO Map pipelines to production sub-regions (Haynesville, Eagle Ford, Marcellus, Permian, etc.)
- [ ] TODO Calculate production impact (Bcf/d) based on pipeline share of takeaway capacity + alternate route availability
- [ ] TODO Classify price direction: Bearish (production-area takeaway constraint) vs Bullish (demand-area delivery constraint)
- [ ] TODO Build `gas_ebbs.outage_impacts` table with capacity_loss, prod_impact, price_impact columns

### Phase 4: Dashboard
- [ ] TODO Build dashboard with: KPI cards, outage detail table, timeline (Gantt), pricing impact cards, production impact table
- [ ] TODO Daily automated refresh via Prefect scheduled flows

## Trade Files
- [] TODO How to flag when a trade is a broker deal for Kapil.

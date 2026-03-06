# Owners & SLAs

Pipeline ownership, freshness expectations, and escalation procedures.

## Pipeline Ownership

| Domain | Owner | Contact |
|--------|-------|---------|
| Power (PJM direct) | TBD | TBD |
| Power (GridStatus/IO) | TBD | TBD |
| Meteologica | TBD | TBD |
| WSI | TBD | TBD |
| EIA | TBD | TBD |
| Genscape | TBD | TBD |
| Positions & Trades | TBD | TBD |
| Event-Driven Listener | TBD | TBD |
| dbt Models | TBD | TBD |

!!! note
    Populate from the team's internal responsibility matrix.

## Freshness SLAs

| Dataset | Expected Freshness | Acceptable Lag | Impact if Stale |
|---------|--------------------|----------------|-----------------|
| PJM DA LMPs | By 1:30 PM ET | 2 hours | Missing DA price signals |
| PJM RT LMPs (unverified) | 5-min lag | 30 min | Delayed real-time P&L |
| PJM RT LMPs (verified) | ~60-day lag | N/A | Settlement reconciliation only |
| PJM Load (prelim) | ~1-hour lag | 2 hours | Delayed load tracking |
| PJM Load (metered) | ~2-day lag | 1 week | Settlement only |
| PJM 5-min load | ~5-min lag | 15 min | Delayed real-time tracking |
| PJM Fuel Mix | Hourly | 3 hours | Delayed generation analysis |
| PJM Outage Forecast | Multiple/day | 6 hours | Delayed supply outlook |
| GridStatus ISO data | Varies | 1 hour | Delayed cross-ISO analysis |
| Meteologica Forecasts | Multiple/day | 6 hours | Stale demand/gen/price forecasts |
| WSI Forecasts | 2-4x daily | 12 hours | Stale weather/degree-day outlook |
| EIA Generation Mix | Hourly | 3 hours | Delayed national generation |
| EIA Gas Storage | Weekly (Thu) | 1 day | Delayed storage report |
| Genscape Gas Production | Daily | 2 days | Delayed production outlook |
| Positions (NAV/Marex) | T+1 morning | T+1 noon | Delayed position reconciliation |
| Trades (Clear Street) | Intraday + T+1 | 4 hours | Delayed trade confirmation |

## Monitoring

All pipelines log to `pipeline_runs` via `PipelineRunLogger`:

- **Fields:** pipeline name, source, target table, start/end time, status, rows processed, error details
- **Check status:** Query `pipeline_runs` for any pipeline's recent runs

## Escalation

| Severity | Criteria | Action |
|----------|----------|--------|
| **P1 -- Critical** | RT or DA data missing >2 hours during market hours | Immediate investigation |
| **P2 -- High** | Forecast data missing >12 hours | Investigate within 4 hours |
| **P3 -- Medium** | Settlement/historical data delayed | Next business day |
| **P4 -- Low** | Reference data or non-time-critical feeds | Within 1 week |

# PJM Data Issues

## Open Issues

- [ ] **Meteologica regional load forecast doesn't equal RTO total**
  - Source: `today.md`
  - The sum of regional load forecasts from Meteologica does not match the total RTO forecast. Could be an aggregation bug in the SQL view, a timezone mismatch, or a missing region.

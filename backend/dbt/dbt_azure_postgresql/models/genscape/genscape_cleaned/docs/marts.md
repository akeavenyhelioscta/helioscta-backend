{% docs genscape_gas_production_forecast_mart %}

## Gas Production Forecast — Mart

Consumer-facing view of monthly gas production forecasts aggregated from 67 granular
regions into 22 geographic tiers with revision tracking. Direct pass-through from the
staging model.

### Grain
One row per **year x month x date x report_date** — each forecast period can have
multiple revisions (one per report date).

### Key Consumers
- Trading desk: gas supply outlook and cross-commodity analysis
- Downstream dbt queries joining on `date` and `report_date`

{% enddocs %}

{% docs genscape_daily_pipeline_production_mart %}

## Daily Pipeline Production — Mart

Consumer-facing view of daily dry gas pipeline production estimates with 22 regional
columns, 5 computed composites, Permian flaring metrics, and revision tracking.
Direct pass-through from the staging model.

### Grain
One row per **date x report_date** — each production date can have multiple revisions.

### Key Consumers
- Trading desk: actual vs forecast production comparison, supply trend monitoring
- Downstream dbt queries joining on `date`

{% enddocs %}

{% docs genscape_daily_power_estimate_mart %}

## Daily Power Estimate — Mart

Consumer-facing view of daily power generation burn estimates by region and model type.
Direct pass-through from the staging model.

### Grain
One row per **gas_day x power_burn_variable x model_type_based_on_noms**.

### Key Consumers
- Trading desk: gas-to-power demand tracking, gas/power spread analysis
- Downstream dbt queries joining on `gas_day`

{% enddocs %}

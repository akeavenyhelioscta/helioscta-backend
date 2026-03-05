{% docs pjm_marts_overview %}

# PJM Marts

This layer exposes consumer-facing PJM views. Each mart model is a thin wrapper
over vetted staging logic so downstream users query stable view names while
internal transforms remain ephemeral.

Where both daily and hourly grains exist in staging, both are exposed as marts.

{% enddocs %}

{% docs pjm_mart_lmps_hourly %}
Hourly PJM LMP mart by `date x hour_ending x hub x market` with DA, RT, and DART pricing.
{% enddocs %}

{% docs pjm_mart_lmps_daily %}
Daily PJM LMP mart by `date x hub x period x market`.
{% enddocs %}

{% docs pjm_mart_load_da_hourly %}
Hourly PJM day-ahead load mart by `date x hour_ending x region`.
{% enddocs %}

{% docs pjm_mart_load_da_daily %}
Daily PJM day-ahead load mart by `date x region x period`.
{% enddocs %}

{% docs pjm_mart_load_rt_metered_hourly %}
Hourly PJM real-time metered load mart by `date x hour_ending x region`.
{% enddocs %}

{% docs pjm_mart_load_rt_prelim_hourly %}
Hourly PJM real-time preliminary load mart by `date x hour_ending x region`.
{% enddocs %}

{% docs pjm_mart_load_forecast_hourly %}
Hourly PJM 7-day load forecast mart by `forecast_rank x forecast_date x hour_ending x region`.
{% enddocs %}

{% docs pjm_mart_gridstatus_load_forecast_hourly %}
Hourly GridStatus-based PJM load forecast mart by `forecast_rank x forecast_date x hour_ending x region`.
{% enddocs %}

{% docs pjm_mart_fuel_mix_daily %}
Daily PJM fuel mix mart by `date x period`.
{% enddocs %}

{% docs pjm_mart_fuel_mix_hourly %}
Hourly PJM fuel mix mart by `date x hour_ending`.
{% enddocs %}

{% docs pjm_mart_outages_actual_daily %}
Daily PJM actual outages mart by `date x region`.
{% enddocs %}

{% docs pjm_mart_lmps_rt_hourly %}
Hourly PJM real-time LMP mart by `date x hour_ending x hub`.
{% enddocs %}

{% docs pjm_mart_load_forecast_daily %}
Daily PJM 7-day load forecast mart by `forecast_rank x forecast_date x region x period`.
{% enddocs %}

{% docs pjm_mart_load_rt_instantaneous_hourly %}
Hourly PJM real-time instantaneous load mart by `date x hour_ending x region`.
{% enddocs %}

{% docs pjm_mart_load_rt_metered_daily %}
Daily PJM real-time metered load mart by `date x region x period`.
{% enddocs %}

{% docs pjm_mart_load_rt_prelim_daily %}
Daily PJM real-time preliminary load mart by `date x region x period`.
{% enddocs %}

{% docs pjm_mart_outages_forecast_daily %}
Daily PJM outage forecast mart by `forecast_rank x forecast_execution_date x forecast_date x region`.
{% enddocs %}

{% docs pjm_mart_tie_flows_hourly %}
Hourly PJM tie flows mart by `date x hour_ending x tie_flow_name`.
{% enddocs %}

{% docs pjm_mart_tie_flows_daily %}
Daily PJM tie flows mart by `date x tie_flow_name x period`.
{% enddocs %}

{% docs pjm_mart_solar_forecast_hourly %}
Hourly PJM solar forecast mart by `forecast_rank x forecast_date x hour_ending`.
{% enddocs %}

{% docs pjm_mart_wind_forecast_hourly %}
Hourly PJM wind forecast mart by `forecast_rank x forecast_date x hour_ending`.
{% enddocs %}

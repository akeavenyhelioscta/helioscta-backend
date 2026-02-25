{% macro create_pjm_indexes() %}

    {#
        Creates indexes on PJM raw source tables.

        Usage:  dbt run-operation create_pjm_indexes
                (or called via: dbt run-operation create_source_indexes)
    #}

    {% set indexes = [
        {
            "table": "pjm.da_hrl_lmps",
            "name": "idx_da_hrl_lmps_ept_pnode",
            "columns": "datetime_beginning_ept, pnode_name"
        },
        {
            "table": "pjm.rt_settlements_verified_hourly_lmps",
            "name": "idx_rt_verified_lmps_ept_pnode",
            "columns": "datetime_beginning_ept, pnode_name"
        },
        {
            "table": "pjm.rt_unverified_hourly_lmps",
            "name": "idx_rt_unverified_lmps_ept_pnode",
            "columns": "datetime_beginning_ept, pnode_name"
        },
    ] %}

    {% for idx in indexes %}

        {% set sql %}
            CREATE INDEX IF NOT EXISTS {{ idx.name }}
                ON {{ idx.table }} ({{ idx.columns }});
        {% endset %}

        {{ log("  Creating index: " ~ idx.name ~ " on " ~ idx.table, info=True) }}
        {% do run_query(sql) %}
        {{ log("    Done.", info=True) }}

    {% endfor %}

{% endmacro %}

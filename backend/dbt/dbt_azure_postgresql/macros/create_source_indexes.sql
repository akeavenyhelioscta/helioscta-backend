{% macro create_source_indexes() %}

    {#
        Creates indexes on all raw source tables to speed up dbt view queries.

        Usage:  dbt run-operation create_source_indexes

        This does NOT run during `dbt run` — it only runs when you invoke it manually.
        You only need to run this once (indexes persist until dropped).

        To run indexes for a single ISO:
            dbt run-operation create_pjm_indexes
    #}

    {{ log("=== Creating source indexes ===", info=True) }}

    -- PJM
    {{ log("PJM indexes:", info=True) }}
    {{ create_pjm_indexes() }}

    {{ log("=== All source indexes created successfully ===", info=True) }}

{% endmacro %}

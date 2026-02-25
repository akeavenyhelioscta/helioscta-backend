#### ERROR
12:40:01 PMStarted executing query at Line 1
invalid input syntax for type numeric: ""
Total execution time: 00:00:00.069

---

#### ROOT CAUSE

The error `invalid input syntax for type numeric: ""` is caused by **empty strings (`''`) in the raw source data** that are not handled before numeric type casts.

**Source model:** `source_v2_clear_street_intraday_trades.sql`

The following columns cast directly to FLOAT/INTEGER **without** `NULLIF` for empty strings:

| Line | Column | Cast | Issue |
|------|--------|------|-------|
| 29 | `strike_price` | `strike_price::FLOAT` | No empty string handling |
| 31 | `qty` | `qty::INTEGER` | No empty string handling |
| 32 | `trade_price` | `trade_price::FLOAT` | No empty string handling |

Additionally, several columns use `NULLIF(col, 'nan')::NUMERIC` which handles `'nan'` but **not empty strings**:

| Line | Column | Cast | Issue |
|------|--------|------|-------|
| 24 | `contract_year` (in `contract_year_month`) | `NULLIF(contract_year, 'nan')::NUMERIC` | Missing `NULLIF(..., '')` |
| 25 | `contract_year` | `NULLIF(contract_year, 'nan')::NUMERIC` | Missing `NULLIF(..., '')` |
| 26 | `contract_month` | `NULLIF(contract_month, 'nan')::NUMERIC` | Missing `NULLIF(..., '')` |
| 27 | `contract_day` | `NULLIF(contract_day, 'nan')::NUMERIC` | Missing `NULLIF(..., '')` |
| 59 | `opt_exp_date` | `NULLIF(opt_exp_date, 'nan')::NUMERIC` | Missing `NULLIF(..., '')` |
| 60 | `last_trd_date` | `NULLIF(last_trd_date, 'nan')::NUMERIC` | Missing `NULLIF(..., '')` |

**Why the error surfaces in the grouped view:**
All models in this chain are materialized as **views** (not tables), so casts are evaluated lazily at query time. When the consumer SQL script runs `ROUND(trade_price_total::NUMERIC, 3)`, PostgreSQL expands the full view chain down to the raw source table, hitting the empty string during cast evaluation.

---

#### TRIGGER

The consumer query (line 26) does:
```sql
ROUND(trade_price_total::NUMERIC, 3) as trade_price_total
```

`trade_price_total` comes from the grouped view: `AVG(trade_price) as trade_price_total`.
`trade_price` comes from the source view: `trade_price::FLOAT as trade_price`.

When the raw data contains `''` (empty string) for `trade_price`, `strike_price`, or any of the `contract_*`/date columns, the cast fails.

---

#### DATA FLOW

```
Raw Table: clear_street.helios_intraday_transactions_v2_2026_feb_23
  (trade_price is VARCHAR, may contain '' empty strings)
    |
    v
source_v2_clear_street_intraday_trades (VIEW)
  trade_price::FLOAT  <-- FAILS on ''
    |
    v
staging_v2_clear_street_intraday_1_additional_cols (EPHEMERAL)
  trade_price passed through unchanged
    |
    v
staging_v2_clear_street_intraday_2_product_codes (EPHEMERAL)
  trade_price passed through unchanged
    |
    v
marts_v2_clear_street_intraday_trades (VIEW)
  trade_price passed through unchanged
    |
    v
marts_v2_clear_street_intraday_trades_grouped (VIEW)
  AVG(trade_price) as trade_price_total
    |
    v
Consumer SQL Script
  ROUND(trade_price_total::NUMERIC, 3)  <-- error surfaces here
```

---

#### FIX

**In `source_v2_clear_street_intraday_trades.sql`**, wrap empty-string-vulnerable columns with `NULLIF`:

```sql
-- Line 29: strike_price
,NULLIF(strike_price, '')::FLOAT as strike_price

-- Line 31: qty
,NULLIF(qty, '')::INTEGER as qty

-- Line 32: trade_price
,NULLIF(trade_price, '')::FLOAT as trade_price

-- Lines 24-27: contract columns (add empty string handling alongside 'nan')
,NULLIF(NULLIF(contract_year, 'nan'), '')::NUMERIC::INTEGER::TEXT || LPAD(NULLIF(NULLIF(contract_month, 'nan'), '')::NUMERIC::INTEGER::TEXT, 2, '0') as contract_year_month
,NULLIF(NULLIF(contract_year, 'nan'), '')::NUMERIC::INTEGER as contract_year
,NULLIF(NULLIF(contract_month, 'nan'), '')::NUMERIC::INTEGER as contract_month
,NULLIF(NULLIF(contract_day, 'nan'), '')::NUMERIC::INTEGER as contract_day

-- Line 59: opt_exp_date
,TO_DATE(NULLIF(NULLIF(opt_exp_date, 'nan'), '')::NUMERIC::INTEGER::VARCHAR, 'YYYYMMDD') as opt_exp_date

-- Line 60: last_trd_date
,TO_DATE(NULLIF(NULLIF(last_trd_date, 'nan'), '')::NUMERIC::INTEGER::VARCHAR, 'YYYYMMDD') as last_trd_date
```

**In the consumer SQL script** (optional defensive fix):
```sql
,ROUND(NULLIF(trade_price_total, '')::NUMERIC, 3) as trade_price_total
```

---

#### SQL Script (that triggered the error)

```sql
WITH TRADES AS (
    select

        sftp_date
        ,trade_date
        ,clear_street_account
        -- ,exchange_name
        ,exchange_code
        ,product_code_grouping
        ,product_code_region
        ,is_option
        ,put_call
        ,strike_price
        ,contract_yyyymm
        ,contract_day
        ,contract_description

        ,ROUND(trade_price_total::NUMERIC, 3) as trade_price_total

        ,qty_total
        ,qty_acim
        -- ,qty_andy
        -- ,qty_mac
        ,qty_pnt
        ,qty_dickson
        ,qty_titan

    from dbt_trades_v2_2026_feb_23.marts_v2_clear_street_intraday_trades_grouped
)

SELECT * FROM TRADES
ORDER BY
    sftp_date DESC
    ,CASE product_code_grouping
        WHEN 'SHORT_TERM_POWER_RT' THEN 1
        WHEN 'SHORT_TERM_POWER' THEN 2
        WHEN 'POWER_OPTIONS' THEN 3
        WHEN 'POWER_FUTURES' THEN 4
        WHEN 'BASIS' THEN 5
        WHEN 'BALMO' THEN 6
        WHEN 'GAS_FUTURES' THEN 7
        WHEN 'GAS_OPTIONS' THEN 8
        ELSE 999
    END
    ,CASE product_code_region
        WHEN 'PJM' THEN 1
        ELSE 999
    END
    ,CASE exchange_code
        WHEN 'NG' THEN 1
        WHEN 'HP' THEN 2
        WHEN 'HH' THEN 3
        WHEN 'LN' THEN 4
        ELSE 999
    END
    ,contract_yyyymm ASC, contract_day ASC
```

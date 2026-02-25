# Refactoring Plan: `hourly_forecast_temp_v4_2025_jan_12.py`

**File:** `backend/src/wsi/temperature/hourly_forecast_temp_v4_2025_jan_12.py`

---

## 1. Fix Runner Discovery — Directory Mismatch

The script lives in `temperature/` but `runner.py` discovers scripts from `SOURCE_DIRS = ["temp_hourly_forecast", ...]`. The runner will never find this script.

**Action:** Either:
- **(a)** Rename the directory from `temperature/` to `temp_hourly_forecast/` to match the runner convention, OR
- **(b)** Add `"temperature"` to `SOURCE_DIRS` in `runner.py`

Option (a) is preferred — it keeps the directory name descriptive of the WSI product type rather than a generic data category, which is consistent with the commented-out entries (`weighted_degree_day_forecast`, `weighted_temp_daily_forecast_city`, etc.).

---

## 2. Add Missing `__init__.py`

The `temperature/` directory has no `__init__.py`. The runner's `importlib.import_module()` requires the directory to be a proper Python package.

**Action:** Create an empty `backend/src/wsi/temperature/__init__.py`.

---

## 3. Remove Unused Parameters from `_pull_helper`

`_pull_helper` accepts `regions`, `site_ids`, and `station_names` as parameters but never uses them — it iterates `wsi_trader_city_ids.keys()` instead.

**Action:** Remove the three unused parameters from the signature and from the call site in `main()`. The call in `main()` should pass only `wsi_trader_city_ids`:

```python
# Before
wsi_trader_city_ids, regions, site_ids, station_names = utils._get_wsi_site_ids()
df = _pull_helper(
    wsi_trader_city_ids=wsi_trader_city_ids,
    regions=regions,
    site_ids=site_ids,
    station_names=station_names,
)

# After
wsi_trader_city_ids = utils._get_wsi_site_ids()[0]
df = _pull_helper(wsi_trader_city_ids=wsi_trader_city_ids)
```

---

## 4. Eliminate Redundant Sort in `_pull_helper`

Both `_format()` (line 59-62) and `_pull_helper()` (line 134-137) perform the exact same sort-and-reorder operation on the same key columns. The sort inside `_format` is unnecessary since `_pull_helper` re-sorts the concatenated result anyway.

**Action:** Remove the sort/reorder block from `_format()` (lines 59-62). Keep the one in `_pull_helper()` which operates on the final concatenated DataFrame.

---

## 5. Fix Column Rename Ordering Bug

In `_format()`, `WindSpeed(mph)` is renamed to `WindSpeed_mph` on line 44, then line 48 lowercases all columns — resulting in `windspeed_mph`. The explicit rename on line 44 is misleading since the casing is immediately lost.

**Action:** Remove the special rename for `WindSpeed(mph)` and let the generic cleanup on line 48 handle it. After `str.lower().str.strip().str.replace(" ", "_")`, the column becomes `windspeed(mph)`. If the parentheses are undesirable, add a second replace:

```python
df.columns = (
    df.columns
    .str.lower()
    .str.strip()
    .str.replace(" ", "_")
    .str.replace(r"[()]", "", regex=True)
)
```

This produces `windspeed_mph` cleanly without a special-case rename.

**Database impact:** The column is currently stored as `windspeed_mph` (the rename + lowercase produces this). The chained `.replace()` approach produces the same result, so no schema migration needed.

---

## 6. Use `pd.concat` with a List Instead of Repeated Append

In `_pull_helper()`, the loop does `df = pd.concat([df, df_station], axis=0)` on every iteration, which creates a new DataFrame each time (O(n^2) behavior).

**Action:** Collect DataFrames in a list and concat once:

```python
frames = []
for region in wsi_trader_city_ids.keys():
    ...
    for site_id, station_name in zip(region_site_ids, region_station_names):
        ...
        df_station = _pull(...)
        frames.append(df_station)

df = pd.concat(frames, axis=0, ignore_index=True)
```

---

## 7. Add `__init__.py` Guard or Type Annotation for `_get_wsi_site_ids` Return

`utils._get_wsi_site_ids()` returns a bare tuple `(dict, list, list, list)`. After step 3, callers only need the dict. This is fragile.

**Action (optional, low priority):** Consider having `_get_wsi_site_ids` return a `TypedDict` or `NamedTuple`, or at minimum add a return type annotation in `utils.py`:

```python
def _get_wsi_site_ids(...) -> tuple[dict, list[str], list[str], list[str]]:
```

---

## 8. Replace `List` Import with Built-in `list`

The script imports `List` from `typing` (Python 3.9+ supports `list[str]` natively). The rest of the codebase (e.g., `utils.py:89`) already uses `list[str]`.

**Action:** Remove `from typing import List` and replace all `List[str]` with `list[str]`.

---

## Summary — Execution Order

| Step | Impact   | Risk  | Description                                        |
|------|----------|-------|----------------------------------------------------|
| 1    | Critical | Low   | Fix directory name or update `SOURCE_DIRS`         |
| 2    | Critical | None  | Add `__init__.py` to temperature directory         |
| 3    | Medium   | Low   | Remove unused params from `_pull_helper` / `main`  |
| 4    | Low      | None  | Remove redundant sort in `_format`                 |
| 5    | Low      | Low   | Fix column rename ordering / remove special case   |
| 6    | Medium   | None  | Batch `pd.concat` for performance                  |
| 7    | Low      | None  | Add type annotation to `_get_wsi_site_ids`         |
| 8    | Low      | None  | Use built-in `list` instead of `typing.List`       |

Steps 1-2 are required for the script to actually run via the runner. Steps 3-6 are correctness/performance improvements. Steps 7-8 are code hygiene.

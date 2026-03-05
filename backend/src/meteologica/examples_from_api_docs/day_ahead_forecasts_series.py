from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from pathlib import Path
from zoneinfo import ZoneInfo

import sys
import json
import math
import pytz
import pickle
import functools
print = functools.partial(print, flush=True)

################################### Please configure according to your needs

# Specify folder path containing the historic content data downloaded with 'content_historic_data.py'

FOLDERNAME = "./usa_us48_wind_power_generation_forecast_meteologica_hourly/"

# Specify AVAILABLE_AT_TIME_STR as the cut time used to choose its closest forecasts —earlier, not later than that time
# Must be in [00:00h .. 23:59h] range
AVAILABLE_AT_TIME_STR = "11:00"

# Specify RANGE which is the AHEAD amount in days
# Must be in [1 .. 14] range
RANGE = 1

VERBOSE = 0 # to see summary of choosen files
################################### Nothing more to be configured below
assert 1 <= RANGE <= 14

TIME_FORMAT = "%H:%M"
ISSUE_DATE_FORMAT = "%Y-%m-%d %H:%M:%S %Z"
FORECAST_DATE_FORMAT = "%Y-%m-%d %H:%M"

dir_path = Path(FOLDERNAME)
dir_path_mtime = dir_path.stat().st_mtime
dir_path_pickle = dir_path.with_suffix(".pickle")
issue_datetimes_info = {}
choosen_files = {}
forecasts = []

################################### Helpers

tz_cache = {}        # cache for fixed-offset timezones (strings like +0200 -> timezone)
def  get_and_cache_tz(utc_offset_str):
    global tz_cache
    if utc_offset_str not in tz_cache:
        utc_offset_int = int(utc_offset_str)
        offset_sign = 1 if utc_offset_int >= 0 else -1
        offset_hours = abs(utc_offset_int) // 100
        offset_minutes = abs(utc_offset_int) % 100
        tz_delta = timedelta(hours=offset_sign * offset_hours, minutes=offset_sign * offset_minutes)
        tz_cache[utc_offset_str] = timezone(tz_delta)
    return  tz_cache[utc_offset_str]

def parse_fixed_forecast_datetime(dt_str: str) -> datetime:
    """Fast string 'YYYY-MM-DD HH:MM' to datetime without tz"""
    return datetime(
        int(dt_str[0:4]),
        int(dt_str[5:7]),
        int(dt_str[8:10]),
        int(dt_str[11:13]),
        int(dt_str[14:16]),
    )

def parse_issue_datetime(dt_str: str) -> datetime:
    """Accept 'YYYY-MM-DD HH:MM:SS+02:00' or 'YYYY-MM-DD HH:MM:SS UTC'"""
    try:
        return datetime.fromisoformat(dt_str)
    except Exception:
        if dt_str.endswith(" UTC"):
            base = dt_str[:-4]
            return datetime.fromisoformat(base).replace(tzinfo=timezone.utc)
        raise

def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

# Looping over the files found in the historic data folder to get and save issue_datetimes.
# (Using a pickle cache file to avoid re-parsing in future executions)
if dir_path_pickle.is_file():
    if dir_path_pickle.stat().st_mtime < dir_path_mtime:
        dir_path_pickle.unlink()
        parse_files_and_create_cache = True
    else:
        with open(f"{dir_path.name}.pickle", "rb") as handle:
            issue_datetimes_info = pickle.load(handle)
            parse_files_and_create_cache = False
            print(f"Got issue datetimes from pickle cache file '{dir_path.name}.pickle'", file=sys.stderr)
else:
    parse_files_and_create_cache = True

if parse_files_and_create_cache:
    for file_path in dir_path.iterdir():
        if file_path.suffix != ".json":
            continue

        content = load_json(file_path)

        # skip files with no content
        if not content.get("data"):
            continue

        issue_datetime = parse_issue_datetime(content["issue_date"])
        issue_datetime = issue_datetime.astimezone(ZoneInfo(content["timezone"]))

        first_from_naive = parse_fixed_forecast_datetime(content["data"][0]["From yyyy-mm-dd hh:mm"])
        tz_fixed = get_and_cache_tz(content["data"][0]["UTC offset from (UTC+/-hhmm)"][-5:])
        first_from = first_from_naive.replace(tzinfo=tz_fixed)

        filename = file_path.name
        if issue_datetime in issue_datetimes_info:
            if issue_datetimes_info[issue_datetime].filename < filename:
                issue_datetimes_info[issue_datetime] = SimpleNamespace(filename=filename, first_from=first_from)
        else:
            issue_datetimes_info[issue_datetime] = SimpleNamespace(filename=filename, first_from=first_from)

    print(f"Wrote issue datetimes to pickle cache file '{dir_path.name}.pickle'", file=sys.stderr)
    with open(f"{dir_path.name}.pickle", "wb") as handle:
        pickle.dump(issue_datetimes_info, handle, protocol=pickle.HIGHEST_PROTOCOL)

# Choosing, for each day, the file whom issue_datetime (RANGE days ahead) is closest to the AVAILABLE_AT_TIME_STR time.
# That means choosing the file with the earlier closest issue_datetime respect to AVAILABLE_AT_TIME_STR within a limit of 24 hours
# For example:
# with  AVAILABLE_AT_TIME_STR=14:00  RANGE=1,
# for the day 02 abril, a candidate file should have an issue_datetime between 30 march 14:00 and 31 march 14:00
# and the choseen file will be those with earlier closest issue_datetime to 31 march 14:00

issue_datetimes = sorted(issue_datetimes_info.keys()) # all data...
len_issue_dates = len(issue_datetimes)

start_datetime = issue_datetimes[0].replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=RANGE)
end_datetime = issue_datetimes[-1].replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=RANGE)

if VERBOSE:
    print(
        "*********** First issue date:",
        issue_datetimes[0],
        "first From",
        issue_datetimes_info[issue_datetimes[0]].first_from,
        "in filename:",
        issue_datetimes_info[issue_datetimes[0]].filename,
        file=sys.stderr,
    )
    print(
        "***********  Last issue date:",
        issue_datetimes[-1],
        "first From",
        issue_datetimes_info[issue_datetimes[-1]].first_from,
        "in filename:",
        issue_datetimes_info[issue_datetimes[-1]].filename,
        file=sys.stderr,
    )

available_at_time = datetime.strptime(AVAILABLE_AT_TIME_STR, TIME_FORMAT).time()
index = 0
day_datetime = start_datetime
while day_datetime < end_datetime:
    tmp_dt = day_datetime.replace(
        tzinfo=None,
        hour=available_at_time.hour,
        minute=available_at_time.minute,
        second=0,
        microsecond=0,
    )
    avail_at_datetime = tmp_dt - timedelta(days=RANGE)
    # align tz (same tz as day_datetime)
    avail_at_datetime = avail_at_datetime.replace(tzinfo=day_datetime.tzinfo)

    # Choosing correct file
    while index < len_issue_dates:
        if issue_datetimes[index] > avail_at_datetime:
            break
        index += 1
    while index > 0:
        if issue_datetimes_info[issue_datetimes[index - 1]].first_from > day_datetime:
            index -= 1
        else:
            break
    if index > 0:
        issue_datetime = issue_datetimes[index - 1]
        filename = issue_datetimes_info[issue_datetime].filename
        first_from = issue_datetimes_info[issue_datetime].first_from

        choosen_files[day_datetime - timedelta(days=RANGE)] = SimpleNamespace(
            filename=filename,
            first_from=first_from,
            issue_datetime=issue_datetime
        )

    day_datetime = day_datetime + timedelta(days=1)

# Extracting pertinent data from each choosen file

# We'll collect forecasts keyed by their UTC instant to avoid duplicates (keep latest issue file)
forecasts_by_utc = {}
limits_cache = {}    # cache for per-day lower/upper UTC bounds
last_content = None

for pos_choosen_files, day_datetime in enumerate(sorted(choosen_files.keys())):
    day_date = day_datetime.date()

    if VERBOSE:
        print(
            f"| day: {day_date} "
            f"| issue_datetime: {choosen_files[day_datetime].issue_datetime} "
            f"| first_from: {choosen_files[day_datetime].first_from} "
            f"| filename: {choosen_files[day_datetime].filename}",
            file=sys.stderr,
        )
    else:
        print(".", end='', file=sys.stderr)

    issue_datetime = choosen_files[day_datetime].issue_datetime

    file_path = dir_path / choosen_files[day_datetime].filename
    filename = file_path.name
    content = load_json(file_path)
    last_content = content
    tz_final = ZoneInfo(content["timezone"])

    # naive day (no tz) for building local times
    naive_day = day_datetime.replace(tzinfo=None, hour=0, minute=0, second=0, microsecond=0)

    for pos_content_data, forecast in enumerate(content["data"]):
        # fast parse of forecast 'From' (fixed format)
        from_naive = parse_fixed_forecast_datetime(forecast["From yyyy-mm-dd hh:mm"])

        # parse UTC offset like '+0200' and cache timezone(delta)
        utc_offset_str = forecast["UTC offset from (UTC+/-hhmm)"][-5:]
        tz_fixed = get_and_cache_tz(utc_offset_str)

        # compute forecast instant in UTC (reliable regardless of DST)
        from_utc = from_naive.replace(tzinfo=tz_fixed).astimezone(timezone.utc)

        # prepare cache key for day in this final timezone
        tz_key = getattr(tz_final, "key", str(tz_final))
        key = (naive_day.year, naive_day.month, naive_day.day, tz_key)

        # compute lower/upper bounds in UTC, considering ambiguous times (fold=0/1)
        if key not in limits_cache:
            # lower local naive
            lower_local = datetime(naive_day.year, naive_day.month, naive_day.day,
                                    0, 0, 0, 0) + timedelta(days=RANGE)
            upper_local = datetime(naive_day.year, naive_day.month, naive_day.day,
                                    23, 59, 59, 999999) + timedelta(days=RANGE)

            lower_candidates = []
            upper_candidates = []
            # consider both folds (0 and 1) to cover ambiguous hour (end of DST) and be robust for non-existent hour
            for fold in (0, 1):
                try:
                    dt_lower = lower_local.replace(tzinfo=tz_final, fold=fold)
                    lower_candidates.append(dt_lower.astimezone(timezone.utc))
                except Exception:
                    pass
                try:
                    dt_upper = upper_local.replace(tzinfo=tz_final, fold=fold)
                    upper_candidates.append(dt_upper.astimezone(timezone.utc))
                except Exception:
                    pass

            # as a fallback (should not happen) add direct replacements
            if not lower_candidates:
                lower_candidates.append(lower_local.replace(tzinfo=tz_final).astimezone(timezone.utc))
            if not upper_candidates:
                upper_candidates.append(upper_local.replace(tzinfo=tz_final).astimezone(timezone.utc))

            lower_utc = min(lower_candidates)
            upper_utc = max(upper_candidates)

            limits_cache[key] = (lower_utc, upper_utc)

        lower_utc, upper_utc = limits_cache[key]

        # include forecast if its instant falls into UTC window
        if lower_utc <= from_utc < upper_utc:
            # copy forecast to avoid mutating original content object
            fc = dict(forecast)
            fc["origin_file"] = filename
            fc["origin_file_issue_date"] = content.get("issue_date")
            fc["origin_file_localized_issue_date"] = str(issue_datetime)

            key_ts = from_utc.isoformat()
            existing = forecasts_by_utc.get(key_ts)
            if existing is None:
                forecasts_by_utc[key_ts] = (fc, issue_datetime, from_utc)
            else:
                # keep the forecast from the file with the latest issue_datetime
                if issue_datetime > existing[1]:
                    forecasts_by_utc[key_ts] = (fc, issue_datetime, from_utc)

print(file=sys.stderr)
# build final sorted forecast list
forecasts = [entry[0] for key, entry in sorted(forecasts_by_utc.items(), key=lambda kv: kv[1][2])]

if not last_content:
    print("No content processed.", file=sys.stderr)
    sys.exit(1)

output_content = {
    "content_id": last_content["content_id"],
    "content_name": last_content["content_id"],
    "data": forecasts,
    "timezone": last_content.get("timezone"),
    "unit": last_content.get("unit"),
}
print(json.dumps(output_content, indent=2, ensure_ascii=False))
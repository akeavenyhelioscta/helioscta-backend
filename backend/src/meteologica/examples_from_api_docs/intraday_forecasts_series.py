from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from pathlib import Path
from zoneinfo import ZoneInfo

import sys
import json
import pickle
import functools
print = functools.partial(print, flush=True)

################################### Please configure according to your needs

# Specify folder path containing the historic content data downloaded with 'content_historic_data.py'

FOLDERNAME = "./usa_us48_wind_power_generation_forecast_meteologica_hourly/"

# Specify the offset to calculate the bidding closure time (SESSION_START_TIMES - OFFSET_SECONDS) for each session.
# Those will be used to choose the closest (earlier) forecasts available for each session.
# Must be in [0 .. 23*60*60] range

OFFSET_SECONDS = 60 * 60  # 1h:00m:00s

SESSIONS_TIME_STR = [  # HH:MM:SS     # Session
    "00:00:00",  # 0
    "01:00:00",  # 1
    "02:00:00",  # 2
    "03:00:00",  # 3
    "04:00:00",  # 4
    "05:00:00",  # 5
    "06:00:00",  # 6
    "07:00:00",  # 7
    "08:00:00",  # 8
    "09:00:00",  # 9
    "10:00:00",  # 10
    "11:00:00",  # 11
    "12:00:00",  # 12
    "13:00:00",  # 13
    "14:00:00",  # 14
    "15:00:00",  # 15
    "16:00:00",  # 16
    "17:00:00",  # 17
    "18:00:00",  # 18
    "19:00:00",  # 19
    "20:00:00",  # 20
    "21:00:00",  # 21
    "22:00:00",  # 22
    "23:00:00",  # 23
]

# SESSIONS_TIME_STR =  [  #HH:MM:SS      # Session
#                        "00:00:00",    # MI2
#                        "04:00:00",    # MI3
#                        "08:00:00",    # MI4
#                        "12:00:00",    # MI5
#                        "16:00:00",    # MI6
#                        "20:00:00"     # MI7
#                    ]

VERBOSE = 0 # to see summary of choosen files
################################### Nothing more to be configured below

TIME_FORMAT = "%H:%M:%S"

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

# Choosing, for each day and for each session, the file whom issue datetime is closest (earlier) to the session bidding closure datetime
# That means choosing the file with the earlier closest issue datetime respect to session bidding closure datetime within a limit of 24 hours from session start datetime

issue_datetimes = sorted(issue_datetimes_info.keys()) # all data...
len_issue_datetimes = len(issue_datetimes)

start_datetime = issue_datetimes[0].replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
end_datetime = issue_datetimes[-1].replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)

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

# The session bidding closure will be calculated using OFFSET_SECONDS for each session ...
SESSIONS_BIDDING_CLOSURE_TIME_STR = [None] * len(SESSIONS_TIME_STR)

# ... or it can be specified for EACH session and OFFSET_SECONDS will be IGNORED
# SESSIONS_BIDDING_CLOSURE_TIME_STR =  [
#                                        "16:30:00",   # MI2
#                                        "23:45:00",   # MI3
#                                        "03:45:00",   # MI4
#                                        "07:45:00",   # MI5
#                                        "11:15:00",   # MI6
#                                        "15:45:00",   # MI7
#                                    ]

assert len(SESSIONS_BIDDING_CLOSURE_TIME_STR) == len(SESSIONS_TIME_STR)

SESSIONS = []
for idx, t in enumerate(SESSIONS_TIME_STR):
    epoch_start_datetime = datetime.strptime(t, TIME_FORMAT)
    session_start_time = epoch_start_datetime.time()

    # End time = next session’s start, or wrap around to first
    try:
        session_end_time = datetime.strptime(SESSIONS_TIME_STR[idx + 1], TIME_FORMAT).time()
    except IndexError:
        session_end_time = datetime.strptime(SESSIONS_TIME_STR[0], TIME_FORMAT).time()

    # The session bidding closure will be calculated using OFFSET_SECONDS for each session ...
    # ... or it can be specified for EACH session and OFFSET_SECONDS will be IGNORED
    if SESSIONS_BIDDING_CLOSURE_TIME_STR[idx]:
        available_at_time = datetime.strptime(
            SESSIONS_BIDDING_CLOSURE_TIME_STR[idx], TIME_FORMAT
        ).time()
    else:
        available_at_time = (epoch_start_datetime - timedelta(seconds=OFFSET_SECONDS)).time()

    # Closure time can belong to the day before if it is later than the session start time
    closure_time_is_in_day_before = available_at_time > session_start_time
    SESSIONS.append((idx, session_start_time, available_at_time, closure_time_is_in_day_before, session_end_time))

for idx, session_start_time, available_at_time, closure_time_is_in_day_before, session_end_time in SESSIONS:
    index = 0
    day_datetime = start_datetime
    while day_datetime < end_datetime:
        choosen_files.setdefault(day_datetime - timedelta(days=1), {})

        tmp_dt = day_datetime.replace(
            tzinfo=None,
            hour=available_at_time.hour,
            minute=available_at_time.minute,
            second=available_at_time.second,
            microsecond=0,
        )
        if closure_time_is_in_day_before:
            session_bidding_closure_datetime = tmp_dt - timedelta(days=2)
        else:
            session_bidding_closure_datetime = tmp_dt - timedelta(days=1)
        # align tz (same tz as day_datetime)
        session_bidding_closure_datetime = session_bidding_closure_datetime.replace(tzinfo=day_datetime.tzinfo)

        tmp_dt = day_datetime.replace(
            tzinfo=None,
            hour=session_start_time.hour,
            minute=session_start_time.minute,
            second=session_start_time.second,
            microsecond=0,
        )
        session_bidding_start_datetime = tmp_dt - timedelta(days=1)
        # align tz (same tz as day_datetime)
        session_bidding_start_datetime = session_bidding_start_datetime.replace(tzinfo=day_datetime.tzinfo)

        # Choosing correct file: first search by issue_datetime until closure datetime and then select if there are data for this session in file
        while index < len_issue_datetimes:
            if issue_datetimes[index] > session_bidding_closure_datetime:
                break
            index += 1
        while index > 0:
            if issue_datetimes_info[issue_datetimes[index - 1]].first_from > session_bidding_start_datetime:
                index -= 1
            else:
                break
        if index > 0:
            issue_datetime = issue_datetimes[index - 1]
            filename = issue_datetimes_info[issue_datetime].filename
            first_from = issue_datetimes_info[issue_datetime].first_from

            choosen_files[day_datetime - timedelta(days=1)][idx] = SimpleNamespace(
                filename=filename,
                first_from=first_from,
                issue_datetime=issue_datetime,
                session_bidding_closure_datetime=session_bidding_closure_datetime,
                session_start_time=session_start_time,
                session_end_time=session_end_time,
            )

        day_datetime = day_datetime + timedelta(days=1)

# Extracting pertinent data from each choosen file

# We'll collect forecasts keyed by their UTC instant to avoid duplicates (keep latest issue file)
forecasts_by_utc = {}
limits_cache = {}    # cache for per-day/session lower/upper UTC bounds
last_content = None

for day_datetime in sorted(choosen_files.keys()):
    day_date = day_datetime.date()
    for session, info in choosen_files[day_datetime].items():
        filename = info.filename
        first_from = info.first_from
        issue_datetime = info.issue_datetime
        session_start_time = info.session_start_time
        session_end_time = info.session_end_time
        session_bidding_closure_datetime = info.session_bidding_closure_datetime

        if VERBOSE:
            print(
                f"| day: {day_date} "
                f"| session: {session:02} ({session_bidding_closure_datetime}) "
                f" {session_start_time} "
                f"- {session_end_time} "
                f"| issue_datetime: {issue_datetime} "
                f"| first_from: {first_from} "
                f"| filename: {filename}",
                file=sys.stderr,
            )
        else:
            print(".", end='', file=sys.stderr)

        file_path = dir_path / filename
        content = load_json(file_path)
        last_content = content
        tz_final = ZoneInfo(content["timezone"])

        # naive day (no tz) for building local times
        naive_day = day_datetime.replace(tzinfo=None, hour=0, minute=0, second=0, microsecond=0)

        for forecast in content["data"]:
            # fast parse of forecast 'From' (fixed format)
            from_naive = parse_fixed_forecast_datetime(forecast["From yyyy-mm-dd hh:mm"])

            # parse UTC offset like '+0200' and cache timezone(delta)
            utc_offset_str = forecast["UTC offset from (UTC+/-hhmm)"][-5:]
            tz_fixed = get_and_cache_tz(utc_offset_str)

            # compute forecast instant in UTC (reliable regardless of DST)
            from_utc = from_naive.replace(tzinfo=tz_fixed).astimezone(timezone.utc)

            # prepare cache key for session/day in this final timezone
            tz_key = getattr(tz_final, "key", str(tz_final))
            key = (naive_day.year, naive_day.month, naive_day.day, session, tz_key)

            # compute lower/upper bounds in UTC for this session, considering ambiguous times (fold=0/1)
            if key not in limits_cache:
                # lower local naive
                lower_local = datetime(naive_day.year, naive_day.month, naive_day.day,
                                        info.session_start_time.hour, info.session_start_time.minute, 0, 0)
                # upper local naive (same day or next day if end < start)
                if info.session_end_time < info.session_start_time:
                    upper_local = (lower_local + timedelta(days=1)).replace(hour=info.session_end_time.hour,
                                                                            minute=info.session_end_time.minute,
                                                                            second=0, microsecond=0)
                else:
                    upper_local = lower_local.replace(hour=info.session_end_time.hour,
                                                      minute=info.session_end_time.minute,
                                                      second=0, microsecond=0)

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

            # include forecast if its instant falls into session's UTC window
            if lower_utc <= from_utc < upper_utc:
                # copy forecast to avoid mutating original content object
                fc = dict(forecast)
                fc["origin_file"] = filename
                fc["origin_file_issue_date"] = content.get("issue_date")
                fc["origin_file_localized_issue"] = str(issue_datetime)
                fc["session_info"] = (
                    f"#{session:02} "
                    f"bidding_closure=({info.session_bidding_closure_datetime}) "
                    f"start={info.session_start_time} -> end={info.session_end_time} "
                )

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
#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ast
import json
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
PREFECT_ROOT = ROOT / "schedulers" / "prefect" / "src"
TASK_SCHEDULER_ROOT = ROOT / "schedulers" / "task_scheduler_azurepostgresql"
WSI_ROOT = ROOT / "backend" / "src" / "wsi"
OUTPUT_PATH = ROOT / "frontend" / "lib" / "generated" / "scrapeCatalog.json"

SOURCE_PRIORITY = {
    "prefect": 3,
    "task_scheduler": 2,
    "unknown": 1,
}

WEEKDAY_TO_NUM = {
    "monday": 1,
    "tuesday": 2,
    "wednesday": 3,
    "thursday": 4,
    "friday": 5,
    "saturday": 6,
    "sunday": 7,
}


def _to_repo_relative(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def _load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def _extract_string_constants(tree: ast.AST) -> dict[str, str]:
    constants: dict[str, str] = {}

    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            if len(node.targets) != 1:
                continue
            target = node.targets[0]
            if not isinstance(target, ast.Name):
                continue
            if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                constants[target.id] = node.value.value
        elif isinstance(node, ast.AnnAssign):
            if not isinstance(node.target, ast.Name):
                continue
            value = node.value
            if isinstance(value, ast.Constant) and isinstance(value.value, str):
                constants[node.target.id] = value.value

    return constants


def _resolve_str_expr(expr: ast.AST | None, constants: dict[str, str]) -> str | None:
    if expr is None:
        return None
    if isinstance(expr, ast.Constant) and isinstance(expr.value, str):
        return expr.value
    if isinstance(expr, ast.Name):
        return constants.get(expr.id)
    return None


def _infer_source_from_path(py_path: Path) -> str:
    rel = _to_repo_relative(py_path).lower()
    if "/postions_and_trades/" in rel:
        return "positions_and_trades"
    if "/wsi/" in rel:
        return "wsi"
    return "power"


def _infer_domain(source: str, py_path: Path) -> str:
    rel = _to_repo_relative(py_path).lower()
    parts = rel.split("/")

    if source == "wsi":
        return "wsi"

    if source == "positions_and_trades":
        if "/trade_breaks/" in rel or "nav_trade_breaks" in rel:
            return "trade_breaks"
        if "/email_sftp_files/" in rel or "/send_trade_files/" in rel:
            return "deliveries"
        if "/positions/" in rel or "position_files" in rel or "postion_files" in rel:
            return "positions"
        if "/trades/" in rel or "trade_files" in rel:
            return "trades"
        return "positions_and_trades"

    if "meteologica" in parts:
        return "meteologica"
    if "gridstatus_open_source" in parts:
        return "gridstatus_open_source"
    if "gridstatusio_api_key" in parts:
        return "gridstatusio_api_key"
    if "event_driven" in parts:
        return "event_driven"
    if "power" in parts:
        idx = parts.index("power")
        if idx + 1 < len(parts):
            return parts[idx + 1]
    return "power"


def _parse_python_metadata(py_path: Path) -> dict[str, Any]:
    text = _load_text(py_path)
    try:
        tree = ast.parse(text, filename=str(py_path))
    except SyntaxError:
        tree = ast.parse("", filename=str(py_path))

    constants = _extract_string_constants(tree)
    pipeline_name = constants.get("API_SCRAPE_NAME", py_path.stem)
    source: str | None = None

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        func = node.func
        is_pipeline_logger_call = (
            isinstance(func, ast.Name) and func.id == "PipelineRunLogger"
        ) or (
            isinstance(func, ast.Attribute) and func.attr == "PipelineRunLogger"
        )
        if not is_pipeline_logger_call:
            continue

        for kw in node.keywords:
            if kw.arg == "source":
                source = _resolve_str_expr(kw.value, constants)
                if source:
                    break
        if source:
            break

    if not source:
        source = _infer_source_from_path(py_path)

    return {
        "pipeline_name": pipeline_name,
        "source": source,
        "domain": _infer_domain(source, py_path),
    }


def _strip_wrapping_quotes(value: str) -> str:
    value = value.strip()
    if (value.startswith('"') and value.endswith('"')) or (
        value.startswith("'") and value.endswith("'")
    ):
        return value[1:-1]
    return value


def _parse_prefect_yaml(prefect_file: Path) -> list[dict[str, Any]]:
    lines = _load_text(prefect_file).splitlines()
    deployments: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    for line in lines:
        m_name = re.match(r"^\s{2}-\s+name:\s*(.+?)\s*$", line)
        if m_name:
            if current:
                deployments.append(current)
            current = {
                "name": _strip_wrapping_quotes(m_name.group(1)),
                "entrypoint": None,
                "tags": [],
                "cron": None,
                "timezone": None,
            }
            continue

        if current is None:
            continue

        m_entrypoint = re.match(r"^\s{4}entrypoint:\s*(.+?)\s*$", line)
        if m_entrypoint:
            current["entrypoint"] = _strip_wrapping_quotes(m_entrypoint.group(1))
            continue

        m_tags = re.match(r"^\s{4}tags:\s*\[(.*?)\]\s*$", line)
        if m_tags:
            tag_blob = m_tags.group(1).strip()
            if tag_blob:
                current["tags"] = [
                    _strip_wrapping_quotes(tag.strip())
                    for tag in tag_blob.split(",")
                    if tag.strip()
                ]
            continue

        m_cron = re.match(r'^\s{6}-\s*cron:\s*"([^"]+)"\s*$', line)
        if m_cron:
            current["cron"] = m_cron.group(1).strip()
            continue

        m_timezone = re.match(r'^\s{8}timezone:\s*"([^"]+)"\s*$', line)
        if m_timezone:
            current["timezone"] = m_timezone.group(1).strip()
            continue

    if current:
        deployments.append(current)

    return deployments


def _extract_ps1_array(text: str, variable_name: str) -> list[str]:
    pattern = re.compile(
        rf"\${re.escape(variable_name)}\s*=\s*@\((.*?)\)",
        re.IGNORECASE | re.DOTALL,
    )
    match = pattern.search(text)
    if not match:
        return []
    return [item.strip() for item in re.findall(r"'([^']+)'", match.group(1))]


def _extract_python_script_path_from_ps1(text: str) -> Path | None:
    match = re.search(
        r'\$PythonScript\d*\s*=\s*"([^"]+\.py)"',
        text,
        re.IGNORECASE,
    )
    if not match:
        return None
    return Path(match.group(1))


def _windows_abs_to_repo_rel(path: Path) -> Path | None:
    path_str = str(path).replace("/", "\\")
    marker = "backend\\src\\"
    idx = path_str.lower().find(marker.lower())
    if idx == -1:
        return None
    rel = path_str[idx:].replace("\\", "/")
    return Path(rel)


def _extract_task_name(text: str) -> str | None:
    match = re.search(r'-TaskName\s+"([^"]+)"', text, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return None


def _parse_prefect_entries() -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []

    for prefect_file in sorted(PREFECT_ROOT.rglob("prefect.yaml")):
        for deployment in _parse_prefect_yaml(prefect_file):
            entrypoint = deployment.get("entrypoint")
            if not entrypoint:
                continue

            entrypoint_path_str = entrypoint.split(":")[0].strip()
            py_path = ROOT / Path(entrypoint_path_str)
            if not py_path.exists():
                continue

            meta = _parse_python_metadata(py_path)
            entries.append(
                {
                    "pipeline_name": meta["pipeline_name"],
                    "source": meta["source"],
                    "domain": meta["domain"],
                    "orchestrator": "prefect",
                    "schedule_kind": "cron",
                    "timezone": deployment.get("timezone") or "America/Edmonton",
                    "cron": deployment.get("cron"),
                    "entrypoint": entrypoint_path_str.replace("\\", "/"),
                    "deployment_name": deployment.get("name"),
                    "tags": deployment.get("tags") or [],
                }
            )

    return entries


def _parse_task_scheduler_entries() -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    ps1_files = sorted(
        p
        for p in TASK_SCHEDULER_ROOT.rglob("*.ps1")
        if p.name.lower() not in {"register_all_tasks.ps1", "unregister_all_tasks.ps1"}
    )

    for ps1_file in ps1_files:
        text = _load_text(ps1_file)
        script_abs = _extract_python_script_path_from_ps1(text)
        if script_abs is None:
            continue

        script_rel = _windows_abs_to_repo_rel(script_abs)
        if script_rel is None:
            continue
        py_path = ROOT / script_rel
        if not py_path.exists():
            continue

        meta = _parse_python_metadata(py_path)
        day_names = _extract_ps1_array(text, "days")
        weekdays = sorted(
            {
                WEEKDAY_TO_NUM[d.lower()]
                for d in day_names
                if d.lower() in WEEKDAY_TO_NUM
            }
        )
        times_local = sorted(set(_extract_ps1_array(text, "times")))
        task_name = _extract_task_name(text)

        entries.append(
            {
                "pipeline_name": meta["pipeline_name"],
                "source": meta["source"],
                "domain": meta["domain"],
                "orchestrator": "task_scheduler",
                "schedule_kind": "weekly_times",
                "timezone": "America/Denver",
                "weekdays": weekdays,
                "times_local": times_local,
                "entrypoint": _to_repo_relative(py_path),
                "deployment_name": task_name,
                "tags": ["task_scheduler"],
            }
        )

    return entries


def _parse_wsi_unknown_entries(existing_keys: set[tuple[str, str]]) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []

    for py_path in sorted(WSI_ROOT.rglob("*.py")):
        if py_path.name.startswith("__"):
            continue
        meta = _parse_python_metadata(py_path)
        key = (meta["source"], meta["pipeline_name"])
        if meta["source"] != "wsi":
            continue
        if key in existing_keys:
            continue
        entries.append(
            {
                "pipeline_name": meta["pipeline_name"],
                "source": "wsi",
                "domain": "wsi",
                "orchestrator": "unknown",
                "schedule_kind": "unknown",
                "timezone": "America/Denver",
                "stale_fallback_hours": 24,
                "entrypoint": _to_repo_relative(py_path),
                "tags": [],
            }
        )

    return entries


def _dedupe(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    best: dict[tuple[str, str], dict[str, Any]] = {}
    for entry in entries:
        key = (entry["source"], entry["pipeline_name"])
        current = best.get(key)
        if current is None:
            best[key] = entry
            continue

        cur_priority = SOURCE_PRIORITY.get(current["orchestrator"], 0)
        new_priority = SOURCE_PRIORITY.get(entry["orchestrator"], 0)
        if new_priority > cur_priority:
            best[key] = entry

    return sorted(best.values(), key=lambda x: (x["source"], x["pipeline_name"]))


def _normalize_entries(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for entry in entries:
        item: dict[str, Any] = {
            "pipeline_name": entry["pipeline_name"],
            "source": entry["source"],
            "domain": entry["domain"],
            "orchestrator": entry["orchestrator"],
            "schedule_kind": entry["schedule_kind"],
            "timezone": entry["timezone"],
        }
        optional_keys = [
            "cron",
            "weekdays",
            "times_local",
            "stale_fallback_hours",
            "entrypoint",
            "deployment_name",
            "tags",
        ]
        for key in optional_keys:
            value = entry.get(key)
            if value is None:
                continue
            if isinstance(value, list) and len(value) == 0 and key != "tags":
                continue
            item[key] = value
        normalized.append(item)
    return normalized


def build_catalog() -> list[dict[str, Any]]:
    prefect_entries = _parse_prefect_entries()
    task_entries = _parse_task_scheduler_entries()
    merged = prefect_entries + task_entries
    keys = {(row["source"], row["pipeline_name"]) for row in merged}
    merged.extend(_parse_wsi_unknown_entries(keys))
    deduped = _dedupe(merged)
    return _normalize_entries(deduped)


def _format_json(payload: list[dict[str, Any]]) -> str:
    return json.dumps(payload, indent=2, sort_keys=False) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate scrape monitoring catalog JSON.")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate generated output without writing files.",
    )
    args = parser.parse_args()

    catalog = build_catalog()
    rendered = _format_json(catalog)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    existing = OUTPUT_PATH.read_text(encoding="utf-8") if OUTPUT_PATH.exists() else ""

    if args.check:
        if existing != rendered:
            print(
                "scrapeCatalog.json is out of date. "
                "Run: python scripts/generate_scrape_catalog.py",
                file=sys.stderr,
            )
            return 1
        print("scrapeCatalog.json is up to date.")
        return 0

    OUTPUT_PATH.write_text(rendered, encoding="utf-8")
    print(f"Wrote {len(catalog)} catalog entries to {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

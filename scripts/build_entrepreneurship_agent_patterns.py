from __future__ import annotations

import argparse
import ast
import json
import math
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from statistics import median
from typing import Any, Iterable


ROLE_FAMILIES = {
    3: "supplier",
    4: "supplier",
    5: "supplier",
    6: "producer",
    7: "producer",
    8: "producer",
    9: "trader",
    10: "trader",
    11: "trader",
}
PROFILE_LABELS = (
    ("proactive", "Proactief"),
    ("steady", "Gestaag"),
    ("deliberate", "Bedachtzaam"),
)
BURST_THRESHOLD_SECONDS = 30
LONG_PAUSE_THRESHOLD_SECONDS = 120


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Bouw geaggregeerde, anonieme agentpatronen uit de Entrepreneurship SQL-dump."
    )
    default_source = (
        Path(__file__).resolve().parents[2]
        / "Leerpret"
        / "data"
        / "LEARNGame Entrepreneurship digital"
        / "20260724_TEG_SST.sql"
    )
    default_output = (
        Path(__file__).resolve().parents[1]
        / "data"
        / "agent-behavior"
        / "entrepreneurship-human-patterns.v1.json"
    )
    parser.add_argument("--input", type=Path, default=default_source)
    parser.add_argument("--output", type=Path, default=default_output)
    parser.add_argument(
        "--javascript-output",
        type=Path,
        default=default_output.with_suffix(".js"),
    )
    return parser.parse_args()


def insert_rows(sql: str, table: str) -> list[tuple[Any, ...]]:
    match = re.search(
        rf"^INSERT INTO `{re.escape(table)}` VALUES (.*);$",
        sql,
        flags=re.MULTILINE,
    )
    if not match:
        raise ValueError(f"Geen INSERT-regel gevonden voor tabel {table}.")
    python_values = re.sub(r"\bNULL\b", "None", match.group(1))
    rows = ast.literal_eval(f"[{python_values}]")
    if not isinstance(rows, list):
        raise ValueError(f"Onverwachte waarden voor tabel {table}.")
    return rows


def percentile(values: Iterable[float], fraction: float) -> float:
    ordered = sorted(float(value) for value in values)
    if not ordered:
        return 0.0
    position = (len(ordered) - 1) * fraction
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


def distribution(values: Iterable[float]) -> dict[str, float]:
    materialized = list(values)
    return {
        "p10": round(percentile(materialized, 0.10), 2),
        "p25": round(percentile(materialized, 0.25), 2),
        "median": round(percentile(materialized, 0.50), 2),
        "p75": round(percentile(materialized, 0.75), 2),
        "p90": round(percentile(materialized, 0.90), 2),
    }


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def safe_ratio(numerator: float, denominator: float, fallback: float = 1.0) -> float:
    return numerator / denominator if denominator > 0 else fallback


def player_activity_rows(
    participants: list[tuple[Any, ...]],
    transactions: list[tuple[Any, ...]],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    role_by_player = {
        (str(game_code).upper(), int(player_number)): int(role_id)
        for game_code, _email, player_number, role_id, _balance in participants
        if player_number is not None and role_id is not None
    }
    game_transactions: dict[str, list[tuple[datetime, int, int, int]]] = defaultdict(list)
    for game_code, timestamp, from_player, to_player, amount in transactions:
        normalized_code = str(game_code).upper()
        game_transactions[normalized_code].append(
            (
                datetime.fromisoformat(str(timestamp)),
                int(from_player),
                int(to_player),
                int(amount),
            )
        )

    activities: dict[tuple[str, int], list[tuple[datetime, int]]] = defaultdict(list)
    valid_transaction_count = 0
    game_bounds: dict[str, tuple[datetime, datetime]] = {}
    for game_code, rows in game_transactions.items():
        rows.sort(key=lambda item: item[0])
        game_bounds[game_code] = (rows[0][0], rows[-1][0])
        for timestamp, from_player, to_player, _amount in rows:
            found_relevant_player = False
            for player_number, partner_number in (
                (from_player, to_player),
                (to_player, from_player),
            ):
                if role_by_player.get((game_code, player_number)) in ROLE_FAMILIES:
                    activities[(game_code, player_number)].append((timestamp, partner_number))
                    found_relevant_player = True
            if found_relevant_player:
                valid_transaction_count += 1

    rows: list[dict[str, Any]] = []
    for (game_code, player_number), events in activities.items():
        role_id = role_by_player[(game_code, player_number)]
        events.sort(key=lambda item: item[0])
        if len(events) < 2:
            continue
        game_start, game_end = game_bounds[game_code]
        game_duration = max(1.0, (game_end - game_start).total_seconds())
        gaps = [
            max(0.0, (current[0] - previous[0]).total_seconds())
            for previous, current in zip(events, events[1:])
        ]
        phases = Counter(
            min(2, int(((timestamp - game_start).total_seconds() / game_duration) * 3))
            for timestamp, _partner in events
        )
        rows.append(
            {
                "family": ROLE_FAMILIES[role_id],
                "actions": len(events),
                "first_offset": max(0.0, (events[0][0] - game_start).total_seconds()),
                "gaps": gaps,
                "median_gap": median(gaps),
                "burst_rate": sum(gap <= BURST_THRESHOLD_SECONDS for gap in gaps) / len(gaps),
                "long_pause_rate": sum(gap >= LONG_PAUSE_THRESHOLD_SECONDS for gap in gaps) / len(gaps),
                "phase_counts": [phases[index] for index in range(3)],
            }
        )

    timestamps = [row[0] for values in game_transactions.values() for row in values]
    source_summary = {
        "gamesWithTransactions": len(game_transactions),
        "participants": len(participants),
        "transactions": len(transactions),
        "transactionsUsed": valid_transaction_count,
        "playerSeriesUsed": len(rows),
        "period": {
            "from": min(timestamps).date().isoformat() if timestamps else None,
            "through": max(timestamps).date().isoformat() if timestamps else None,
        },
    }
    return rows, source_summary


def summarize_profile(
    profile_id: str,
    label: str,
    rows: list[dict[str, Any]],
    family_median_gap: float,
    family_size: int,
) -> dict[str, Any]:
    gaps = [gap for row in rows for gap in row["gaps"]]
    cluster_median_gap = percentile([row["median_gap"] for row in rows], 0.50)
    pace_ratio = safe_ratio(cluster_median_gap, family_median_gap)
    p50 = max(1.0, percentile(gaps, 0.50))
    p90 = percentile(gaps, 0.90)
    return {
        "id": profile_id,
        "label": label,
        "weight": round(len(rows) / family_size, 4),
        "samplePlayers": len(rows),
        "processingMultiplier": round(clamp(math.sqrt(pace_ratio), 0.72, 1.48), 3),
        "transferMultiplier": round(clamp(pace_ratio ** 0.35, 0.78, 1.38), 3),
        "hesitationChance": round(
            clamp(sum(row["long_pause_rate"] for row in rows) / len(rows), 0.02, 0.35),
            4,
        ),
        "hesitationMultiplier": [
            1.35,
            round(clamp(p90 / p50, 1.6, 3.5), 2),
        ],
        "burstChance": round(
            clamp(sum(row["burst_rate"] for row in rows) / len(rows), 0.04, 0.65),
            4,
        ),
    }


def summarize_family(family: str, rows: list[dict[str, Any]]) -> dict[str, Any]:
    gaps = [gap for row in rows for gap in row["gaps"]]
    median_gaps = [row["median_gap"] for row in rows]
    lower = percentile(median_gaps, 1 / 3)
    upper = percentile(median_gaps, 2 / 3)
    clusters = {profile_id: [] for profile_id, _label in PROFILE_LABELS}
    for row in rows:
        profile_id = (
            "proactive"
            if row["median_gap"] <= lower
            else "steady"
            if row["median_gap"] <= upper
            else "deliberate"
        )
        clusters[profile_id].append(row)

    phase_counts = [
        sum(row["phase_counts"][phase] for row in rows)
        for phase in range(3)
    ]
    total_phase_actions = sum(phase_counts) or 1
    phase_shares = [count / total_phase_actions for count in phase_counts]
    family_median_gap = max(1.0, percentile(median_gaps, 0.50))
    profiles = []
    for profile_id, label in PROFILE_LABELS:
        cluster_rows = clusters[profile_id]
        if cluster_rows:
            profiles.append(
                summarize_profile(
                    profile_id,
                    label,
                    cluster_rows,
                    family_median_gap,
                    len(rows),
                )
            )

    return {
        "samplePlayers": len(rows),
        "observedActions": sum(row["actions"] for row in rows),
        "firstActionOffsetSeconds": distribution(row["first_offset"] for row in rows),
        "interActionSeconds": distribution(gaps),
        "actionsPerPlayer": distribution(row["actions"] for row in rows),
        "burstThresholdSeconds": BURST_THRESHOLD_SECONDS,
        "burstRate": round(sum(row["burst_rate"] for row in rows) / len(rows), 4),
        "longPauseThresholdSeconds": LONG_PAUSE_THRESHOLD_SECONDS,
        "longPauseRate": round(sum(row["long_pause_rate"] for row in rows) / len(rows), 4),
        "activityByPhase": {
            "early": round(phase_shares[0], 4),
            "middle": round(phase_shares[1], 4),
            "late": round(phase_shares[2], 4),
        },
        "profiles": profiles,
    }


def build_payload(sql_path: Path) -> dict[str, Any]:
    sql = sql_path.read_text(encoding="utf-8")
    participants = insert_rows(sql, "participants")
    transactions = insert_rows(sql, "transactions")
    activity_rows, source_summary = player_activity_rows(participants, transactions)
    families = {
        family: summarize_family(
            family,
            [row for row in activity_rows if row["family"] == family],
        )
        for family in ("supplier", "producer", "trader")
    }
    return {
        "schemaVersion": "entrepreneurship-human-agent-patterns-v1",
        "generatedFrom": sql_path.name,
        "sourceSummary": source_summary,
        "privacy": {
            "aggregationOnly": True,
            "containsEmailAddresses": False,
            "containsGameCodes": False,
            "containsIndividualTimelines": False,
            "minimumOutputUnit": "role-family profile",
        },
        "interpretation": {
            "purpose": "Lokale agentvariatie zonder LLM- of API-aanroepen.",
            "supportedSignals": [
                "relative processing pace",
                "transfer pace",
                "short action bursts",
                "long hesitation pauses",
                "activity over early, middle and late game phases",
            ],
            "unsupportedInferences": [
                "logistics error probability",
                "product quantity preference",
                "individual personality or identity",
            ],
        },
        "roleMapping": {
            "customer": "trader",
            "operations": "trader",
            "srm": "supplier",
            "pd1": "producer",
            "pd2": "producer",
            "pd3": "producer",
            "ssf": "trader",
        },
        "roleFamilies": families,
    }


def main() -> None:
    args = parse_args()
    payload = build_payload(args.input.resolve())
    json_text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json_text, encoding="utf-8")
    args.javascript_output.parent.mkdir(parents=True, exist_ok=True)
    args.javascript_output.write_text(
        "window.EntrepreneurshipAgentPatterns = Object.freeze("
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ");\n",
        encoding="utf-8",
    )
    print(
        f"{payload['sourceSummary']['transactions']} transacties verwerkt; "
        f"{payload['sourceSummary']['playerSeriesUsed']} anonieme spelersreeksen samengevat."
    )


if __name__ == "__main__":
    main()

from __future__ import annotations

import json
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def dotenv(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def setting(name: str, defaults: dict[str, str], local: dict[str, str]) -> str:
    value = os.getenv(name) or local.get(name) or defaults.get(name)
    if not value:
        raise SystemExit(f"Ontbrekende configuratie: {name}")
    return value


defaults = dotenv(ROOT / ".env.example")
local = dotenv(ROOT / ".env")
config = {
    "apiBase": setting("LEERPRET_API_URL", defaults, local),
    "appUrl": setting("LEARNGAME_OM_URL", defaults, local),
    "dashboardUrl": setting("LEERPRET_DASHBOARD_URL", defaults, local),
    "editorUrl": setting("LEERBOX_EDITOR_URL", defaults, local),
}
payload = (
    "window.LEARNGAME_OM_CONFIG = Object.freeze("
    + json.dumps(config, ensure_ascii=False, indent=2)
    + ");\n"
)
target = ROOT / "runtime-config.js"
target.write_text(payload, encoding="utf-8")
print(f"Runtimeconfiguratie geschreven: {target}")

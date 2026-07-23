from __future__ import annotations

import json
import re
import unittest
from pathlib import Path


PRODUCT_ROOT = Path(__file__).resolve().parents[1]


class ProductPackageTests(unittest.TestCase):
    def test_declared_entrypoint_and_fixtures_exist(self) -> None:
        manifest = json.loads((PRODUCT_ROOT / "product.json").read_text(encoding="utf-8"))
        declared = [
            manifest["entrypoint"],
            *manifest["public_contracts"],
            *manifest["fixtures"],
        ]
        missing = [relative_path for relative_path in declared if not (PRODUCT_ROOT / relative_path).is_file()]
        self.assertEqual([], missing)

    def test_html_uses_only_present_local_assets(self) -> None:
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        references = re.findall(r"""(?:src|href)=["']([^"'#?]+)""", html)
        local_references = [
            reference
            for reference in references
            if not reference.startswith(("http://", "https://", "data:", "/"))
        ]
        missing = [reference for reference in local_references if not (PRODUCT_ROOT / reference).is_file()]
        self.assertEqual([], missing)

    def test_pwa_identity_is_location_independent(self) -> None:
        manifest = json.loads((PRODUCT_ROOT / "manifest.webmanifest").read_text(encoding="utf-8"))
        self.assertEqual("./", manifest["id"])
        self.assertTrue(manifest["start_url"].startswith("./"))
        self.assertEqual("./", manifest["scope"])

    def test_runtime_exposes_versioned_events_without_dropping_legacy_events(self) -> None:
        script = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        self.assertIn("getInteractionBuffer", script)
        self.assertIn("getContractEventBuffer", script)
        self.assertIn('specversion: "1.0"', script)
        self.assertIn("contract_events", script)

    def test_local_contract_is_the_host_contract_snapshot(self) -> None:
        local_contract_path = PRODUCT_ROOT / "contracts/events/leerpret-interaction-event-v1.schema.json"
        local_contract = json.loads(local_contract_path.read_text(encoding="utf-8"))
        self.assertEqual("Leerpret interaction event v1", local_contract["title"])
        self.assertIn("data", local_contract["required"])
        host_contract_candidates = (
            PRODUCT_ROOT.parents[1] / "contracts/events/leerpret-interaction-event-v1.schema.json",
            PRODUCT_ROOT.parent / "Leerpret/contracts/events/leerpret-interaction-event-v1.schema.json",
        )
        host_contract_path = next((path for path in host_contract_candidates if path.is_file()), None)
        if host_contract_path:
            self.assertEqual(
                json.loads(host_contract_path.read_text(encoding="utf-8")),
                local_contract,
                "Werk de contractsnapshot bij voordat het publieke contract wijzigt.",
            )


if __name__ == "__main__":
    unittest.main()

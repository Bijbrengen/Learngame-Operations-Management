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

    def test_isometric_logistics_view_is_separate_and_configurable(self) -> None:
        renderer = (PRODUCT_ROOT / "isometric-logistics-view.js").read_text(encoding="utf-8")
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("window.IsometricLogisticsView", renderer)
        self.assertIn("isometric-logistics-view.js", html)
        self.assertIn("sortedDepartments", renderer)
        self.assertIn("iso-overlay-layer", renderer)
        self.assertIn("Math.max(...floor.map", renderer)
        self.assertIn("departmentColor", game)
        self.assertIn('departmentColor: "raw"', game)
        self.assertIn('departmentColor: "production-a"', game)
        self.assertIn('departmentColor: "production-b"', game)
        self.assertIn('departmentColor: "production-c"', game)
        self.assertIn('departmentColor: "finished"', game)
        self.assertIn('{ from: "inbound", to: "production_1", kind: "material"', game)
        self.assertIn('{ from: "inbound", to: "production_2", kind: "material"', game)
        self.assertIn('{ from: "inbound", to: "production_3", kind: "material"', game)
        product_connections = game.split("const ISOMETRIC_DEPARTMENT_CONNECTIONS = [", 1)[1].split("];", 1)[0]
        self.assertEqual(
            3,
            len(re.findall(r'\{ from: "inbound", to: "production_[123]", kind: "material"', product_connections)),
        )
        self.assertIn('{ from: "production_1", to: "quality", kind: "material"', game)
        self.assertIn('{ from: "production_2", to: "quality", kind: "material"', game)
        self.assertIn('{ from: "production_3", to: "quality", kind: "material"', game)
        self.assertIn('{ from: "quality", to: "dispatch", kind: "customer"', game)
        self.assertNotIn("junctionMarkup", renderer)
        self.assertNotIn("scene.junctions", renderer)
        self.assertIn("setVisibleLogisticsDepartments", game)
        self.assertIn("LOGISTICS_ORGANIZATION_VARIANTS", game)
        self.assertIn('logisticsOrganization: "product"', game)
        self.assertIn("FUNCTIONAL_ISOMETRIC_DEPARTMENT_CONNECTIONS", game)
        self.assertIn('{ from: "production_1", to: "production_2", kind: "material" }', game)
        self.assertIn("setLogisticsOrganizationVariant", game)
        self.assertIn('id="logisticsOrganizationSelect"', html)
        self.assertIn('setProcessView("isometric")', game)

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

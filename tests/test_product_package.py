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

    def test_character_creation_runs_both_ipsative_scans_before_tutorial(self) -> None:
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        wizard = (PRODUCT_ROOT / "character-creation.js").read_text(encoding="utf-8")
        stylesheet = (PRODUCT_ROOT / "style.css").read_text(encoding="utf-8")
        service_worker = (PRODUCT_ROOT / "service-worker.js").read_text(encoding="utf-8")
        self.assertIn('id="characterCreationGate"', html)
        self.assertIn('src="character-creation.js"', html)
        self.assertLess(html.index('src="character-creation.js"'), html.index('src="script.js"'))
        self.assertIn("basic_style", wizard)
        self.assertIn("response_style", wizard)
        trait_block = wizard.split("const TRAIT_GROUPS = [", 1)[1].split(
            "];\n\n  const freshAllocations",
            1,
        )[0]
        self.assertEqual(10, len(re.findall(r"^    \[$", trait_block, flags=re.MULTILINE)))
        self.assertIn("Meeste punten = past het minst", wizard)
        self.assertIn("Meeste punten = past het best onder druk", wizard)
        self.assertIn("Math.min(10, 20 - totalWithoutCurrent", wizard)
        self.assertIn('PROFILE_ENDPOINT = "/v1/player/behavior-profile"', wizard)
        self.assertIn("behavior-profile-completed", wizard)
        self.assertIn(".character-creation-active .app-shell", stylesheet)
        self.assertIn('"./character-creation.js"', service_worker)

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

    def test_interactive_lego_builder_uses_the_three_source_products(self) -> None:
        builder = (PRODUCT_ROOT / "lego-builder.js").read_text(encoding="utf-8")
        renderer = (PRODUCT_ROOT / "lego-tower-renderer.js").read_text(encoding="utf-8")
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        assets = [
            "assets/lego/tutorial-step-1.gif",
            "assets/lego/tutorial-step-2.gif",
            "assets/lego/tutorial-step-3.gif",
            "assets/lego/tower-a.png",
            "assets/lego/tower-b.png",
            "assets/lego/tower-c.png",
        ]
        self.assertTrue(all((PRODUCT_ROOT / asset).is_file() for asset in assets))
        self.assertIn('src="lego-builder.js"', html)
        self.assertIn('id="legoBuilderMount"', html)
        self.assertIn("window.LegoTowerRenderer.renderPart", builder)
        self.assertIn("supportedLayer", builder)
        self.assertIn("boardProjection", builder)
        self.assertIn("snapCandidate", builder)
        self.assertIn("LegoTowerRenderer.brick", builder)
        self.assertIn("builder-isometric-scene", builder)
        self.assertIn("validateBuild", builder)
        self.assertIn("normalizedSignature", builder)
        self.assertIn("tutorialRotationForPiece", builder)
        self.assertIn("dragstart", builder)
        self.assertIn("grid", builder.lower())
        self.assertIn('towerBlueprint: { lower: "yellow", middle: "red", upper: "white"', game)
        self.assertIn('towerBlueprint: { lower: "blue", middle: "yellow", upper: "green"', game)
        self.assertIn('towerBlueprint: { lower: "white", middle: "blue", upper: "red"', game)
        self.assertIn('A: { lower: "yellow", middle: "red", upper: "white"', renderer)
        self.assertIn("getLegoBuilderSnapshot", game)

    def test_tutorial_step_two_collects_stock_in_the_isometric_view(self) -> None:
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        renderer = (PRODUCT_ROOT / "isometric-logistics-view.js").read_text(encoding="utf-8")
        builder = (PRODUCT_ROOT / "lego-builder.js").read_text(encoding="utf-8")
        styles = (PRODUCT_ROOT / "style.css").read_text(encoding="utf-8")
        self.assertIn("LOGISTICS_TUTORIAL_REQUIREMENTS", game)
        self.assertIn('blue_8: 2', game)
        self.assertIn('yellow_4: 1', game)
        self.assertIn('green_4: 1', game)
        self.assertIn('"tutorial_warehouse_a"', game)
        self.assertIn('"tutorial_warehouse_b"', game)
        self.assertIn('"tutorial_warehouse_c"', game)
        self.assertIn('"tutorial_player_stock"', game)
        self.assertIn('"tutorial_assembly"', game)
        self.assertIn("startLogisticsTutorial", game)
        self.assertIn("collectTutorialMaterial", game)
        self.assertIn("transferTutorialStockToAssembly", game)
        self.assertIn('actionType: "collect_tutorial_material"', game)
        self.assertIn('actionType: "complete_logistics_tutorial_step"', game)
        self.assertIn('actionType === "complete_lego_tutorial"', game)
        self.assertIn('actionType === "complete_stock_tutorial_build"', game)
        self.assertIn('prepareStockTutorial("B")', game)
        self.assertIn("setStockTutorialInventory", game)
        self.assertIn("setFreeBuildUnlocked", builder)
        self.assertIn("freeBuildUnlocked", builder)
        self.assertIn("stock_waiting", builder)
        self.assertIn("stock_build", builder)
        self.assertIn("availableStock", builder)
        self.assertIn("prepareStockTutorial", builder)
        self.assertIn("setStockTutorialInventory", builder)
        self.assertIn("badgeValue", renderer)
        self.assertIn("iso-tutorial-banner", renderer)
        self.assertIn("onDepartmentAction", renderer)
        self.assertIn("is-highlighted", renderer)
        self.assertIn(".iso-department.is-highlighted", styles)
        self.assertIn(".iso-department.is-locked", styles)
        self.assertIn("openRoof: true", game)
        self.assertIn("stockVisuals", game)
        self.assertIn("distractorPart", game)
        self.assertIn("dropTutorialMaterial", game)
        self.assertIn("wrong_brick_format", game)
        self.assertIn('dropLabel: "BOUWAFDELING"', game)
        self.assertIn("openWarehouseMarkup", renderer)
        self.assertIn("iso-stock-brick", renderer)
        self.assertIn("data-stock-source-id", renderer)
        self.assertIn("onStockDrop", renderer)
        self.assertIn("pointerdown", renderer)
        self.assertIn("is-drop-target", renderer)
        self.assertIn(".iso-building-interior", styles)
        self.assertIn(".iso-stock-brick.is-draggable", styles)
        self.assertIn(".iso-department.is-drop-target.is-drag-over", styles)

    def test_tutorial_step_three_transfers_the_semi_finished_product(self) -> None:
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        builder = (PRODUCT_ROOT / "lego-builder.js").read_text(encoding="utf-8")
        readme = (PRODUCT_ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("INTERNAL_LOGISTICS_TUTORIAL_DEPARTMENTS", game)
        self.assertIn('"tutorial_production"', game)
        self.assertIn('"tutorial_next_department"', game)
        self.assertIn("startInternalLogisticsTutorial", game)
        self.assertIn("transferTutorialSemiFinished", game)
        self.assertIn("finishInternalLogisticsTutorial", game)
        self.assertIn('actionType: "start_internal_logistics_tutorial_step"', game)
        self.assertIn('actionType: "complete_internal_logistics_tutorial_step"', game)
        self.assertIn('actionType === "complete_stock_tutorial_build"', game)
        self.assertIn("semiFinished", game)
        self.assertIn("setInternalLogisticsComplete", builder)
        self.assertIn("internalLogisticsComplete", builder)
        self.assertIn("complete_stock_tutorial_build", builder)
        self.assertIn("Interne Logistiek", readme)
        self.assertIn("cargoVisual", game)
        self.assertIn("acceptsCargoDrop", game)
        self.assertIn("dropTutorialSemiFinished", game)
        self.assertIn("towerCargoMarkup", (PRODUCT_ROOT / "isometric-logistics-view.js").read_text(encoding="utf-8"))
        self.assertIn("onCargoDrop", (PRODUCT_ROOT / "isometric-logistics-view.js").read_text(encoding="utf-8"))

    def test_authenticated_experience_starts_in_tutorial_focus_mode(self) -> None:
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        builder = (PRODUCT_ROOT / "lego-builder.js").read_text(encoding="utf-8")
        styles = (PRODUCT_ROOT / "style.css").read_text(encoding="utf-8")
        self.assertIn('id="tutorialExitButton"', html)
        self.assertIn("setTutorialFocus", game)
        self.assertIn("leaveTutorialFocus", game)
        self.assertIn("endTutorial", game)
        self.assertIn("tutorialDismissed", game)
        self.assertIn("skipTutorial", builder)
        self.assertIn(".tutorial-focus.tutorial-stage-builder", styles)
        self.assertIn(".tutorial-focus.tutorial-stage-logistics", styles)

    def test_tutorial_uses_visual_drag_only_guidance(self) -> None:
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        builder = (PRODUCT_ROOT / "lego-builder.js").read_text(encoding="utf-8")
        renderer = (PRODUCT_ROOT / "isometric-logistics-view.js").read_text(encoding="utf-8")
        styles = (PRODUCT_ROOT / "style.css").read_text(encoding="utf-8")
        self.assertIn("Je bent leverancier van LEGO-torens.", builder)
        self.assertIn("Een klant wil deze toren.", builder)
        self.assertIn('image: "assets/lego/tutorial-step-1.gif"', builder)
        self.assertIn('image: "assets/lego/tutorial-step-2.gif"', builder)
        self.assertIn('image: "assets/lego/tutorial-step-3.gif"', builder)
        self.assertNotIn("plaats hier", builder.lower())
        self.assertNotIn("builder-rotate", builder)
        self.assertNotIn('board.addEventListener("click"', builder)
        self.assertIn('board.addEventListener("drop"', builder)
        self.assertIn("builder-icon-button builder-undo", builder)
        self.assertIn("builder-icon-button builder-reset", builder)
        self.assertIn("animateRejection", builder)
        self.assertIn("builder-reject-shake", styles)
        self.assertIn("Gefeliciteerd!", builder)
        self.assertIn("Je hebt deze stap onder de knie.", builder)
        self.assertIn("builder-step-complete", builder)
        self.assertIn("builder-complete-arrive", styles)
        self.assertIn("iso-object-reject", styles)
        self.assertIn("visualOnly: true", game)
        self.assertIn("hideMetric", renderer)
        self.assertNotIn("sleep hierheen", renderer.lower())
        self.assertIn("showDropLabel: false", game)
        self.assertIn("iso-logistics-view.is-tutorial .iso-zone-metric", styles)
        self.assertIn('aria-label="Tutorial beëindigen"', html)

    def test_leerpret_login_uses_the_shared_server_session(self) -> None:
        auth = (PRODUCT_ROOT / "leerpret-auth.js").read_text(encoding="utf-8")
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        worker = (PRODUCT_ROOT / "service-worker.js").read_text(encoding="utf-8")
        self.assertIn('src="leerpret-auth.js"', html)
        self.assertIn('id="leerpretGoogleSignIn"', html)
        self.assertIn('id="leerpretAuthStatus"', html)
        self.assertIn("https://accounts.google.com/gsi/client", html)
        self.assertIn('credentials: "include"', auth)
        self.assertIn("/auth/leerbox/session?leerbox_id=", auth)
        self.assertIn("/auth/leerbox/exchange?leerbox_id=", auth)
        self.assertIn('request("/auth/leerbox/google"', auth)
        self.assertIn('request("/auth/google/config"', auth)
        self.assertIn("googleIdentity.renderButton", auth)
        self.assertIn('request("/auth/leerbox/logout"', auth)
        self.assertIn('"learner"', auth)
        self.assertIn('"attraction"', auth)
        self.assertIn("leerpret-auth-changed", auth)
        self.assertNotIn("leerpret-local-dev", auth)
        self.assertNotIn("leerpretAuthApiKey", html)
        self.assertNotIn("API-sleutel</span>", html)
        self.assertNotIn('localStorage.setItem("api_key"', auth)
        self.assertIn("./leerpret-auth.js", worker)

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

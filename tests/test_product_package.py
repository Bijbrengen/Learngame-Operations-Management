from __future__ import annotations

import json
import re
import subprocess
import unittest
from pathlib import Path


PRODUCT_ROOT = Path(__file__).resolve().parents[1]

# SDK-contracttests mogen optioneel tegen een expliciet aangeleverde SDK-asset
# draaien. De repository zoekt nooit zelf in een buurrepository.
import os

SDK_LOGIC_PATH = Path(
    os.getenv("LEERPRET_SDK_LOGIC")
    or (PRODUCT_ROOT / ".external-sdk-not-configured.js")
).resolve()
SDK_COMPONENT_DIR = Path(
    os.getenv("LEERPRET_SDK_COMPONENT_DIR")
    or (PRODUCT_ROOT / ".external-sdk-components-not-configured")
).resolve()
SDK_RENDERER_PATH = SDK_COMPONENT_DIR / "lego-renderer.js"
SDK_BUILDER_PATH = SDK_COMPONENT_DIR / "lego-builder.mount.js"
SDK_EDITOR_PATH = SDK_COMPONENT_DIR / "lego-tower-editor.js"
# Pad zoals node het vanuit cwd=PRODUCT_ROOT ziet (voor de vm-tests).
SDK_LOGIC_JS_FOR_NODE = SDK_LOGIC_PATH.as_posix()
_SDK_AVAILABLE = all(path.is_file() for path in (
    SDK_LOGIC_PATH,
    SDK_RENDERER_PATH,
    SDK_BUILDER_PATH,
    SDK_EDITOR_PATH,
))
os.environ.setdefault("SDK_RENDERER", SDK_RENDERER_PATH.as_posix())
os.environ.setdefault("SDK_BUILDER", SDK_BUILDER_PATH.as_posix())
os.environ.setdefault("SDK_EDITOR", SDK_EDITOR_PATH.as_posix())


class ProductPackageTests(unittest.TestCase):
    def test_live_game_reuses_configuration_layout_next_to_process_flow(self) -> None:
        engine = (PRODUCT_ROOT / "logistics-game-engine.js").read_text(encoding="utf-8")
        ui = (PRODUCT_ROOT / "logistics-game-ui.js").read_text(encoding="utf-8")
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        self.assertIn("gameType: this.gameType", engine)
        self.assertIn("organizationModel: this.organizationModel", engine)
        self.assertIn("intermediateStock: this.intermediateStock", engine)
        self.assertIn("ConfigurationLayoutPreview?.diagramMarkup", ui)
        self.assertIn("data-sim-live-layout", ui)
        self.assertIn("Drie gelijktijdige liveweergaven", ui)
        self.assertIn("gameType: state.config.gameType", game)
        self.assertIn("intermediateStock: state.config.intermediateStock", game)

    def test_dark_game_surfaces_do_not_fall_back_to_white_controls(self) -> None:
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        service_worker = (PRODUCT_ROOT / "service-worker.js").read_text(encoding="utf-8")
        stylesheet = (PRODUCT_ROOT / "style.css").read_text(encoding="utf-8")

        self.assertIn('href="style.css?v=20260827.2"', html)
        self.assertIn('src="logistics-game-ui.js?v=20260827.2"', html)
        self.assertIn('src="multiplayer-runtime.js?v=20260827.1"', html)
        self.assertIn('src="game-configuration-store.js?v=20260821.3"', html)
        self.assertIn('src="configuration-layout-preview.js?v=20260821.3"', html)
        self.assertIn('src="game-sessions.js?v=20260821.3"', html)
        self.assertIn('"isometric-logistics-view.js?v=20260827.2"', html)
        self.assertIn('"script.js?v=20260827.2"', html)
        self.assertIn('CACHE_VERSION = "learngame-om-v244-isometric-transfer"', service_worker)
        self.assertIn(
            'register("service-worker.js?v=learngame-om-v244-isometric-transfer")',
            (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8"),
        )

        manager_controls = stylesheet.split(
            ".manager-dashboard .order-form input,", 1
        )[1].split("}", 1)[0]
        self.assertIn(".manager-dashboard .production-plan-fields input", manager_controls)
        self.assertIn("background: #071a21", manager_controls)
        self.assertIn("color: var(--lp-ink)", manager_controls)

        advisor = stylesheet.split(".game-advisor-panel {", 1)[1].split("}", 1)[0]
        self.assertIn("color: var(--lp-ink)", advisor)
        self.assertNotRegex(advisor, r"background:\s*(?:#fff(?:fff)?|white)\s*;")

        for selector in (
            ".game-advisor-insight {",
            ".game-advisor-insight.is-warning {",
            ".game-advisor-insight.is-ok {",
            ".chapter9-indicator-card.is-warning {",
        ):
            rule = stylesheet.split(selector, 1)[1].split("}", 1)[0]
            self.assertIn("color:", rule, selector)
            self.assertNotRegex(
                rule,
                r"background:\s*(?:#fff(?:fff)?|#fffbeb|#f0fdf4|#fff7f2|white)\s*;",
                selector,
            )

    def test_all_departments_use_the_shared_transparent_lego_box_primitive(self) -> None:
        renderer = (PRODUCT_ROOT / "isometric-logistics-view.js").read_text(encoding="utf-8")
        self.assertIn("LegoTowerRenderer?.openContainerLayers", renderer)
        self.assertIn('class="iso-lego-box"', renderer)
        self.assertIn("container.base}${container.rear}", renderer)
        self.assertIn("${bricks}${cargo}${empty}${interiorSymbol}", renderer)
        self.assertIn("container.front", renderer)
        self.assertIn("container.roof", renderer)
        self.assertIn('data-transparent-front="true"', renderer)
        self.assertIn('data-transparent-roof="true"', renderer)
        self.assertIn('usesLegoContainer = typeof window.LegoTowerRenderer', renderer)

    def test_all_lom_process_connections_use_the_engine_cable_primitive(self) -> None:
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        renderer = (PRODUCT_ROOT / "isometric-logistics-view.js").read_text(encoding="utf-8")
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        game_ui = (PRODUCT_ROOT / "logistics-game-ui.js").read_text(encoding="utf-8")
        layout = (PRODUCT_ROOT / "configuration-layout-preview.js").read_text(encoding="utf-8")

        self.assertIn('"lego-renderer", "lego-cables", "lego-tower-editor"', html)
        self.assertIn('components?.["lego-cables"]', renderer)
        self.assertIn("cables.connectionMarkup", renderer)
        self.assertIn("processCableMarkup", game)
        self.assertIn("cables.connectionMarkup", game)
        self.assertIn("inlineProcessCable", game_ui)
        self.assertIn("cables?.connectionMarkup", layout)
        self.assertNotIn("isoFlowArrowMaterial", renderer)
        self.assertNotIn("dataModelArrow", game)

    def test_game_master_layout_mounts_the_live_isometric_lego_scene(self) -> None:
        sessions = (PRODUCT_ROOT / "game-sessions.js").read_text(encoding="utf-8")
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        styles = (PRODUCT_ROOT / "style.css").read_text(encoding="utf-8")

        self.assertIn("data-session-layout-lego", sessions)
        self.assertIn("Bekijk schematische configuratie", sessions)
        self.assertIn("window.LOMLogisticsScene?.mountSessionLayout?.()", sessions)
        self.assertIn("IsometricLogisticsView.mount(target, isometricScene()", game)
        self.assertIn("window.LOMLogisticsScene = Object.freeze", game)
        self.assertIn(".session-layout-lego > .iso-logistics-view", styles)

    def test_manager_navigation_does_not_cancel_forms_inside_the_active_panel(self) -> None:
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        styles = (PRODUCT_ROOT / "style.css").read_text(encoding="utf-8")

        self.assertIn("dataset.activeManagerTab = nextTab", game)
        self.assertIn('closest("button[data-manager-tab]")', game)
        self.assertNotIn("els.managerWorkbench.dataset.managerTab = nextTab", game)
        self.assertIn('[data-active-manager-tab="process"]', styles)

    def test_localhost_uses_engine_scoped_development_login_without_google(self) -> None:
        auth = (PRODUCT_ROOT / "leerpret-auth.js").read_text(encoding="utf-8")
        self.assertIn('location.hostname === "127.0.0.1"', auth)
        self.assertIn("/auth/leerbox/local-development?leerbox_id=", auth)
        self.assertIn("await window.LeerpretSDKReady", auth)
        self.assertIn("sdkBridge.client.request", auth)
        self.assertIn("acceptSession(localSession)", auth)

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

    def test_manager_navigation_uses_requested_workflow_order(self) -> None:
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        manager_menu = html.split('<aside class="manager-dashboard-menu"', 1)[1].split("</aside>", 1)[0]
        self.assertLess(
            manager_menu.index('<p class="eyebrow">Game Master</p>'),
            manager_menu.index('class="manager-tab-list"'),
        )
        self.assertNotIn("manager-perspective-switcher", manager_menu)
        navigation = html.split('<nav class="manager-tab-list"', 1)[1].split("</nav>", 1)[0]
        tabs = re.findall(r'data-manager-tab="([^"]+)"', navigation)
        self.assertEqual(
            [
                "session",
                "layout",
                "process",
                "digital-twin",
                "inventory",
                "balance-sheet",
                "income-statement",
                "history",
                "roles",
                "game-presets",
                "role-presets",
            ],
            tabs,
        )
        self.assertNotIn('data-manager-tab="core"', navigation)
        self.assertIn('class="is-active" role="tab" aria-selected="true"', navigation)
        self.assertNotIn('data-manager-panel="core"', html)
        self.assertIn('data-manager-panel="session"', html)
        self.assertIn('data-manager-panel="balance-sheet"', html)
        self.assertIn('data-manager-panel="income-statement"', html)

    def test_runtime_exposes_versioned_events_without_dropping_legacy_events(self) -> None:
        script = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        self.assertIn("getInteractionBuffer", script)
        self.assertIn("getContractEventBuffer", script)
        self.assertIn('specversion: "1.0"', script)
        self.assertIn("contract_events", script)

    def test_engine_delivers_theme_runtime_and_leerobject_classes_over_http(self) -> None:
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        sdk = (PRODUCT_ROOT / "leerpret-sdk.js").read_text(encoding="utf-8")
        styles = (PRODUCT_ROOT / "style.css").read_text(encoding="utf-8")
        self.assertIn("/ui/leerpret-theme.css", html)
        self.assertIn('theme.dataset.leerpretTheme = "engine"', html)
        self.assertIn("/sdk/sdk-loader/loader.js", sdk)
        self.assertIn('load(["api-client", "leerobject"])', sdk)
        self.assertIn("/leerbox-runtime/", sdk)
        self.assertIn("SelfStartingLeerobject", sdk)
        self.assertIn("SuccesLeerobject", sdk)
        self.assertIn("WeerstandLeerobject", sdk)
        self.assertIn("OverigLeerobject", sdk)
        self.assertIn("bridge.track(record)", (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8"))
        self.assertNotIn("--lp-color-orange:", styles)
        self.assertIn("var(--toyist-border)", styles)

    def test_character_creation_runs_both_ipsative_scans_before_tutorial(self) -> None:
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        wizard = (PRODUCT_ROOT / "character-creation.js").read_text(encoding="utf-8")
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        stylesheet = (PRODUCT_ROOT / "style.css").read_text(encoding="utf-8")
        service_worker = (PRODUCT_ROOT / "service-worker.js").read_text(encoding="utf-8")
        self.assertIn('id="characterCreationGate"', html)
        self.assertIn('id="characterCreationDismiss"', html)
        self.assertIn('aria-label="Gedragsstijltest sluiten en overslaan"', html)
        self.assertIn('id="playerWorkbench"', html)
        self.assertIn('id="managerWorkbench"', html)
        self.assertIn('id="playerFormMount"', html)
        self.assertIn('id="playerProcessMount"', html)
        self.assertIn('data-app-view="player"', html)
        self.assertIn('id="menuCharacterEditButton"', html)
        self.assertIn("Karakter", html)
        self.assertIn('src="character-creation.js"', html)
        self.assertIn('src="behavior-quality.js"', html)
        # script.js wordt nu via de LeerpretSDK-laadketen ingeladen (niet meer als
        # los src="script.js"), maar nog steeds na character-creation.js.
        self.assertLess(html.index('src="character-creation.js"'), html.index('"script.js?v='))
        self.assertIn("basic_style", wizard)
        self.assertIn("response_style", wizard)
        self.assertIn("Wat minder bij je past", wizard)
        trait_block = wizard.split("const TRAIT_GROUPS = [", 1)[1].split(
            "];\n\n  const freshAllocations",
            1,
        )[0]
        self.assertEqual(10, len(re.findall(r"^    \[$", trait_block, flags=re.MULTILINE)))
        self.assertIn("Meeste punten = past het minst", wizard)
        self.assertIn("Meeste punten = past het best onder druk", wizard)
        self.assertIn("Math.min(10, 20 - totalWithoutCurrent", wizard)
        self.assertIn('PROFILE_ENDPOINT = "/v1/player/behavior-profile"', wizard)
        self.assertIn('method: "GET"', wizard)
        self.assertIn("checkAccountProfile", wizard)
        self.assertIn("DISMISS_KEY", wizard)
        self.assertIn("dismissedForSession", wizard)
        self.assertIn("applyExistingProfile", wizard)
        self.assertIn("result.exists", wizard)
        self.assertIn('state.entryMode = forceEdit ? "edit" : "onboarding"', wizard)
        self.assertIn("behavior-profile-completed", wizard)
        self.assertIn("sessionStorage.setItem(DRAFT_KEY", wizard)
        self.assertIn("restoreDraft()", wizard)
        self.assertIn("BehaviorResponseQuality", wizard)
        self.assertIn("Nog een keer met aandacht", wizard)
        self.assertIn("Bekijk en pas je verdeling aan", wizard)
        self.assertIn("basic_style_category_ms", wizard)
        self.assertIn("Download PDF-rapport", wizard)
        self.assertIn("/report.pdf", wizard)
        self.assertIn("recommended_role", game)
        self.assertIn("Houd jezelf een spiegel voor", wizard)
        self.assertIn("passende rol", wizard)
        self.assertNotIn("player_info", wizard)
        self.assertNotIn('name="email"', wizard)
        self.assertNotIn('name="first_name"', wizard)
        self.assertIn(".character-creation-active .app-shell", stylesheet)
        self.assertIn('"./character-creation.js"', service_worker)
        self.assertIn('"./behavior-quality.js"', service_worker)
        self.assertIn('"./leerpret-theme.js"', service_worker)
        self.assertIn("function renderPlayerView()", game)
        self.assertIn("if (!sessionAllowsRoleActions)", game)
        self.assertIn("els.playerWaitingPanel.hidden = true", game)
        self.assertIn("function setAppView(", game)

    def test_behavior_quality_flags_only_strong_response_patterns(self) -> None:
        quality_path = PRODUCT_ROOT / "behavior-quality.js"
        script = """
const quality = require(process.argv[1]);
const repeated = values => Array.from({length: 10}, () => [...values]);
const normal = quality.assess({
  basic_style: repeated([5, 3, 7, 5]),
  response_style: repeated([5, 7, 3, 5])
});
const identical = quality.assess({
  basic_style: repeated([5, 3, 7, 5]),
  response_style: repeated([5, 3, 7, 5])
});
const flat = quality.assess({
  basic_style: repeated([5, 5, 5, 5]),
  response_style: repeated([5, 7, 3, 5])
});
const fast = quality.assess({
  basic_style: repeated([5, 3, 7, 5]),
  response_style: repeated([5, 7, 3, 5])
}, {
  basic_style_category_ms: Array(10).fill(3000),
  response_style_category_ms: Array(10).fill(3000)
});
process.stdout.write(JSON.stringify({normal, identical, flat, fast}));
"""
        result = subprocess.run(
            ["node", "-e", script, str(quality_path)],
            check=True,
            capture_output=True,
            text=True,
        )
        review = json.loads(result.stdout)
        self.assertFalse(review["normal"]["doubtful"])
        self.assertTrue(review["identical"]["doubtful"])
        self.assertTrue(review["flat"]["doubtful"])
        self.assertTrue(review["identical"]["rowIssues"]["basic_style"][0])
        self.assertTrue(review["identical"]["rowIssues"]["response_style"][0])
        self.assertTrue(review["flat"]["rowIssues"]["basic_style"][0])
        self.assertFalse(review["normal"]["rowIssues"]["basic_style"][0])
        self.assertFalse(review["fast"]["doubtful"])
        self.assertLess(review["fast"]["reliability"], review["normal"]["reliability"])

    def test_waiting_time_switches_to_system_perspective(self) -> None:
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        styles = (PRODUCT_ROOT / "style.css").read_text(encoding="utf-8")
        self.assertIn('id="attentionModeBanner"', html)
        self.assertIn("enterSystemPerspective(order)", game)
        self.assertIn("showAssignment(order)", game)
        self.assertIn('"enter_system_perspective"', game)
        self.assertIn('"assignment_attention_alert"', game)
        self.assertIn(".system-perspective .data-model-panel", styles)

    def test_isometric_logistics_view_is_separate_and_configurable(self) -> None:
        renderer = (PRODUCT_ROOT / "isometric-logistics-view.js").read_text(encoding="utf-8")
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("window.IsometricLogisticsView", renderer)
        self.assertIn("containerWallStudAnchor", renderer)
        self.assertIn("wallStudFlowPoint(connection.from", renderer)
        self.assertNotIn("flowPoint(connection.from, departmentById, connection.fromOffset)", renderer)
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
        self.assertIn('id="parallelProductionToggle"', html)
        self.assertIn('id="sequentialProductionToggle"', html)
        self.assertIn('setProcessView("isometric")', game)

    def test_live_flow_labels_can_be_placed_above_their_buildings(self) -> None:
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        self.assertEqual(3, game.count('labelPosition: "above"'))

        node_program = r'''
const fs = require("fs");
const vm = require("vm");
global.window = global;
vm.runInThisContext(fs.readFileSync("isometric-logistics-view.js", "utf8"));
const layout = { x: 6, y: 3, width: 3.5, depth: 3.2, height: 64 };
const above = window.IsometricLogisticsView.geometryForDepartment({ layout, labelPosition: "above" });
const below = window.IsometricLogisticsView.geometryForDepartment({ layout });
process.stdout.write(JSON.stringify({
  aboveLabelY: above.label.y,
  roofTopY: Math.min(...above.roof.map(point => point.y)),
  belowLabelY: below.label.y,
  floorBottomY: Math.max(...below.floor.map(point => point.y))
}));
'''
        result = subprocess.run(
            ["node", "-e", node_program],
            cwd=PRODUCT_ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        positions = json.loads(result.stdout)
        self.assertLess(positions["aboveLabelY"], positions["roofTopY"])
        self.assertGreater(positions["belowLabelY"], positions["floorBottomY"])

    def test_live_flow_renders_every_tower_in_a_small_production_batch(self) -> None:
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        self.assertIn("quantity: Number(activeOrder.quantity || 1)", game)

        node_program = r'''
const fs = require("fs");
const vm = require("vm");
global.window = global;
window.LegoTowerRenderer = {
  definitions: () => "",
  layoutSequence: () => [],
  plate: () => "<g class=\"test-plate\"></g>",
  brick: () => "",
  openContainerLayers: () => ({ base: "", rear: "", front: "", roof: "" })
};
vm.runInThisContext(fs.readFileSync("isometric-logistics-view.js", "utf8"));
const container = {
  clientWidth: 800,
  clientHeight: 600,
  innerHTML: "",
  querySelector: () => null,
  querySelectorAll: () => [],
  contains: () => true
};
window.IsometricLogisticsView.mount(container, {
  title: "Batchweergave",
  connections: [],
  departments: [{
    id: "production_b",
    title: "Productie B",
    departmentColor: "production-b",
    status: "active",
    openRoof: true,
    layout: { x: 1, y: 2, width: 4.2, depth: 3.8, height: 78 },
    cargoVisual: {
      kind: "tower",
      cargoId: "order-b",
      label: "Toren B",
      quantity: 2,
      draggable: true,
      towerSequence: ["blue_8", "blue_8", "yellow_4", "green_4"]
    }
  }]
}, {});
const largeContainer = { ...container, innerHTML: "" };
window.IsometricLogisticsView.mount(largeContainer, {
  title: "Grote batchweergave",
  connections: [],
  departments: [{
    id: "production_c",
    title: "Productie C",
    departmentColor: "production-c",
    status: "active",
    openRoof: true,
    layout: { x: 1, y: 2, width: 4.2, depth: 3.8, height: 78 },
    cargoVisual: {
      kind: "tower",
      cargoId: "order-large",
      label: "Toren C",
      quantity: 6,
      draggable: true,
      towerSequence: ["white_8", "white_8", "blue_4", "red_4"]
    }
  }]
}, {});
process.stdout.write(JSON.stringify({
  instances: (container.innerHTML.match(/iso-cargo-tower-instance/g) || []).length,
  quantity: /data-cargo-quantity="2"/.test(container.innerHTML),
  cargoId: /data-cargo-id="order-b"/.test(container.innerHTML),
  sourceId: /data-cargo-source-id="production_b"/.test(container.innerHTML),
  keyboardButton: /role="button"[\s\S]*tabindex="0"/.test(container.innerHTML),
  largeInstances: (largeContainer.innerHTML.match(/iso-cargo-tower-instance/g) || []).length,
  largeOverflow: />\+2<\/text>/.test(largeContainer.innerHTML)
}));
'''
        result = subprocess.run(
            ["node", "-e", node_program],
            cwd=PRODUCT_ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        rendered = json.loads(result.stdout)
        self.assertEqual(2, rendered["instances"])
        self.assertTrue(rendered["quantity"])
        self.assertTrue(rendered["cargoId"])
        self.assertTrue(rendered["sourceId"])
        self.assertTrue(rendered["keyboardButton"])
        self.assertEqual(4, rendered["largeInstances"])
        self.assertTrue(rendered["largeOverflow"])

    def test_game_type_selector_applies_lo_and_entrepreneurial_presets(self) -> None:
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="gameTypeSelect"', html)
        self.assertIn('<option value="entrepreneurial">Entrepreneurial Game</option>', html)
        for game_number in range(1, 8):
            self.assertRegex(
                html,
                rf'<option value="lo{game_number}"(?: selected)?>LO Game {game_number}</option>',
            )
        self.assertIn("const GAME_TYPE_PRESETS", game)
        self.assertIn("function applyGameTypePreset", game)
        self.assertIn('gameType: "lo4"', game)
        self.assertIn("loadGameConfiguration(val, true)", game)
        self.assertIn("const MIN_PRODUCT_TYPES = 1", game)

    def test_production_routes_support_parallel_sequential_and_unsaved_hybrid(self) -> None:
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        store = (PRODUCT_ROOT / "game-configuration-store.js").read_text(encoding="utf-8")
        self.assertIn('id="parallelProductionToggle"', html)
        self.assertIn('id="sequentialProductionToggle"', html)
        self.assertIn('id="hybridProductionTooltip"', html)
        self.assertNotIn('id="logisticsOrganizationSelect"', html)
        self.assertIn("production_processes", game)
        self.assertIn("production_processes", store)
        self.assertIn("processMatch", store)
        self.assertIn('"custom_draft"', game)

        probe = subprocess.run(
            [
                "node",
                "-e",
                """
const process = require("./logistics-process.js");
console.log(JSON.stringify({
  lo1: process.defaultProcessesForGame("lo1"),
  lo3: process.defaultProcessesForGame("lo3"),
  lo7: process.defaultProcessesForGame("lo7"),
  tutorial: process.defaultProcessesForGame("tutorial"),
  hybrid: process.profileForProcesses(["parallel", "sequential"], "lo4")
}));
""",
            ],
            cwd=PRODUCT_ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        result = json.loads(probe.stdout)
        self.assertEqual(["sequential"], result["lo1"])
        self.assertEqual(["parallel"], result["lo3"])
        self.assertEqual(["sequential"], result["lo7"])
        self.assertEqual(["parallel"], result["tutorial"])
        self.assertEqual("hybrid", result["hybrid"]["id"])

    def test_role_actions_are_not_rendered_inside_settings(self) -> None:
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        settings = html.split('aria-label="Interne configuratiespiegel"', 1)[1].split("</section>", 1)[0]
        self.assertIn("hidden", settings)
        self.assertNotIn('id="selectedOrderBox"', settings)
        self.assertNotIn('id="advanceButton"', settings)
        self.assertNotIn('id="disruptionButton"', settings)
        self.assertNotIn('id="purchaseForm"', settings)
        self.assertIn('data-player-purchase-form', game)
        self.assertIn('role.id === "srm"', game)
        self.assertIn('data-player-disruption', game)
        self.assertIn('role.id === "opr"', game)
        self.assertIn("state.gameSessionRunning", game)
        self.assertIn('window.addEventListener("learngame-session-state"', game)

    def test_standalone_logistics_engine_runs_role_state_machines_without_network(self) -> None:
        engine_path = PRODUCT_ROOT / "logistics-game-engine.js"
        engine_source = engine_path.read_text(encoding="utf-8")
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        self.assertIn('src="logistics-game-engine.js?v=', html)
        self.assertRegex(html, r'src="logistics-game-ui\.js(?:\?[^\"]+)?"')
        self.assertIn('id="logisticsGameMount"', html)
        self.assertNotIn("fetch(", engine_source)
        self.assertNotIn("XMLHttpRequest", engine_source)
        self.assertNotIn("WebSocket", engine_source)
        self.assertIn("class GameLoop", engine_source)
        self.assertIn("class LogisticsGameEngine", engine_source)
        self.assertIn("towerSequence", engine_source)
        self.assertIn(
            "window.LegoTowerRenderer.renderAnimated",
            (PRODUCT_ROOT / "logistics-game-ui.js").read_text(encoding="utf-8"),
        )
        self.assertIn("towerSequence: [...(product.towerSequence || [])]", game)
        for state_name in ("IDLE", "PROCESSING", "WAITING_FOR_NEXT", "AWAITING_PLAYER"):
            self.assertIn(f'{state_name}: "{state_name}"', engine_source)
        self.assertIn("startStandaloneLogisticsGame", game)
        self.assertIn("standaloneSimulationProducts", game)

        node_program = f"""
const fs = require("fs");
global.window = global;
window.setInterval = () => 1;
window.clearInterval = () => {{}};
eval(fs.readFileSync({json.dumps(str(engine_path))}, "utf8"));
let now = 1000;
const Engine = window.LogisticsGameEngine.LogisticsGameEngine;
const engine = new Engine({{
  now: () => now,
  random: () => 0,
  config: {{
    initialOrderDelayMs: 999999999,
    orderIntervalMinMs: 999999999,
    orderIntervalMaxMs: 999999999,
    transferDelayMinMs: 0,
    transferDelayMaxMs: 0,
    incidentChance: 0,
    processingTimeScale: 1
  }}
}});
engine.start({{humanRoleId: "pd1", playMode: "digital"}});
const created = engine.generateOrder();
engine.orders.get(created.id).quantity = 3;
for (let i = 0; i < 20 && !engine.playerTask(); i += 1) {{
  now += 1000;
  engine.update(now);
}}
const task = engine.playerTask();
const partialBatch = engine.completePlayerAction({{
  parts: task.requiredParts,
  signed: true,
  signature: [[[1, 1], [20, 20]]],
  completedQuantity: 2,
  transferred: true
}});
const rejected = engine.completePlayerAction({{
  parts: task.requiredParts,
  signed: true,
  signature: [[[1, 1], [20, 20]]],
  completedQuantity: task.order.quantity,
  transferred: false
}});
const completed = engine.completePlayerAction({{
  parts: task.requiredParts,
  signed: true,
  signature: [[[1, 1], [20, 20]]],
  completedQuantity: task.order.quantity,
  transferred: true,
  transfer: engine.batchTransferDescriptor(task.order, task.role.id)
}});
for (let i = 0; i < 30; i += 1) {{
  now += 1000;
  engine.update(now);
}}
const delivered = engine.snapshot().orders.find(order => order.id === created.id);
process.stdout.write(JSON.stringify({{
  taskRole: task.role.id,
  requiredParts: task.requiredParts,
  partialBatch,
  rejected,
  completed,
  delivered: delivered.status,
  roleStates: Object.keys(window.LogisticsGameEngine.ROLE_STATES)
}}));
"""
        completed_process = subprocess.run(
            ["node", "-e", node_program],
            cwd=PRODUCT_ROOT,
            env={**os.environ, "SDK_LOGIC": SDK_LOGIC_JS_FOR_NODE},
            check=True,
            capture_output=True,
            text=True,
        )
        result = json.loads(completed_process.stdout)
        self.assertEqual("pd1", result["taskRole"])
        self.assertEqual({"base_green": 3, "yellow_8": 6}, result["requiredParts"])
        self.assertFalse(result["partialBatch"]["ok"])
        self.assertIn("alle 3 torens", " ".join(result["partialBatch"]["errors"]))
        self.assertFalse(result["rejected"]["ok"])
        self.assertTrue(result["completed"]["ok"])
        self.assertEqual("DELIVERED", result["delivered"])
        self.assertEqual(
            ["IDLE", "PROCESSING", "WAITING_FOR_NEXT", "AWAITING_PLAYER"],
            result["roleStates"],
        )

    def test_digital_batch_transfer_is_atomic_and_bound_to_current_route(self) -> None:
        engine_path = PRODUCT_ROOT / "logistics-game-engine.js"
        node_program = f"""
const fs = require("fs");
global.window = global;
window.setInterval = () => 1;
window.clearInterval = () => {{}};
eval(fs.readFileSync({json.dumps(str(engine_path))}, "utf8"));
let now = 1000;
const Engine = window.LogisticsGameEngine.LogisticsGameEngine;
const engine = new Engine({{
  now: () => now,
  random: () => 0,
  config: {{
    initialOrderDelayMs: 999999999,
    transferDelayMinMs: 0,
    transferDelayMaxMs: 0,
    incidentChance: 0
  }}
}});
const transfers = [];
engine.subscribe(event => {{ if (event.type === "order-transferred") transfers.push(event.detail?.transfer); }});
engine.start({{humanRoleId: "operations", playMode: "digital", productionProcesses: ["sequential"]}});
const created = engine.generateOrder();
const order = engine.orders.get(created.id);
order.quantity = 3;
Object.values(engine.roleRuntime).forEach(runtime => {{
  runtime.queue = runtime.queue.filter(orderId => orderId !== order.id);
}});
engine.beginRoleWork("operations", order.id, now);
const task = engine.playerTask();
const descriptor = engine.batchTransferDescriptor(task.order, task.role.id);
const basePayload = {{
  parts: {{}},
  signed: true,
  signature: [[[1, 1], [20, 20]]],
  completedQuantity: 3,
  transferred: true
}};
const wrongTarget = engine.completePlayerAction({{
  ...basePayload,
  transfer: {{...descriptor, targetRoleId: "pd3"}}
}});
const wrongIdentity = engine.completePlayerAction({{
  ...basePayload,
  transfer: {{...descriptor, batchId: "STALE", sourceRoleId: "srm"}}
}});
const wrongQuantityAndRoute = engine.completePlayerAction({{
  ...basePayload,
  transfer: {{...descriptor, quantity: "3", routeIndex: descriptor.routeIndex + 1}}
}});
const missingTransfer = engine.completePlayerAction(basePayload);
const nullTransfer = engine.completePlayerAction({{...basePayload, transfer: null}});
const accepted = engine.completePlayerAction({{...basePayload, transfer: descriptor}});
now = Number(engine.roleRuntime.operations.transfersAt || now);
engine.updateRole("operations", now);
const transferHistory = order.history.filter(item => item.type === "transferred");
const customer = engine.batchTransferDescriptor({{
  id: "CUS-1", productId: "A", quantity: 1,
  roleFlow: ["customer", "operations", "srm", "pd1", "pd2", "pd3", "ssf"],
  productionRoute: "sequential"
}}, "customer");
const parallel = engine.batchTransferDescriptor({{
  id: "PAR-1", productId: "B", quantity: 2,
  roleFlow: ["customer", "operations", "srm", "pd2", "ssf"],
  productionRoute: "parallel"
}}, "pd2");
const finalDelivery = engine.batchTransferDescriptor({{
  id: "FIN-1", productId: "C", quantity: 4,
  roleFlow: ["customer", "operations", "srm", "pd1", "pd2", "pd3", "ssf"],
  productionRoute: "sequential"
}}, "ssf");
const finalEngine = new Engine({{
  now: () => now,
  random: () => 0,
  config: {{initialOrderDelayMs: 999999999, transferDelayMinMs: 0, transferDelayMaxMs: 0, incidentChance: 0}}
}});
const finalEvents = [];
finalEngine.subscribe(event => {{
  if (["order-transferred", "order-delivered"].includes(event.type)) {{
    finalEvents.push({{
      type: event.type,
      historyTypes: event.detail?.order?.history?.map(item => item.type) || []
    }});
  }}
}});
finalEngine.start({{humanRoleId: "ssf", playMode: "digital", productionProcesses: ["sequential"]}});
const finalOrder = finalEngine.generateOrder();
finalOrder.roleFlow = ["customer", "operations", "srm", "pd1", "pd2", "pd3", "ssf"];
finalOrder.currentRoleId = "ssf";
finalOrder.routeIndex = 6;
Object.values(finalEngine.roleRuntime).forEach(runtime => {{
  runtime.queue = runtime.queue.filter(orderId => orderId !== finalOrder.id);
}});
finalEngine.beginRoleWork("ssf", finalOrder.id, now);
const finalTask = finalEngine.playerTask();
const finalAccepted = finalEngine.completePlayerAction({{
  parts: {{}}, signed: true, signature: [[[1, 1], [20, 20]]],
  completedQuantity: finalOrder.quantity, transferred: true,
  transfer: finalEngine.batchTransferDescriptor(finalTask.order, "ssf")
}});
now = Number(finalEngine.roleRuntime.ssf.transfersAt || now);
finalEngine.updateRole("ssf", now);
process.stdout.write(JSON.stringify({{
  descriptor,
  wrongTarget,
  wrongIdentity,
  wrongQuantityAndRoute,
  missingTransfer,
  nullTransfer,
  accepted,
  transferHistory,
  transfers,
  currentRoleId: order.currentRoleId,
  customer,
  parallel,
  finalDelivery,
  finalAccepted,
  finalEvents
}}));
"""
        completed_process = subprocess.run(
            ["node", "-e", node_program],
            cwd=PRODUCT_ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        result = json.loads(completed_process.stdout)
        self.assertEqual("operations", result["descriptor"]["sourceRoleId"])
        self.assertEqual("srm", result["descriptor"]["targetRoleId"])
        self.assertEqual(3, result["descriptor"]["quantity"])
        self.assertTrue(result["descriptor"]["atomicTransfer"])
        self.assertFalse(result["wrongTarget"]["ok"])
        self.assertIn("targetRoleId", " ".join(result["wrongTarget"]["errors"]))
        self.assertFalse(result["wrongIdentity"]["ok"])
        self.assertIn("batchId", " ".join(result["wrongIdentity"]["errors"]))
        self.assertIn("sourceRoleId", " ".join(result["wrongIdentity"]["errors"]))
        self.assertFalse(result["wrongQuantityAndRoute"]["ok"])
        self.assertIn("aantal", " ".join(result["wrongQuantityAndRoute"]["errors"]))
        self.assertIn("andere afdeling", " ".join(result["wrongQuantityAndRoute"]["errors"]))
        self.assertFalse(result["missingTransfer"]["ok"])
        self.assertFalse(result["nullTransfer"]["ok"])
        self.assertIn("mist", " ".join(result["missingTransfer"]["errors"]))
        self.assertTrue(result["accepted"]["ok"])
        self.assertEqual("srm", result["currentRoleId"])
        self.assertEqual(1, len(result["transferHistory"]))
        self.assertEqual(1, len(result["transfers"]))
        self.assertEqual(result["descriptor"]["orderId"], result["transfers"][0]["orderId"])
        self.assertEqual(3, result["transfers"][0]["quantity"])
        self.assertEqual("operations", result["transfers"][0]["sourceRoleId"])
        self.assertEqual("srm", result["transfers"][0]["targetRoleId"])
        self.assertEqual("order_information", result["transfers"][0]["cargoKind"])
        self.assertEqual("operations", result["customer"]["targetRoleId"])
        self.assertEqual("order_information", result["customer"]["cargoKind"])
        self.assertEqual("finished_towers", result["parallel"]["cargoKind"])
        self.assertEqual("ssf", result["parallel"]["targetRoleId"])
        self.assertEqual("customer", result["finalDelivery"]["targetRoleId"])
        self.assertTrue(result["finalDelivery"]["finalDelivery"])
        self.assertEqual("delivery", result["finalDelivery"]["cargoKind"])
        self.assertTrue(result["finalAccepted"]["ok"])
        self.assertEqual(
            ["order-transferred", "order-delivered"],
            [event["type"] for event in result["finalEvents"]],
        )
        self.assertIn("transferred", result["finalEvents"][1]["historyTypes"])

    def test_standalone_engine_routes_parallel_orders_to_one_complete_product_department(self) -> None:
        engine_path = PRODUCT_ROOT / "logistics-game-engine.js"
        node_program = f"""
const fs = require("fs");
global.window = global;
window.setInterval = () => 1;
window.clearInterval = () => {{}};
eval(fs.readFileSync({json.dumps(str(engine_path))}, "utf8"));
let now = 1000;
const Engine = window.LogisticsGameEngine.LogisticsGameEngine;
const engine = new Engine({{
  now: () => now,
  random: () => 0.5,
  config: {{
    initialOrderDelayMs: 999999999,
    transferDelayMinMs: 0,
    transferDelayMaxMs: 0,
    incidentChance: 0,
    processingTimeScale: 1
  }}
}});
engine.start({{
  humanRoleId: "pd2",
  productionProcesses: ["parallel"]
}});
const created = engine.generateOrder();
for (let index = 0; index < 20 && !engine.playerTask(); index += 1) {{
  now += 1000;
  engine.update(now);
}}
const task = engine.playerTask();
const before = engine.snapshot().orders.find(order => order.id === created.id);
const completed = engine.completePlayerAction({{
  parts: task.requiredParts,
  signed: true,
  signature: [[[1, 1], [20, 20]]],
  completedQuantity: task.order.quantity,
  transferred: true,
  transfer: engine.batchTransferDescriptor(task.order, task.role.id)
}});
for (let index = 0; index < 20; index += 1) {{
  now += 1000;
  engine.update(now);
}}
const delivered = engine.snapshot().orders.find(order => order.id === created.id);
process.stdout.write(JSON.stringify({{
  productionProcesses: engine.snapshot().productionProcesses,
  productionRoute: before.productionRoute,
  productionDepartment: before.productionDepartment,
  roleFlow: before.roleFlow,
  taskRole: task.role.id,
  taskTitle: task.role.title,
  requiredParts: task.requiredParts,
  completed,
  delivered: delivered.status
}}));
"""
        completed_process = subprocess.run(
            ["node", "-e", node_program],
            cwd=PRODUCT_ROOT,
            env={**os.environ, "SDK_LOGIC": SDK_LOGIC_JS_FOR_NODE},
            check=True,
            capture_output=True,
            text=True,
        )
        result = json.loads(completed_process.stdout)
        self.assertEqual(["parallel"], result["productionProcesses"])
        self.assertEqual("parallel", result["productionRoute"])
        self.assertEqual("pd2", result["productionDepartment"])
        self.assertEqual(
            ["customer", "operations", "srm", "pd2", "ssf"],
            result["roleFlow"],
        )
        self.assertEqual("pd2", result["taskRole"])
        self.assertEqual("MANAGER PRODUCTIE B", result["taskTitle"])
        self.assertEqual(
            {
                "base_green": 2,
                "blue_8": 4,
                "yellow_4": 2,
                "green_4": 2,
            },
            result["requiredParts"],
        )
        self.assertTrue(result["completed"]["ok"])
        self.assertEqual("DELIVERED", result["delivered"])

    def test_entrepreneurship_agents_use_anonymous_historical_patterns(self) -> None:
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        engine_path = PRODUCT_ROOT / "logistics-game-engine.js"
        pattern_path = (
            PRODUCT_ROOT
            / "data/agent-behavior/entrepreneurship-human-patterns.v1.json"
        )
        pattern_script_path = pattern_path.with_suffix(".js")
        patterns = json.loads(pattern_path.read_text(encoding="utf-8"))
        serialized = json.dumps(patterns)

        self.assertEqual(
            "entrepreneurship-human-agent-patterns-v1",
            patterns["schemaVersion"],
        )
        self.assertEqual(7170, patterns["sourceSummary"]["transactions"])
        self.assertEqual(695, patterns["sourceSummary"]["playerSeriesUsed"])
        self.assertNotIn("@", serialized)
        self.assertFalse(patterns["privacy"]["containsEmailAddresses"])
        self.assertFalse(patterns["privacy"]["containsGameCodes"])
        for family in ("supplier", "producer", "trader"):
            self.assertEqual(
                {"proactive", "steady", "deliberate"},
                {
                    profile["id"]
                    for profile in patterns["roleFamilies"][family]["profiles"]
                },
            )

        data_script = 'src="data/agent-behavior/entrepreneurship-human-patterns.v1.js"'
        self.assertIn(data_script, html)
        self.assertLess(html.index(data_script), html.index('src="logistics-game-engine.js?v='))
        self.assertIn(
            'state.config.organizationModel === "independent_enterprises"',
            game,
        )
        self.assertIn("setBehaviorPatterns", game)

        node_program = f"""
const fs = require("fs");
global.window = global;
window.setInterval = () => 1;
window.clearInterval = () => {{}};
eval(fs.readFileSync({json.dumps(str(pattern_script_path))}, "utf8"));
eval(fs.readFileSync({json.dumps(str(engine_path))}, "utf8"));
const engine = new window.LogisticsGameEngine.LogisticsGameEngine({{
  random: () => 0.99
}});
engine.setBehaviorPatterns(window.EntrepreneurshipAgentPatterns);
engine.start({{humanRoleId: "pd1"}});
const snapshot = engine.snapshot();
process.stdout.write(JSON.stringify({{
  schemaVersion: snapshot.behaviorSource.schemaVersion,
  sourceTransactions: snapshot.behaviorSource.sourceSummary.transactions,
  supplierProfile: snapshot.roleRuntime.srm.agentBehavior.profileId,
  producerFamily: snapshot.roleRuntime.pd2.agentBehavior.familyId,
  traderFamily: snapshot.roleRuntime.operations.agentBehavior.familyId
}}));
"""
        completed_process = subprocess.run(
            ["node", "-e", node_program],
            cwd=PRODUCT_ROOT,
            env={**os.environ, "SDK_LOGIC": SDK_LOGIC_JS_FOR_NODE},
            check=True,
            capture_output=True,
            text=True,
        )
        result = json.loads(completed_process.stdout)
        self.assertEqual(
            "entrepreneurship-human-agent-patterns-v1",
            result["schemaVersion"],
        )
        self.assertEqual(7170, result["sourceTransactions"])
        self.assertEqual("deliberate", result["supplierProfile"])
        self.assertEqual("producer", result["producerFamily"])
        self.assertEqual("trader", result["traderFamily"])

    def test_standalone_engine_generates_hardcoded_incidents_and_peak_flow(self) -> None:
        engine_path = PRODUCT_ROOT / "logistics-game-engine.js"
        node_program = f"""
const fs = require("fs");
global.window = global;
window.setInterval = () => 1;
window.clearInterval = () => {{}};
eval(fs.readFileSync({json.dumps(str(engine_path))}, "utf8"));
let now = 0;
const engine = new window.LogisticsGameEngine.LogisticsGameEngine({{
  now: () => now,
  random: () => 0,
  config: {{
    initialOrderDelayMs: 0,
    orderIntervalMinMs: 999999999,
    orderIntervalMaxMs: 999999999,
    transferDelayMinMs: 0,
    transferDelayMaxMs: 0,
    incidentChance: 1,
    peakFlowChance: 1,
    processingTimeScale: 1
  }}
}});
engine.start({{humanRoleId: "pd1"}});
for (let i = 0; i < 30 && !engine.playerTask(); i += 1) {{
  now += 25000;
  engine.update(now);
}}
const snapshot = engine.snapshot();
process.stdout.write(JSON.stringify({{
  orderCount: snapshot.orders.length,
  hasRawDelay: snapshot.feed.some(item => item.message.includes("Grondstoffenvertraging")),
  hasPeakFlow: snapshot.feed.some(item => item.message.includes("Peak Flow"))
}}));
"""
        completed_process = subprocess.run(
            ["node", "-e", node_program],
            cwd=PRODUCT_ROOT,
            env={**os.environ, "SDK_LOGIC": SDK_LOGIC_JS_FOR_NODE},
            check=True,
            capture_output=True,
            text=True,
        )
        result = json.loads(completed_process.stdout)
        self.assertGreaterEqual(result["orderCount"], 2)
        self.assertTrue(result["hasRawDelay"])
        self.assertTrue(result["hasPeakFlow"])

    def test_waiting_player_sees_three_large_live_views_and_top_departments(self) -> None:
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        ui = (PRODUCT_ROOT / "logistics-game-ui.js").read_text(encoding="utf-8")
        styles = (PRODUCT_ROOT / "style.css").read_text(encoding="utf-8")
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        isometric = (PRODUCT_ROOT / "isometric-logistics-view.js").read_text(encoding="utf-8")
        self.assertNotIn("data-sim-waiting-tab", ui)
        self.assertIn('aria-label="Drie gelijktijdige liveweergaven"', ui)
        self.assertLess(
            ui.index('<h3 id="simWaitingFlowTitle">'),
            ui.index('<h3 id="simWaitingHeatmapTitle">'),
        )
        self.assertNotIn('<h3 id="simWaitingEventsTitle">', ui)
        self.assertNotIn('<h3 id="simWaitingDepartmentsTitle">', ui)
        self.assertIn('id="topDepartmentMiniView"', html)
        self.assertIn('id="hudOpportunityCost"', html)
        self.assertIn('id="topDepartmentDetailLayer"', html)
        self.assertNotIn('id="playerDepartmentHeatmap"', html)
        self.assertIn("renderTopDepartmentMini", ui)
        self.assertIn("data-top-department-id", ui)
        self.assertIn("learngame-top-department-select", ui)
        self.assertIn('id="topLiveEventFeed"', html)
        self.assertIn("renderTopLiveEvents", ui)
        self.assertIn("Afdelingen", ui)
        self.assertIn("Productiestroom", ui)
        self.assertNotIn("<h2>Live fabrieksoverzicht</h2>", ui)
        self.assertIn("grid-template-rows: minmax(0, 1fr)", styles)
        self.assertIn("mountProcessFlow", ui)
        self.assertIn("renderProcessFlow: (target, snapshot, interaction = null) =>", game)
        self.assertIn("centerDepartments: true", game)
        self.assertIn('departmentDetailMode: "popup"', game)
        self.assertIn("onDepartmentClose", game)
        self.assertIn("centeredDepartmentViewBox", isometric)
        self.assertIn("iso-department-detail-popup", isometric)
        self.assertIn("data-department-detail-close", isometric)
        self.assertIn("standaloneLogisticsScene(snapshot, interaction)", game)
        self.assertIn("window.IsometricLogisticsView.mount(target", game)
        self.assertIn("processFlowSignature", ui)
        self.assertIn("simulationStateLabel", game)
        self.assertIn("simulationPartialSequence", game)
        self.assertIn("cargoVisual: showProduct", game)
        self.assertIn("stockVisuals: definition.roleId === \"srm\"", game)
        self.assertIn("towerSequence: cargoSequence", game)
        self.assertIn('mode: "player-transfer"', ui)
        self.assertIn("submitIsometricTransfer", ui)
        self.assertIn("onCargoDrop: payload", game)
        self.assertIn("runtime.incident", game)
        self.assertIn(".sim-waiting-tabs", styles)
        self.assertIn(".sim-process-flow-mount", styles)

    @unittest.skipUnless(_SDK_AVAILABLE, "LeerpretSDK-logica niet naast de repo gevonden")
    def test_interactive_lego_builder_uses_the_three_source_products(self) -> None:
        builder = SDK_BUILDER_PATH.read_text(encoding="utf-8")
        logic = SDK_LOGIC_PATH.read_text(encoding="utf-8")
        renderer = SDK_RENDERER_PATH.read_text(encoding="utf-8")
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        styles = (PRODUCT_ROOT / "style.css").read_text(encoding="utf-8")
        self.assertIn('/sdk/lego-builder/mount.js', html)
        self.assertIn('id="legoBuilderMount"', html)
        self.assertIn("window.LegoTowerRenderer.renderPart", builder)
        self.assertIn("window.LegoTowerRenderer.renderAnimated", builder)
        self.assertIn(
            "window.LegoTowerRenderer.definitions(BOARD_GRADIENT_SCOPE)",
            builder,
        )
        self.assertIn("static gradientId(", renderer)
        self.assertIn('this.gradientId(color, "top", scope)', renderer)
        self.assertIn('this.gradientId(color, "right", scope)', renderer)
        self.assertIn('const scope = `part-${this.animationId += 1}`', renderer)
        self.assertNotIn('image: "assets/lego/tower-', builder)
        self.assertNotIn("<img src=", builder)
        self.assertIn("supportedLayer", builder)
        self.assertIn("boardProjection", builder)
        self.assertIn("snapCandidate", builder)
        self.assertIn("updateHoverPreview", builder)
        self.assertIn("data-builder-hover-preview", builder)
        self.assertIn("LegoTowerRenderer.brick", builder)
        self.assertIn("builder-isometric-scene", builder)
        self.assertIn("validateBuild", builder)
        # De pure kwaliteitscontrole-logica is verhuisd naar de LeerpretSDK-module;
        # de browsercomponent leunt erop via core.*.
        self.assertIn("normalizedSignature", logic)
        self.assertIn("core.validateBuildStrict", builder)
        self.assertIn("tutorialRotationForPiece", builder)
        self.assertIn("dragstart", builder)
        self.assertIn("grid", builder.lower())
        self.assertIn('towerBlueprint: { lower: "yellow", middle: "red", upper: "white"', game)
        self.assertIn('towerBlueprint: { lower: "blue", middle: "yellow", upper: "green"', game)
        self.assertIn('towerBlueprint: { lower: "white", middle: "blue", upper: "red"', game)
        self.assertIn('A: { lower: "yellow", middle: "red", upper: "white"', renderer)
        self.assertIn("getLegoBuilderSnapshot", game)

    @unittest.skipUnless(_SDK_AVAILABLE, "LeerpretSDK-logica niet naast de repo gevonden")
    def test_tutorial_board_renders_translucent_3d_target_bricks_with_studs(self) -> None:
        node_program = r"""
const fs = require("fs");
const vm = require("vm");
global.window = global;
global.document = { activeElement: null };
global.requestAnimationFrame = callback => callback();
global.addEventListener = () => {};
global.removeEventListener = () => {};
vm.runInThisContext(fs.readFileSync(process.env.SDK_RENDERER, "utf8"));
vm.runInThisContext(fs.readFileSync(process.env.SDK_LOGIC, "utf8"));
vm.runInThisContext(fs.readFileSync(process.env.SDK_BUILDER, "utf8"));
const container = {
  innerHTML: "",
  offsetParent: {},
  querySelectorAll: () => [],
  querySelector: () => null
};
window.LegoBuilder.mount(container, {});
const previewClass = container.innerHTML.indexOf('class="builder-order-animation"');
const previewStart = container.innerHTML.lastIndexOf("<svg", previewClass);
const previewEnd = container.innerHTML.indexOf("</svg>", previewClass);
const previewMarkup = container.innerHTML.slice(previewStart, previewEnd + 6);
const boardStart = container.innerHTML.indexOf('<svg class="builder-board"');
const boardEnd = container.innerHTML.indexOf("</svg>", boardStart);
const boardMarkup = container.innerHTML.slice(boardStart, boardEnd + 6);
const targetPattern = /<g class="builder-target"[^>]*>([\s\S]*?)<\/g>\s*<\/g>/g;
const targets = [...boardMarkup.matchAll(targetPattern)].map(match => match[1]);
process.stdout.write(JSON.stringify({
  previewBlockCount: (previewMarkup.match(/class="animated-tower-block-/g) || []).length,
  previewHasCompleteColors:
    previewMarkup.includes("yellow")
    && previewMarkup.includes("red")
    && previewMarkup.includes("white"),
  targetCount: targets.length,
  boardBrickCount: (boardMarkup.match(/class="iso-brick"/g) || []).length,
  targetsUse3dBricks: targets.every(target => target.includes('class="iso-brick"')),
  targetsHaveStuds: targets.every(target => target.includes("<ellipse")),
  targetsUseExpectedColor: targets.every(target => target.includes("lego-builder-board-yellow")),
  targetsHaveFilledTop: targets.every(target =>
    target.includes('fill="url(#lego-builder-board-yellow-top)"')
  ),
  targetsHaveFilledSides: targets.every(target =>
    target.includes('fill="url(#lego-builder-board-yellow-left)"')
    && target.includes('fill="url(#lego-builder-board-yellow-right)"')
  ),
  targetsHaveNoEmptyFill: targets.every(target => !target.includes('fill="none"')),
  boardDefinesScopedGradients:
    boardMarkup.includes('id="lego-builder-board-yellow-top"')
    && boardMarkup.includes('id="lego-builder-board-yellow-left"')
    && boardMarkup.includes('id="lego-builder-board-yellow-right"'),
  boardHasNoUnscopedGradientRefs: !boardMarkup.includes('url(#lego-yellow-'),
  hasLegacyFlatTarget: /class="builder-target"[^>]*>\s*<polygon/.test(boardMarkup)
}));
"""
        completed_process = subprocess.run(
            ["node", "-e", node_program],
            cwd=PRODUCT_ROOT,
            env={**os.environ, "SDK_LOGIC": SDK_LOGIC_JS_FOR_NODE},
            check=True,
            capture_output=True,
            text=True,
        )
        result = json.loads(completed_process.stdout)
        self.assertEqual(4, result["previewBlockCount"])
        self.assertTrue(result["previewHasCompleteColors"])
        self.assertEqual(2, result["targetCount"])
        self.assertEqual(3, result["boardBrickCount"])
        self.assertTrue(result["targetsUse3dBricks"])
        self.assertTrue(result["targetsHaveStuds"])
        self.assertTrue(result["targetsUseExpectedColor"])
        self.assertTrue(result["targetsHaveFilledTop"])
        self.assertTrue(result["targetsHaveFilledSides"])
        self.assertTrue(result["targetsHaveNoEmptyFill"])
        self.assertTrue(result["boardDefinesScopedGradients"])
        self.assertTrue(result["boardHasNoUnscopedGradientRefs"])
        self.assertFalse(result["hasLegacyFlatTarget"])
        styles = (PRODUCT_ROOT / "style.css").read_text(encoding="utf-8")
        target_css = styles.split(".builder-target {", 1)[1].split(
            ".builder-icon-button",
            1,
        )[0]
        self.assertIn("opacity: 0.34", target_css)
        self.assertIn(".builder-target .iso-brick polygon", target_css)
        self.assertIn("stroke-dasharray: 4 3", target_css)
        self.assertIn("@keyframes builder-target-pulse", target_css)
        self.assertIn("opacity: 0.58", target_css)
        self.assertNotIn("filter", target_css)

    @unittest.skipUnless(_SDK_AVAILABLE, "LeerpretSDK-componenten niet geconfigureerd")
    def test_tutorial_order_preview_always_shows_the_complete_tower(self) -> None:
        builder = SDK_BUILDER_PATH.read_text(encoding="utf-8")
        render_section = builder.split("function render() {", 1)[1].split(
            "function wire() {",
            1,
        )[0]
        self.assertIn("const orderSequence = goal.sequence;", render_section)
        self.assertIn('"Volledig bouwvoorbeeld van Toren A"', render_section)
        self.assertNotIn("TUTORIAL[state.tutorialStep].sequence", render_section)

    @unittest.skipUnless(_SDK_AVAILABLE, "LeerpretSDK-logica niet naast de repo gevonden")
    def test_tutorial_requires_rotation_and_opens_help_on_the_correct_target(self) -> None:
        node_program = r"""
const fs = require("fs");
const vm = require("vm");
global.window = global;
global.document = { activeElement: null };
global.requestAnimationFrame = callback => callback();
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.setTimeout = callback => callback();
vm.runInThisContext(fs.readFileSync(process.env.SDK_RENDERER, "utf8"));
vm.runInThisContext(fs.readFileSync(process.env.SDK_LOGIC, "utf8"));
const builderSource = fs.readFileSync(process.env.SDK_BUILDER, "utf8").replace(
  "const publicApi = {\n    mount,",
  "window.__placeTutorialBrickForTest = placeAt;\n  window.__rotateTutorialBrickForTest = rotateSelectedPiece;\n  const publicApi = {\n    mount,"
);
vm.runInThisContext(builderSource);
const container = {
  innerHTML: "",
  offsetParent: {},
  querySelectorAll: () => [],
  querySelector: () => null
};
window.LegoBuilder.mount(container, {});
window.__placeTutorialBrickForTest(0, 0);
window.__placeTutorialBrickForTest(5, 5);
const afterFoundation = window.LegoBuilder.getSnapshot();
window.__placeTutorialBrickForTest(2, 1);
const beforeRotation = window.LegoBuilder.getSnapshot();
window.__rotateTutorialBrickForTest();
const afterRotation = window.LegoBuilder.getSnapshot();
window.__placeTutorialBrickForTest(1, 2);
const afterStepTwo = window.LegoBuilder.getSnapshot();
const red = afterStepTwo.bricks.find(brick => brick.type === "red_8");
process.stdout.write(JSON.stringify({
  foundationStep: afterFoundation.tutorialStep,
  foundationPositions: afterFoundation.bricks.map(brick => [brick.x, brick.y]),
  beforeRotationStep: beforeRotation.tutorialStep,
  beforeRotationCount: beforeRotation.bricks.length,
  rotationHintOpen: beforeRotation.rotationHintOpen,
  hintClosedAfterRotation: !afterRotation.rotationHintOpen,
  stepTwoAdvanced: afterStepTwo.tutorialStep,
  red
}));
"""
        completed_process = subprocess.run(
            ["node", "-e", node_program],
            cwd=PRODUCT_ROOT,
            env={**os.environ, "SDK_LOGIC": SDK_LOGIC_JS_FOR_NODE},
            check=True,
            capture_output=True,
            text=True,
        )
        result = json.loads(completed_process.stdout)
        self.assertEqual(1, result["foundationStep"])
        self.assertEqual([[1, 1], [3, 1]], result["foundationPositions"])
        self.assertEqual(1, result["beforeRotationStep"])
        self.assertEqual(2, result["beforeRotationCount"])
        self.assertTrue(result["rotationHintOpen"])
        self.assertTrue(result["hintClosedAfterRotation"])
        self.assertIn("data-rotate-from-help", SDK_BUILDER_PATH.read_text(encoding="utf-8"))
        self.assertEqual(2, result["stepTwoAdvanced"])
        self.assertEqual(
            {
                "type": "red_8",
                "color": "red",
                "x": 1,
                "y": 2,
                "width": 4,
                "depth": 2,
                "z": 1,
            },
            result["red"],
        )

    @unittest.skipUnless(_SDK_AVAILABLE, "LeerpretSDK-logica niet naast de repo gevonden")
    def test_second_tower_build_has_no_transparent_target_layer(self) -> None:
        node_program = r"""
const fs = require("fs");
const vm = require("vm");
global.window = global;
global.document = { activeElement: null };
global.requestAnimationFrame = callback => callback();
global.addEventListener = () => {};
global.removeEventListener = () => {};
vm.runInThisContext(fs.readFileSync(process.env.SDK_RENDERER, "utf8"));
vm.runInThisContext(fs.readFileSync(process.env.SDK_LOGIC, "utf8"));
vm.runInThisContext(fs.readFileSync(process.env.SDK_BUILDER, "utf8"));
const container = {
  innerHTML: "",
  offsetParent: {},
  querySelectorAll: () => [],
  querySelector: () => null
};
window.LegoBuilder.mount(container, {});
window.LegoBuilder.prepareStockTutorial("B");
window.LegoBuilder.setStockTutorialInventory({
  blue_8: 2,
  yellow_4: 1,
  green_4: 1
});
const snapshot = window.LegoBuilder.getSnapshot();
const boardStart = container.innerHTML.indexOf('<svg class="builder-board"');
const boardEnd = container.innerHTML.indexOf("</svg>", boardStart);
const boardMarkup = container.innerHTML.slice(boardStart, boardEnd + 6);
process.stdout.write(JSON.stringify({
  mode: snapshot.mode,
  productId: snapshot.productId,
  placedBrickCount: snapshot.bricks.length,
  targetCount: (boardMarkup.match(/class="builder-target"/g) || []).length,
  boardBrickCount: (boardMarkup.match(/class="iso-brick"/g) || []).length
}));
"""
        completed_process = subprocess.run(
            ["node", "-e", node_program],
            cwd=PRODUCT_ROOT,
            env={**os.environ, "SDK_LOGIC": SDK_LOGIC_JS_FOR_NODE},
            check=True,
            capture_output=True,
            text=True,
        )
        result = json.loads(completed_process.stdout)
        self.assertEqual("stock_build", result["mode"])
        self.assertEqual("B", result["productId"])
        self.assertEqual(0, result["placedBrickCount"])
        self.assertEqual(0, result["targetCount"])
        self.assertEqual(1, result["boardBrickCount"])

    @unittest.skipUnless(_SDK_AVAILABLE, "LeerpretSDK-componenten niet geconfigureerd")
    def test_tutorial_step_two_collects_stock_in_the_isometric_view(self) -> None:
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        renderer = (PRODUCT_ROOT / "isometric-logistics-view.js").read_text(encoding="utf-8")
        builder = SDK_BUILDER_PATH.read_text(encoding="utf-8")
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
        completion_transition = game.split(
            'if (actionType === "complete_lego_tutorial") {',
            1,
        )[1].split("}", 1)[0]
        self.assertIn('window.LegoBuilder?.prepareStockTutorial("B");', completion_transition)
        self.assertIn("startLogisticsTutorial();", completion_transition)
        self.assertLess(
            completion_transition.index('prepareStockTutorial("B")'),
            completion_transition.index("startLogisticsTutorial()"),
        )
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
        self.assertIn("forceSelectedRender", renderer)
        self.assertIn("onDepartmentAction", renderer)
        self.assertIn("is-highlighted", renderer)
        self.assertIn(".iso-department.is-highlighted", styles)
        self.assertIn(".iso-department.is-locked", styles)
        self.assertIn(".iso-logistics-view.is-tutorial", styles)
        self.assertIn("min-width: 0;", styles)
        self.assertIn("swimlane-sticky-header", game)
        self.assertIn("edge-source-${item.id}", game)
        self.assertIn("edge-target-${next.id}", game)
        self.assertIn("has-edge-focus", game)
        self.assertIn('V ${routeY} H ${tx} V ${ty}', game)
        self.assertIn(".manager-dashboard .swimlane-canvas.has-edge-focus .swimlane-cable", styles)
        self.assertIn(".swimlane-cable.is-related", styles)
        self.assertIn("openRoof: true", game)
        self.assertIn("stockVisuals", game)
        self.assertIn("distractorParts", game)
        self.assertIn('id: "blue_4", color: "blue"', game)
        self.assertIn('id: "yellow_8", color: "yellow"', game)
        self.assertIn('id: "green_8_wrong", color: "green"', game)
        self.assertIn('reason: "wrong_brick_type"', game)
        self.assertIn("dropTutorialMaterial", game)
        self.assertIn("wrong_brick_type", game)
        player_stock_definition = game.split('id: "tutorial_player_stock"', 1)[1].split("},", 1)[0]
        self.assertIn("showDropLabel: false", player_stock_definition)
        self.assertNotIn('dropLabel: "BOUWAFDELING"', game)
        self.assertIn("openWarehouseMarkup", renderer)
        self.assertIn("iso-stock-brick", renderer)
        self.assertIn("data-stock-source-id", renderer)
        self.assertIn("onStockDrop", renderer)
        self.assertIn("pointerdown", renderer)
        self.assertIn("document.elementsFromPoint", renderer)
        self.assertIn('dragSurface?.classList.add("is-stock-dragging")', renderer)
        self.assertIn('dragSurface?.classList.remove("is-stock-dragging")', renderer)
        self.assertIn("is-drop-target", renderer)
        self.assertIn(".iso-building-interior", styles)
        self.assertIn(".iso-stock-brick.is-draggable", styles)
        self.assertIn(".iso-logistics-view.is-stock-dragging", styles)
        self.assertIn(".iso-department.is-drop-target.is-drag-over", styles)

    @unittest.skipUnless(_SDK_AVAILABLE, "Optionele externe SDK-contractasset niet ingesteld")
    def test_tutorial_step_two_renderer_never_produces_an_empty_screen(self) -> None:
        node_program = r"""
const fs = require("fs");
const vm = require("vm");
global.window = global;
global.document = { elementFromPoint: () => null };
global.setTimeout = callback => callback();
vm.runInThisContext(fs.readFileSync(process.env.SDK_RENDERER, "utf8"));
vm.runInThisContext(fs.readFileSync(process.env.SDK_LOGIC, "utf8"));
vm.runInThisContext(fs.readFileSync("isometric-logistics-view.js", "utf8"));
const container = {
  innerHTML: "",
  querySelectorAll: () => [],
  querySelector: () => null,
  contains: () => true
};
window.IsometricLogisticsView.mount(container, {
  title: "Tutorial · Magazijn & Voorraad",
  selectedDepartmentId: "tutorial_warehouse_a",
  legend: [{ color: "tutorial-blue", label: "Magazijn A · blauw" }],
  connections: [],
  departments: [{
    id: "tutorial_warehouse_a",
    title: "Magazijn A",
    shortTitle: "Blauw",
    departmentColor: "tutorial-blue",
    status: "active",
    layout: { x: 2, y: 2, width: 3.4, depth: 3.1, height: 58 },
    orders: [],
    primaryMetric: "2× blauw 2×4"
  }],
  tutorial: {
    active: true,
    stepLabel: "2 / 5",
    eyebrow: "Self-starting tutorial · stap 2",
    title: "Magazijn & Voorraad",
    instruction: "Sleep de juiste blokken naar de Bouwafdeling.",
    feedback: "Verzamel vier onderdelen.",
    status: "collecting",
    collected: 0,
    required: 4
  }
}, {});
process.stdout.write(JSON.stringify({
  hasView: container.innerHTML.includes("iso-logistics-view is-tutorial"),
  hasStepTwoBanner: container.innerHTML.includes("Self-starting tutorial · stap 2"),
  hasInstruction: container.innerHTML.includes("Sleep de juiste blokken"),
  hasMap: container.innerHTML.includes('class="iso-map"'),
  hasWarehouse: container.innerHTML.includes('data-department-id="tutorial_warehouse_a"')
}));
"""
        completed_process = subprocess.run(
            ["node", "-e", node_program],
            cwd=PRODUCT_ROOT,
            env={**os.environ, "SDK_LOGIC": SDK_LOGIC_JS_FOR_NODE},
            check=True,
            capture_output=True,
            text=True,
        )
        result = json.loads(completed_process.stdout)
        self.assertTrue(result["hasView"])
        self.assertTrue(result["hasStepTwoBanner"])
        self.assertTrue(result["hasInstruction"])
        self.assertTrue(result["hasMap"])
        self.assertTrue(result["hasWarehouse"])

    def test_tutorial_focus_keeps_filled_step_two_parent_visible(self) -> None:
        node_program = r"""
const fs = require("fs");
const vm = require("vm");
const game = fs.readFileSync("script.js", "utf8");
const visibilityFunction = "function syncWorkbenchVisibility"
  + game.split("function syncWorkbenchVisibility")[1].split(
    "function setAppView"
  )[0];
const activeClasses = new Set(["tutorial-focus", "tutorial-stage-logistics"]);
global.document = {
  body: {
    classList: { contains: value => activeClasses.has(value) }
  }
};
global.state = { appView: "player" };
global.els = {
  playerWorkbench: { hidden: false, style: { display: "" } },
  managerWorkbench: { hidden: true, style: { display: "" } }
};
vm.runInThisContext(visibilityFunction);
syncWorkbenchVisibility("player");
const focused = {
  playerHidden: els.playerWorkbench.hidden,
  managerHidden: els.managerWorkbench.hidden
};
activeClasses.clear();
syncWorkbenchVisibility("player");
const normal = {
  playerHidden: els.playerWorkbench.hidden,
  managerHidden: els.managerWorkbench.hidden
};
process.stdout.write(JSON.stringify({ focused, normal }));
"""
        completed_process = subprocess.run(
            ["node", "-e", node_program],
            cwd=PRODUCT_ROOT,
            env={**os.environ, "SDK_LOGIC": SDK_LOGIC_JS_FOR_NODE},
            check=True,
            capture_output=True,
            text=True,
        )
        result = json.loads(completed_process.stdout)
        self.assertTrue(result["focused"]["playerHidden"])
        self.assertFalse(result["focused"]["managerHidden"])
        self.assertFalse(result["normal"]["playerHidden"])
        self.assertTrue(result["normal"]["managerHidden"])

    @unittest.skipUnless(_SDK_AVAILABLE, "Optionele externe SDK-contractasset niet ingesteld")
    def test_parallel_logistics_views_keep_stock_bricks_filled(self) -> None:
        node_program = r"""
const fs = require("fs");
const vm = require("vm");
global.window = global;
global.document = { elementFromPoint: () => null };
global.setTimeout = callback => callback();
vm.runInThisContext(fs.readFileSync(process.env.SDK_RENDERER, "utf8"));
vm.runInThisContext(fs.readFileSync(process.env.SDK_LOGIC, "utf8"));
vm.runInThisContext(fs.readFileSync("isometric-logistics-view.js", "utf8"));
const makeContainer = () => ({
  innerHTML: "",
  querySelectorAll: () => [],
  querySelector: () => null,
  contains: () => true
});
const scene = {
  title: "Tutorial · Magazijn & Voorraad",
  selectedDepartmentId: "tutorial_warehouse_a",
  legend: [],
  connections: [],
  departments: [{
    id: "tutorial_warehouse_a",
    title: "Magazijn A",
    shortTitle: "Blauw",
    departmentColor: "tutorial-blue",
    materialId: "blue_8",
    status: "active",
    openRoof: true,
    layout: { x: 2, y: 2, width: 3.4, depth: 3.1, height: 58 },
    orders: [],
    stockVisuals: [{
      partId: "blue_8",
      color: "blue",
      width: 2,
      depth: 4,
      count: 1,
      draggable: true,
      label: "blauw 2×4-blok"
    }]
  }],
  tutorial: {
    active: true,
    title: "Magazijn & Voorraad",
    instruction: "Verzamel het blok.",
    status: "collecting",
    collected: 0,
    required: 1
  }
};
const first = makeContainer();
const second = makeContainer();
window.IsometricLogisticsView.mount(first, scene, {});
window.IsometricLogisticsView.mount(second, scene, {});
process.stdout.write(JSON.stringify({
  firstDefinesOwnFill:
    first.innerHTML.includes('id="lego-iso-logistics-1-blue-top"')
    && first.innerHTML.includes('id="lego-iso-logistics-1-blue-left"')
    && first.innerHTML.includes('id="lego-iso-logistics-1-blue-right"'),
  firstUsesOwnFill:
    first.innerHTML.includes('fill="url(#lego-iso-logistics-1-blue-top)"')
    && first.innerHTML.includes('fill="url(#lego-iso-logistics-1-blue-left)"')
    && first.innerHTML.includes('fill="url(#lego-iso-logistics-1-blue-right)"'),
  secondDefinesOwnFill:
    second.innerHTML.includes('id="lego-iso-logistics-2-blue-top"')
    && second.innerHTML.includes('id="lego-iso-logistics-2-blue-left"')
    && second.innerHTML.includes('id="lego-iso-logistics-2-blue-right"'),
  secondUsesOwnFill:
    second.innerHTML.includes('fill="url(#lego-iso-logistics-2-blue-top)"')
    && second.innerHTML.includes('fill="url(#lego-iso-logistics-2-blue-left)"')
    && second.innerHTML.includes('fill="url(#lego-iso-logistics-2-blue-right)"'),
  hasNoUnscopedBlueFill:
    !first.innerHTML.includes('url(#lego-blue-')
    && !second.innerHTML.includes('url(#lego-blue-')
}));
"""
        completed_process = subprocess.run(
            ["node", "-e", node_program],
            cwd=PRODUCT_ROOT,
            env={**os.environ, "SDK_LOGIC": SDK_LOGIC_JS_FOR_NODE},
            check=True,
            capture_output=True,
            text=True,
        )
        result = json.loads(completed_process.stdout)
        self.assertTrue(result["firstDefinesOwnFill"])
        self.assertTrue(result["firstUsesOwnFill"])
        self.assertTrue(result["secondDefinesOwnFill"])
        self.assertTrue(result["secondUsesOwnFill"])
        self.assertTrue(result["hasNoUnscopedBlueFill"])

    def test_tutorial_warehouses_only_contain_their_own_color(self) -> None:
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        tutorial_departments = game.split(
            "const LOGISTICS_TUTORIAL_DEPARTMENTS = [",
            1,
        )[1].split("const LOGISTICS_TUTORIAL_CONNECTIONS", 1)[0]
        warehouse_colors = {
            "tutorial_warehouse_a": "blue",
            "tutorial_warehouse_b": "yellow",
            "tutorial_warehouse_c": "green",
        }
        for warehouse_id, expected_color in warehouse_colors.items():
            warehouse = tutorial_departments.split(
                f'id: "{warehouse_id}"',
                1,
            )[1].split("layout:", 1)[0]
            colors = re.findall(r'color: "([^"]+)"', warehouse)
            self.assertTrue(colors)
            self.assertEqual({expected_color}, set(colors))

    @unittest.skipUnless(_SDK_AVAILABLE, "LeerpretSDK-componenten niet geconfigureerd")
    def test_tutorial_step_three_transfers_the_semi_finished_product(self) -> None:
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        builder = SDK_BUILDER_PATH.read_text(encoding="utf-8")
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

    def test_tutorial_step_four_books_purchase_and_sale_in_isometric_view(self) -> None:
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        renderer = (PRODUCT_ROOT / "isometric-logistics-view.js").read_text(encoding="utf-8")
        styles = (PRODUCT_ROOT / "style.css").read_text(encoding="utf-8")
        readme = (PRODUCT_ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("FINANCIAL_TUTORIAL_DEPARTMENTS", game)
        self.assertIn('"tutorial_finance_warehouse"', game)
        self.assertIn('"tutorial_finance_production_a"', game)
        self.assertIn('"tutorial_finance_production_b"', game)
        self.assertIn('"tutorial_finance_production_c"', game)
        self.assertIn('"tutorial_finance_finished"', game)
        self.assertIn('"tutorial_finance_dispatch"', game)
        self.assertIn("startFinancialTutorial", game)
        self.assertIn("dropFinancialTutorialMaterial", game)
        self.assertIn("transferFinancialTutorialProduct", game)
        self.assertIn("deliverFinancialTutorialOrder", game)
        self.assertIn("finishFinancialTutorial", game)
        self.assertIn("financialTutorialSalePrice", game)
        self.assertIn("financialTutorialMaterialTotal", game)
        self.assertIn("FINANCIAL_TUTORIAL_DISTRACTORS", game)
        self.assertIn('actionType: "reject_financial_tutorial_material"', game)
        self.assertIn('reason: "not_in_tower_b_bill_of_materials"', game)
        self.assertIn("function layoutStockItems(items)", renderer)
        self.assertIn("const brickZ = 0.22 + visual.layer * 0.72", renderer)
        self.assertIn("slice(0, 8)", renderer)
        self.assertIn("state.config.money", game)
        self.assertIn("state.config.pnl", game)
        self.assertIn("state.config.priceMode", game)
        self.assertIn('actionType: "tutorial_financial_material_issue"', game)
        self.assertIn('actionType: "complete_financial_tutorial_transaction"', game)
        self.assertIn('actionType: "start_tutorial_mastery_trial"', game)
        self.assertIn("startTowerDesignTutorial", game)
        self.assertIn('state.logisticsTutorial.phase = "tower_design"', game)
        self.assertIn('actionType: "complete_tutorial_product_design"', game)
        self.assertIn('id="towerTutorialGuide"', (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8"))
        finish_finance = game.split("function finishFinancialTutorial() {", 1)[1].split(
            "function financialTutorialScene",
            1,
        )[0]
        self.assertIn("return startTowerDesignTutorial()", finish_finance)
        self.assertNotIn("endTutorial({ completed: true })", finish_finance)
        self.assertIn('nextLabel: "Naar Stap 5"', game)
        self.assertIn('location.hash === "#tutorialStep4"', game)
        self.assertIn("financeHudMarkup", renderer)
        self.assertIn("financeMutationMarkup", renderer)
        self.assertIn("financeSummaryMarkup", renderer)
        self.assertIn("data-finance-action", renderer)
        self.assertIn("onFinanceAction", renderer)
        self.assertIn(".iso-finance-hud", styles)
        self.assertIn(".iso-money-mutation", styles)
        self.assertIn(".iso-finance-summary", styles)
        self.assertIn("@keyframes iso-cash-credit", styles)
        self.assertIn("@keyframes iso-cash-debit", styles)
        self.assertIn("Financieel & Transactie", readme)

    @unittest.skipUnless(_SDK_AVAILABLE, "LeerpretSDK-componenten niet geconfigureerd")
    def test_authenticated_experience_starts_in_tutorial_focus_mode(self) -> None:
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        builder = SDK_BUILDER_PATH.read_text(encoding="utf-8")
        styles = (PRODUCT_ROOT / "style.css").read_text(encoding="utf-8")
        self.assertIn('id="tutorialExitButton"', html)
        self.assertIn('id="menuTutorialButton"', html)
        self.assertIn("data-tutorial-label", html)
        self.assertIn("Tutorial hervatten", html)
        self.assertIn("setTutorialFocus", game)
        self.assertIn("leaveTutorialFocus", game)
        self.assertIn("endTutorial", game)
        self.assertIn("pauseTutorial", game)
        self.assertIn("resumeTutorial", game)
        resume_section = game.split("function resumeTutorial() {", 1)[1].split(
            "function endTutorial",
            1,
        )[0]
        self.assertNotIn("return launchTutorial()", resume_section)
        self.assertIn('state.tutorialStage === "logistics"', resume_section)
        self.assertIn("state.logisticsTutorial.active = true", resume_section)
        self.assertIn('setTutorialFocus("logistics")', resume_section)
        self.assertIn('state.tutorialStage === "finance"', resume_section)
        launch_section = game.split("function launchTutorial() {", 1)[1].split(
            "async function syncTutorialStateToBackend",
            1,
        )[0]
        self.assertIn(
            "if (state.tutorialPaused || state.tutorialCompleted) return resumeTutorial();",
            launch_section,
        )
        self.assertIn('actionType: "pause_onboarding_tutorial"', game)
        self.assertIn('actionType: "resume_onboarding_tutorial"', game)
        self.assertIn('actionType: "restart_onboarding_tutorial"', game)
        self.assertIn('state.tutorialCompleted ? "Tutorial opnieuw" : "Tutorial hervatten"', game)
        self.assertIn('els.tutorialExitButton?.addEventListener("click", pauseTutorial)', game)
        self.assertIn(
            'document.querySelectorAll("[data-tutorial-launch]").forEach(button => {',
            game,
        )
        self.assertIn("event.stopPropagation()", game)
        self.assertIn("tutorialDismissed", game)
        self.assertIn("skipTutorial", builder)
        self.assertIn(".tutorial-focus.tutorial-stage-builder", styles)
        self.assertIn(".tutorial-focus.tutorial-stage-logistics", styles)
        self.assertIn("logisticsGameController?.pause()", game)
        self.assertIn("logisticsGameController?.resume()", game)
        self.assertIn(".tutorial-focus .logistics-game-mount", styles)
        self.assertIn("lastTutorialStateUpdateTimestamp = Date.now()", game)
        self.assertIn("requestStartTime < lastTutorialStateUpdateTimestamp", game)
        self.assertIn(
            '&& !document.body.classList.contains("tutorial-focus")',
            game,
        )
        self.assertIn(
            "pause()",
            (PRODUCT_ROOT / "logistics-game-ui.js").read_text(encoding="utf-8"),
        )

    @unittest.skipUnless(_SDK_AVAILABLE, "LeerpretSDK-logica niet naast de repo gevonden")
    def test_tutorial_uses_visual_drag_only_guidance(self) -> None:
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        builder = SDK_BUILDER_PATH.read_text(encoding="utf-8")
        logic = SDK_LOGIC_PATH.read_text(encoding="utf-8")
        renderer = (PRODUCT_ROOT / "isometric-logistics-view.js").read_text(encoding="utf-8")
        tower_renderer = SDK_RENDERER_PATH.read_text(encoding="utf-8")
        styles = (PRODUCT_ROOT / "style.css").read_text(encoding="utf-8")
        self.assertIn("Je bent leverancier van LEGO-torens.", builder)
        self.assertIn("Een klant wil deze toren.", builder)
        self.assertIn('const firstTowerComplete = state.mode === "tutorial" && state.tutorialComplete;', builder)
        self.assertIn('firstTowerComplete\n      ? "Volgende stap"', builder)
        self.assertIn('const warehouseNext = state.mode === "stock_waiting";', builder)
        self.assertIn('? "Naar de magazijnen"', builder)
        self.assertIn('data-tooltip="Geen blokjes meer in voorraad"', builder)
        self.assertIn("builder-stock-hint", builder)
        self.assertIn("Hint: haal voorraad uit het magazijn.", builder)
        self.assertIn('aria-disabled="${outOfStock}"', builder)
        self.assertIn(".builder-palette-item.is-out-of-stock", styles)
        self.assertIn(".builder-stock-hint-backdrop", styles)
        # De TUTORIAL-sequenties wonen nu in de LeerpretSDK-logica-module.
        self.assertIn('sequence: ["yellow_8", "yellow_8"]', logic)
        self.assertIn('sequence: ["yellow_8", "yellow_8", "red_8"]', logic)
        self.assertIn('sequence: ["yellow_8", "yellow_8", "red_8", "white_4"]', logic)
        self.assertIn("window.LegoTowerRenderer.renderAnimated", builder)
        self.assertIn("static layoutSequence(sequence)", tower_renderer)
        self.assertIn("static renderAnimated(", tower_renderer)
        self.assertIn("window.LegoTowerRenderer.renderAnimated", renderer)
        self.assertNotIn("plaats hier", builder.lower())
        self.assertIn("builder-rotate", builder)
        self.assertIn("quality_orientation_mismatch", builder)
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
        self.assertIn('id="menuSettingsButton"', html)
        self.assertIn('id="accountSettingsMenu"', html)
        self.assertIn('id="menuAuthStatus"', html)
        self.assertIn("setAccountMenuOpen", auth)
        self.assertIn("https://accounts.google.com/gsi/client", auth)
        self.assertIn('credentials: "include"', auth)
        self.assertIn("window.LEARNGAME_OM_CONFIG?.apiBase", auth)
        self.assertIn("LEERPRET_API_URL ontbreekt in runtime-config.js", auth)
        self.assertNotIn("localApiForCurrentPage", auth)
        self.assertNotIn("alignStoredLoopbackHost", auth)
        self.assertIn("/auth/leerbox/session?leerbox_id=", auth)
        self.assertIn("/auth/leerbox/exchange?leerbox_id=", auth)
        self.assertIn('request("/auth/leerbox/google-code"', auth)
        self.assertIn("retained and returns the restricted HttpOnly cookie", auth)
        self.assertIn('request("/auth/google/config"', auth)
        self.assertIn("initCodeClient", auth)
        self.assertIn('scope: "openid"', auth)
        self.assertIn("include_granted_scopes: false", auth)
        self.assertNotIn("accounts.id", auth)
        self.assertNotIn("response.credential", auth)
        self.assertIn('request("/auth/leerbox/logout"', auth)
        self.assertIn('"learner"', auth)
        self.assertIn('"attraction"', auth)
        self.assertIn("leerpret-auth-changed", auth)
        self.assertNotIn("leerpret-local-dev", auth)
        self.assertNotIn("leerpretAuthApiKey", html)
        self.assertNotIn("API-sleutel</span>", html)
        self.assertNotIn('localStorage.setItem("api_key"', auth)
        self.assertIn("./leerpret-auth.js", worker)

    def test_ci_preview_uses_the_production_engine(self) -> None:
        runtime = (PRODUCT_ROOT / "runtime-config.js").read_text(encoding="utf-8")
        generator = (PRODUCT_ROOT / "scripts/generate_runtime_config.py").read_text(
            encoding="utf-8"
        )
        for source in (runtime, generator):
            self.assertIn('window.location.port === "47913"', source)
            self.assertIn("var isLocal = !isCiPreview", source)

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

    def test_game_session_contract_requires_unanimous_consensus_records(self) -> None:
        contract = json.loads(
            (PRODUCT_ROOT / "contracts/game-session-consensus-v1.schema.json").read_text(encoding="utf-8")
        )
        consensus = contract["properties"]["consensus"]
        self.assertIn("difficulty_level", contract["required"])
        self.assertIn("play_mode", contract["properties"]["game_config"]["required"])
        self.assertIn("opening_balance_enabled", contract["properties"]["game_config"]["required"])
        self.assertIn("revenue_balance_enabled", contract["properties"]["game_config"]["required"])
        self.assertIn("production_planning_enabled", contract["properties"]["game_config"]["required"])
        self.assertIn("enabled_roles", contract["properties"]["game_config"]["required"])
        self.assertIn(
            "production_a",
            contract["properties"]["game_config"]["properties"]["enabled_roles"]["items"]["enum"],
        )
        self.assertEqual(
            ["physical", "digital"],
            contract["properties"]["game_config"]["properties"]["play_mode"]["enum"],
        )
        self.assertEqual(
            ["easy", "normal", "hard"],
            contract["properties"]["difficulty_level"]["enum"],
        )
        self.assertIn("required_member_ids", consensus["required"])
        self.assertIn("approved_member_ids", consensus["required"])
        self.assertEqual(
            "fill_vacant_roles_with_virtual_agents",
            consensus["properties"]["proposal"]["const"],
        )

    def test_game_session_ui_separates_managed_creation_and_free_fallback(self) -> None:
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        runtime = (PRODUCT_ROOT / "game-sessions.js").read_text(encoding="utf-8")
        player = html.split('id="playerWorkbench"', 1)[1].split('id="managerWorkbench"', 1)[0]
        manager = html.split('id="managerWorkbench"', 1)[1]
        self.assertNotIn('id="gameSessionCreateForm"', player)
        self.assertIn('id="gameSessionCreateForm"', manager)
        self.assertIn("can_start_free_game", runtime)
        self.assertIn("data-start-free-game", runtime)
        self.assertIn('"wait"', runtime)
        self.assertIn('"start_with_agents"', runtime)
        self.assertIn('context === "player" && running', runtime)
        self.assertIn("player-running-session", runtime)
        self.assertIn("placePlayerSessionPanel", runtime)
        self.assertIn('id="playerSessionMetricMount"', html)
        self.assertIn('id="liveEventsToggle"', html)
        self.assertNotIn('id="liveEventsPopover"', html)
        self.assertIn('id="topLiveEventsPopover"', html)
        self.assertIn('id="topEventsPopover"', html)
        self.assertIn('id="eventsToggle"', html)
        self.assertNotRegex(
            html,
            r'id="eventsToggle"[^>]*data-main-menu-tab',
        )
        self.assertNotRegex(
            html,
            r'id="liveEventsToggle"[^>]*data-main-menu-tab',
        )
        self.assertNotIn('id="openOrdersValue"', html)
        self.assertNotIn("Gamecode &amp; lobby", runtime)
        self.assertIn("is-metric-session", runtime)
        self.assertIn("data-game-master-role-select", runtime)
        self.assertIn("game-master-role", runtime)
        self.assertIn("(rolruil)", runtime)
        self.assertIn("mutationVersion", runtime)
        self.assertIn("gameSessionDifficulty", html)
        self.assertIn("data-create-difficulty-select", runtime)
        self.assertIn("data-game-difficulty-select", runtime)
        self.assertIn("difficulty_level", runtime)
        self.assertIn("Moeilijkheidsgraad", runtime)
        self.assertIn("data-active-game-config", runtime)
        self.assertIn("customer_order_mode", runtime)
        self.assertIn("play_mode", runtime)
        self.assertIn("Spelmodus", runtime)
        self.assertIn("game_config: gameConfig", runtime)
        self.assertIn("/configuration", runtime)
        self.assertIn("queueGameConfigSave", runtime)
        self.assertIn("pendingConfigOverlay", runtime)
        self.assertIn("mutationQueue", runtime)
        self.assertIn("recoverLocalApiBase", runtime)
        self.assertIn("response.status === 501", runtime)
        self.assertIn("error.status = response.status", runtime)
        self.assertIn("Je neemt al deel aan een lobby of actieve gamesessie.", runtime)
        self.assertIn("await refreshAfterMutation()", runtime)
        self.assertIn('localStorage.setItem("leerpret.apiBase"', runtime)
        self.assertIn("createSessionDraft", runtime)
        self.assertIn("state.createSessionDraft.game_config = config", runtime)

    def test_create_session_button_executes_post_contract_directly(self) -> None:
        runtime = (PRODUCT_ROOT / "game-sessions.js").read_text(encoding="utf-8")
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        function_source = "function createSessionFromForm" + runtime.split(
            "function createSessionFromForm",
            1,
        )[1].split("function wire", 1)[0]
        node_program = f"""
const vm = require("vm");
const sandbox = {{
  state: {{ busy: false, createSessionDraft: null }},
  collectGameConfig: () => ({{ game_type: "lo4", play_mode: "physical" }}),
  mutate: (path, body) => {{ sandbox.mutation = {{ path, body }}; }}
}};
sandbox.form = {{
  querySelector: selector => ({{
    value: selector === "#gameSessionType" ? "closed" : "normal"
  }})
}};
vm.runInNewContext({json.dumps(function_source)} + `
  result = createSessionFromForm(form);
`, sandbox);
process.stdout.write(JSON.stringify({{
  result: sandbox.result,
  draft: sandbox.state.createSessionDraft,
  mutation: sandbox.mutation
}}));
"""
        completed_process = subprocess.run(
            ["node", "-e", node_program],
            cwd=PRODUCT_ROOT,
            env={**os.environ, "SDK_LOGIC": SDK_LOGIC_JS_FOR_NODE},
            check=True,
            capture_output=True,
            text=True,
        )
        result = json.loads(completed_process.stdout)
        self.assertTrue(result["result"])
        self.assertEqual("/v1/game-sessions", result["mutation"]["path"])
        self.assertEqual("closed", result["mutation"]["body"]["session_type"])
        self.assertEqual("normal", result["mutation"]["body"]["difficulty_level"])
        self.assertEqual("lo4", result["mutation"]["body"]["game_config"]["game_type"])
        self.assertEqual(result["draft"], result["mutation"]["body"])
        self.assertIn("data-create-game-session", html)
        self.assertIn('id="managerSessionActionButton"', html)
        self.assertIn('getElementById("managerSessionActionButton")', runtime)
        self.assertIn("Sessie aanmaken", html)
        self.assertIn('id="topPeopleButton"', html)
        self.assertIn('id="topAgentsButton"', html)
        self.assertIn("sessionRoleDistributionMarkup", runtime)
        self.assertIn("setRunningConfigReadOnly", runtime)
        self.assertIn("Instellingen van de lopende gamesessie", runtime)
        self.assertIn('"Sessie afsluiten"', runtime)
        self.assertIn('event.target.closest("[data-create-game-session]")', runtime)
        self.assertIn(
            'createSessionFromForm(createButton.form || document.getElementById("gameSessionCreateForm"))',
            runtime,
        )

    def test_customer_places_tower_order_without_selecting_bricks(self) -> None:
        engine_path = PRODUCT_ROOT / "logistics-game-engine.js"
        ui = (PRODUCT_ROOT / "logistics-game-ui.js").read_text(encoding="utf-8")
        self.assertIn("customerOrderPanelMarkup", ui)
        self.assertIn("data-customer-order-form", ui)
        self.assertIn("Order plaatsen en naar Operations sturen", ui)
        self.assertIn('role.id === "customer"', ui)
        self.assertIn("customerOrderDraft", ui)
        self.assertIn("sim-customer-catalog", ui)
        self.assertIn("Kies uit het productassortiment", ui)
        self.assertIn("displayProduct", ui)
        self.assertIn("selectedProductId", ui)

    @unittest.skipUnless(_SDK_AVAILABLE, "LeerpretSDK-componenten niet geconfigureerd")
    def test_physical_and_digital_modes_require_different_player_actions(self) -> None:
        engine_path = PRODUCT_ROOT / "logistics-game-engine.js"
        ui_path = PRODUCT_ROOT / "logistics-game-ui.js"
        renderer_path = SDK_RENDERER_PATH
        ui = ui_path.read_text(encoding="utf-8")
        styles = (PRODUCT_ROOT / "style.css").read_text(encoding="utf-8")
        self.assertIn("physicalActionPanelMarkup", ui)
        self.assertIn("digitalActionPanelMarkup", ui)
        self.assertIn("digitalPartStageMarkup", ui)
        self.assertIn("digitalBuilderBoardMarkup", ui)
        self.assertIn("placeDigitalBoardPart", ui)
        self.assertIn('components?.["lego-builder"]?.logic', ui)
        self.assertIn("planRecipeBuild", ui)
        self.assertIn("validatePlannedPlacement", ui)
        self.assertNotIn("digitalLayerBricks", ui)
        self.assertNotIn("Math.hypot(targetX - pointerX", ui)
        self.assertIn("data-sim-builder-board", ui)
        self.assertIn("eventTargetClosest", ui)
        self.assertIn('event.dataTransfer.dropEffect = "copy"', ui)
        self.assertIn('event.dataTransfer.dropEffect = "move"', ui)
        self.assertIn("data-sim-virtual-stage", ui)
        self.assertIn("data-sim-drag-part", ui)
        self.assertIn("data-sim-part-dropzone", ui)
        self.assertIn("data-sim-transfer-cargo", ui)
        self.assertIn("data-sim-transfer-dropzone", ui)
        self.assertIn("data-sim-transfer-target", ui)
        self.assertIn("activeTransferPointer", ui)
        self.assertIn("setPointerCapture", ui)
        self.assertIn('completeDigitalTransfer("touch")', ui)
        self.assertIn("digitalCompletionPayload", ui)
        self.assertNotIn('setData("application/x-learngame-transfer", "ready")', ui)
        self.assertIn("sim-action-help", ui)
        self.assertIn("data-sim-form-parts", ui)
        self.assertIn("Automatisch overgenomen", ui)
        self.assertIn(".sim-digital-workbench", styles)
        self.assertIn(".sim-inline-builder-board", styles)
        self.assertIn(
            "grid-template-columns: minmax(330px, 0.78fr) minmax(520px, 1.22fr)",
            styles,
        )
        self.assertIn(".sim-auto-form-summary", styles)

        node_program = f"""
const fs = require("fs");
global.window = global;
window.setInterval = () => 1;
window.clearInterval = () => {{}};
let now = 1000;
eval(fs.readFileSync({json.dumps(str(renderer_path))}, "utf8"));
eval(fs.readFileSync({json.dumps(str(SDK_LOGIC_PATH))}, "utf8"));
eval(fs.readFileSync({json.dumps(str(engine_path))}, "utf8"));
eval(fs.readFileSync({json.dumps(str(ui_path))}, "utf8"));
const Engine = window.LogisticsGameEngine.LogisticsGameEngine;
function taskFor(playMode) {{
  const engine = new Engine({{
    now: () => now,
    random: () => 0,
    config: {{
      initialOrderDelayMs: 999999999,
      transferDelayMinMs: 0,
      transferDelayMaxMs: 0,
      incidentChance: 0
    }}
  }});
  engine.start({{humanRoleId: "pd1", playMode}});
  engine.generateOrder();
  for (let i = 0; i < 20 && !engine.playerTask(); i += 1) {{
    now += 1000;
    engine.update(now);
  }}
  return engine;
}}
const physical = taskFor("physical");
const physicalTask = physical.playerTask();
const physicalRejected = physical.completePlayerAction({{signed: true}});
const physicalResult = physical.completePlayerAction({{
  parts: physicalTask.requiredParts,
  transferred: true,
  signed: true,
  signature: [[[1, 1], [20, 20]]],
  completedQuantity: physicalTask.order.quantity
}});
const digital = taskFor("digital");
const digitalTask = digital.playerTask();
const digitalRejected = digital.completePlayerAction({{signed: true}});
const digitalCompleted = digital.completePlayerAction({{
  parts: digitalTask.requiredParts,
  transferred: true,
  transfer: digital.batchTransferDescriptor(digitalTask.order, digitalTask.role.id),
  signed: true,
  signature: [[[1, 1], [20, 20]]],
  completedQuantity: digitalTask.order.quantity
}});
const UIController = window.LogisticsGameUI.LogisticsGameUIController;
const uiController = Object.create(UIController.prototype);
uiController.engine = digital;
uiController.selectedParts = {{}};
uiController.transferred = false;
uiController.signed = false;
uiController.signatureStrokes = [];
uiController.digitalTransferSelected = false;
uiController.feedback = "";
let signatureRenderCount = 0;
uiController.render = () => {{ signatureRenderCount += 1; }};
const digitalBefore = uiController.digitalActionPanelMarkup(digitalTask);
uiController.selectedParts = {{...digitalTask.requiredParts}};
const digitalBuilt = uiController.digitalActionPanelMarkup(digitalTask);
uiController.signatureStrokes = [[{{x: 1, y: 1}}, {{x: 12, y: 12}}, {{x: 24, y: 18}}, {{x: 40, y: 8}}, {{x: 55, y: 20}}]];
uiController.signed = uiController.signatureHasInk();
const signedMarkup = uiController.signatureMarkup(digitalTask, true);
const signedDigitalPanel = uiController.digitalActionPanelMarkup(digitalTask);
uiController.transferred = true;
const completedDigitalPanel = uiController.digitalActionPanelMarkup(digitalTask);
uiController.engine = physical;
uiController.selectedParts = {{}};
uiController.transferred = false;
uiController.signed = false;
uiController.signatureStrokes = [];
const physicalMarkup = uiController.physicalActionPanelMarkup(physicalTask);
process.stdout.write(JSON.stringify({{
  physicalMode: physicalTask.playMode,
  physicalRejected,
  physicalResult,
  physicalHistory: physical.snapshot().orders[0].history,
  digitalMode: digitalTask.playMode,
  digitalRejected,
  digitalCompleted,
  digitalUsesDragParts: digitalBefore.includes("data-sim-drag-part"),
  digitalUsesTutorialBoard: digitalBefore.includes('class="sim-inline-builder-board"'),
  digitalShowsPlacementTarget: digitalBefore.includes("sim-builder-target"),
  digitalHasNoLegacyPartButton: !digitalBefore.includes('data-sim-part="'),
  digitalHasTowerDropzone: digitalBuilt.includes("data-sim-part-dropzone"),
  digitalShowsSignatureForCompleteBatch: digitalBuilt.includes("data-sim-signature-pad"),
  digitalLocksTransferBeforeSignature: digitalBuilt.includes('draggable="false"'),
  digitalUnlocksBatchAfterSignature: signedDigitalPanel.includes('draggable="true"'),
  digitalCarriesOrderBatch: signedDigitalPanel.includes(`data-sim-transfer-cargo="${{digitalTask.order.id}}"`),
  digitalCarriesTarget: signedDigitalPanel.includes('data-sim-transfer-target="'),
  digitalShowsWholeBatch: (signedDigitalPanel.match(/class="sim-transfer-tower"/g) || []).length === Math.min(4, digitalTask.order.quantity),
  physicalKeepsLegacyPartButton: physicalMarkup.includes('data-sim-part="'),
  signatureHasInk: signedMarkup.includes("sim-signature is-signed"),
  signedMarkupHasPad: signedMarkup.includes("data-sim-signature-pad"),
  signedMarkupIsActive: signedMarkup.includes("sim-signature is-signed"),
  signedMarkupConfirmsOrder: signedMarkup.includes("Order geparafeerd"),
  signedMarkupConfirms: signedMarkup.includes("Formulier geparafeerd ✓"),
  transferShowsAuthoritativePendingState: completedDigitalPanel.includes("data-sim-transfer-pending"),
  digitalHasNoSecondCompletionButton: !completedDigitalPanel.includes("data-sim-complete")
}}));
"""
        completed_process = subprocess.run(
            ["node", "-e", node_program],
            cwd=PRODUCT_ROOT,
            env={**os.environ, "SDK_LOGIC": SDK_LOGIC_JS_FOR_NODE},
            check=True,
            capture_output=True,
            text=True,
        )
        result = json.loads(completed_process.stdout)
        self.assertEqual("physical", result["physicalMode"])
        self.assertFalse(result["physicalRejected"]["ok"])
        self.assertTrue(result["physicalResult"]["ok"])
        self.assertTrue(
            any(item.get("playMode") == "physical" for item in result["physicalHistory"])
        )
        self.assertEqual("digital", result["digitalMode"])
        self.assertFalse(result["digitalRejected"]["ok"])
        self.assertTrue(result["digitalCompleted"]["ok"])
        self.assertTrue(result["digitalUsesDragParts"])
        self.assertTrue(result["digitalUsesTutorialBoard"])
        self.assertTrue(result["digitalShowsPlacementTarget"])
        self.assertTrue(result["digitalHasNoLegacyPartButton"])
        self.assertTrue(result["digitalHasTowerDropzone"])
        self.assertTrue(result["digitalShowsSignatureForCompleteBatch"])
        self.assertTrue(result["digitalLocksTransferBeforeSignature"])
        self.assertTrue(result["digitalUnlocksBatchAfterSignature"])
        self.assertTrue(result["digitalCarriesOrderBatch"])
        self.assertTrue(result["digitalCarriesTarget"])
        self.assertTrue(result["digitalShowsWholeBatch"])
        self.assertTrue(result["physicalKeepsLegacyPartButton"])
        self.assertTrue(result["signatureHasInk"])
        self.assertTrue(result["signedMarkupHasPad"])
        self.assertTrue(result["signedMarkupIsActive"])
        self.assertTrue(result["signedMarkupConfirmsOrder"])
        self.assertTrue(result["transferShowsAuthoritativePendingState"])
        self.assertTrue(result["digitalHasNoSecondCompletionButton"])

        node_program = f"""
const fs = require("fs");
global.window = global;
window.setInterval = () => 1;
window.clearInterval = () => {{}};
let now = 1000;
eval(fs.readFileSync({json.dumps(str(engine_path))}, "utf8"));
const Engine = window.LogisticsGameEngine.LogisticsGameEngine;
const engine = new Engine({{
  now: () => now,
  random: () => 0,
  config: {{transferDelayMinMs: 0, transferDelayMaxMs: 0}}
}});
engine.start({{humanRoleId: "customer", customerOrderMode: "free"}});
engine.generateOrder();
engine.update(now);
const task = engine.playerTask();
const result = engine.completePlayerAction({{
  customerOrder: {{productId: "B", quantity: 4, dueMinutes: 15}}
}});
const order = engine.snapshot().orders[0];
const requiredEngine = new Engine({{
  now: () => now,
  random: () => 0,
  config: {{transferDelayMinMs: 0, transferDelayMaxMs: 0}}
}});
requiredEngine.start({{humanRoleId: "customer", customerOrderMode: "required"}});
requiredEngine.generateOrder();
requiredEngine.update(now);
const requiredResult = requiredEngine.completePlayerAction({{
  customerOrder: {{productId: "B", quantity: 12, dueMinutes: 120}}
}});
const requiredOrder = requiredEngine.snapshot().orders[0];
process.stdout.write(JSON.stringify({{
  role: task.role.id,
  requiredParts: task.requiredParts,
  mode: task.customerOrderMode,
  availableProducts: task.availableProducts.length,
  ok: result.ok,
  productId: order.productId,
  quantity: order.quantity,
  status: order.status,
  requiredOk: requiredResult.ok,
  requiredProductId: requiredOrder.productId,
  requiredQuantity: requiredOrder.quantity
}}));
"""
        completed_process = subprocess.run(
            ["node", "-e", node_program],
            cwd=PRODUCT_ROOT,
            env={**os.environ, "SDK_LOGIC": SDK_LOGIC_JS_FOR_NODE},
            check=True,
            capture_output=True,
            text=True,
        )
        result = json.loads(completed_process.stdout)
        self.assertEqual("customer", result["role"])
        self.assertEqual({}, result["requiredParts"])
        self.assertEqual("free", result["mode"])
        self.assertGreaterEqual(result["availableProducts"], 1)
        self.assertTrue(result["ok"])
        self.assertEqual("B", result["productId"])
        self.assertEqual(4, result["quantity"])
        self.assertEqual("ACTIVE", result["status"])
        self.assertTrue(result["requiredOk"])
        self.assertEqual("A", result["requiredProductId"])
        self.assertEqual(1, result["requiredQuantity"])

    def test_session_difficulty_controls_agent_pressure_and_noise(self) -> None:
        engine_path = PRODUCT_ROOT / "logistics-game-engine.js"
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        engine_source = engine_path.read_text(encoding="utf-8")
        self.assertIn("DIFFICULTY_PRESETS", engine_source)
        self.assertIn("Typefout in overdracht", engine_source)
        self.assertIn("Verkeerde levering", engine_source)
        self.assertIn("setDifficulty(difficultyLevel)", game)
        self.assertIn("session.difficulty_level", game)

        node_program = f"""
const fs = require("fs");
global.window = global;
window.setInterval = () => 1;
window.clearInterval = () => {{}};
eval(fs.readFileSync({json.dumps(str(engine_path))}, "utf8"));
const Engine = window.LogisticsGameEngine.LogisticsGameEngine;
const easy = new Engine();
easy.setDifficulty("easy");
const normal = new Engine();
normal.setDifficulty("normal");
const hard = new Engine();
hard.setDifficulty("hard");
process.stdout.write(JSON.stringify({{
  easy: easy.snapshot(),
  normal: normal.snapshot(),
  hard: hard.snapshot()
}}));
"""
        completed_process = subprocess.run(
            ["node", "-e", node_program],
            cwd=PRODUCT_ROOT,
            env={**os.environ, "SDK_LOGIC": SDK_LOGIC_JS_FOR_NODE},
            check=True,
            capture_output=True,
            text=True,
        )
        result = json.loads(completed_process.stdout)
        self.assertGreater(
            result["easy"]["config"]["orderIntervalMinMs"],
            result["normal"]["config"]["orderIntervalMinMs"],
        )
        self.assertGreater(
            result["normal"]["config"]["orderIntervalMinMs"],
            result["hard"]["config"]["orderIntervalMinMs"],
        )
        self.assertLess(
            result["easy"]["config"]["incidentChance"],
            result["normal"]["config"]["incidentChance"],
        )
        self.assertLess(
            result["normal"]["config"]["incidentChance"],
            result["hard"]["config"]["incidentChance"],
        )
        self.assertGreater(
            result["hard"]["difficulty"]["reactionJitter"][1]
            - result["hard"]["difficulty"]["reactionJitter"][0],
            result["easy"]["difficulty"]["reactionJitter"][1]
            - result["easy"]["difficulty"]["reactionJitter"][0],
        )

    @unittest.skipUnless(_SDK_AVAILABLE, "LeerpretSDK-componenten niet geconfigureerd")
    def test_tower_editor_adds_animated_products_to_the_assortment(self) -> None:
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        game = (PRODUCT_ROOT / "script.js").read_text(encoding="utf-8")
        editor = SDK_EDITOR_PATH.read_text(encoding="utf-8")
        renderer = SDK_RENDERER_PATH.read_text(encoding="utf-8")
        builder = SDK_BUILDER_PATH.read_text(encoding="utf-8")
        sessions = (PRODUCT_ROOT / "game-sessions.js").read_text(encoding="utf-8")
        self.assertIn('data-main-menu-tab="tower-editor"', html)
        self.assertIn('data-manager-panel="tower-editor"', html)
        self.assertIn('data-manager-menu="towers"', html)
        self.assertIn('data-tower-tab="builder"', html)
        self.assertIn('data-tower-tab="assortment"', html)
        self.assertIn("Productassortiment", html)
        self.assertIn("renderAnimated", editor)
        self.assertIn("tower-assortment-grid", editor)
        self.assertIn("registerCustomProduct", game)
        self.assertIn("removeCustomProduct", game)
        self.assertIn("CUSTOM_PRODUCTS_STORAGE", game)
        self.assertIn("data-remove-assortment-product", editor)
        self.assertIn("Kan niet bij een actieve gamesessie", editor)
        self.assertIn("learngame-session-state", editor)
        self.assertIn("static renderSequence(", renderer)
        self.assertIn("static foundationCount(", renderer)
        self.assertIn("completedLayerCount", editor)
        self.assertIn("partFitsCurrentLayer", editor)
        self.assertIn("precies 3 lagen hoog", editor)
        self.assertIn("registerProduct", builder)
        self.assertIn("unregisterProduct", builder)
        self.assertIn('data-ground-plate-color=', editor)
        self.assertIn("Grootte:", editor)
        self.assertIn("GROUND_PLATE_SIZE", editor)
        self.assertIn("groundPlate: {", editor)
        self.assertIn("groundPlate: { ...product.groundPlate }", game)
        self.assertIn('blokId: "element.ground-plate.6x6.green"', game)
        self.assertIn('blokFile: "elements/element_grondplaat_6x6_groen.blok"', game)
        self.assertIn('width: 6,\n      depth: 6', game)
        self.assertIn('groundPlateColor = "green"', renderer)
        self.assertIn("product.groundPlate?.color || \"green\"", builder)
        self.assertIn('name="multiple_colors"', html)
        self.assertIn('name="color_groundPlate"', html)
        self.assertIn('name="color_layer1"', html)
        self.assertIn('name="color_layer2"', html)
        self.assertIn('name="color_layer3"', html)
        self.assertIn("setColorConfiguration", editor)
        self.assertIn("CLASSIC_LAYER_COLORS", editor)
        self.assertIn('editableColorLayers: ["groundPlate", "layer1", "layer2", "layer3"]', game)
        self.assertIn("updateColorLayerControls", sessions)
        self.assertIn("editable_color_layers", sessions)
        self.assertIn("Meerdere kleuren", sessions)
        self.assertIn("gameComparisonMatricesMarkup", sessions)
        self.assertIn("Grondplaatkleur vrij", sessions)
        self.assertIn("Leverancier", sessions)


    def test_game_configuration_store_and_schema(self) -> None:
        schema_path = PRODUCT_ROOT / "contracts" / "game-configuration-v1.schema.json"
        store_path = PRODUCT_ROOT / "game-configuration-store.js"
        html_path = PRODUCT_ROOT / "index.html"
        script_path = PRODUCT_ROOT / "script.js"

        self.assertTrue(schema_path.is_file())
        self.assertTrue(store_path.is_file())

        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        self.assertEqual("LEARNGame OM Game Configuration Schema v1", schema["title"])
        self.assertIn("opening_balance_enabled", schema["properties"]["settings"]["required"])
        self.assertIn("revenue_balance_enabled", schema["properties"]["settings"]["required"])
        self.assertIn("production_planning_enabled", schema["properties"]["settings"]["required"])

        store_code = store_path.read_text(encoding="utf-8")
        self.assertIn("class GameConfigurationStore", store_code)
        self.assertIn("BUILTIN_PRESETS", store_code)
        self.assertIn("lo1", store_code)
        self.assertIn("entrepreneurial", store_code)
        self.assertIn("le_training", store_code)
        self.assertIn("saveConfiguration", store_code)
        self.assertIn("deleteCustomConfiguration", store_code)
        self.assertIn("findMatchingConfiguration", store_code)
        self.assertIn("opening_balance_enabled", store_code)
        self.assertIn("revenue_balance_enabled", store_code)
        self.assertIn("production_planning_enabled", store_code)

        probe = subprocess.run(
            [
                "node",
                "-e",
                """
global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {} };
require("./logistics-process.js");
require("./runtime-role-contract.js");
require("./game-configuration-store.js");
const layout = require("./configuration-layout-preview.js");
const lo4 = global.GameConfigurationStore.getConfiguration("lo4");
const match = global.GameConfigurationStore.findMatchingConfiguration({
  ...lo4.settings,
  play_mode: "digital",
  enabled_roles: [...lo4.settings.enabled_roles]
});
const repaired = global.GameConfigurationStore.normalizeSettings({
  ...lo4.settings,
  enabled_roles: ["supplier"],
  has_supplier: true
}, "lo4");
console.log(JSON.stringify({
  match: match && match.config_id,
  repairedRoles: repaired.enabled_roles,
  repairedHasSupplier: repaired.has_supplier,
  lo4TopologyNodes: [
    ...layout.topology(lo4.settings).before,
    ...layout.topology(lo4.settings).internal,
    ...layout.topology(lo4.settings).after
  ].map(node => node.id)
}));
""",
            ],
            cwd=PRODUCT_ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        preset_result = json.loads(probe.stdout)
        self.assertEqual("lo4", preset_result["match"])
        self.assertEqual(7, len(preset_result["repairedRoles"]))
        self.assertIn("production_a", preset_result["repairedRoles"])
        self.assertNotIn("supplier", preset_result["repairedRoles"])
        self.assertNotIn("sales", preset_result["repairedRoles"])
        self.assertNotIn("finance", preset_result["repairedRoles"])
        self.assertTrue(preset_result["repairedHasSupplier"])
        self.assertIn("supplier", preset_result["lo4TopologyNodes"])
        self.assertIn("raw", preset_result["lo4TopologyNodes"])

        html = html_path.read_text(encoding="utf-8")
        self.assertIn('src="game-configuration-store.js?v=20260821.3"', html)
        self.assertLess(
            html.index('src="runtime-role-contract.js?v=20260821.2"'),
            html.index('src="game-configuration-store.js?v=20260821.3"'),
        )
        self.assertIn('id="saveConfigDialog"', html)
        self.assertIn('id="saveConfigButton"', html)

        script = script_path.read_text(encoding="utf-8")
        self.assertIn("loadGameConfiguration", script)
        self.assertIn("populateGameTypeSelect", script)
        self.assertIn("findMatchingConfiguration", script)
        self.assertIn("is-highlighted", script)
        self.assertIn("Mutatie liquide middelen", script)
        self.assertIn("Fictieve nulbalans", script)
        self.assertIn("Fictieve nul-verliesrekening", script)


if __name__ == "__main__":
    unittest.main()

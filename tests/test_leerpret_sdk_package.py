"""Packaging-regressietests voor de LeerpretSDK-bedrading in de frontend.

De SDK-broncode woont niet meer in deze repo maar in de Leerpret-backend, die
'm achter /api/sdk/... serveert. Deze test bewaakt dat de frontend de SDK van
de API laadt (in de juiste volgorde) en niet terugvalt op een lokaal bestand.
"""
from __future__ import annotations

import re
import unittest
from pathlib import Path


PRODUCT_ROOT = Path(__file__).resolve().parents[1]
# De loader stelt de asset-URL samen als <backend-basis> + dit pad.
SDK_ASSET_PATH = "/sdk/lego-builder/logic.js"


class LeerpretSdkWiringTests(unittest.TestCase):
    def test_frontend_loads_sdk_from_the_api_before_the_component(self) -> None:
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn(SDK_ASSET_PATH, html, "index.html moet de SDK-loader bevatten")
        self.assertIn("LEERPRET_SDK_BASE", html, "de loader moet een override-hook bieden")
        # De scripts worden geketend geladen: SDK vóór lego-builder.js, en script.js erna.
        self.assertIn('"lego-builder.js"', html)
        self.assertIn('"script.js"', html)
        self.assertLess(
            html.index(SDK_ASSET_PATH),
            html.index('"lego-builder.js"'),
            "de SDK-logica moet vóór lego-builder.js in de laadketen staan",
        )
        self.assertLess(
            html.index('"lego-builder.js"'),
            html.index('"script.js"'),
            "lego-builder.js moet vóór script.js geladen worden",
        )

    def test_no_local_sdk_copy_remains(self) -> None:
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        self.assertNotIn("sdk/components/lego-builder.logic.js", html,
                         "de frontend mag niet meer naar een lokale SDK-kopie wijzen")
        self.assertFalse((PRODUCT_ROOT / "sdk" / "components" / "lego-builder.logic.js").exists(),
                         "de lokale SDK-kopie hoort verwijderd te zijn (backend is eigenaar)")

    def test_service_worker_does_not_cache_a_local_sdk_file(self) -> None:
        sw = (PRODUCT_ROOT / "service-worker.js").read_text(encoding="utf-8")
        cached = set(re.findall(r"""["']\./([^"']+)["']""", sw))
        self.assertNotIn("sdk/components/lego-builder.logic.js", cached)


if __name__ == "__main__":
    unittest.main()

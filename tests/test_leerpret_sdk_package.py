"""Regressietests voor de centrale LeerpretSDK-bedrading in LOM."""
from __future__ import annotations

import re
import unittest
from pathlib import Path


PRODUCT_ROOT = Path(__file__).resolve().parents[1]
SDK_ASSETS = (
    "/sdk/lego-renderer/renderer.js",
    "/sdk/lego-tower-editor/editor.js",
    "/sdk/lego-builder/logic.js",
    "/sdk/lego-builder/mount.js",
)


class LeerpretSdkWiringTests(unittest.TestCase):
    def test_frontend_loads_complete_lego_sdk_before_the_product(self) -> None:
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("LEERPRET_SDK_BASE", html)
        self.assertIn("[base(), configuredBase()]", html)
        for asset in SDK_ASSETS:
            self.assertIn(asset, html)
        positions = [html.index(asset) for asset in SDK_ASSETS]
        self.assertEqual(sorted(positions), positions)
        self.assertLess(html.index(SDK_ASSETS[-1]), html.index('"script.js"'))

    def test_no_local_lego_implementation_remains(self) -> None:
        for relative_path in (
            "lego-builder.js",
            "lego-tower-renderer.js",
            "tower-editor.js",
            "sdk/components/lego-builder.logic.js",
        ):
            self.assertFalse((PRODUCT_ROOT / relative_path).exists(), relative_path)

    def test_service_worker_does_not_cache_local_lego_code(self) -> None:
        sw = (PRODUCT_ROOT / "service-worker.js").read_text(encoding="utf-8")
        cached = set(re.findall(r'''["']\./([^"']+)["']''', sw))
        for path in (
            "lego-builder.js",
            "lego-tower-renderer.js",
            "tower-editor.js",
            "sdk/components/lego-builder.logic.js",
        ):
            self.assertNotIn(path, cached)


if __name__ == "__main__":
    unittest.main()

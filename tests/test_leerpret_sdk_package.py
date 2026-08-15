"""Regressietests voor de centrale LeerpretSDK-bedrading in LOM."""
from __future__ import annotations

import re
import unittest
from pathlib import Path


PRODUCT_ROOT = Path(__file__).resolve().parents[1]
SDK_COMPONENTS = ("lego-renderer", "lego-tower-editor", "lego-builder")


class LeerpretSdkWiringTests(unittest.TestCase):
    def test_frontend_loads_complete_lego_sdk_before_the_product(self) -> None:
        html = (PRODUCT_ROOT / "index.html").read_text(encoding="utf-8")
        sdk = (PRODUCT_ROOT / "leerpret-sdk.js").read_text(encoding="utf-8")
        self.assertIn("LEERPRET_SDK_BASE", html)
        self.assertIn("[base(), configuredBase()]", html)
        self.assertIn("window.LeerpretSDKLoaderReady = loaderReady", sdk)
        self.assertIn("return loader.load(sdkComponents)", html)
        for component in SDK_COMPONENTS:
            self.assertIn(f'"{component}"', html)
        self.assertNotIn("/sdk/lego-renderer/renderer.js", html)
        self.assertIn('.then(function () { loadTail(0); })', html)

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

import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class TestBlokCatalog(unittest.TestCase):
    def test_every_game_part_points_to_one_canonical_engine_blok(self):
        source = (ROOT / "logistics-game-engine.js").read_text(encoding="utf-8")
        section = source.split("const PART_DEFINITIONS", 1)[1].split("const DEFAULT_CONFIG", 1)[0]
        records = re.findall(r'^\s+(\w+): \{([^\n]+)\}', section, re.MULTILINE)
        self.assertEqual(10, len(records))
        for part_id, record in records:
            self.assertRegex(record, r'blokId: "element\.[^"]+"', part_id)
            self.assertRegex(record, r'blokFile: "elements/[^\"]+\.blok"', part_id)
        blok_ids = re.findall(r'blokId: "([^"]+)"', section)
        self.assertEqual(len(blok_ids), len(set(blok_ids)), "LOM mag geen dubbele semantische .blok-kopieën publiceren")

    def test_every_legacy_inventory_part_uses_the_same_canonical_catalog(self):
        source = (ROOT / "script.js").read_text(encoding="utf-8")
        section = source.split("const PARTS =", 1)[1].split("const BASE_PRODUCTS =", 1)[0]
        records = re.findall(r'^\s+\{ id: "([^"]+)",([^\n]+)\}', section, re.MULTILINE)
        self.assertEqual(10, len(records))
        for part_id, record in records:
            self.assertIn('blokId: "element.', record, part_id)
            self.assertRegex(record, r'blokFile: "elements/[^\"]+\.blok"', part_id)


if __name__ == "__main__":
    unittest.main()

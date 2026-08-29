import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  loadCurrentSources,
  loadHistoricalSources,
  sha256
} = require("./visual/isometric-history-source.cjs");

test("de historische isometrische Playwright-bron is exact en bereikbaar", () => {
  const { provenance, sources } = loadHistoricalSources();

  assert.equal(provenance.schemaVersion, 1);
  assert.deepEqual(Object.keys(sources).sort(), Object.keys(provenance.sources).sort());
  for (const [name, source] of Object.entries(sources)) {
    assert.equal(Buffer.byteLength(source), provenance.sources[name].bytes, `${name}: bytes`);
    assert.equal(sha256(source), provenance.sources[name].sha256, `${name}: sha256`);
  }
});

test("de vergelijking gebruikt een werkelijk gewijzigde renderer en leesbare actuele bronnen", () => {
  const { sources: historical } = loadHistoricalSources();
  const current = loadCurrentSources(Object.keys(historical));

  assert.notEqual(
    sha256(current["isometric-logistics-view.js"]),
    sha256(historical["isometric-logistics-view.js"]),
    "De actuele renderer moet afwijken van de historische referentie; anders meet dit contract geen migratie."
  );
  assert.match(sha256(current["style.css"]), /^[0-9a-f]{64}$/u);
  assert.ok(current["style.css"].includes(".iso-logistics-view"));
});

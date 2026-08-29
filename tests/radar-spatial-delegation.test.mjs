import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const characterSource = fs.readFileSync(
  new URL("../character-creation.js", import.meta.url),
  "utf8"
);
const sdkSource = fs.readFileSync(
  new URL("../leerpret-sdk.js", import.meta.url),
  "utf8"
);

test("gedragsradar gebruikt uitsluitend de pure SDK-radargeometrie", () => {
  assert.match(characterSource, /spatial\(\)\.radialAxes\(/);
  assert.match(characterSource, /spatial\(\)\.radarSeriesPoints\(/);
  assert.doesNotMatch(characterSource, /Math\.(?:cos|sin)\(/);
  assert.doesNotMatch(characterSource, /axis\s*\*\s*90/);
});

test("de radargeometrie is geladen voordat authenticatie de wizard kan openen", () => {
  assert.match(sdkSource, /loader\.load\(\["api-client", "leerobject", "lego-spatial"\]\)/);
  assert.match(sdkSource, /window\.LeerpretSDKComponentsReady = componentsReady/);
  assert.match(characterSource, /renderWhenSpatialReady\(\)/);
});

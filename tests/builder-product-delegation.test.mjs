import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../script.js", import.meta.url), "utf8");

test("eigen producten delegeren fundamentanalyse, recepttelling en procesdeling aan de SDK", () => {
  assert.match(source, /core\.analyzeTowerSequence\(core\.BASE_PIECES, sequence, \{/);
  assert.match(source, /core\.partitionSequenceEvenly\(sequence, 3\)/);
  assert.match(source, /core\.countRecipeParts\(stageSequences\[0\]\)/);
  assert.match(source, /core\.countRecipeParts\(stageSequences\[1\]\)/);
  assert.match(source, /core\.countRecipeParts\(stageSequences\[2\]\)/);

  assert.doesNotMatch(source, /firstPart\?\.width === "narrow" \? 4 : 2/);
  assert.doesNotMatch(source, /sequence\.length !== foundationCount \+ 2/);
  assert.doesNotMatch(source, /Math\.ceil\(sequence\.length \/ 3\)/);
  assert.doesNotMatch(source, /function recipeFromSequence/);
});

test("eigen productborden blijven relatieve positieve gridmaten", () => {
  assert.match(source, /function spatialProductCore\(\)/);
  assert.match(source, /\.positiveGridInteger\(draft\?\.groundPlate\?\.width, 6\)/);
  assert.match(source, /\.positiveGridInteger\(draft\?\.groundPlate\?\.depth, 6\)/);
  assert.match(source, /board: \{ width: groundPlateWidth, depth: groundPlateDepth \}/);
  assert.match(source, /ground-plate\.\$\{groundPlateWidth\}x\$\{groundPlateDepth\}/);
  assert.match(source, /groundPlateWidth: spatialProductCore\(\)\.positiveGridInteger\(activeProduct\?\.groundPlate\?\.width, 6\)/);
  assert.doesNotMatch(source, /function positiveGridDimension/);
  assert.doesNotMatch(source, /groundPlate:\s*\{[^}]*width:\s*6,\s*depth:\s*6/s);
});

test("een incomplete SDK faalt voor productbouw expliciet en vroeg", () => {
  assert.match(source, /function builderProductCore\(\)/);
  assert.match(source, /productbouwkern is niet volledig geladen/);
  assert.match(source, /!core\?\.analyzeTowerSequence/);
  assert.match(source, /!core\?\.countRecipeParts/);
  assert.match(source, /!core\?\.partitionSequenceEvenly/);
});

test("gegenereerde torens bepalen ieder onderdeel eenmaal uit gridoppervlak", () => {
  assert.match(source, /function gridArea\(size, fallback = 4\)/);
  assert.match(source, /const preferred = `\$\{color\}_\$\{gridArea\(size\)\}`/);
  assert.match(source, /const parts = resolveGeneratedTower\(blueprint\)/);
  assert.match(source, /visual: makeTowerVisual\(parts\)/);
  assert.doesNotMatch(source, /blueprint\.middleSize === "2x2"/);
  assert.equal((source.match(/resolveGeneratedTower\(blueprint\)/g) || []).length, 2);
});

test("product- en functiestromen delen één relatieve isometrische afdelingsindeling", () => {
  assert.match(source, /const ISOMETRIC_DEPARTMENT_LAYOUTS = Object\.freeze\(\{/);
  for (const departmentId of [
    "inbound",
    "production_1",
    "production_2",
    "production_3",
    "quality",
    "dispatch"
  ]) {
    const references = source.match(
      new RegExp(`layout: ISOMETRIC_DEPARTMENT_LAYOUTS\\.${departmentId}`, "g")
    ) || [];
    assert.equal(references.length, 2, `${departmentId} moet beide scenetypen voeden`);
  }
  assert.equal((source.match(/\{ x: 1, y: 21, width: 3\.5, depth: 3\.2, height: 54 \}/g) || []).length, 1);
  assert.equal((source.match(/CUSTOMER_DISPATCH_CONNECTION/g) || []).length, 3);
  assert.equal((source.match(/fromOffset: Object\.freeze\(\{ x: 24, y: 56 \}\)/g) || []).length, 1);
});

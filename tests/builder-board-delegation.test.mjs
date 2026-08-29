import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(
  new URL("../logistics-game-ui.js", import.meta.url),
  "utf8"
);

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function controllerHarness(options = {}) {
  const calls = {
    builderBoardProfile: [],
    sortBuildPlacements: [],
    physicalLayer: [],
    targetFootprint: [],
    boardPointFromClient: [],
    targetSurface: [],
    projectBoardPoint: [],
    validatePlannedPlacement: []
  };
  const profile = options.profile || Object.freeze({
    viewBox: Object.freeze({ width: 520, height: 420 }),
    transform: Object.freeze({ x: 170, y: 62, scale: 2 }),
    board: Object.freeze({ width: 8, depth: 10 }),
    placement: Object.freeze({ baseHeight: 0.5, layerPitch: 1.25, snapLift: 0.1 }),
    target: Object.freeze({ baseHeight: 0.27, layerPitch: 0.78, hitTolerance: 90 }),
    decoration: Object.freeze({ shadowCenterX: 311, shadowCenterY: 333, shadowRadiusX: 121, shadowRadiusY: 22 })
  });
  const core = {
    builderBoardProfile(options) {
      calls.builderBoardProfile.push(plain(options));
      return profile;
    },
    resolvePiece() {
      return { width: 2, depth: 4 };
    },
    sortBuildPlacements(items) {
      calls.sortBuildPlacements.push(plain(items));
      return items.slice().reverse();
    },
    physicalLayer(z, boardProfile) {
      calls.physicalLayer.push({ z, profile: plain(boardProfile) });
      return boardProfile.placement.baseHeight + z * boardProfile.placement.layerPitch;
    },
    targetFootprint(renderer, target, boardProfile) {
      calls.targetFootprint.push({ renderer, target: plain(target), profile: plain(boardProfile) });
      return [[1, 2], [3, 4], [5, 6], [7, 8]];
    },
    boardPointFromClient(point, rect, boardProfile) {
      calls.boardPointFromClient.push({ point: plain(point), rect: plain(rect), profile: plain(boardProfile) });
      return { x: 260, y: 210 };
    },
    targetSurface(z, boardProfile) {
      calls.targetSurface.push({ z, profile: plain(boardProfile) });
      return 1.83;
    },
    projectBoardPoint(renderer, point, boardProfile) {
      calls.projectBoardPoint.push({ renderer, point: plain(point), profile: plain(boardProfile) });
      return { x: 330, y: 190 };
    },
    validatePlannedPlacement(options) {
      calls.validatePlannedPlacement.push(plain(options));
      return { valid: true };
    }
  };
  const renderer = {
    definitions: () => "<defs-test></defs-test>",
    plate: (...args) => `<plate-test data-args="${args.join("|")}"></plate-test>`,
    brick: (...args) => `<brick-test data-args="${args.join("|")}"></brick-test>`,
    iso: () => [0, 0]
  };
  const context = { console, Intl };
  context.window = context;
  context.globalThis = context;
  context.LegoTowerRenderer = renderer;
  vm.runInNewContext(source, context, { filename: "logistics-game-ui.js" });

  const Controller = context.LogisticsGameUI.LogisticsGameUIController;
  const controller = Object.create(Controller.prototype);
  controller.builderCore = () => core;
  controller.engine = {
    parts: {
      blue_8: { color: "blue", label: "Blauw blok" }
    },
    playerTask: () => ({
      role: { id: "pd1" },
      product: options.taskGroundPlate === null
        ? {}
        : { groundPlate: options.taskGroundPlate || { width: 8, depth: 10 } }
    })
  };
  controller.digitalSelectedPartId = "blue_8";
  controller.digitalPartRotated = false;
  controller.digitalBuildState = () => ({
    previous: [{ type: "blue_8", x: 0, y: 0, z: 0, width: 2, depth: 4 }],
    placed: [{ type: "blue_8", x: 2, y: 0, z: 1, width: 2, depth: 4 }],
    nextTarget: { type: "blue_8", x: 1, y: 2, z: 2, width: 2, depth: 4 },
    complete: false,
    quantity: 2,
    completedTowers: 0,
    currentTower: 1
  });
  controller.addDigitalPart = () => true;
  controller.render = () => {};
  return { calls, controller, core, profile, renderer };
}

test("builderbord gebruikt het SDK-profiel, de SDK-paint-order en de SDK-targetfootprint", () => {
  const { calls, controller, profile, renderer } = controllerHarness();
  const markup = controller.digitalBuilderBoardMarkup({
    product: { name: "Toren", groundPlate: { width: 8, depth: 10 } }
  });

  assert.match(markup, /viewBox="0 0 520 420"/);
  assert.match(markup, /transform="translate\(170 62\) scale\(2\)"/);
  assert.match(markup, /<plate-test data-args="0\|0\|0\|8\|10\|green\|sim-builder"><\/plate-test>/);
  assert.match(markup, /groene 8 bij 10 grondplaat/);
  assert.match(markup, /<ellipse cx="311"\s+cy="333"\s+rx="121"\s+ry="22"/);
  assert.match(markup, /<polygon points="1,2 3,4 5,6 7,8"><\/polygon>/);
  assert.deepEqual(calls.sortBuildPlacements, [[
    { type: "blue_8", x: 0, y: 0, z: 0, width: 2, depth: 4 },
    { type: "blue_8", x: 2, y: 0, z: 1, width: 2, depth: 4 }
  ]]);
  assert.deepEqual(calls.builderBoardProfile, [{ board: { width: 8, depth: 10 } }]);
  assert.deepEqual(calls.physicalLayer, [
    { z: 1, profile: plain(profile) },
    { z: 0, profile: plain(profile) }
  ]);
  assert.equal(calls.targetFootprint.length, 1);
  assert.equal(calls.targetFootprint[0].renderer, renderer);
  assert.deepEqual(calls.targetFootprint[0].profile, plain(profile));

  assert.doesNotMatch(source, /\.sort\(\(left, right\)/);
  assert.doesNotMatch(source, /0\.27\s*\+\s*target\.z\s*\*\s*0\.78/);
  assert.doesNotMatch(source, /viewBox="0 0 520 420"/);
  assert.doesNotMatch(source, /transform="translate\(170 62\) scale\(2\)"/);
  assert.doesNotMatch(source, /groene 6 bij 6 grondplaat/);
  assert.doesNotMatch(source, /<ellipse cx="350" cy="357" rx="150" ry="30"/);
});

test("pointer- en targetcoordinaten plus tolerantie komen volledig uit het SDK-profiel", () => {
  const { calls, controller, profile, renderer } = controllerHarness();
  const rect = { left: 20, top: 30, width: 1040, height: 840 };
  const placed = controller.placeDigitalBoardPart(
    "blue_8",
    { clientX: 540, clientY: 450 },
    { getBoundingClientRect: () => rect }
  );

  assert.equal(placed, true);
  assert.deepEqual(calls.boardPointFromClient, [{
    point: { x: 540, y: 450 },
    rect,
    profile: plain(profile)
  }]);
  assert.deepEqual(calls.targetSurface, [{ z: 2, profile: plain(profile) }]);
  assert.equal(calls.projectBoardPoint.length, 1);
  assert.equal(calls.projectBoardPoint[0].renderer, renderer);
  assert.deepEqual(calls.projectBoardPoint[0].point, { x: 2, y: 4, z: 1.83 });
  assert.deepEqual(calls.projectBoardPoint[0].profile, plain(profile));
  assert.deepEqual(calls.validatePlannedPlacement[0].pointer, { x: 260, y: 210 });
  assert.deepEqual(calls.validatePlannedPlacement[0].targetPoint, { x: 330, y: 190 });
  assert.equal(calls.validatePlannedPlacement[0].tolerance, 90);

  assert.doesNotMatch(source, /event\.clientX\s*-\s*rect\.left/);
  assert.doesNotMatch(source, /tolerance:\s*90/);
  assert.doesNotMatch(source, /targetPoint\s*=\s*\{\s*x:\s*170/);
});

test("het standaard 6x6-bord houdt de volledige LOM-markup bytegelijk", () => {
  const profile = Object.freeze({
    viewBox: Object.freeze({ width: 520, height: 420 }),
    transform: Object.freeze({ x: 170, y: 62, scale: 2 }),
    board: Object.freeze({ width: 6, depth: 6 }),
    placement: Object.freeze({ baseHeight: 0.22, layerPitch: 0.78, snapLift: 0.04 }),
    target: Object.freeze({ baseHeight: 0.27, layerPitch: 0.78, hitTolerance: 90 }),
    decoration: Object.freeze({ shadowCenterX: 350, shadowCenterY: 357, shadowRadiusX: 150, shadowRadiusY: 30 })
  });
  const { controller, core, renderer } = controllerHarness({ profile, taskGroundPlate: null });
  renderer.iso = (x, y, z) => [x - y, (x + y) / 2 - z];
  core.sortBuildPlacements = items => items.slice().sort((left, right) => (
    left.z - right.z || (left.x + left.y) - (right.x + right.y) || left.x - right.x
  ));
  core.targetFootprint = (activeRenderer, target, boardProfile) => {
    const height = boardProfile.target.baseHeight + target.z * boardProfile.target.layerPitch;
    return [
      activeRenderer.iso(target.x, target.y, height),
      activeRenderer.iso(target.x + target.width, target.y, height),
      activeRenderer.iso(target.x + target.width, target.y + target.depth, height),
      activeRenderer.iso(target.x, target.y + target.depth, height)
    ];
  };
  const markup = controller.digitalBuilderBoardMarkup({ product: { name: "Toren" } });
  const hash = createHash("sha256").update(markup).digest("hex");

  assert.equal(hash, "0469d77a7893e5073e8cbfa1cd75ed820a49dd85c79feccccdb4ed230fc53774");
});

test("builderCore weigert een stale SDK voordat een gedeeltelijke build kan starten", () => {
  const context = { console, Intl };
  context.window = context;
  context.globalThis = context;
  context.LeerpretSDK = {
    components: {
      "lego-builder": {
        logic: {
          planRecipeBuild() {},
          validatePlannedPlacement() {}
        }
      }
    }
  };
  vm.runInNewContext(source, context, { filename: "logistics-game-ui.js" });
  const Controller = context.LogisticsGameUI.LogisticsGameUIController;
  const controller = Object.create(Controller.prototype);

  let error;
  try {
    controller.builderCore();
  } catch (caught) {
    error = caught;
  }
  assert.ok(error);
  assert.match(error.message, /bouwkern is niet volledig geladen/);
  for (const helper of [
    "boardPointFromClient",
    "builderBoardProfile",
    "physicalLayer",
    "pieceDimensions",
    "projectBoardPoint",
    "resolvePiece",
    "sortBuildPlacements",
    "targetFootprint",
    "targetSurface"
  ]) {
    assert.match(error.message, new RegExp(helper));
  }
});

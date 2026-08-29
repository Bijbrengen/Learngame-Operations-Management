import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const profileSource = fs.readFileSync(
  new URL("../material-cart-profile.js", import.meta.url),
  "utf8"
);
const isometricSource = fs.readFileSync(
  new URL("../isometric-logistics-view.js", import.meta.url),
  "utf8"
);
const uiSource = fs.readFileSync(
  new URL("../logistics-game-ui.js", import.meta.url),
  "utf8"
);

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function harness(renderer = null) {
  const context = { console, LegoTowerRenderer: renderer };
  context.window = context;
  context.globalThis = context;
  vm.runInNewContext(profileSource, context, { filename: "material-cart-profile.js" });
  return { context, profile: context.LOMMaterialCartProfile };
}

test("het gedeelde profiel levert exact de bestaande blokidentiteit, view en rendereropties", () => {
  const calls = [];
  const parts = [{ partId: "blue_8", color: "blue", width: 2, depth: 4, count: 3 }];
  const { profile } = harness({
    materialCart(options) {
      calls.push(plain(options));
      return "<shared-material-cart></shared-material-cart>";
    }
  });

  assert.equal(profile.markup(parts, "cart-scope", "stage"), "<shared-material-cart></shared-material-cart>");
  assert.deepEqual(plain(profile.blok), {
    id: "logistics.material-cart",
    file: "logistics/materiaalwagen.blok",
    preset: "logistics-material-cart.green"
  });
  assert.deepEqual(plain(profile.view), { originX: 32, originY: 58, scale: 0.36 });
  assert.deepEqual(calls, [{
    x: 0,
    y: 0,
    zHalfLayers: 0,
    color: "green",
    wheelColor: "black",
    parts,
    maxVisibleParts: 8,
    scope: "cart-scope",
    view: { originX: 32, originY: 58, scale: 0.36 }
  }]);
  assert.equal(profile.countParts([...parts, { count: -4 }, { count: 2.9 }]), 5);
});

test("beide historische materiaalwagenfallbacks blijven bytegelijk", () => {
  const { profile } = harness();
  assert.equal(profile.fallbackMarkup(5, "stage"), `
      <g data-lego-material-cart
         data-material-part-count="5"
         data-material-cart-fallback="true"
         data-blok-id="logistics.material-cart"
         data-blok-file="logistics/materiaalwagen.blok"
         data-blok-render-preset="logistics-material-cart.green">
        <title>Materiaalwagen met 5 losse LEGO-onderdelen</title>
        <text class="sim-material-cart-fallback-symbol" x="32" y="29" text-anchor="middle" aria-hidden="true">WAGEN</text>
        <text class="sim-material-cart-fallback-copy" x="32" y="44" text-anchor="middle">Materiaalwagen</text>
      </g>
    `);
  assert.equal(profile.fallbackMarkup(5, "isometric"), `
          <g data-lego-material-cart
             data-material-part-count="5"
             data-material-cart-fallback="true"
             data-blok-id="logistics.material-cart"
             data-blok-file="logistics/materiaalwagen.blok"
             data-blok-render-preset="logistics-material-cart.green">
            <title>Materiaalwagen met 5 losse LEGO-onderdelen</title>
            <text class="iso-material-cart-fallback-copy" x="32" y="34" text-anchor="middle">MATERIAALWAGEN</text>
          </g>
        `);
});

test("consumenten bevatten geen eigen materiaalwagenprofiel of fallback meer", () => {
  for (const source of [isometricSource, uiSource]) {
    assert.match(source, /window\.LOMMaterialCartProfile/);
    assert.doesNotMatch(source, /MATERIAL_CART_BLOK|MATERIAL_CART_VIEW/);
    assert.doesNotMatch(source, /data-material-cart-fallback="true"/);
    assert.doesNotMatch(source, /logistics\/materiaalwagen\.blok/);
  }
});

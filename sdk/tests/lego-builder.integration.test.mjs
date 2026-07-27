/**
 * Integratie-/regressietest op het ECHTE browserbestand lego-builder.js.
 * Laadt het (met een minimale window-shim) samen met de SDK-logica en
 * controleert de publieke, DOM-loze API. Zo bewijzen we dat de herbedrading
 * naar LeerpretSDK het gedrag niet heeft veranderd — en dat de fallback werkt.
 *
 * Draaien met: node --test
 */
import { test as rawTest } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUILDER_PATH = require.resolve("../../lego-builder.js");

// De SDK-logica woont nu in de Leerpret-backend (naast deze repo).
// Override met LEERPRET_SDK_LOGIC; standaard de sibling-repo onder dezelfde parent.
const LOGIC_PATH = process.env.LEERPRET_SDK_LOGIC
  ? path.resolve(process.env.LEERPRET_SDK_LOGIC)
  : path.resolve(HERE, "../../../Leerpret/backend/app/sdk/components/lego-builder.logic.js");

const SKIP = !existsSync(LOGIC_PATH)
  ? { skip: "LeerpretSDK-logica niet gevonden (zet LEERPRET_SDK_LOGIC of plaats Leerpret-repo ernaast)" }
  : {};

// Alle tests overslaan i.p.v. hard falen als de backend-SDK niet naast de repo staat.
const test = (name, fn) => rawTest(name, SKIP, fn);

function withBuilder({ withLogic }, fn) {
  const prevWindow = globalThis.window;
  try {
    globalThis.window = {};
    delete require.cache[LOGIC_PATH];
    delete require.cache[BUILDER_PATH];
    if (withLogic) require(LOGIC_PATH); // hangt logica onder window.LeerpretSDK
    require(BUILDER_PATH);              // IIFE zet window.LegoBuilder
    return fn(globalThis.window.LegoBuilder);
  } finally {
    if (prevWindow === undefined) delete globalThis.window;
    else globalThis.window = prevWindow;
    delete require.cache[LOGIC_PATH];
    delete require.cache[BUILDER_PATH];
  }
}

test("publieke API is aanwezig na laden met SDK-logica", () => {
  withBuilder({ withLogic: true }, (LB) => {
    for (const key of [
      "mount", "setProduct", "registerProduct", "unregisterProduct",
      "startFreeBuild", "prepareStockTutorial", "setStockTutorialInventory",
      "reset", "restartTutorial", "setFreeBuildUnlocked",
      "setInternalLogisticsComplete", "setCustomerDecision", "skipTutorial", "validateBuild",
      "getCatalog", "getSnapshot"
    ]) {
      assert.equal(typeof LB[key], "function", `${key} ontbreekt`);
    }
  });
});

test("getSnapshot geeft de verwachte begintoestand", () => {
  withBuilder({ withLogic: true }, (LB) => {
    const s = LB.getSnapshot();
    assert.equal(s.mode, "tutorial");
    assert.equal(s.productId, "A");
    assert.equal(s.selectedType, "yellow_8");
    assert.equal(s.tutorialStep, 0);
    assert.deepEqual(s.bricks, []);
  });
});

test("klantbeslismodus is instelbaar voor mens en agent", () => {
  withBuilder({ withLogic: true }, (LB) => {
    LB.setCustomerDecision({ mode: "agent", tolerance: 0.3, random: () => 0.2 });
    assert.deepEqual(LB.getSnapshot().customerDecision, {
      mode: "agent",
      tolerance: 0.3
    });
    LB.setCustomerDecision({ mode: "human" });
    assert.equal(LB.getSnapshot().customerDecision.mode, "human");
  });
});

test("getCatalog levert de drie basisproducten met kopie-bricks", () => {
  withBuilder({ withLogic: true }, (LB) => {
    const cat = LB.getCatalog();
    assert.deepEqual(Object.keys(cat), ["A", "B", "C"]);
    // muteren van de teruggegeven catalogus mag de interne staat niet raken
    cat.A.bricks[0].x = 999;
    assert.equal(LB.getCatalog().A.bricks[0].x, 1);
  });
});

test("validateBuild keurt de correcte bouw goed en een lege plaat af", () => {
  withBuilder({ withLogic: true }, (LB) => {
    const correct = LB.getCatalog().A.bricks;
    assert.equal(LB.validateBuild("A", correct), true);
    assert.equal(LB.validateBuild("A", []), false);
    assert.equal(LB.validateBuild("ZZZ", correct), false);
  });
});

test("registerProduct + validateBuild op een geldig eigen product", () => {
  withBuilder({ withLogic: true }, (LB) => {
    const ok = LB.registerProduct({
      id: "X",
      name: "Toren X",
      towerSequence: ["yellow_8", "yellow_8", "white_4", "green_4"]
    });
    assert.equal(ok, true);
    const cat = LB.getCatalog();
    assert.ok(cat.X, "nieuw product staat in de catalogus");
    assert.equal(LB.validateBuild("X", cat.X.bricks), true);
  });
});

test("registerProduct weigert een ongeldig product", () => {
  withBuilder({ withLogic: true }, (LB) => {
    assert.equal(LB.registerProduct({ id: "Y", name: "Y", towerSequence: ["yellow_8"] }), false);
    assert.equal(LB.getCatalog().Y, undefined);
  });
});

test("unregisterProduct beschermt de basisproducten, verwijdert eigen product", () => {
  withBuilder({ withLogic: true }, (LB) => {
    assert.equal(LB.unregisterProduct("A"), false, "A is ingebouwd");
    LB.registerProduct({ id: "X", name: "Toren X", towerSequence: ["yellow_8", "yellow_8", "white_4", "green_4"] });
    assert.equal(LB.unregisterProduct("X"), true);
    assert.equal(LB.getCatalog().X, undefined);
    assert.equal(LB.unregisterProduct("X"), false, "bestaat niet meer");
  });
});

test("setProduct accepteert bekend product en weigert onbekend", () => {
  withBuilder({ withLogic: true }, (LB) => {
    assert.equal(LB.setProduct("B"), true);
    assert.equal(LB.getSnapshot().productId, "B");
    assert.equal(LB.setProduct("ZZZ"), false);
  });
});

// --- Graceful degradation: zonder SDK-logica -------------------------------

test("fallback: zonder SDK-logica blijft de API veilig (geen crash)", () => {
  withBuilder({ withLogic: false }, (LB) => {
    assert.equal(typeof LB.mount, "function");
    assert.equal(LB.validateBuild("A", []), false);
    assert.equal(LB.setProduct("A"), false);
    assert.equal(LB.registerProduct({}), false);
    assert.deepEqual(LB.getCatalog(), {});
    assert.deepEqual(LB.getSnapshot(), {});
    // mount toont een nette foutmelding i.p.v. te crashen
    const el = { innerHTML: "" };
    LB.mount(el);
    assert.match(el.innerHTML, /kon niet worden geladen/);
  });
});

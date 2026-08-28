import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { classify, supportsSession } = require("../device-capabilities.js");

test("niet-computerschermen blokkeren beheer, aanmaak, tutorial en digitaal spel", () => {
  const devices = [
    classify({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148",
      platform: "iPhone",
      maxTouchPoints: 5,
      primaryPointerCoarse: true
    }),
    classify({
      userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel Tablet)",
      platform: "Linux armv8l",
      maxTouchPoints: 10,
      primaryPointerCoarse: true
    }),
    classify({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/18 Safari/605.1.15",
      platform: "MacIntel",
      maxTouchPoints: 5,
      anyFinePointer: true,
      anyHover: true
    }),
    classify({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      platform: "Win32",
      maxTouchPoints: 10,
      primaryPointerCoarse: true,
      anyFinePointer: false,
      anyHover: false
    }),
    classify({
      userAgent: "Mozilla/5.0 (PlayStation 5 7.00) AppleWebKit/605.1.15",
      platform: "PlayStation 5",
      maxTouchPoints: 0
    }),
    classify({
      userAgent: "Mozilla/5.0 (Xbox; Xbox One) AppleWebKit/537.36 Edge/44.18363",
      platform: "Xbox",
      maxTouchPoints: 0
    }),
    classify({
      userAgent: "Mozilla/5.0 (SMART-TV; Linux; Tizen 8.0) AppleWebKit/537.36",
      platform: "Linux armv7l",
      maxTouchPoints: 0
    })
  ];

  devices.forEach(capabilities => {
    assert.equal(capabilities.deviceKind, "mobile");
    assert.equal(capabilities.supportsDigitalPlay, false);
    assert.equal(capabilities.supportsTutorial, false);
    assert.equal(capabilities.supportsGameManagement, false);
    assert.equal(capabilities.supportsSessionCreation, false);
  });
});

test("computer en touchscreen-laptop met muisaanwijzer blijven volledig bruikbaar", () => {
  const desktop = classify({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    platform: "Win32",
    maxTouchPoints: 0,
    primaryPointerCoarse: false,
    anyFinePointer: true,
    anyHover: true
  });
  const touchLaptop = classify({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    platform: "Win32",
    maxTouchPoints: 10,
    primaryPointerCoarse: true,
    anyFinePointer: true,
    anyHover: true
  });

  [desktop, touchLaptop].forEach(capabilities => {
    assert.equal(capabilities.deviceKind, "computer");
    assert.equal(capabilities.supportsDigitalPlay, true);
    assert.equal(capabilities.supportsTutorial, true);
    assert.equal(capabilities.supportsGameManagement, true);
    assert.equal(capabilities.supportsSessionCreation, true);
  });
});

test("mobiel kan alleen aan expliciet fysieke sessies deelnemen", () => {
  const mobile = { supportsDigitalPlay: false };
  const computer = { supportsDigitalPlay: true };

  assert.equal(supportsSession("physical", mobile), true);
  assert.equal(supportsSession("digital", mobile), false);
  assert.equal(supportsSession(null, mobile), false);
  assert.equal(supportsSession("digital", computer), true);
});

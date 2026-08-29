"use strict";

const { defineConfig } = require("@playwright/test");
const base = require("./playwright.config.cjs");

const desktop = base.projects.find(project => project.name === "desktop-chromium");
if (!desktop) throw new Error("Het desktop-chromium-project ontbreekt in de hoofdconfiguratie.");

module.exports = defineConfig({
  ...base,
  fullyParallel: false,
  workers: 1,
  projects: [
    {
      ...desktop,
      name: "history-parity-chromium",
      testMatch: /isometric-history-parity\.spec\.js$/u,
      use: {
        ...desktop.use,
        launchOptions: {
          args: [
            "--disable-gpu",
            "--disable-gpu-compositing",
            "--disable-gpu-rasterization",
            "--disable-oop-rasterization",
            "--force-color-profile=srgb"
          ]
        }
      }
    }
  ]
});

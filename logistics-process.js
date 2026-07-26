/**
 * Canonical logistics process contract for LO Game 1-7 and the tutorial.
 * Keep process routing out of individual screens so configuration, simulation,
 * tutorial and financial projections cannot disagree.
 */
(function (global) {
  "use strict";

  const GAME_PROCESS_MATRIX = Object.freeze({
    lo1: Object.freeze(["sequential"]),
    lo2: Object.freeze(["sequential"]),
    lo3: Object.freeze(["parallel"]),
    lo4: Object.freeze(["parallel"]),
    lo5: Object.freeze(["sequential"]),
    lo6: Object.freeze(["sequential"]),
    lo7: Object.freeze(["sequential"]),
    tutorial: Object.freeze(["parallel"])
  });

  const PROCESS_PROFILES = Object.freeze({
    parallel: Object.freeze({
      id: "parallel",
      label: "Parallelle productie",
      logisticsOrganization: "product",
      flow: Object.freeze([
        "Magazijn Grondstoffen",
        "Productieafdelingen A / B / C",
        "Magazijn Gereed Product",
        "Expeditie"
      ]),
      production: Object.freeze({
        model: "complete_product_per_department",
        departments: Object.freeze(["production_1", "production_2", "production_3"])
      }),
      finance: Object.freeze({
        balance: "Onderhanden werk en gereed product per productieafdeling",
        profitAndLoss: "Materiaal-, conversiekosten en marge per productieafdeling",
        inventory: "Grondstoffen, OHW A/B/C en gereed product afzonderlijk"
      })
    }),
    sequential: Object.freeze({
      id: "sequential",
      label: "Sequentiële productie",
      logisticsOrganization: "functional",
      flow: Object.freeze([
        "Magazijn Grondstoffen",
        "Productieafdeling 1 · laag 1",
        "Tussenvoorraad 1",
        "Productieafdeling 2 · laag 2",
        "Tussenvoorraad 2",
        "Productieafdeling 3 · laag 3",
        "Magazijn Gereed Product",
        "Expeditie"
      ]),
      production: Object.freeze({
        model: "one_layer_per_department",
        departments: Object.freeze(["production_1", "production_2", "production_3"])
      }),
      finance: Object.freeze({
        balance: "Onderhanden werk per laag en tussenvoorraad in de keten",
        profitAndLoss: "Cumulatieve materiaal- en conversiekosten per productiestap",
        inventory: "Grondstoffen, tussenvoorraad 1/2 en gereed product afzonderlijk"
      })
    }),
    hybrid: Object.freeze({
      id: "hybrid",
      label: "Hybride productie",
      logisticsOrganization: "product",
      flow: Object.freeze([
        "Parallel: Magazijn → complete toren per productieafdeling → Gereed Product → Expeditie",
        "Sequentieel: Magazijn → laag 1 → laag 2 → laag 3 → Gereed Product → Expeditie"
      ]),
      production: Object.freeze({
        model: "parallel_and_sequential_routes",
        departments: Object.freeze(["production_1", "production_2", "production_3"])
      }),
      finance: Object.freeze({
        balance: "OHW zowel per parallelle afdeling als per sequentiële laag",
        profitAndLoss: "Kosten en marge per afdeling, order en gekozen route",
        inventory: "Grondstoffen, OHW per afdeling/laag, tussenvoorraad en gereed product"
      })
    })
  });

  function defaultProcessesForGame(gameType) {
    return [...(GAME_PROCESS_MATRIX[gameType] || [])];
  }

  function normalizeProcesses(processes, gameType) {
    const normalized = Array.from(new Set(
      (Array.isArray(processes) ? processes : [])
        .filter(process => process === "parallel" || process === "sequential")
    ));
    return normalized.length ? normalized : defaultProcessesForGame(gameType);
  }

  function profileForProcesses(processes, gameType) {
    const normalized = normalizeProcesses(processes, gameType);
    if (normalized.length === 2) return PROCESS_PROFILES.hybrid;
    return PROCESS_PROFILES[normalized[0]] || null;
  }

  function profileForGame(gameType) {
    return profileForProcesses(defaultProcessesForGame(gameType), gameType);
  }

  function applyToSettings(gameType, settings = {}) {
    const productionProcesses = normalizeProcesses(settings.productionProcesses, gameType);
    const profile = profileForProcesses(productionProcesses, gameType);
    if (!profile) return { ...settings };
    return {
      ...settings,
      productionProcesses,
      logisticsOrganization: profile.logisticsOrganization
    };
  }

  const api = {
    GAME_PROCESS_MATRIX,
    PROCESS_PROFILES,
    defaultProcessesForGame,
    normalizeProcesses,
    profileForProcesses,
    profileForGame,
    applyToSettings
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.LogisticsProcess = api;
})(typeof window !== "undefined" ? window : globalThis);

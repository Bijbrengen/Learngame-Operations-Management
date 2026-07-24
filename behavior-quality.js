(() => {
  "use strict";

  const ARCHETYPES = ["Initiator", "Inspirator", "Verbinder", "Analist"];
  const ROLE_PROFILES = [
    { id: "opr", title: "Operations Manager", target: [40, 20, 15, 25] },
    { id: "srm", title: "Magazijn Grondstoffen", target: [15, 10, 25, 50] },
    { id: "pd1", title: "Productie Afdeling 1", target: [30, 15, 20, 35] },
    { id: "pd2", title: "Productie Afdeling 2", target: [25, 20, 25, 30] },
    { id: "pd3", title: "Productie Afdeling 3", target: [20, 15, 25, 40] },
    { id: "mfp", title: "Magazijn Gereed Product", target: [15, 10, 35, 40] },
    { id: "customer1", title: "Klant", target: [20, 40, 30, 10] }
  ];

  function mean(values) {
    return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  }

  function standardDeviation(values) {
    const average = mean(values);
    return Math.sqrt(mean(values.map(value => (value - average) ** 2)));
  }

  function correlation(left, right) {
    if (left.length !== right.length || left.length < 2) return 0;
    const leftMean = mean(left);
    const rightMean = mean(right);
    const numerator = left.reduce(
      (sum, value, index) => sum + (value - leftMean) * (right[index] - rightMean),
      0
    );
    const denominator = Math.sqrt(
      left.reduce((sum, value) => sum + (value - leftMean) ** 2, 0)
      * right.reduce((sum, value) => sum + (value - rightMean) ** 2, 0)
    );
    return denominator > 0 ? numerator / denominator : 0;
  }

  function scanStatistics(matrix) {
    const categoryDeviations = matrix.map(standardDeviation);
    const flatCategories = categoryDeviations.filter(value => value <= 0.55).length;
    const patternCounts = new Map();
    matrix.forEach(values => {
      const key = values.join(",");
      patternCounts.set(key, (patternCounts.get(key) || 0) + 1);
    });
    return {
      flatCategories,
      categoryDeviations,
      averageCategoryDeviation: mean(categoryDeviations),
      distinctPatterns: patternCounts.size,
      largestRepeat: Math.max(0, ...patternCounts.values())
    };
  }

  function profileScores(basic, response) {
    const totals = [0, 0, 0, 0];
    basic.forEach((category, categoryIndex) => {
      category.forEach((value, axis) => {
        totals[axis] += (10 - value) + response[categoryIndex][axis];
      });
    });
    const grandTotal = totals.reduce((sum, value) => sum + value, 0);
    const axes = totals.map(value => grandTotal ? value / grandTotal * 100 : 25);
    const roleMatches = ROLE_PROFILES.map(role => {
      const distance = axes.reduce(
        (sum, value, axis) => sum + Math.abs(value - role.target[axis]),
        0
      );
      return {
        id: role.id,
        title: role.title,
        match: Math.max(0, Math.round(100 - distance / 2))
      };
    }).sort((left, right) => right.match - left.match);
    return {
      axes: Object.fromEntries(ARCHETYPES.map((name, index) => [name, Number(axes[index].toFixed(1))])),
      archetype: ARCHETYPES[axes.indexOf(Math.max(...axes))],
      roleMatches,
      recommendedRole: roleMatches[0]
    };
  }

  function timingStatistics(timing = {}) {
    const values = [
      ...(timing.basic_style_category_ms || []),
      ...(timing.response_style_category_ms || [])
    ].map(Number).filter(value => Number.isFinite(value) && value > 0);
    const totalMs = values.reduce((sum, value) => sum + value, 0);
    return {
      totalMs,
      measuredCategories: values.length,
      veryFastCategories: values.filter(value => value < 8000).length
    };
  }

  function assess(allocations, timing = {}) {
    const basic = allocations?.basic_style || [];
    const response = allocations?.response_style || [];
    if (basic.length !== 10 || response.length !== 10) {
      return { doubtful: false, reasons: [], metrics: null };
    }

    const basicStats = scanStatistics(basic);
    const responseStats = scanStatistics(response);
    const basicValues = basic.flat();
    const responseValues = response.flat();
    const rawCorrelation = correlation(basicValues, responseValues);
    const identicalCategories = basic.filter(
      (values, index) => values.every((value, trait) => value === response[index][trait])
    ).length;
    const reasons = [];
    const attentionNotes = [];
    const rowIssues = {
      basic_style: Array.from({ length: 10 }, () => []),
      response_style: Array.from({ length: 10 }, () => [])
    };
    if (basicStats.flatCategories >= 8) {
      basicStats.categoryDeviations.forEach((deviation, index) => {
        if (deviation <= 0.55) rowIssues.basic_style[index].push("De verdeling is vrijwel vlak.");
      });
    }
    if (responseStats.flatCategories >= 8) {
      responseStats.categoryDeviations.forEach((deviation, index) => {
        if (deviation <= 0.55) rowIssues.response_style[index].push("De verdeling is vrijwel vlak.");
      });
    }
    if (rawCorrelation >= 0.92 && identicalCategories >= 7) {
      basic.forEach((values, index) => {
        if (values.every((value, trait) => value === response[index][trait])) {
          const issue = "Deze rij is in Basisstijl en Drukproef identiek.";
          rowIssues.basic_style[index].push(issue);
          rowIssues.response_style[index].push(issue);
        }
      });
    }

    if (basicStats.flatCategories >= 8 || responseStats.flatCategories >= 8) {
      reasons.push("De punten zijn in veel categorieën vrijwel gelijk verdeeld.");
    }
    if (rawCorrelation >= 0.92 && identicalCategories >= 7) {
      reasons.push("Basisstijl en Drukproef zijn bijna hetzelfde ingevuld, terwijl hoge punten daar een tegengestelde betekenis hebben.");
    }
    const timingStats = timingStatistics(timing);
    if (
      timingStats.measuredCategories === 20
      && (timingStats.totalMs < 120000 || timingStats.veryFastCategories >= 8)
    ) {
      attentionNotes.push("De scan is opvallend snel ingevuld; daardoor is de zekerheidsmarge lager.");
    }

    let reliability = 100;
    reliability -= (basicStats.flatCategories + responseStats.flatCategories) * 3;
    reliability -= Math.max(0, identicalCategories - 4) * 4;
    if (rawCorrelation > 0.75) reliability -= Math.round((rawCorrelation - 0.75) * 40);
    reliability -= timingStats.veryFastCategories * 2;
    if (timingStats.measuredCategories === 20 && timingStats.totalMs < 120000) reliability -= 10;
    if (reasons.length) reliability = Math.min(reliability, 45);
    reliability = Math.max(20, Math.min(100, Math.round(reliability)));
    const profile = profileScores(basic, response);

    return {
      doubtful: reasons.length > 0,
      reasons,
      attentionNotes,
      rowIssues,
      reliability,
      profile,
      metrics: {
        basicFlatCategories: basicStats.flatCategories,
        responseFlatCategories: responseStats.flatCategories,
        identicalCategories,
        rawCorrelation: Number(rawCorrelation.toFixed(3)),
        basicDistinctPatterns: basicStats.distinctPatterns,
        responseDistinctPatterns: responseStats.distinctPatterns,
        totalDurationMs: timingStats.totalMs,
        veryFastCategories: timingStats.veryFastCategories
      }
    };
  }

  const api = { assess, correlation, profileScores, standardDeviation };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.BehaviorResponseQuality = api;
})();

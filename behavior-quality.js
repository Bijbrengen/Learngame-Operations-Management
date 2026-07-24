(() => {
  "use strict";

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
      averageCategoryDeviation: mean(categoryDeviations),
      distinctPatterns: patternCounts.size,
      largestRepeat: Math.max(0, ...patternCounts.values())
    };
  }

  function assess(allocations) {
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

    if (basicStats.flatCategories >= 8 || responseStats.flatCategories >= 8) {
      reasons.push("De punten zijn in veel categorieën vrijwel gelijk verdeeld.");
    }
    if (rawCorrelation >= 0.92 && identicalCategories >= 7) {
      reasons.push("Basisstijl en Drukproef zijn bijna hetzelfde ingevuld, terwijl hoge punten daar een tegengestelde betekenis hebben.");
    }

    return {
      doubtful: reasons.length > 0,
      reasons,
      metrics: {
        basicFlatCategories: basicStats.flatCategories,
        responseFlatCategories: responseStats.flatCategories,
        identicalCategories,
        rawCorrelation: Number(rawCorrelation.toFixed(3)),
        basicDistinctPatterns: basicStats.distinctPatterns,
        responseDistinctPatterns: responseStats.distinctPatterns
      }
    };
  }

  const api = { assess, correlation, standardDeviation };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.BehaviorResponseQuality = api;
})();

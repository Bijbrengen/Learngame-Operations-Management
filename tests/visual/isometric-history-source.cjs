"use strict";

const { createHash } = require("node:crypto");
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REPOSITORY_ROOT = path.resolve(__dirname, "..", "..");
const PROVENANCE_PATH = path.join(__dirname, "isometric-history-provenance.json");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readProvenance() {
  const provenance = JSON.parse(fs.readFileSync(PROVENANCE_PATH, "utf8"));
  if (provenance.schemaVersion !== 1) {
    throw new Error(`Onbekende pariteitsprovenanceversie: ${provenance.schemaVersion}`);
  }
  if (!/^[0-9a-f]{40}$/u.test(provenance.baselineCommit || "")) {
    throw new Error("baselineCommit moet een volledige Git-SHA van 40 hextekens zijn.");
  }
  if (!provenance.sources || Object.keys(provenance.sources).length === 0) {
    throw new Error("De historische bronlijst is leeg.");
  }
  return provenance;
}

function assertCommitAvailable(commit) {
  const result = spawnSync(
    "git",
    ["cat-file", "-e", `${commit}^{commit}`],
    { cwd: REPOSITORY_ROOT, encoding: "utf8" }
  );
  if (result.status !== 0) {
    throw new Error(
      `Historische commit ${commit} ontbreekt. Haal de volledige Git-geschiedenis op (CI: fetch-depth: 0).`
    );
  }
}

function assertBaselineIsAncestor(commit) {
  const result = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", commit, "HEAD"],
    { cwd: REPOSITORY_ROOT, encoding: "utf8" }
  );
  if (result.status !== 0) {
    throw new Error(`Historische commit ${commit} is geen voorouder van HEAD.`);
  }
}

function validateSource(name, buffer, expected) {
  if (!Number.isSafeInteger(expected?.bytes) || expected.bytes < 0) {
    throw new Error(`Ongeldige bytegrootte voor historische bron ${name}.`);
  }
  if (!/^[0-9a-f]{64}$/u.test(expected?.sha256 || "")) {
    throw new Error(`Ongeldige SHA-256 voor historische bron ${name}.`);
  }
  const actual = { bytes: buffer.length, sha256: sha256(buffer) };
  if (actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) {
    throw new Error(
      `Historische bron ${name} wijkt af: verwacht ${expected.bytes}/${expected.sha256}, `
      + `ontving ${actual.bytes}/${actual.sha256}.`
    );
  }
  return actual;
}

function loadHistoricalSources() {
  const provenance = readProvenance();
  assertCommitAvailable(provenance.baselineCommit);
  assertBaselineIsAncestor(provenance.baselineCommit);
  const sources = {};
  for (const [name, expected] of Object.entries(provenance.sources)) {
    if (path.isAbsolute(name) || name.includes("..") || name.includes("\\")) {
      throw new Error(`Onveilig historisch bronpad: ${name}`);
    }
    const buffer = execFileSync(
      "git",
      ["show", `${provenance.baselineCommit}:${name}`],
      { cwd: REPOSITORY_ROOT, encoding: "buffer", maxBuffer: 10 * 1024 * 1024 }
    );
    validateSource(name, buffer, expected);
    sources[name] = buffer.toString("utf8");
  }
  return { provenance, sources };
}

function loadCurrentSources(names) {
  return Object.fromEntries(names.map(name => {
    if (path.isAbsolute(name) || name.includes("..") || name.includes("\\")) {
      throw new Error(`Onveilig actueel bronpad: ${name}`);
    }
    return [name, fs.readFileSync(path.join(REPOSITORY_ROOT, name), "utf8")];
  }));
}

module.exports = {
  PROVENANCE_PATH,
  REPOSITORY_ROOT,
  assertBaselineIsAncestor,
  assertCommitAvailable,
  loadCurrentSources,
  loadHistoricalSources,
  readProvenance,
  sha256,
  validateSource
};

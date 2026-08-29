import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { deflateSync } from "node:zlib";

const require = createRequire(import.meta.url);
const { compareDecodedPixels, decodePngPixels } = require("./visual/png-pixels.cjs");
const { digest, stableStringify } = require("./visual/isometric-parity-fingerprint.cjs");

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function rgbPng(width, height, pixels, ancillary = false) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const stride = width * 3;
  const scanlines = Buffer.concat(Array.from({ length: height }, (_, row) => (
    Buffer.concat([Buffer.from([0]), pixels.subarray(row * stride, (row + 1) * stride)])
  )));
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", header),
    ...(ancillary ? [chunk("tEXt", Buffer.from("parity\0container-variant"))] : []),
    chunk("IDAT", deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

test("de PNG-decoder hasht gedecodeerde pixels en negeert containerchunks", () => {
  const pixels = Buffer.from([10, 20, 30, 40, 50, 60]);
  const plain = rgbPng(2, 1, pixels);
  const withText = rgbPng(2, 1, pixels, true);

  assert.notDeepEqual(plain, withText);
  assert.deepEqual(decodePngPixels(plain).pixels, pixels);
  assert.equal(decodePngPixels(plain).sha256, decodePngPixels(withText).sha256);
  assert.equal(compareDecodedPixels(plain, withText).differentPixels, 0);
});

test("kanaalruis is begrensd en pixels buiten de grens blijven zichtbaar", () => {
  const left = rgbPng(1, 1, Buffer.from([10, 20, 30]));
  const right = rgbPng(1, 1, Buffer.from([16, 14, 36]));

  const accepted = compareDecodedPixels(left, right, { maximumChannelNoise: 6 });
  assert.equal(accepted.equal, true);
  assert.equal(accepted.rawDifferentPixels, 1);
  assert.equal(accepted.differentPixels, 0);
  assert.equal(accepted.maximumChannelDelta, 6);

  const rejected = compareDecodedPixels(left, right, { maximumChannelNoise: 5 });
  assert.equal(rejected.equal, false);
  assert.equal(rejected.differentPixels, 1);
  assert.equal(rejected.samples.length, 1);
});

test("canonieke fingerprints zijn onafhankelijk van object-sleutelvolgorde", () => {
  const left = { z: 1, nested: { b: 2, a: 3 }, list: [{ y: 4, x: 5 }] };
  const right = { list: [{ x: 5, y: 4 }], nested: { a: 3, b: 2 }, z: 1 };

  assert.equal(stableStringify(left), stableStringify(right));
  assert.equal(digest(left), digest(right));
});

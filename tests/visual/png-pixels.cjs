"use strict";

const { createHash } = require("node:crypto");
const { inflateSync } = require("node:zlib");

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const diagonalDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= diagonalDistance) return left;
  return upDistance <= diagonalDistance ? up : upLeft;
}

function decodePngPixels(png) {
  if (!Buffer.isBuffer(png) || png.length < PNG_SIGNATURE.length || !png.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("Ongeldige PNG-signatuur.");
  }

  let offset = 8;
  let header = null;
  const idat = [];
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > png.length) throw new Error(`Afgebroken PNG-chunk ${type}.`);
    const data = png.subarray(start, end);
    if (type === "IHDR") {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12]
      };
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset = end + 4;
  }

  if (!header || idat.length === 0) throw new Error("PNG mist IHDR of IDAT.");
  if (header.bitDepth !== 8 || header.compression !== 0 || header.filter !== 0 || header.interlace !== 0) {
    throw new Error(`Niet-ondersteunde PNG-indeling: ${JSON.stringify(header)}.`);
  }
  const channelsByColorType = new Map([[0, 1], [2, 3], [4, 2], [6, 4]]);
  const channels = channelsByColorType.get(header.colorType);
  if (!channels) throw new Error(`Niet-ondersteund PNG-kleurtype ${header.colorType}.`);

  const stride = header.width * channels;
  const inflated = inflateSync(Buffer.concat(idat));
  const expectedLength = (stride + 1) * header.height;
  if (inflated.length !== expectedLength) {
    throw new Error(`PNG-pixellengte ${inflated.length}; verwacht ${expectedLength}.`);
  }

  const pixels = Buffer.allocUnsafe(stride * header.height);
  let inputOffset = 0;
  for (let row = 0; row < header.height; row += 1) {
    const filterType = inflated[inputOffset];
    inputOffset += 1;
    const outputOffset = row * stride;
    for (let column = 0; column < stride; column += 1) {
      const raw = inflated[inputOffset + column];
      const left = column >= channels ? pixels[outputOffset + column - channels] : 0;
      const up = row > 0 ? pixels[outputOffset - stride + column] : 0;
      const upLeft = row > 0 && column >= channels
        ? pixels[outputOffset - stride + column - channels]
        : 0;
      let value;
      if (filterType === 0) value = raw;
      else if (filterType === 1) value = raw + left;
      else if (filterType === 2) value = raw + up;
      else if (filterType === 3) value = raw + Math.floor((left + up) / 2);
      else if (filterType === 4) value = raw + paeth(left, up, upLeft);
      else throw new Error(`Onbekend PNG-filtertype ${filterType}.`);
      pixels[outputOffset + column] = value & 0xff;
    }
    inputOffset += stride;
  }

  const descriptor = `${header.width}x${header.height}:${header.colorType}:${channels}:`;
  return {
    width: header.width,
    height: header.height,
    colorType: header.colorType,
    channels,
    pixels,
    sha256: createHash("sha256").update(descriptor).update(pixels).digest("hex")
  };
}

function compareDecodedPixels(leftPng, rightPng, options = {}) {
  const left = decodePngPixels(leftPng);
  const right = decodePngPixels(rightPng);
  const maximumChannelNoise = Math.max(0, Number(options.maximumChannelNoise) || 0);
  const dimensionsEqual = left.width === right.width
    && left.height === right.height
    && left.channels === right.channels
    && left.colorType === right.colorType;
  if (!dimensionsEqual) {
    return {
      equal: false,
      differentPixels: null,
      maximumChannelDelta: null,
      left: { ...left, pixels: undefined },
      right: { ...right, pixels: undefined }
    };
  }

  let differentPixels = 0;
  let rawDifferentPixels = 0;
  let maximumChannelDelta = 0;
  const samples = [];
  const pixelCount = left.width * left.height;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    let differs = false;
    for (let channel = 0; channel < left.channels; channel += 1) {
      const index = pixel * left.channels + channel;
      const delta = Math.abs(left.pixels[index] - right.pixels[index]);
      if (delta > 0) differs = true;
      if (delta > maximumChannelDelta) maximumChannelDelta = delta;
    }
    if (differs) {
      rawDifferentPixels += 1;
      let exceedsNoise = false;
      for (let channel = 0; channel < left.channels; channel += 1) {
        const index = pixel * left.channels + channel;
        if (Math.abs(left.pixels[index] - right.pixels[index]) > maximumChannelNoise) {
          exceedsNoise = true;
          break;
        }
      }
      if (exceedsNoise) differentPixels += 1;
      if (exceedsNoise && samples.length < 10) {
        const start = pixel * left.channels;
        samples.push({
          x: pixel % left.width,
          y: Math.floor(pixel / left.width),
          left: Array.from(left.pixels.subarray(start, start + left.channels)),
          right: Array.from(right.pixels.subarray(start, start + right.channels))
        });
      }
    }
  }
  return {
    equal: differentPixels === 0,
    differentPixels,
    rawDifferentPixels,
    maximumChannelDelta,
    maximumChannelNoise,
    samples,
    left: { width: left.width, height: left.height, channels: left.channels, sha256: left.sha256 },
    right: { width: right.width, height: right.height, channels: right.channels, sha256: right.sha256 }
  };
}

module.exports = { compareDecodedPixels, decodePngPixels };

// src/utils/webmFix.ts
function readVint(
  data: Uint8Array,
  offset: number
): { value: number; length: number; unknown: boolean } {
  if (offset >= data.length) return { value: 0, length: 1, unknown: false };
  const first = data[offset];
  if (first === 0) return { value: 0, length: 1, unknown: false };
  let length = 1;
  for (let mask = 0x80; mask > 0; mask >>= 1) {
    if (first & mask) break;
    length++;
  }
  if (length > 8 || offset + length > data.length) return { value: 0, length: 1, unknown: false };
  let value = first & (0xff >> length);
  for (let i = 1; i < length; i++) {
    value = value * 256 + data[offset + i];
  }
  const maxValue = Math.pow(2, 7 * length) - 1;
  const unknown = value === maxValue;
  return { value, length, unknown };
}

function encodeVint(value: number, preferredLength?: number): Uint8Array {
  let length = preferredLength ?? Math.ceil(Math.log2(value + 1) / 7);
  if (length < 1) length = 1;
  if (length > 8) length = 8;
  while (length < 8 && value >= Math.pow(2, 7 * length) - 1) length++;
  const result = new Uint8Array(length);
  let temp = value;
  for (let i = length - 1; i >= 0; i--) {
    result[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }
  result[0] |= 1 << (8 - length);
  return result;
}

function float64BE(value: number): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value, false);
  return new Uint8Array(buffer);
}

function findElement(data: Uint8Array, id: number[], start = 0, end = data.length): number {
  outer: for (let i = start; i <= end - id.length; i++) {
    for (let j = 0; j < id.length; j++) {
      if (data[i + j] !== id[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function fixWebMDuration(data: Uint8Array, durationMs: number): Uint8Array {
  try {
    const segmentId = [0x18, 0x53, 0x80, 0x67];
    const infoId = [0x15, 0x49, 0xa9, 0x66];
    const timecodeScaleId = [0x2a, 0xd7, 0xb1];
    const durationId = [0x44, 0x89];

    const segmentIndex = findElement(data, segmentId);
    if (segmentIndex === -1) { console.warn('WebM: Segment not found'); return data; }

    const segmentSizeInfo = readVint(data, segmentIndex + 4);
    const segmentDataStart = segmentIndex + 4 + segmentSizeInfo.length;

    const infoIndex = findElement(data, infoId, segmentDataStart, Math.min(data.length, segmentDataStart + 1024 * 1024));
    if (infoIndex === -1) { console.warn('WebM: Info element not found'); return data; }

    const infoSizeInfo = readVint(data, infoIndex + 4);
    const infoBodyStart = infoIndex + 4 + infoSizeInfo.length;
    const infoBodyEnd = infoBodyStart + infoSizeInfo.value;
    if (infoBodyEnd > data.length) { console.warn('WebM: Invalid Info size'); return data; }

    let timecodeScale = 1_000_000;
    const scaleIndex = findElement(data, timecodeScaleId, infoBodyStart, infoBodyEnd);
    if (scaleIndex !== -1) {
      const scaleSizeInfo = readVint(data, scaleIndex + 3);
      let scale = 0;
      for (let i = 0; i < scaleSizeInfo.value; i++) {
        scale = scale * 256 + data[scaleIndex + 3 + scaleSizeInfo.length + i];
      }
      if (scale > 0) timecodeScale = scale;
    }

    const durationTicks = (durationMs * 1_000_000) / timecodeScale;
    const durationIndex = findElement(data, durationId, infoBodyStart, infoBodyEnd);

    if (durationIndex !== -1) {
      const durationSizeInfo = readVint(data, durationIndex + 2);
      if (durationSizeInfo.value === 8) {
        const output = new Uint8Array(data);
        output.set(float64BE(durationTicks), durationIndex + 2 + durationSizeInfo.length);
        return output;
      }
      return data;
    }

    const durationElement = concatUint8Arrays(
      new Uint8Array([0x44, 0x89, 0x88]),
      float64BE(durationTicks)
    );

    const oldInfoBody = data.slice(infoBodyStart, infoBodyEnd);
    const newInfoBody = concatUint8Arrays(oldInfoBody, durationElement);
    const newInfoSize = encodeVint(newInfoBody.length);
    const infoElement = concatUint8Arrays(new Uint8Array(infoId), newInfoSize, newInfoBody);
    const afterInfo = data.slice(infoBodyEnd);
    const beforeInfo = data.slice(0, infoIndex);
    const result = concatUint8Arrays(beforeInfo, infoElement, afterInfo);

    if (!segmentSizeInfo.unknown) {
      const oldSegmentEnd = segmentDataStart + segmentSizeInfo.value;
      if (oldSegmentEnd <= data.length) {
        const sizeDifference = result.length - data.length;
        const newSegmentSize = segmentSizeInfo.value + sizeDifference;
        const encodedSegmentSize = encodeVint(newSegmentSize, segmentSizeInfo.length);
        result.set(encodedSegmentSize, segmentIndex + 4);
      }
    }

    return result;
  } catch (error) {
    console.warn('WebM duration fix failed:', error);
    return data;
  }
}

export async function makeSeekableWebM(blob: Blob, durationMs: number): Promise<Blob> {
  try {
    const buffer = await blob.arrayBuffer();
    const fixed = fixWebMDuration(new Uint8Array(buffer), durationMs);
    const cleanBuffer = fixed.buffer.slice(0) as ArrayBuffer;
    return new Blob([cleanBuffer], { type: blob.type || 'video/webm' });
  } catch (error) {
    console.warn('Could not make WebM seekable:', error);
    return blob;
  }
}
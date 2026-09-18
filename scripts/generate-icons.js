import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, drawFn) {
  // RGBA buffer: height rows, each row has 1 filter byte (0) + width * 4 bytes
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize, 0);

  const setPixel = (x, y, r, g, b, a) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const offset = y * rowSize + 1 + x * 4;
    rawData[offset] = r;
    rawData[offset + 1] = g;
    rawData[offset + 2] = b;
    rawData[offset + 3] = a;
  };

  drawFn(width, height, setPixel);

  const compressedData = zlib.deflateSync(rawData);

  function crc32(buf) {
    let c;
    const table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c;
    }
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const combined = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(combined), 0);
    return Buffer.concat([len, combined, crcBuf]);
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function drawWebLockIcon(width, height, setPixel) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = width / 2 - 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Smooth circular rounded background
      if (dist <= radius) {
        // Gradient from electric violet (#8B5CF6 -> #6366F1)
        const t = (y / height);
        const r = Math.round(139 * (1 - t) + 99 * t);
        const g = Math.round(92 * (1 - t) + 102 * t);
        const b = Math.round(246 * (1 - t) + 241 * t);
        
        // Edge antialiasing
        const edgeAlpha = Math.min(1, Math.max(0, radius - dist + 0.5));
        setPixel(x, y, r, g, b, Math.round(255 * edgeAlpha));
      }
    }
  }

  // Draw white padlock symbol inside
  // Padlock body (rectangle) and shackle (arch)
  const padW = Math.max(4, Math.round(width * 0.45));
  const padH = Math.max(3, Math.round(height * 0.35));
  const padLeft = Math.round((width - padW) / 2);
  const padTop = Math.round(height * 0.48);

  // Body
  for (let y = padTop; y < padTop + padH; y++) {
    for (let x = padLeft; x < padLeft + padW; x++) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        setPixel(x, y, 255, 255, 255, 255);
      }
    }
  }

  // Shackle
  const shackleW = Math.max(3, Math.round(width * 0.32));
  const shackleThick = Math.max(1, Math.round(width * 0.08));
  const shackleLeft = Math.round((width - shackleW) / 2);
  const shackleRight = shackleLeft + shackleW - 1;
  const shackleTop = Math.round(height * 0.25);
  const shackleBottom = padTop;

  // Top arch
  for (let y = shackleTop; y < shackleTop + shackleThick; y++) {
    for (let x = shackleLeft; x <= shackleRight; x++) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        setPixel(x, y, 255, 255, 255, 255);
      }
    }
  }
  // Left & Right legs of shackle
  for (let y = shackleTop; y < shackleBottom; y++) {
    for (let t = 0; t < shackleThick; t++) {
      setPixel(shackleLeft + t, y, 255, 255, 255, 255);
      setPixel(shackleRight - t, y, 255, 255, 255, 255);
    }
  }

  // Small keyhole dot
  const dotX = Math.round(cx);
  const dotY = Math.round(padTop + padH * 0.45);
  const dotR = Math.max(1, Math.round(width * 0.05));
  for (let y = dotY - dotR; y <= dotY + dotR; y++) {
    for (let x = dotX - dotR; x <= dotX + dotR; x++) {
      setPixel(x, y, 19, 22, 29, 255); // Dark surface color
    }
  }
}

const iconsDir = path.resolve('public/icons');
fs.mkdirSync(iconsDir, { recursive: true });

const sizes = [16, 32, 48, 128];
for (const size of sizes) {
  const pngBuf = createPng(size, size, drawWebLockIcon);
  const filePath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, pngBuf);
  console.log(`Generated ${filePath} (${pngBuf.length} bytes)`);
}

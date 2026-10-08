// Reads a QR code out of a screenshot -- Feature 6001. The browser test photographs the
// QR code element exactly as a phone camera would see it and decodes what it says.
import jsQR from "jsqr";
import { PNG } from "pngjs";

export function decodeQr(png: Buffer): string | null {
  const { data, width, height } = PNG.sync.read(png);
  return jsQR(new Uint8ClampedArray(data), width, height)?.data ?? null;
}

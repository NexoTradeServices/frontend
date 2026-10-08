// QR code -- Feature 6001. frontend-conventions.md, Atoms / Small visuals (QR
// code): ink squares on a surface square, 16px of surface around them, a 1px
// hairline border, 6px corners; the QR code height (200px) square at every
// size, centered, a Caption under it. Drawn in the browser from the value --
// no outside service ever sees the pay link. The surface and ink come from the
// --qr-* tokens, which do not change with the theme.
import qrcode from "qrcode-generator";

const SIZE = 200;
const QUIET_ZONE = 16;

export function QrCode({ value, caption }: { value: string; caption?: string }) {
  const code = qrcode(0, "M");
  code.addData(value);
  code.make();
  const count = code.getModuleCount();
  const squares: string[] = [];
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (code.isDark(row, col)) squares.push(`M${String(col)} ${String(row)}h1v1h-1z`);
    }
  }
  // 16px of surface around the squares, whatever the module count: work in module units.
  const quiet = QUIET_ZONE / ((SIZE - 2 * QUIET_ZONE) / count);
  const box = count + 2 * quiet;
  return (
    <figure className="m-0 flex flex-col items-center">
      <svg
        role="img"
        aria-label="QR code for the pay link"
        data-testid="qr-code"
        width={SIZE}
        height={SIZE}
        viewBox={`${String(-quiet)} ${String(-quiet)} ${String(box)} ${String(box)}`}
        shapeRendering="crispEdges"
        className="rounded-md border border-hairline"
        style={{ background: "var(--qr-surface)" }}
      >
        <path d={squares.join("")} fill="var(--qr-ink)" />
      </svg>
      {caption ? <figcaption className="mt-2 text-center text-xs text-muted-text">{caption}</figcaption> : null}
    </figure>
  );
}

// The Container -- Feature 1018; Templates / Frame pieces / Container.
//
// The box a page's content sits in: as wide as the Main slot until its
// maximum, then centred. Three widths and no more; a page names its width
// and never sets its own. Narrow also centres its card vertically in the
// space under the Top bar (the Main slot is a column that fills the height).
import type { ReactNode } from "react";

export type ContainerWidth = "narrow" | "medium" | "wide";

const WIDTH_CLASSES: Record<ContainerWidth, string> = {
  narrow: "max-w-narrow my-auto",
  medium: "max-w-medium",
  wide: "max-w-wide",
};

export function Container({ width, children }: { width: ContainerWidth; children: ReactNode }) {
  return (
    <div data-container={width} className={`mx-auto w-full ${WIDTH_CLASSES[width]}`}>
      {children}
    </div>
  );
}

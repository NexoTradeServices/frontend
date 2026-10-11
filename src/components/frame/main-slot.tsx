// The Main slot -- Feature 1018; Templates / Frame pieces / Main slot.
//
// The area a page renders into, inside every shell: ground, filling the
// height left under the Top bar so a short page still pushes the Footer to
// the bottom; 28px above the content at every size; side space 16px Phone,
// 24px Tablet, 32px Desktop and up (Tokens / Screen sizes). The Container
// sits inside it.
import type { ReactNode } from "react";

export function MainSlot({ children }: { children: ReactNode }) {
  return <main className="flex flex-1 flex-col bg-ground px-4 py-7 md:px-6 lg:px-8">{children}</main>;
}

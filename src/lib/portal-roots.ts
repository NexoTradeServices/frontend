// Which root each role owns -- Feature 1003, auth + roles (AC11).
//
// Architecture & Routing / The doors: ops and the owner share one portal.
import type { Role } from "./session";

export const PORTAL_ROOTS: Record<Role, string> = {
  customer: "/account",
  contractor: "/contractor",
  ops: "/ops",
  owner: "/ops",
};

export const PORTAL_NAMES: Record<Role, string> = {
  customer: "Customer account",
  contractor: "Contractor portal",
  ops: "Operations portal",
  owner: "Operations portal",
};

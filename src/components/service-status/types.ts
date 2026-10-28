// Shared shapes -- Feature 6012, service status page.
export type ServiceState = "up" | "down" | "not_set_up";
export type RowState = ServiceState | "checking";

/** One row of GET /api/status. */
export interface BackendServiceStatus {
  key: "mailjet" | "clicksend" | "stripe" | "recaptcha" | "cloudinary";
  name: string;
  state: ServiceState;
  reason?: string;
}

export interface StatusRow {
  key: BackendServiceStatus["key"] | "places";
  name: string;
  /** What it is for, in plain words. */
  purpose: string;
  state: RowState;
  reason?: string;
}

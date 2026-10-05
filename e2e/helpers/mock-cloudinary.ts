// Stands in for Cloudinary in the browser -- Feature 3003, enquiry photos.
//
// No test uploads to the real account. Three things are faked by route
// interception, the way mock-google-places.ts fakes Places:
//   - the backend's upload signature (POST /api/enquiries/photo-signature)
//   - Cloudinary's upload and delete_by_token endpoints (api.cloudinary.com)
//   - the picture itself (res.cloudinary.com), a 1px PNG
// Every call is recorded so a test can say what was (not) sent.
import type { Page, Route } from "@playwright/test";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

/** A 1x1 transparent PNG. */
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

export interface CloudinaryMockOptions {
  /** The backend's answer to the signature request: 200 (set up) or 503 (not set up). */
  signatureStatus?: 200 | 503;
  /** How long each upload takes to answer. */
  uploadDelayMs?: number;
  /** Every upload answers an error. */
  failUpload?: boolean;
  /** Every delete answers an error. */
  failDelete?: boolean;
}

export interface CloudinaryMock {
  /** The file name of each upload that reached "Cloudinary", in order. */
  uploads: string[];
  /** The delete token of each delete that reached "Cloudinary". */
  deletes: string[];
  /** The public id handed back for each upload, in order. */
  publicIds: string[];
}

export async function installMockCloudinary(page: Page, options: CloudinaryMockOptions = {}): Promise<CloudinaryMock> {
  const mock: CloudinaryMock = { uploads: [], deletes: [], publicIds: [] };

  await page.route(`${apiUrl}/api/enquiries/photo-signature`, async (route: Route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    if ((options.signatureStatus ?? 200) === 503) {
      await route.fulfill({ status: 503, headers: CORS, json: { error: "photo upload is unavailable" } });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: CORS,
      json: {
        cloudName: "e2e-cloud",
        apiKey: "000000000000000",
        timestamp: Math.floor(Date.now() / 1000),
        signature: "e2e-signature",
        uploadPreset: "tradeservice-enquiry-photos",
        folder: "tradeservice/enquiry-photos",
        allowedFormats: "jpg,png,webp,heic",
        returnDeleteToken: true,
      },
    });
  });

  await page.route("https://api.cloudinary.com/v1_1/*/image/upload", async (route: Route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    const body = route.request().postDataBuffer()?.toString("latin1") ?? "";
    const fileName = /filename="([^"]*)"/.exec(body)?.[1] ?? "unknown";
    mock.uploads.push(fileName);
    if (options.uploadDelayMs) await new Promise((resolve) => setTimeout(resolve, options.uploadDelayMs));
    if (options.failUpload) {
      await route.fulfill({ status: 400, headers: CORS, json: { error: { message: "Upload failed" } } });
      return;
    }
    const publicId = `tradeservice/enquiry-photos/e2e-${String(mock.uploads.length)}-${String(Date.now())}`;
    mock.publicIds.push(publicId);
    await route.fulfill({
      status: 200,
      headers: CORS,
      json: { public_id: publicId, delete_token: `token-${publicId}` },
    });
  });

  await page.route("https://api.cloudinary.com/v1_1/*/delete_by_token", async (route: Route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    mock.deletes.push(new URLSearchParams(route.request().postData() ?? "").get("token") ?? "");
    if (options.failDelete) {
      await route.fulfill({ status: 400, headers: CORS, json: { error: { message: "Invalid token" } } });
      return;
    }
    await route.fulfill({ status: 200, headers: CORS, json: { result: "ok" } });
  });

  await installMockPhotoImages(page);
  return mock;
}

/** The pictures themselves: every Cloudinary delivery URL answers a 1px PNG. */
export async function installMockPhotoImages(page: Page): Promise<void> {
  await page.route("https://res.cloudinary.com/**", (route) =>
    route.fulfill({ status: 200, headers: CORS, contentType: "image/png", body: PIXEL }),
  );
}

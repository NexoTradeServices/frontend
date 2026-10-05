// The enquiry form's photos -- Feature 3003, enquiry photos.
//
// Each picked photo goes straight from the browser to Cloudinary with a
// signature the backend hands out; the enquiry then carries only the public
// ids. Cloudinary is a convenience, never a gate: with the signature
// unavailable the Add tile is switched off and the enquiry still goes
// through. The list lives at the form level so it survives a trip to
// another step and back.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryPhoto } from "@/components/ui/photo-gallery";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export const MAX_PHOTOS = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic"];

export const PHOTO_TOO_BIG = "Photos must be under 10MB";
export const PHOTO_WRONG_TYPE = "Only photos can be added";
export const PHOTO_UNAVAILABLE = "Photo upload isn't working right now - you can still send your request";

interface Signature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  uploadPreset: string;
  folder: string;
  allowedFormats: string;
  returnDeleteToken: boolean;
}

interface Photo extends GalleryPhoto {
  /** The Cloudinary public id, once up. */
  storageKey?: string;
  deleteToken?: string;
  cloudName?: string;
  /** The local preview, released once the Cloudinary thumbnail is in. */
  objectUrl?: string;
  abort?: AbortController;
}

/** The same thumbnail the backend builds: square, automatic format and quality. */
function thumbnailFor(cloudName: string, storageKey: string): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,g_auto,w_240,h_240,f_auto,q_auto/${storageKey}`;
}

function isAllowedType(file: File): boolean {
  if (ALLOWED_TYPES.includes(file.type)) return true;
  // HEIC often arrives with no type at all.
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return file.type === "" && ALLOWED_EXTENSIONS.includes(extension);
}

async function fetchSignature(): Promise<Signature | null> {
  try {
    const res = await fetch(`${apiUrl}/api/enquiries/photo-signature`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) return null;
    return (await res.json()) as Signature;
  } catch {
    return null;
  }
}

/** Taking a photo off never waits on Cloudinary and never shows a failure. */
function deleteQuietly(cloudName: string, deleteToken: string): void {
  void fetch(`https://api.cloudinary.com/v1_1/${cloudName}/delete_by_token`, {
    method: "POST",
    body: new URLSearchParams({ token: deleteToken }),
  }).catch(() => undefined);
}

export function useEnquiryPhotos() {
  const [photos, setPhotosState] = useState<Photo[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string>();
  const photosRef = useRef<Photo[]>([]);
  const uploadsRef = useRef(new Set<Promise<void>>());
  const nextId = useRef(0);

  const setPhotos = useCallback((update: (current: Photo[]) => Photo[]) => {
    photosRef.current = update(photosRef.current);
    setPhotosState(photosRef.current);
  }, []);

  const patch = useCallback(
    (id: string, changes: Partial<Photo>) => {
      setPhotos((current) => current.map((photo) => (photo.id === id ? { ...photo, ...changes } : photo)));
    },
    [setPhotos],
  );

  /** Called when the Photos section first shows: is upload switched on at all? */
  const checkAvailable = useCallback(async () => {
    if (available !== null) return;
    setAvailable((await fetchSignature()) !== null);
  }, [available]);

  async function upload(id: string, file: File, abort: AbortController): Promise<void> {
    const signature = await fetchSignature();
    if (signature === null) {
      setAvailable(false);
      patch(id, { status: "failed" });
      return;
    }
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", signature.apiKey);
      form.append("timestamp", String(signature.timestamp));
      form.append("signature", signature.signature);
      form.append("upload_preset", signature.uploadPreset);
      form.append("folder", signature.folder);
      form.append("allowed_formats", signature.allowedFormats);
      form.append("return_delete_token", "true");
      const res = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
        method: "POST",
        body: form,
        signal: abort.signal,
      });
      const body = (await res.json().catch(() => ({}))) as { public_id?: string; delete_token?: string };
      if (!res.ok || !body.public_id) throw new Error("upload failed");

      const stillThere = photosRef.current.find((photo) => photo.id === id);
      if (stillThere === undefined) {
        // Taken off while it was going up: it must not be left behind.
        if (body.delete_token) deleteQuietly(signature.cloudName, body.delete_token);
        return;
      }
      if (stillThere.objectUrl) URL.revokeObjectURL(stillThere.objectUrl);
      patch(id, {
        status: "done",
        storageKey: body.public_id,
        deleteToken: body.delete_token,
        cloudName: signature.cloudName,
        thumbnailUrl: thumbnailFor(signature.cloudName, body.public_id),
        objectUrl: undefined,
        abort: undefined,
      });
    } catch {
      if (abort.signal.aborted) return;
      patch(id, { status: "failed", abort: undefined });
    }
  }

  const pick = useCallback(
    (files: File[]) => {
      let refusal: string | undefined;
      const accepted: File[] = [];
      for (const file of files) {
        if (!isAllowedType(file)) refusal = PHOTO_WRONG_TYPE;
        else if (file.size > MAX_BYTES) refusal ??= PHOTO_TOO_BIG;
        else accepted.push(file);
      }
      setMessage(refusal);

      const room = MAX_PHOTOS - photosRef.current.length;
      for (const file of accepted.slice(0, Math.max(0, room))) {
        nextId.current += 1;
        const id = `photo-${String(nextId.current)}`;
        const abort = new AbortController();
        const objectUrl = URL.createObjectURL(file);
        setPhotos((current) => [
          ...current,
          { id, fileName: file.name, status: "uploading", thumbnailUrl: objectUrl, objectUrl, abort },
        ]);
        const task = upload(id, file, abort).finally(() => uploadsRef.current.delete(task));
        uploadsRef.current.add(task);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- upload only touches refs and stable setters
    [setPhotos],
  );

  const remove = useCallback(
    (id: string) => {
      const photo = photosRef.current.find((p) => p.id === id);
      if (photo === undefined) return;
      photo.abort?.abort();
      if (photo.objectUrl) URL.revokeObjectURL(photo.objectUrl);
      if (photo.deleteToken && photo.cloudName) deleteQuietly(photo.cloudName, photo.deleteToken);
      setMessage(undefined);
      setPhotos((current) => current.filter((p) => p.id !== id));
    },
    [setPhotos],
  );

  /** Waits for every upload still going, then hands back what is up: the photos to send. */
  const finish = useCallback(async (): Promise<{ storageKey: string; fileName: string }[]> => {
    await Promise.allSettled([...uploadsRef.current]);
    return photosRef.current.flatMap((photo) =>
      photo.status === "done" && photo.storageKey ? [{ storageKey: photo.storageKey, fileName: photo.fileName }] : [],
    );
  }, []);

  useEffect(
    () => () => {
      for (const photo of photosRef.current) if (photo.objectUrl) URL.revokeObjectURL(photo.objectUrl);
    },
    [],
  );

  return { photos, available, message, checkAvailable, pick, remove, finish };
}

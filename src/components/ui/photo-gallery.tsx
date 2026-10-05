// Photo gallery -- frontend-conventions.md, Organisms / Record pieces (Photo
// gallery) and its Photo gallery rules. Feature 3003.
//
// Two faces of one grid: the editable one (the enquiry form: Add tile, remove
// x on every cell, "N of 5 photos" Caption, uploading and failed cells) and
// the read-only one (the ops job page and the respond page: tap a thumbnail
// to open the full photo in a new tab; no x, no Add tile, no count).
"use client";

import type { ChangeEvent } from "react";
import { Camera, CircleAlert, X } from "lucide-react";

export interface GalleryPhoto {
  id: string;
  fileName: string;
  status: "uploading" | "done" | "failed";
  /** What the cell shows: a local preview while uploading, the Cloudinary thumbnail once up. */
  thumbnailUrl: string | null;
}

export interface ReadOnlyPhoto {
  fileName: string;
  thumbnailUrl: string;
  fullUrl: string;
}

const gridClass = "grid grid-cols-3 gap-3.5 md:grid-cols-5";
const cellClass = "relative aspect-square overflow-hidden rounded-md border border-hairline bg-ground";
const captionClass = "mt-1 block text-xs text-muted-text";

const NAME_LIMIT = 14;

/** A long name is cut short with "..." -- on one line, the same at every size. */
export function shortFileName(name: string): string {
  return name.length > NAME_LIMIT ? `${name.slice(0, NAME_LIMIT - 3)}...` : name;
}

function FileNameCaption({ name }: { name: string }) {
  return (
    <span className={`${captionClass} truncate`} title={name}>
      {shortFileName(name)}
    </span>
  );
}

/** The Spinner atom: a small white ring, turning. */
function Spinner() {
  return (
    <span
      role="status"
      aria-label="Uploading"
      className="inline-block size-4 animate-spin rounded-full border-2 border-white/45 border-t-white"
    />
  );
}

function EditableCell({ photo, onRemove }: { photo: GalleryPhoto; onRemove: (id: string) => void }) {
  return (
    <li className="min-w-0" data-testid="photo-cell" data-status={photo.status}>
      <div className={cellClass}>
        {photo.status === "failed" ? (
          <div className="flex size-full flex-col items-center justify-center gap-1 bg-ground px-1 text-center">
            <CircleAlert aria-hidden className="size-4 text-brand-destructive" />
            <span className="text-xs text-brand-destructive">Didn&apos;t upload</span>
          </div>
        ) : (
          <>
            {photo.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- a Cloudinary or local-preview thumbnail; next/image would add nothing
              <img
                src={photo.thumbnailUrl}
                alt={photo.fileName}
                className={`size-full object-cover ${photo.status === "uploading" ? "opacity-40" : ""}`}
              />
            ) : null}
            {photo.status === "uploading" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-ink/40">
                <Spinner />
              </div>
            ) : null}
          </>
        )}
        <button
          type="button"
          onClick={() => onRemove(photo.id)}
          aria-label={`Remove ${photo.fileName}`}
          className="absolute top-0 right-0 flex size-11 items-start justify-end p-1.5"
        >
          <span className="flex size-5 items-center justify-center rounded-full bg-ink/75 text-white">
            <X aria-hidden className="size-3" />
          </span>
        </button>
      </div>
      <FileNameCaption name={photo.fileName} />
    </li>
  );
}

/** The editable gallery. `message` is a Field message under the grid (the caller words it). */
export function PhotoGallery({
  photos,
  limit,
  addDisabled,
  onPick,
  onRemove,
}: {
  photos: GalleryPhoto[];
  limit: number;
  addDisabled: boolean;
  onPick: (files: File[]) => void;
  onRemove: (id: string) => void;
}) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    // Reset so picking the same file again after removing it fires a change.
    event.target.value = "";
    if (files.length > 0) onPick(files);
  }

  return (
    <div>
      <ul className={gridClass}>
        {photos.map((photo) => (
          <EditableCell key={photo.id} photo={photo} onRemove={onRemove} />
        ))}
        {photos.length < limit ? (
          <li className="min-w-0">
            <label
              className={`${cellClass} flex flex-col items-center justify-center gap-1 border-dashed text-[13px] font-semibold text-secondary-text focus-within:ring-2 focus-within:ring-ink/30 ${
                addDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              }`}
            >
              <Camera aria-hidden className="size-4" />
              <span>Add photo</span>
              <input
                type="file"
                multiple
                disabled={addDisabled}
                accept=".jpg,.jpeg,.png,.webp,.heic,image/jpeg,image/png,image/webp,image/heic"
                className="sr-only"
                onChange={handleChange}
              />
            </label>
          </li>
        ) : null}
      </ul>
      <span className={captionClass}>
        {photos.length} of {limit} photos
      </span>
    </div>
  );
}

/** The read-only gallery: tap a thumbnail to open the full photo in a new tab. */
export function ReadOnlyPhotoGallery({ photos }: { photos: ReadOnlyPhoto[] }) {
  return (
    <ul className={gridClass}>
      {photos.map((photo) => (
        <li key={photo.fullUrl} className="min-w-0">
          <a
            href={photo.fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${photo.fileName}`}
            className={`${cellClass} block`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a Cloudinary thumbnail */}
            <img src={photo.thumbnailUrl} alt={photo.fileName} className="size-full object-cover" />
          </a>
          <FileNameCaption name={photo.fileName} />
        </li>
      ))}
    </ul>
  );
}

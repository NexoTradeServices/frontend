// The service area builder -- Feature 2002, plan decisions 3-11. ONE shared
// screen, rendered in both portals: the ops Service area tab
// (/ops/contractors/[code]/service-area) and the contractor's own
// (/contractor/service-area). Card order (Core location, Radius,
// Postcodes), copy and both toasts are taken from the Service area builder
// flow walkthrough, 03 Sep 2026 (plan.md Quick fixes) -- not re-decided
// here, except where a plan decision fixes something the walkthrough's own
// mock data could not show (decision 8: no saved-by stamp -- the design has
// no field for it, so this screen carries no "Saved dd/mm/yy by X" caption
// the walkthrough's fictional bookkeeping displayed).
//
// V4 (ADJUSTED, feel-pass 07/09/26): decision 7's "kept last time, now
// outside the radius" carryover group -- served postcodes that fall outside
// a NEW pin's range, kept until explicitly crossed off -- is dropped at the
// owner's word. Moving the core location now starts the postcode list over:
// radius resets to the default and only what is actually in range of the
// NEW pin can be kept. See change.md's Notes on the table, V4.
"use client";

import { useEffect, useRef, useState } from "react";
import { PlacesField, type PickedAddress } from "@/components/ui/places-field";
import { Toast, useToast } from "@/components/ui/toast";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const MIN_KM = 5;
const MAX_KM = 60;
const KM_STEP = 5;
const DEFAULT_RADIUS_KM = 30;

export interface SuburbPin {
  suburb: string;
  state: string;
  country: string;
  postcode: string;
  lat: number;
  lng: number;
  placeId: string;
}

export interface ServiceAreaDto {
  coreLocation: SuburbPin | null;
  radiusKm: number;
  postcodes: string[];
}

interface InRangePostcode {
  postcode: string;
  suburbs: string[];
  nearestKm: number;
}

function toPickedAddress(pin: SuburbPin | null): PickedAddress | null {
  if (!pin) return null;
  return { ...pin, street: "" };
}

function toSuburbPin(picked: PickedAddress): SuburbPin {
  return {
    suburb: picked.suburb,
    state: picked.state,
    country: picked.country,
    postcode: picked.postcode,
    lat: picked.lat,
    lng: picked.lng,
    placeId: picked.placeId,
  };
}

async function fetchInRange(lat: number, lng: number, km: number): Promise<InRangePostcode[]> {
  const res = await fetch(`${apiUrl}/api/suburbs/in-range?lat=${String(lat)}&lng=${String(lng)}&km=${String(km)}`, {
    credentials: "include",
  });
  if (res.status !== 200) return [];
  return (await res.json()) as InRangePostcode[];
}

function derivedCrossed(inRange: InRangePostcode[], served: string[]): Set<string> {
  const servedSet = new Set(served);
  return new Set(inRange.filter((row) => !servedSet.has(row.postcode)).map((row) => row.postcode));
}

export function ServiceArea({
  putUrl,
  initial,
  mode,
  contractorName,
  onSaved,
  onCancel,
}: {
  /** the PUT target -- /api/contractors/{code}/service-area or /api/contractor/service-area */
  putUrl: string;
  initial: ServiceAreaDto;
  mode: "ops" | "contractor";
  /** required in ops mode -- the toast names the contractor. */
  contractorName?: string;
  /** ops mode: called with the toast text once saved; the parent navigates to the list with it. */
  onSaved?: (toastText: string) => void;
  /** ops mode: called on Cancel; the parent navigates to the list. */
  onCancel?: () => void;
}) {
  const [savedState, setSavedState] = useState(initial);
  const [pin, setPin] = useState(savedState.coreLocation);
  const [radiusKm, setRadiusKm] = useState(savedState.radiusKm);
  const [draftKm, setDraftKm] = useState(savedState.radiusKm);
  const [crossed, setCrossed] = useState<Set<string>>(new Set());
  const [inRange, setInRange] = useState<InRangePostcode[]>([]);
  const [pinError, setPinError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [addressPicking, setAddressPicking] = useState(false);
  const [toastMessage, showToast] = useToast();
  // A brand new area (no saved pin at all) has nothing to derive crossed-off
  // state FROM -- every postcode simply arrives kept, so seeding starts
  // already "done" and the first-ever fetch (once a pin is picked) never
  // runs the derived-crossed comparison against an empty saved list.
  const seededFor = useRef(savedState.coreLocation === null);

  // The in-range set at the CURRENT pin + radius -- fetched fresh whenever
  // either changes (decision 4: the client asks the server on pin pick and
  // on slider release, never mid-drag). The very first fetch for a given
  // pin also seeds `crossed` from the derived-crossed rule (decision 6):
  // every postcode in range of the SAVED pin+radius with no served row
  // reads crossed off on load; after that, `crossed` is remembered locally
  // and never re-derived -- a postcode entering range for the first time
  // simply has no entry in it, so it arrives kept by default.
  useEffect(() => {
    // Stale data left over from a since-cleared pin is harmless: every
    // reader below is itself guarded on `pin` being set, so it simply never
    // renders while there is none.
    if (!pin) return;
    let cancelled = false;
    fetchInRange(pin.lat, pin.lng, radiusKm)
      .then((rows) => {
        if (cancelled) return;
        setInRange(rows);
        if (!seededFor.current) {
          seededFor.current = true;
          setCrossed(derivedCrossed(rows, savedState.postcodes));
        }
      })
      .catch(() => {
        if (!cancelled) setInRange([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin?.lat, pin?.lng, radiusKm]);

  function handlePinChange(picked: PickedAddress | null) {
    // V4: a changed core location starts the postcode list over -- radius
    // back to the default, nothing carried forward from the old pin. The
    // fresh fetch above (triggered by pin/radius both changing) then arrives
    // with `seededFor` already true, so nothing gets derived-crossed either:
    // everything in range of the new pin simply arrives kept.
    seededFor.current = true;
    setCrossed(new Set());
    setRadiusKm(DEFAULT_RADIUS_KM);
    setDraftKm(DEFAULT_RADIUS_KM);
    setPin(picked ? toSuburbPin(picked) : null);
    setFormError(undefined);
  }

  function commitKm(nextKm: number) {
    if (nextKm === radiusKm) return;
    setRadiusKm(nextKm);
  }

  const kept = inRange.filter((row) => !crossed.has(row.postcode));

  function toggleChip(postcode: string) {
    setCrossed((prev) => {
      const next = new Set(prev);
      if (next.has(postcode)) next.delete(postcode);
      else next.add(postcode);
      return next;
    });
  }

  function keepAllInRange() {
    setCrossed((prev) => {
      const next = new Set(prev);
      inRange.forEach((row) => next.delete(row.postcode));
      return next;
    });
  }

  function crossAllInRange() {
    setCrossed((prev) => {
      const next = new Set(prev);
      inRange.forEach((row) => next.add(row.postcode));
      return next;
    });
  }

  function undoChanges() {
    seededFor.current = savedState.coreLocation === null;
    setPin(savedState.coreLocation);
    setRadiusKm(savedState.radiusKm);
    setDraftKm(savedState.radiusKm);
    setPinError(undefined);
    setFormError(undefined);
    showToast("Changes undone.");
  }

  async function handleSave() {
    setFormError(undefined);
    setPinError(undefined);

    if (!pin) {
      setPinError("Pick the suburb the area is built around.");
      setFormError("Not saved. The service area needs a core location.");
      window.scrollTo(0, 0);
      return;
    }

    const finalPostcodes = kept.map((row) => row.postcode);
    if (finalPostcodes.length === 0) {
      setFormError("Not saved. Keep at least one postcode -- a service area with nothing in it cannot match a job.");
      window.scrollTo(0, 0);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}${putUrl}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coreLocation: pin, radiusKm, postcodes: finalPostcodes }),
      });
      const body = (await res.json()) as ServiceAreaDto & { error?: string; field?: string };
      if (!res.ok) {
        if (body.field === "coreLocation") setPinError(body.error);
        setFormError(body.error ?? "Save failed.");
        window.scrollTo(0, 0);
        return;
      }
      setSavedState(body);
      const toastText =
        mode === "ops"
          ? `${contractorName ?? ""}'s service area saved -- ${String(finalPostcodes.length)} postcodes from ${pin.suburb}.`
          : `Service area saved -- ${String(finalPostcodes.length)} postcodes from ${pin.suburb}.`;
      if (mode === "ops") {
        onSaved?.(toastText);
      } else {
        showToast(toastText);
      }
    } catch {
      setFormError("Save failed -- check your connection and try again.");
      window.scrollTo(0, 0);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (mode === "ops") {
      onCancel?.();
    } else {
      undoChanges();
    }
  }

  const crossedCount = inRange.length - kept.length;
  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      {formError ? (
        <div className="rounded-lg border border-error-border bg-error-bg p-3.5 text-[13px] text-brand-destructive">
          <b>Not saved.</b> {formError.replace(/^Not saved\.\s*/, "")}
        </div>
      ) : null}

      <div className="rounded-[10px] border border-hairline bg-surface p-5">
        <h3 className="mb-1.5 font-heading text-base font-extrabold text-ink">Core location</h3>
        <p className="mb-3.5 text-xs text-muted-text">
          {mode === "ops"
            ? "The suburb the contractor is based in. The radius and postcode list below both start from here."
            : "The suburb you're based in. The radius and postcode list below both start from here."}
        </p>
        <PlacesField
          id="core-location"
          label="Suburb"
          variant="suburb"
          value={toPickedAddress(pin)}
          onChange={handlePinChange}
          error={pinError}
          onErrorChange={setPinError}
          onPickingChange={setAddressPicking}
          helper="Pick a suburb only."
        />
      </div>

      <div className="rounded-[10px] border border-hairline bg-surface p-5">
        <h3 className="mb-1.5 font-heading text-base font-extrabold text-ink">Radius</h3>
        <p className="mb-3.5 text-xs text-muted-text">
          {mode === "ops"
            ? "How far the contractor is willing to travel from their core location. Drag it, and every postcode within that distance of the pin fills in below."
            : "How far you're willing to travel from your core location. Drag it, and every postcode within that distance of your pin fills in below."}
        </p>
        <div className="mb-1.5 font-heading text-xl font-extrabold text-ink">{draftKm} km</div>
        <input
          type="range"
          aria-label="Radius in kilometres"
          min={MIN_KM}
          max={MAX_KM}
          step={KM_STEP}
          value={draftKm}
          onChange={(e) => setDraftKm(Number(e.target.value))}
          onMouseUp={(e) => commitKm(Number(e.currentTarget.value))}
          onTouchEnd={(e) => commitKm(Number(e.currentTarget.value))}
          onKeyUp={(e) => commitKm(Number(e.currentTarget.value))}
          className="h-11 w-full accent-brand-accent"
        />
        <div className="flex justify-between text-[11px] text-muted-text">
          <span>{MIN_KM} km</span>
          <span>{MAX_KM} km</span>
        </div>
      </div>

      <div className="rounded-[10px] border border-hairline bg-surface p-5">
        <h3 className="mb-1.5 font-heading text-base font-extrabold text-ink">
          Postcodes
        </h3>
        {!pin ? (
          <div className="rounded-lg bg-warning-bg p-3.5 text-[13px] text-brand-warning">
            <b>Pick the suburb first.</b> The postcodes in range appear here once there is a pin.
          </div>
        ) : (
          <>
            <p className="mb-3.5 text-xs text-muted-text">
              Tick a postcode to keep it, untick it to cross it off -- whole postcodes only, never part of one.
            </p>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-4">
                <div>
                  <div className="font-heading text-lg font-extrabold text-ink">{inRange.length}</div>
                  <div className="text-[11px] text-muted-text">in range</div>
                </div>
                <div>
                  <div className="font-heading text-lg font-extrabold text-brand-success">{kept.length}</div>
                  <div className="text-[11px] text-muted-text">kept</div>
                </div>
                <div>
                  <div className="font-heading text-lg font-extrabold text-muted-text">{crossedCount}</div>
                  <div className="text-[11px] text-muted-text">crossed off</div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={keepAllInRange}
                  className="text-[12px] font-semibold text-secondary-text underline underline-offset-2"
                >
                  Tick all
                </button>
                <button
                  type="button"
                  onClick={crossAllInRange}
                  className="text-[12px] font-semibold text-secondary-text underline underline-offset-2"
                >
                  Untick all
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {inRange.map((row) => {
                const off = crossed.has(row.postcode);
                return (
                  <button
                    key={row.postcode}
                    type="button"
                    aria-pressed={!off}
                    onClick={() => toggleChip(row.postcode)}
                    className={`min-h-9 rounded-full px-3.5 py-2 text-left text-[13px] font-semibold ${
                      off
                        ? "border border-dashed border-hairline text-muted-text line-through"
                        : "border border-transparent bg-success-bg text-brand-success"
                    }`}
                  >
                    {row.postcode} - {row.suburbs.join(", ")}
                    <small className="ml-1.5 font-normal opacity-80">{Math.round(row.nearestKm)} km</small>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="min-h-11 rounded-md border border-hairline bg-surface px-4 py-2.5 text-sm font-bold text-ink"
        >
          {mode === "ops" ? "Cancel" : "Undo changes"}
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || addressPicking}
          className={`min-h-11 min-w-[180px] rounded-md px-5 py-2.5 text-sm font-bold text-on-accent ${
            saving || addressPicking ? "bg-brand-accent-loading" : "bg-brand-accent"
          }`}
        >
          {saving ? "Saving..." : addressPicking ? "Picking suburb..." : "Save service area"}
        </button>
      </div>

      {mode === "contractor" ? <Toast message={toastMessage} /> : null}
    </div>
  );
}

// The enquiry form -- Feature 3001, enquiry form to job created.
//
// Built to the frozen Request A Job style reference (25-27 Aug 2026): field
// anatomy, the persistent urgent banner, trade cards, progress bar, the
// auto-computed priced summary, and the confirmation screen. One step the
// reference never drew is added here (change.md, V1 -- "Your details").
// The trade's prefilled fields (Customer Workflow step 4) are QUESTIONS,
// each with its own typed answer -- "What brand is it", "How old is the
// system" -- not a pick list. They live INSIDE the Notes step, optional,
// under "Additional questions", AFTER the required "What's happening" box
// (owner's feel-pass, 09/09/26) -- never their own step.
//
// Required/optional marking (change.md, V3): now that "Additional
// questions" and the marketing checkboxes are genuinely optional, this
// form is the frontend-conventions.md "most fields required" case (a star
// on each required field), not the "every field required" case (no stars,
// a blanket line) plan.md's AC8 was written against -- the word
// "(optional)" is never used either way.
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/auth/field";
import { Banner } from "@/components/auth/banner";
import { PlacesField, type PickedAddress } from "@/components/ui/places-field";
import { getRecaptchaToken } from "@/lib/recaptcha";
import { TradeIcon } from "./trade-icon";
import { formatDayName, formatDollars, formatFriendlyDate, isWeekendDate, todayYmd } from "./money";
import type { FormDataDto, PreferredWindow } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

type StepKey = "suburb" | "trade" | "schedule" | "notes" | "details" | "price";

const STEPS: readonly StepKey[] = ["suburb", "trade", "schedule", "notes", "details", "price"];

const STEP_LABELS: Record<StepKey, string> = {
  suburb: "Where's the job?",
  trade: "What's the job?",
  schedule: "When works for you?",
  notes: "Tell us what's wrong",
  details: "Your details",
  price: "Pricing",
};

const WINDOWS: { value: PreferredWindow; label: string; note: string }[] = [
  { value: "morning", label: "Morning", note: "7:00 - 12:00" },
  { value: "afternoon", label: "Afternoon", note: "12:00 - 17:00" },
  { value: "evening", label: "Evening", note: "17:00 - 20:00" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RequestAJobForm({
  formData,
  displayName,
}: {
  formData: FormDataDto;
  /** PlatformSettings.displayName -- brand is config, never code (Ground rules; Brand identity surfaces). Null when the identity read failed upstream; the slot renders empty, never a literal fallback (Wordmark's own decision 6). */
  displayName: string | null;
}) {
  const router = useRouter();
  const { operatorPhone, serviceTypes } = formData;

  const [stepIndex, setStepIndex] = useState(0);
  const [location, setLocation] = useState<PickedAddress | null>(null);
  const [locationError, setLocationError] = useState<string>();
  const [trade, setTrade] = useState<string | null>(null);
  const [tradeError, setTradeError] = useState<string>();
  /** One typed answer per trade question, keyed by the question's own label. Optional -- left blank is fine. */
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [preferredDate, setPreferredDate] = useState(todayYmd());
  const [preferredWindow, setPreferredWindow] = useState<PreferredWindow>("morning");
  const [description, setDescription] = useState("");
  const [descriptionError, setDescriptionError] = useState<string>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [marketingEmail, setMarketingEmail] = useState(false);
  const [marketingSms, setMarketingSms] = useState(false);
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const selectedType = useMemo(
    () => serviceTypes.find((t) => t.trade === trade) ?? null,
    [serviceTypes, trade],
  );

  const step = STEPS[Math.min(stepIndex, STEPS.length - 1)] ?? "suburb";

  const weekend = isWeekendDate(preferredDate);
  const multiplier = selectedType ? (weekend ? selectedType.serviceLevelMultipliers.weekend : selectedType.serviceLevelMultipliers.normal) : 1;
  const calloutRate = selectedType ? Math.round(selectedType.customerCalloutRate * multiplier) : 0;
  const standardRate = selectedType ? Math.round(selectedType.customerStandardRate * multiplier) : 0;

  function goTo(index: number) {
    setStepIndex(Math.max(0, Math.min(index, STEPS.length - 1)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateStep(): boolean {
    if (step === "suburb") {
      if (location === null) {
        setLocationError("Pick a suburb from the list before continuing.");
        return false;
      }
      return true;
    }
    if (step === "trade") {
      if (trade === null) {
        setTradeError("Pick a trade before continuing.");
        return false;
      }
      return true;
    }
    if (step === "notes") {
      // The trade's own questions are optional (owner, 09/09/26) -- only
      // the general description is required on this step.
      const descriptionOk = description.trim() !== "";
      setDescriptionError(descriptionOk ? undefined : "Tell us what's happening before continuing.");
      return descriptionOk;
    }
    if (step === "details") {
      const errors: Record<string, string> = {};
      if (name.trim() === "") errors.name = "Required.";
      if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address.";
      if (phone.trim() === "") errors.phone = "Required.";
      setDetailErrors(errors);
      return Object.keys(errors).length === 0;
    }
    return true;
  }

  function handleContinue() {
    if (!validateStep()) return;
    goTo(stepIndex + 1);
  }

  async function handleSubmit() {
    if (location === null || trade === null) return;
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      // The literal question shown, paired with what the customer typed --
      // Job.selectedOptions snapshots exactly this (Customer Workflow step
      // 4). Optional: a question left blank is just left out, never sent
      // as "Question: ".
      const selectedOptions = (selectedType?.prefilledFields ?? [])
        .filter((question) => (questionAnswers[question] ?? "").trim() !== "")
        .map((question) => `${question}: ${questionAnswers[question]!.trim()}`);
      const recaptchaToken = await getRecaptchaToken("enquiry_submit");
      const res = await fetch(`${apiUrl}/api/enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          location: {
            suburb: location.suburb,
            state: location.state,
            country: location.country,
            postcode: location.postcode,
            lat: location.lat,
            lng: location.lng,
            placeId: location.placeId,
          },
          trade,
          selectedOptions,
          preferredDate,
          preferredWindow,
          description: description.trim(),
          marketingEmail,
          marketingSms,
          recaptchaToken,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { reference?: string; error?: string; operatorPhone?: string };
      if (res.status === 201 && body.reference) {
        router.push(`/request-a-job/confirmed?ref=${encodeURIComponent(body.reference)}`);
        return;
      }
      if (res.status === 403) {
        setSubmitError(
          `We couldn't take that request automatically -- please call us on ${body.operatorPhone ?? operatorPhone}.`,
        );
        return;
      }
      setSubmitError(body.error ?? "Something went wrong -- check your details and try again.");
    } catch {
      setSubmitError("Something went wrong -- check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-ground">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex max-w-[640px] items-center justify-between px-5 py-4">
          {displayName ? (
            <span className="font-heading text-lg font-black text-ink">
              {displayName.split("&").map((part, index) => (
                <span key={index}>
                  {index > 0 ? <span className="text-brand-accent">&amp;</span> : null}
                  {part}
                </span>
              ))}
            </span>
          ) : null}
          <a href={`tel:${operatorPhone}`} className="text-[13px] font-bold text-secondary-text">
            {operatorPhone}
          </a>
        </div>
      </header>

      <div className="border-b border-[#f3cda3] bg-warning-bg px-5 py-3 text-center">
        <p className="text-[13px] font-semibold text-brand-warning">
          Job urgent? Don&apos;t fill the form -- call us now:{" "}
          <a href={`tel:${operatorPhone}`} className="text-ink underline">
            {operatorPhone}
          </a>
        </p>
      </div>

      <div className="mx-auto max-w-[640px] px-5">
        <div className="pt-6 pb-1">
          <div className="flex items-center gap-1.5">
            {STEPS.map((key, i) => (
              <div
                key={key}
                className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-brand-accent" : "bg-hairline"}`}
              />
            ))}
          </div>
          <p className="mt-2.5 text-xs font-bold tracking-[0.02em] text-muted-text uppercase">
            Step <strong className="text-ink">{stepIndex + 1}</strong> of {STEPS.length} -- {STEP_LABELS[step]}
          </p>
        </div>

        <section className="py-7 pb-12">
          <h1 className="mb-5 font-heading text-2xl font-extrabold text-ink">{STEP_LABELS[step]}</h1>

          {step === "suburb" ? (
            <>
              <PlacesField
                id="suburb"
                label="Suburb"
                required
                variant="suburb"
                value={location}
                onChange={(value) => {
                  setLocation(value);
                  if (value) setLocationError(undefined);
                }}
                error={locationError}
                onErrorChange={setLocationError}
              />
            </>
          ) : null}

          {step === "trade" ? (
            <>
              <span className="mb-[5px] block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase after:ml-0.5 after:text-brand-destructive after:content-['*']">
                Trade
              </span>
              <div className="grid grid-cols-3 gap-2">
                {serviceTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setTrade(type.trade);
                      setTradeError(undefined);
                      setQuestionAnswers({});
                    }}
                    className={`min-h-11 rounded-lg border bg-surface px-2 py-2.5 text-center ${
                      trade === type.trade ? "border-brand-accent ring-1 ring-brand-accent" : "border-hairline"
                    }`}
                  >
                    <TradeIcon trade={type.trade} />
                    <span className="text-xs font-bold text-ink">{type.trade}</span>
                  </button>
                ))}
              </div>
              {tradeError ? <p className="mt-2.5 text-xs font-semibold text-brand-destructive">{tradeError}</p> : null}
            </>
          ) : null}

          {step === "schedule" ? (
            <>
              <p className="mb-6 text-sm text-secondary-text">
                Choose a slot that works for you -- we&apos;ll confirm the exact time via SMS/email.
              </p>
              <Field
                id="preferredDate"
                label="Date"
                required
                type="date"
                min={todayYmd()}
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                helper="Defaults to today -- move it later if that suits you better."
              />
              <div className="mb-3.5">
                <span className="mb-[5px] block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase after:ml-0.5 after:text-brand-destructive after:content-['*']">
                  Time of day
                </span>
                <div className="flex flex-col gap-2.5">
                  {WINDOWS.map((w) => (
                    <label
                      key={w.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border bg-surface px-4 py-3.5 ${
                        preferredWindow === w.value ? "border-brand-accent ring-1 ring-brand-accent" : "border-hairline"
                      }`}
                    >
                      <input
                        type="radio"
                        name="window"
                        className="h-[18px] w-[18px] accent-[var(--brand-accent)]"
                        checked={preferredWindow === w.value}
                        onChange={() => setPreferredWindow(w.value)}
                      />
                      <span>
                        <span className="block text-sm font-bold text-ink">{w.label}</span>
                        <span className="block text-xs text-muted-text">{w.note}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {step === "notes" ? (
            <>
              <div className="mb-3.5">
                <label
                  htmlFor="description"
                  className="mb-[5px] block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase after:ml-0.5 after:text-brand-destructive after:content-['*']"
                >
                  What&apos;s happening
                </label>
                <textarea
                  id="description"
                  className={`min-h-[110px] w-full rounded-md border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 ${
                    descriptionError ? "border-brand-destructive" : "border-hairline"
                  }`}
                  placeholder="e.g. Kitchen tap won't stop dripping, started yesterday"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (e.target.value.trim() !== "") setDescriptionError(undefined);
                  }}
                />
                {descriptionError ? <p className="mt-[5px] text-xs text-brand-destructive">{descriptionError}</p> : null}
              </div>

              {selectedType && selectedType.prefilledFields.length > 0 ? (
                <div className="mt-6 border-t border-hairline pt-5">
                  <h2 className="font-heading text-sm font-extrabold text-ink">Additional questions</h2>
                  <p className="mb-4 text-xs text-muted-text">Help us to attend the job better prepared.</p>
                  {selectedType.prefilledFields.map((question, index) => (
                    <Field
                      key={question}
                      id={`prefilled-${String(index)}`}
                      label={question}
                      value={questionAnswers[question] ?? ""}
                      onChange={(e) => setQuestionAnswers((prev) => ({ ...prev, [question]: e.target.value }))}
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          {step === "details" ? (
            <>
              <Field
                id="name"
                label="Your name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={detailErrors.name}
              />
              <Field
                id="email"
                label="Email"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={detailErrors.email}
              />
              <Field
                id="phone"
                label="Phone"
                required
                placeholder="0412 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={detailErrors.phone}
              />
              <div className="mt-5 flex flex-col gap-2.5">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    className="h-[18px] w-[18px] accent-[var(--brand-accent)]"
                    checked={marketingEmail}
                    onChange={(e) => setMarketingEmail(e.target.checked)}
                  />
                  <span className="text-sm text-ink">Send me offers and updates by email</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    className="h-[18px] w-[18px] accent-[var(--brand-accent)]"
                    checked={marketingSms}
                    onChange={(e) => setMarketingSms(e.target.checked)}
                  />
                  <span className="text-sm text-ink">Send me offers and updates by SMS</span>
                </label>
              </div>
            </>
          ) : null}

          {step === "price" ? (
            <>
              {submitError ? <Banner kind="error">{submitError}</Banner> : null}
              <div className="mb-5 grid grid-cols-2 gap-3 rounded-lg border border-hairline bg-surface px-4 py-3.5 sm:grid-cols-4">
                <div>
                  <div className="text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase">Selected Trade</div>
                  <div className="text-sm font-bold text-ink">{trade}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase">Day</div>
                  <div className="text-sm font-bold text-ink">{formatDayName(preferredDate)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase">Date</div>
                  <div className="text-sm font-bold text-ink">{formatFriendlyDate(preferredDate)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase">Time Range</div>
                  <div className="text-sm font-bold text-ink">
                    {WINDOWS.find((w) => w.value === preferredWindow)?.note}
                  </div>
                </div>
              </div>
              <p className="mb-6 text-sm text-secondary-text">
                This price includes the call-out and up to one hour of service. Any additional time is charged at the
                hourly rate shown below.
              </p>
              <div className="flex items-center justify-between rounded-lg border border-brand-accent px-4 py-3.5 ring-1 ring-brand-accent">
                <div className="text-sm font-bold text-ink">{weekend ? "Weekend rate" : "Standard Rate"}</div>
                <div className="text-right">
                  <div className="text-[15px] font-extrabold text-ink">{formatDollars(calloutRate)}</div>
                  <div className="text-[11.5px] text-muted-text">then {formatDollars(standardRate)} per additional hour</div>
                </div>
              </div>
            </>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={() => goTo(stepIndex - 1)}
                className="min-h-11 rounded-md border border-hairline bg-surface px-5 py-2.5 text-sm font-bold text-ink"
              >
                Back
              </button>
            ) : (
              <span />
            )}
            {step === "price" ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmit()}
                className={`min-h-11 rounded-md px-5 py-2.5 text-sm font-bold text-on-accent ${
                  submitting ? "bg-brand-accent-loading" : "bg-brand-accent"
                }`}
              >
                {submitting ? "Sending..." : "Request a job"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleContinue}
                className="min-h-11 rounded-md bg-brand-accent px-5 py-2.5 text-sm font-bold text-on-accent"
              >
                Continue
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

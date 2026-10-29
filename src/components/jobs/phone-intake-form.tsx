// Phone intake -- Feature 3005, phone-taken job intake.
//
// Operations Admin Workflow: urgent work arrives by phone, and Mike keys the job himself while the
// customer is on the line. The enquiry form's fields on one page (Pages / Which layout each kind of
// page takes: a record edited as a form), without photos, marketing ticks or reCAPTCHA. Saving makes
// a normal `new` job (source phone) and opens its page, where Mike carries on with the confirming
// call. The suburb field, the trade's questions and the price block are the enquiry form's own pieces.
// Owner's call at UAT: the street address of the job and whoever lets us in are taken on the call too
// (both optional), so Mike does not have to ring back for them.
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/auth/field";
import { Banner } from "@/components/auth/banner";
import { PrimaryButton } from "@/components/auth/buttons";
import { SelectField } from "@/components/ui/select-field";
import { PlacesField, type PickedAddress, type PlatformSuburb } from "@/components/ui/places-field";
import { AdditionalQuestions } from "@/components/request-a-job/additional-questions";
import { PriceBox } from "@/components/request-a-job/price-box";
import { WINDOWS } from "@/components/request-a-job/request-a-job-form";
import { isWeekendDate, todayYmd } from "@/components/request-a-job/money";
import type { FormDataDto, PreferredWindow } from "@/components/request-a-job/types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldKey =
  | "location"
  | "trade"
  | "description"
  | "preferredDate"
  | "preferredWindow"
  | "name"
  | "email"
  | "phone"
  | "businessName"
  | "siteAddress"
  | "siteContactName"
  | "siteContactPhone"
  | "siteContactEmail";
type Errors = Partial<Record<FieldKey, string>>;

export function PhoneIntakeForm({ formData }: { formData: FormDataDto }) {
  const router = useRouter();
  const { serviceTypes } = formData;

  const [location, setLocation] = useState<PickedAddress | null>(null);
  const [platformSuburb, setPlatformSuburb] = useState<PlatformSuburb | null>(null);
  const [trade, setTrade] = useState("");
  const [description, setDescription] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [preferredDate, setPreferredDate] = useState(todayYmd());
  const [preferredWindow, setPreferredWindow] = useState<PreferredWindow | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [siteAddress, setSiteAddress] = useState<PickedAddress | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const selectedType = useMemo(() => serviceTypes.find((t) => t.trade === trade) ?? null, [serviceTypes, trade]);
  const weekend = isWeekendDate(preferredDate);
  const multiplier = selectedType
    ? weekend
      ? selectedType.serviceLevelMultipliers.weekend
      : selectedType.serviceLevelMultipliers.normal
    : 1;

  function clearError(key: FieldKey) {
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): Errors {
    const next: Errors = {};
    if (location === null && platformSuburb === null) next.location = "Pick a suburb from the list.";
    if (trade === "") next.trade = "Pick a trade.";
    if (description.trim() === "") next.description = "Tell us what's happening.";
    if (preferredDate === "") next.preferredDate = "Pick a date.";
    if (preferredWindow === null) next.preferredWindow = "Pick a time of day.";
    if (name.trim() === "") next.name = "Enter the customer's name.";
    if (!EMAIL_PATTERN.test(email.trim())) next.email = "Enter the customer's email address.";
    if (phone.trim() === "") next.phone = "Enter the customer's phone number.";
    // The site contact is all-or-nothing: name and phone together, the email checked when given.
    const anyContact = contactName.trim() !== "" || contactPhone.trim() !== "" || contactEmail.trim() !== "";
    if (anyContact && contactName.trim() === "") next.siteContactName = "Required.";
    if (anyContact && contactPhone.trim() === "") next.siteContactPhone = "Required.";
    if (contactEmail.trim() !== "" && !EMAIL_PATTERN.test(contactEmail.trim())) {
      next.siteContactEmail = "That does not look like an email address.";
    }
    return next;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(undefined);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const selectedOptions = (selectedType?.prefilledFields ?? [])
      .map((question) => [question, (answers[question] ?? "").trim()] as const)
      .filter(([, answer]) => answer !== "")
      .map(([question, answer]) => `${question}: ${answer}`);

    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/jobs/phone`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          ...(businessName.trim() !== "" ? { businessName: businessName.trim() } : {}),
          location:
            location !== null
              ? {
                  suburb: location.suburb,
                  state: location.state,
                  country: location.country,
                  postcode: location.postcode,
                  lat: location.lat,
                  lng: location.lng,
                  placeId: location.placeId,
                }
              : { suburbId: platformSuburb?.suburbId },
          trade,
          selectedOptions,
          preferredDate,
          preferredWindow,
          description: description.trim(),
          ...(siteAddress !== null ? { siteAddress } : {}),
          ...(contactName.trim() !== "" || contactPhone.trim() !== "" || contactEmail.trim() !== ""
            ? {
                siteContact: {
                  name: contactName.trim(),
                  phone: contactPhone.trim(),
                  ...(contactEmail.trim() !== "" ? { email: contactEmail.trim() } : {}),
                },
              }
            : {}),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { reference?: string; error?: string; field?: FieldKey };
      if (res.status === 201 && body.reference) {
        router.push(`/ops/jobs/${encodeURIComponent(body.reference)}`);
        return;
      }
      if (res.status === 400 && body.field && body.error) {
        setErrors({ [body.field]: body.error });
      } else {
        setFormError("The job was not created. Please try again.");
      }
    } catch {
      setFormError("The job was not created. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
      className="rounded-card border border-hairline bg-surface p-4 md:p-5"
    >
      {formError ? <Banner kind="error">{formError}</Banner> : null}

      <PlacesField
        id="suburb"
        label="Suburb"
        required
        variant="suburb"
        value={location}
        onChange={(value) => {
          setLocation(value);
          if (value) clearError("location");
        }}
        error={errors.location}
        onErrorChange={(message) => setErrors((prev) => ({ ...prev, location: message }))}
        platformFallback={{
          onChange: (value) => {
            setPlatformSuburb(value);
            if (value) clearError("location");
          },
        }}
      />

      <SelectField
        id="trade"
        label="Trade"
        required
        value={trade}
        onChange={(event) => {
          setTrade(event.target.value);
          setAnswers({});
          clearError("trade");
        }}
        error={errors.trade}
        options={[{ value: "", label: "Choose a trade" }, ...serviceTypes.map((type) => ({ value: type.trade, label: type.trade }))]}
      />

      <div className="mb-3.5">
        <label
          htmlFor="description"
          className="mb-[5px] block text-field-label font-bold tracking-[0.08em] text-muted-text uppercase after:ml-0.5 after:text-brand-destructive after:content-['*']"
        >
          What&apos;s happening
        </label>
        <textarea
          id="description"
          className={`min-h-[110px] w-full rounded-button border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 ${
            errors.description ? "border-brand-destructive" : "border-hairline"
          }`}
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            if (event.target.value.trim() !== "") clearError("description");
          }}
        />
        {errors.description ? <p className="mt-[5px] text-xs text-brand-destructive">{errors.description}</p> : null}
      </div>

      <AdditionalQuestions
        questions={selectedType?.prefilledFields ?? []}
        answers={answers}
        onChange={(question, answer) => setAnswers((prev) => ({ ...prev, [question]: answer }))}
        hint="Ask the customer; leave any blank."
      />

      <div className="mt-6 border-t border-hairline pt-5">
        <Field
          id="preferredDate"
          label="Date"
          required
          type="date"
          min={todayYmd()}
          value={preferredDate}
          onChange={(event) => {
            setPreferredDate(event.target.value);
            clearError("preferredDate");
          }}
          error={errors.preferredDate}
        />
        <fieldset className="mb-3.5">
          <legend className="mb-[5px] block text-field-label font-bold tracking-[0.08em] text-muted-text uppercase after:ml-0.5 after:text-brand-destructive after:content-['*']">
            Time of day
          </legend>
          <div className="flex flex-col gap-2">
            {WINDOWS.map((w) => (
              <label
                key={w.value}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-small-box border bg-surface px-4 py-2.5 ${
                  preferredWindow === w.value ? "border-brand-accent ring-1 ring-brand-accent" : "border-hairline"
                }`}
              >
                <input
                  type="radio"
                  name="window"
                  className="h-[18px] w-[18px] accent-[var(--brand-accent)]"
                  checked={preferredWindow === w.value}
                  onChange={() => {
                    setPreferredWindow(w.value);
                    clearError("preferredWindow");
                  }}
                />
                <span>
                  <span className="block text-sm font-bold text-ink">{w.label}</span>
                  <span className="block text-xs text-muted-text">{w.note}</span>
                </span>
              </label>
            ))}
          </div>
          {errors.preferredWindow ? <p className="mt-[5px] text-xs text-brand-destructive">{errors.preferredWindow}</p> : null}
        </fieldset>
      </div>

      <div className="mt-6 border-t border-hairline pt-5">
        <Field
          id="name"
          label="Name"
          required
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            clearError("name");
          }}
          error={errors.name}
        />
        <Field
          id="email"
          label="Email"
          required
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            clearError("email");
          }}
          error={errors.email}
        />
        <Field
          id="phone"
          label="Phone"
          required
          placeholder="0412 345 678"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            clearError("phone");
          }}
          error={errors.phone}
        />
        <Field
          id="business-name"
          label="Business name"
          helper="Only if this job is for a business"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          autoComplete="organization"
        />
      </div>

      <div className="mt-6 border-t border-hairline pt-5">
        <PlacesField
          id="site-address"
          label="Street address of the job"
          helper="Ask while they are on the line. Leave blank if they do not know yet."
          value={siteAddress}
          onChange={(value) => {
            setSiteAddress(value);
            clearError("siteAddress");
          }}
          error={errors.siteAddress}
          onErrorChange={(message) => setErrors((prev) => ({ ...prev, siteAddress: message }))}
        />
        {siteAddress !== null && location !== null && (siteAddress.suburb !== location.suburb || siteAddress.postcode !== location.postcode) ? (
          <p className="mb-3.5 text-small text-secondary-text">
            This address is in {siteAddress.suburb} {siteAddress.postcode}, so the job will be saved there.
          </p>
        ) : null}
        <p className="mb-2 text-small text-secondary-text">Who lets us in, if it is not the customer:</p>
        <Field
          id="site-contact-name"
          label="Site contact name"
          value={contactName}
          onChange={(event) => {
            setContactName(event.target.value);
            clearError("siteContactName");
          }}
          error={errors.siteContactName}
          autoComplete="off"
        />
        <Field
          id="site-contact-phone"
          label="Site contact phone"
          value={contactPhone}
          onChange={(event) => {
            setContactPhone(event.target.value);
            clearError("siteContactPhone");
          }}
          error={errors.siteContactPhone}
          autoComplete="off"
        />
        <Field
          id="site-contact-email"
          label="Site contact email"
          type="email"
          helper="Optional"
          value={contactEmail}
          onChange={(event) => {
            setContactEmail(event.target.value);
            clearError("siteContactEmail");
          }}
          error={errors.siteContactEmail}
          autoComplete="off"
        />
      </div>

      {selectedType ? (
        <div className="mt-2 mb-5">
          <p className="mb-2 text-small text-secondary-text">What the customer pays - read it out:</p>
          <PriceBox
            weekend={weekend}
            calloutRate={Math.round(selectedType.customerCalloutRate * multiplier)}
            standardRate={Math.round(selectedType.customerStandardRate * multiplier)}
          />
        </div>
      ) : null}

      <PrimaryButton size="compact" loading={submitting} loadingLabel="Creating...">
        Create job
      </PrimaryButton>
    </form>
  );
}

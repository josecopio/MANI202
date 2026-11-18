"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, DoorClosed, ImagePlus, Lock, Repeat, Send, Trash2, Save, TriangleAlert } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { addDaysToKey } from "@/lib/dates";
import {
  DESCRIPTION_MAX,
  HOUSE_NONE,
  NOTE_MAX,
  validateEvent,
  type EventErrors,
  type EventField,
  type EventFormValues,
} from "@/lib/validation";
import type { CategoryView, VenueView } from "@/lib/queries";
import type { HouseView } from "@/lib/houses";
import type { EventStatus } from "@/lib/types";
import { saveEventAction, type SaveIntent } from "@/actions/events";
import { cn, fmt } from "@/lib/utils";
import { Field } from "./Field";

type Props = {
  mode: "organiser" | "admin";
  eventId?: string;
  initial: EventFormValues;
  categories: CategoryView[];
  houses: HouseView[];
  venues: VenueView[];
  status?: EventStatus;
  rejectionReason?: string | null;
  todayKey: string;
  userEmail?: string;
};

const FIELD_ORDER: EventField[] = [
  "title", "categoryId", "description", "date", "startTime", "endTime", "houseId", "venueId", "customLocation",
  "audience", "restrictionNote",
  "recurrenceEnd", "organiserName", "contactEmail", "registrationUrl", "imageUrl",
];

export function EventForm({ mode, eventId, initial, categories, houses, venues, status, rejectionReason, todayKey, userEmail }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [values, setValues] = useState<EventFormValues>(initial);
  const [frequency, setFrequency] = useState<"WEEKLY" | "MONTHLY">(initial.recurrence === "MONTHLY" ? "MONTHLY" : "WEEKLY");
  const [errors, setErrors] = useState<EventErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const repeats = values.recurrence !== "NONE";
  const otherVenueIds = venues.filter((v) => v.isOther).map((v) => v.id);
  const venueHouse = Object.fromEntries(venues.map((v) => [v.id, v.houseId]));
  // Spaces of the chosen house, plus the generic "Other" spaces that belong to no house.
  const spaces = venues.filter((v) => v.houseId === null || v.houseId === values.houseId);
  const noHouse = values.houseId === "" || values.houseId === HOUSE_NONE;
  const isOtherVenue = otherVenueIds.includes(values.venueId);
  const descLength = values.description.length;
  const publishedNotice = mode === "organiser" && status === "PUBLISHED";

  const set = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key as EventField]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const focusFirstError = (errs: EventErrors) => {
    const first = FIELD_ORDER.find((f) => errs[f]) ?? (Object.keys(errs)[0] as EventField | undefined);
    if (!first) return;
    requestAnimationFrame(() => {
      summaryRef.current?.scrollIntoView({ block: "nearest" });
      const el =
        document.getElementById(`field-${first}`) ??
        document.querySelector<HTMLElement>(`[name="${first}"]`);
      el?.focus();
    });
  };

  const submit = (intent: SaveIntent) => {
    setFormError(null);
    const lenient = intent === "draft" || (intent === "save" && status === "DRAFT");
    const local = validateEvent(values, {
      mode: lenient ? "draft" : "submit",
      allowPast: mode === "admin",
      otherVenueIds,
      venueHouse,
    });
    if (!local.ok) {
      setErrors(local.errors);
      focusFirstError(local.errors);
      return;
    }
    setErrors({});
    startTransition(async () => {
      const result = await saveEventAction({ id: eventId, intent, values });
      if (result.ok) {
        const notice = intent === "draft" ? "draft" : intent === "submit" ? "submitted" : "saved";
        router.push(mode === "admin" ? `/admin?tab=${intent === "publish" ? "events" : "review"}&notice=${notice}` : `/my-events?notice=${notice}`);
        return;
      }
      if (result.errors) {
        setErrors(result.errors);
        focusFirstError(result.errors);
      } else {
        setFormError(result.error === "forbidden" ? t.common.forbidden : t.common.genericError);
      }
    });
  };

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    submit((submitter?.value as SaveIntent) || "submit");
  };

  const upload = async (file: File) => {
    setUploading(true);
    setUploadError(false);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      if (!res.ok) throw new Error(String(res.status));
      const { url } = (await res.json()) as { url: string };
      set("imageUrl", url);
    } catch {
      setUploadError(true);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const errorCount = Object.values(errors).filter(Boolean).length;
  const maxRepeat = values.date ? addDaysToKey(values.date, 366) : undefined;

  return (
    <form onSubmit={onFormSubmit} noValidate className="space-y-6">
      <div ref={summaryRef} aria-live="assertive">
        {(errorCount > 0 || formError) && (
          <div role="alert" className="flex items-start gap-2 rounded-control bg-danger-soft p-4 text-danger">
            <AlertCircle size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
            <p className="font-semibold">{formError ?? t.submit.fixErrors}</p>
          </div>
        )}
      </div>

      {mode === "organiser" && status === "REJECTED" && (
        <div className="rounded-control bg-danger-soft p-4 text-danger">
          <p className="font-semibold">{t.submit.editRejectedNotice}</p>
          {rejectionReason && (
            <p className="mt-1">
              <span className="font-semibold">{t.myEvents.rejectionReason} : </span>
              {rejectionReason}
            </p>
          )}
        </div>
      )}
      {publishedNotice && <div className="rounded-control bg-warn-soft p-4 text-warn font-medium">{t.submit.editPublishedNotice}</div>}
      {mode === "admin" && <div className="rounded-control bg-accent-soft p-4 font-medium">{t.admin.editNotice}</div>}

      {/* 1. The event */}
      <section aria-labelledby="sec-event" className="card space-y-5 p-5 sm:p-6">
        <h2 id="sec-event" className="font-heading text-xl font-bold">{t.submit.sectionEvent}</h2>

        <Field name="title" label={t.submit.fieldTitle} error={errors.title} required>
          {(p) => (
            <input {...p} name="title" className="input" value={values.title} onChange={(e) => set("title", e.target.value)} autoComplete="off" />
          )}
        </Field>

        <fieldset aria-describedby={errors.categoryId ? "field-categoryId-error" : undefined}>
          <legend className="label">
            {t.submit.fieldCategory}
            <span aria-hidden="true" className="text-danger"> *</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {categories.map((c, i) => {
              const on = values.categoryId === c.id;
              return (
                <label
                  key={c.id}
                  className="pill has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
                  style={on ? { backgroundColor: c.bgColor, borderColor: c.color, color: c.color, fontWeight: 600 } : undefined}
                >
                  <input
                    type="radio"
                    name="categoryId"
                    id={i === 0 ? "field-categoryId" : undefined}
                    value={c.id}
                    checked={on}
                    onChange={() => set("categoryId", c.id)}
                    className="sr-only"
                  />
                  {on ? <Check size={16} aria-hidden="true" /> : <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />}
                  {c.name}
                </label>
              );
            })}
          </div>
          {errors.categoryId && <p id="field-categoryId-error" className="field-error">{t.errors[errors.categoryId]}</p>}
        </fieldset>

        <Field
          name="description"
          label={t.submit.fieldDescription}
          hint={t.submit.descriptionHint}
          error={errors.description ?? (descLength > DESCRIPTION_MAX ? "description_long" : undefined)}
          required={mode === "admin" || undefined}
        >
          {(p) => (
            <>
              <textarea
                {...p}
                name="description"
                rows={5}
                className="input"
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
              />
              <p className={cn("mt-1 text-right text-sm", descLength > DESCRIPTION_MAX ? "font-semibold text-danger" : "text-muted")}>
                {fmt(t.submit.charCount, { count: descLength, max: DESCRIPTION_MAX })}
              </p>
            </>
          )}
        </Field>
      </section>

      {/* 2. When and where */}
      <section aria-labelledby="sec-when" className="card space-y-5 p-5 sm:p-6">
        <h2 id="sec-when" className="font-heading text-xl font-bold">{t.submit.sectionWhen}</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field name="date" label={t.submit.fieldDate} error={errors.date} required>
            {(p) => (
              <input {...p} name="date" type="date" className="input" value={values.date} min={mode === "admin" ? undefined : todayKey} onChange={(e) => set("date", e.target.value)} />
            )}
          </Field>
          <Field name="startTime" label={t.submit.fieldStart} error={errors.startTime} required>
            {(p) => <input {...p} name="startTime" type="time" className="input" value={values.startTime} onChange={(e) => set("startTime", e.target.value)} />}
          </Field>
          <Field name="endTime" label={t.submit.fieldEnd} error={errors.endTime} required>
            {(p) => <input {...p} name="endTime" type="time" className="input" value={values.endTime} onChange={(e) => set("endTime", e.target.value)} />}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="houseId" label={t.submit.fieldHouse} error={errors.houseId} required>
            {(p) => (
              <select
                {...p}
                name="houseId"
                className="input"
                value={values.houseId}
                onChange={(e) => {
                  const houseId = e.target.value;
                  setValues((v) => {
                    // A space of another house no longer applies; "reserved for the house" needs a house.
                    const keep = venues.find((x) => x.id === v.venueId && (x.houseId === null || x.houseId === houseId));
                    return {
                      ...v,
                      houseId,
                      venueId: keep ? v.venueId : "",
                      audience: v.audience === "HOUSE_ONLY" && (houseId === "" || houseId === HOUSE_NONE) ? "RESIDENTS_ONLY" : v.audience,
                    };
                  });
                  setErrors((er) => ({ ...er, houseId: undefined }));
                }}
              >
                <option value="">{t.submit.housePlaceholder}</option>
                {houses.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
                <option value={HOUSE_NONE}>{t.submit.houseNone}</option>
              </select>
            )}
          </Field>
          <Field name="venueId" label={t.submit.fieldVenue} error={errors.venueId} required>
            {(p) => (
              <select {...p} name="venueId" className="input" value={values.venueId} onChange={(e) => set("venueId", e.target.value)} disabled={values.houseId === ""}>
                <option value="">{t.submit.venuePlaceholder}</option>
                {spaces.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <Field
          name="customLocation"
          label={isOtherVenue ? t.submit.customLocationRequired : t.submit.fieldCustomLocation}
          hint={isOtherVenue ? undefined : t.submit.customLocationHint}
          error={errors.customLocation}
          required={isOtherVenue}
        >
          {(p) => <input {...p} name="customLocation" className="input" value={values.customLocation} onChange={(e) => set("customLocation", e.target.value)} autoComplete="off" />}
        </Field>

        <div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
            <input
              type="checkbox"
              className="h-6 w-6 accent-accent"
              checked={repeats}
              onChange={(e) => {
                set("recurrence", e.target.checked ? frequency : "NONE");
                if (!e.target.checked) set("recurrenceEnd", "");
              }}
            />
            <Repeat size={18} aria-hidden="true" />
            {t.submit.fieldRepeats}
          </label>
          {repeats && (
            <div className="mt-3 grid gap-4 rounded-control bg-accent-soft p-4 sm:grid-cols-2">
              <fieldset>
                <legend className="label">{t.submit.fieldFrequency}</legend>
                <div className="flex flex-wrap gap-2">
                  {(["WEEKLY", "MONTHLY"] as const).map((f) => (
                    <label key={f} className="pill has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent" style={values.recurrence === f ? { backgroundColor: "#47D7AC", borderColor: "#47D7AC", color: "#1E2023" } : undefined}>
                      <input
                        type="radio"
                        name="frequency"
                        value={f}
                        checked={values.recurrence === f}
                        onChange={() => {
                          setFrequency(f);
                          set("recurrence", f);
                        }}
                        className="sr-only"
                      />
                      {f === "WEEKLY" ? t.submit.weekly : t.submit.monthly}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field name="recurrenceEnd" label={t.submit.fieldRepeatEnd} hint={t.submit.repeatEndHint} error={errors.recurrenceEnd} required>
                {(p) => (
                  <input {...p} name="recurrenceEnd" type="date" className="input" value={values.recurrenceEnd} min={values.date || undefined} max={maxRepeat} onChange={(e) => set("recurrenceEnd", e.target.value)} />
                )}
              </Field>
            </div>
          )}
        </div>
      </section>

      {/* 3. Access and restrictions */}
      <section aria-labelledby="sec-access" className="card space-y-5 p-5 sm:p-6">
        <div>
          <h2 id="sec-access" className="font-heading text-xl font-bold">{t.submit.sectionAccess}</h2>
          <p className="mt-1 text-muted">{t.submit.sectionAccessHint}</p>
        </div>

        <fieldset aria-describedby={errors.audience ? "field-audience-error" : undefined}>
          <legend className="label">{t.submit.fieldAudience}</legend>
          <div className="flex flex-wrap gap-2">
            {(["PUBLIC", "RESIDENTS_ONLY", "HOUSE_ONLY"] as const).map((a, i) => {
              const on = values.audience === a;
              const disabled = a === "HOUSE_ONLY" && noHouse;
              return (
                <label
                  key={a}
                  className={cn(
                    "pill has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                    disabled && "cursor-not-allowed opacity-50",
                  )}
                  style={on ? { backgroundColor: "#47D7AC", borderColor: "#47D7AC", color: "#1E2023" } : undefined}
                  title={disabled ? t.submit.audienceHouseDisabled : undefined}
                >
                  <input
                    type="radio"
                    name="audience"
                    id={i === 0 ? "field-audience" : undefined}
                    value={a}
                    checked={on}
                    disabled={disabled}
                    onChange={() => set("audience", a)}
                    className="sr-only"
                  />
                  {on ? <Check size={16} aria-hidden="true" /> : a === "HOUSE_ONLY" ? <Lock size={16} aria-hidden="true" /> : null}
                  {a === "PUBLIC" ? t.submit.audiencePublic : a === "RESIDENTS_ONLY" ? t.submit.audienceResidents : t.submit.audienceHouse}
                </label>
              );
            })}
          </div>
          {errors.audience && <p id="field-audience-error" className="field-error">{t.errors[errors.audience]}</p>}
        </fieldset>

        <fieldset>
          <legend className="label">{t.submit.fieldImpact}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(["NONE", "LIMITED", "CLOSED"] as const).map((im) => {
              const on = values.spaceImpact === im;
              const Icon = im === "CLOSED" ? DoorClosed : im === "LIMITED" ? TriangleAlert : Check;
              return (
                <label
                  key={im}
                  className={cn(
                    "flex min-h-14 cursor-pointer items-start gap-2 rounded-control border bg-surface p-3 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                    on ? "border-brand-strong bg-accent-soft font-semibold" : "border-field",
                  )}
                >
                  <input type="radio" name="spaceImpact" value={im} checked={on} onChange={() => set("spaceImpact", im)} className="sr-only" />
                  <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
                  {im === "NONE" ? t.submit.impactNone : im === "LIMITED" ? t.submit.impactLimited : t.submit.impactClosed}
                </label>
              );
            })}
          </div>
        </fieldset>

        <Field name="restrictionNote" label={t.submit.fieldNote} hint={t.submit.noteHint} error={errors.restrictionNote ?? (values.restrictionNote.length > NOTE_MAX ? "note_long" : undefined)} optional>
          {(p) => (
            <>
              <textarea {...p} name="restrictionNote" rows={2} className="input" value={values.restrictionNote} onChange={(e) => set("restrictionNote", e.target.value)} />
              <p className={cn("mt-1 text-right text-sm", values.restrictionNote.length > NOTE_MAX ? "font-semibold text-danger" : "text-muted")}>
                {fmt(t.submit.charCount, { count: values.restrictionNote.length, max: NOTE_MAX })}
              </p>
            </>
          )}
        </Field>
      </section>

      {/* 4. Organiser */}
      <section aria-labelledby="sec-audience" className="card space-y-5 p-5 sm:p-6">
        <h2 id="sec-audience" className="font-heading text-xl font-bold">{t.submit.sectionAudience}</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="organiserName" label={t.submit.fieldOrganiser} error={errors.organiserName} required>
            {(p) => <input {...p} name="organiserName" className="input" value={values.organiserName} onChange={(e) => set("organiserName", e.target.value)} autoComplete="organization" />}
          </Field>
          <Field name="contactEmail" label={t.submit.fieldContact} hint={t.submit.contactHint} error={errors.contactEmail} required>
            {(p) => <input {...p} name="contactEmail" type="email" inputMode="email" className="input" value={values.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} autoComplete="email" />}
          </Field>
        </div>

        <Field name="registrationUrl" label={t.submit.fieldRegistration} hint={t.submit.registrationHint} error={errors.registrationUrl} optional>
          {(p) => <input {...p} name="registrationUrl" type="url" inputMode="url" className="input" value={values.registrationUrl} onChange={(e) => set("registrationUrl", e.target.value)} placeholder="https://" />}
        </Field>

        <div>
          <span id="image-label" className="label">
            {t.submit.fieldImage} <span className="font-normal text-muted">({t.common.optional})</span>
          </span>
          <input
            ref={fileRef}
            id="field-imageUrl"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-labelledby="image-label"
            aria-describedby="image-hint"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          <div className="flex flex-wrap items-center gap-3">
            {values.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={values.imageUrl} alt="" className="h-20 w-32 rounded-control border border-line object-cover" />
            )}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <ImagePlus size={16} aria-hidden="true" />
              {uploading ? t.submit.imageUploading : values.imageUrl ? t.submit.imageReplace : t.submit.imageUpload}
            </button>
            {values.imageUrl && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => set("imageUrl", "")}>
                <Trash2 size={16} aria-hidden="true" />
                {t.submit.imageRemove}
              </button>
            )}
          </div>
          <p id="image-hint" className="hint mt-1.5">{t.submit.imageHint}</p>
          {(uploadError || errors.imageUrl) && <p role="alert" className="field-error">{t.submit.imageError}</p>}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        {mode === "organiser" ? (
          <>
            {!publishedNotice && (
              <button type="submit" value="draft" className="btn btn-secondary" disabled={pending}>
                <Save size={18} aria-hidden="true" />
                {t.submit.saveDraft}
              </button>
            )}
            <button type="submit" value="submit" className="btn btn-primary" disabled={pending}>
              <Send size={18} aria-hidden="true" />
              {pending ? t.submit.saving : publishedNotice ? t.submit.submitChanges : t.submit.submitForReview}
            </button>
          </>
        ) : (
          <>
            <button type="submit" value="save" className="btn btn-secondary" disabled={pending}>
              <Save size={18} aria-hidden="true" />
              {t.admin.saveChanges}
            </button>
            <button type="submit" value="publish" className="btn btn-primary" disabled={pending}>
              <Check size={18} aria-hidden="true" />
              {pending ? t.submit.saving : t.admin.saveAndPublish}
            </button>
          </>
        )}
        {userEmail && <p className="hint">{fmt(t.submit.signedInAs, { email: userEmail })}</p>}
      </div>
    </form>
  );
}

export function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    [t.submit.step1Title, t.submit.step1Body],
    [t.submit.step2Title, t.submit.step2Body],
    [t.submit.step3Title, t.submit.step3Body],
  ];
  return (
    <aside aria-labelledby="how-title" className="card p-5 sm:p-6 lg:sticky lg:top-6">
      <h2 id="how-title" className="font-heading text-xl font-bold">{t.submit.howTitle}</h2>
      <ol className="mt-4 space-y-4">
        {steps.map(([title, body], i) => (
          <li key={title} className="flex gap-3">
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand font-heading font-bold text-ink">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}


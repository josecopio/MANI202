"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import {
  deleteCategoryAction,
  deleteHouseAction,
  deleteVenueAction,
  saveCategoryAction,
  saveHouseAction,
  saveVenueAction,
  type AdminResult,
} from "@/actions/admin";
import { contrastRatio, isHexColor, MIN_TEXT_CONTRAST } from "@/lib/contrast";
import { fmt } from "@/lib/utils";

export type CategoryRowData = { id: string; nameFr: string; nameEn: string; color: string; bgColor: string; sortOrder: number; used: number };
export type VenueRowData = { id: string; houseId: string | null; nameFr: string; nameEn: string; isOther: boolean; sortOrder: number; used: number };
export type HouseRowData = { id: string; nameFr: string; nameEn: string; isResidence: boolean; sortOrder: number; used: number; spaces: number };
export type HouseOption = { id: string; name: string };

function Msg({ state }: { state: AdminResult | null }) {
  const { t } = useI18n();
  if (!state) return null;
  if (state.ok) return <p role="status" className="text-sm font-medium text-accent">{t.admin.saved}</p>;
  const first = state.fields ? Object.values(state.fields)[0] : undefined;
  return (
    <p role="alert" className="field-error">
      {first ? t.errors[first] : state.error === "in_use" ? t.admin.deleteBlocked : t.common.forbidden}
    </p>
  );
}

function ErrorFor({ state, name }: { state: AdminResult | null; name: string }) {
  const { t } = useI18n();
  const key = state?.fields?.[name];
  return key ? <p id={`err-${name}`} className="field-error">{t.errors[key]}</p> : null;
}

function DeleteButton({ used, label, onDelete }: { used: number; label: string; onDelete: () => Promise<AdminResult> }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [blocked, setBlocked] = useState(false);
  return (
    <div className="flex flex-col">
      <button
        type="button"
        className="btn btn-danger btn-sm"
        disabled={pending || used > 0}
        title={used > 0 ? fmt(t.admin.inUse, { count: used }) : undefined}
        onClick={() =>
          startTransition(async () => {
            const res = await onDelete();
            if (res.ok) router.refresh();
            else setBlocked(true);
          })
        }
      >
        <Trash2 size={16} aria-hidden="true" />
        {t.common.delete}
        <span className="sr-only">: {label}</span>
      </button>
      {used > 0 && <span className="hint mt-1">{fmt(t.admin.inUse, { count: used })}</span>}
      {blocked && <span role="alert" className="field-error">{t.admin.deleteBlocked}</span>}
    </div>
  );
}

// ---- Categories -------------------------------------------------------------------------

function CategoryForm({ row }: { row?: CategoryRowData }) {
  const { t } = useI18n();
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminResult | null, FormData>(async (prev, fd) => {
    const res = await saveCategoryAction(prev, fd);
    if (res.ok) router.refresh();
    return res;
  }, null);
  const [color, setColor] = useState(row?.color ?? "#1E4F8A");
  const [bg, setBg] = useState(row?.bgColor ?? "#E7EEF8");
  const ratio = isHexColor(color) && isHexColor(bg) ? contrastRatio(color, bg) : null;
  const key = row?.id ?? "new";

  return (
    <form action={action} key={state?.ok && !row ? Math.random() : key} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_90px]" noValidate>
      {row && <input type="hidden" name="id" value={row.id} />}
      <div>
        <label className="label" htmlFor={`cfr-${key}`}>{t.admin.categoryNameFr}</label>
        <input id={`cfr-${key}`} name="nameFr" className="input" defaultValue={row?.nameFr} required aria-invalid={state?.fields?.nameFr ? true : undefined} />
        <ErrorFor state={state} name="nameFr" />
      </div>
      <div>
        <label className="label" htmlFor={`cen-${key}`}>{t.admin.categoryNameEn}</label>
        <input id={`cen-${key}`} name="nameEn" className="input" defaultValue={row?.nameEn} required aria-invalid={state?.fields?.nameEn ? true : undefined} />
        <ErrorFor state={state} name="nameEn" />
      </div>
      <div>
        <label className="label" htmlFor={`cco-${key}`}>{t.admin.categoryColor}</label>
        <div className="flex items-center gap-2">
          <input id={`cco-${key}`} name="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 w-14 cursor-pointer rounded-control border border-field bg-surface p-1" />
          <code className="text-sm">{color}</code>
        </div>
        <ErrorFor state={state} name="color" />
      </div>
      <div>
        <label className="label" htmlFor={`cbg-${key}`}>{t.admin.categoryBg}</label>
        <div className="flex items-center gap-2">
          <input id={`cbg-${key}`} name="bgColor" type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-11 w-14 cursor-pointer rounded-control border border-field bg-surface p-1" />
          <code className="text-sm">{bg}</code>
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`cor-${key}`}>{t.admin.categoryOrder}</label>
        <input id={`cor-${key}`} name="sortOrder" type="number" min={0} max={999} className="input" defaultValue={row?.sortOrder ?? 0} />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-5">
        <span className="badge" style={{ color, backgroundColor: bg }}>{t.admin.categoryPreview}</span>
        {ratio !== null && (
          <span className={`text-sm font-medium ${ratio >= MIN_TEXT_CONTRAST ? "text-accent" : "text-danger"}`}>
            {fmt(t.admin.contrast, { ratio: ratio.toFixed(1) })}
          </span>
        )}
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          {row ? t.common.save : (<><Plus size={16} aria-hidden="true" />{t.admin.categoryAdd}</>)}
        </button>
        <Msg state={state} />
      </div>
    </form>
  );
}

export function CategoryManager({ rows }: { rows: CategoryRowData[] }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.id} className="card p-4 sm:p-5">
          <CategoryForm row={r} />
          <div className="mt-3 border-t border-line pt-3">
            <DeleteButton used={r.used} label={r.nameEn} onDelete={() => deleteCategoryAction(r.id)} />
          </div>
        </div>
      ))}
      <div className="card border-dashed p-4 sm:p-5">
        <h2 className="mb-3 font-heading text-lg font-bold">{t.admin.categoryAdd}</h2>
        <CategoryForm />
      </div>
    </div>
  );
}

// ---- Venues ------------------------------------------------------------------------------------

function VenueForm({ row, houses }: { row?: VenueRowData; houses: HouseOption[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminResult | null, FormData>(async (prev, fd) => {
    const res = await saveVenueAction(prev, fd);
    if (res.ok) router.refresh();
    return res;
  }, null);
  const key = row?.id ?? "new";

  return (
    <form action={action} key={state?.ok && !row ? Math.random() : key} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_90px]" noValidate>
      {row && <input type="hidden" name="id" value={row.id} />}
      <div>
        <label className="label" htmlFor={`vfr-${key}`}>{t.admin.venueNameFr}</label>
        <input id={`vfr-${key}`} name="nameFr" className="input" defaultValue={row?.nameFr} required aria-invalid={state?.fields?.nameFr ? true : undefined} />
        <ErrorFor state={state} name="nameFr" />
      </div>
      <div>
        <label className="label" htmlFor={`ven-${key}`}>{t.admin.venueNameEn}</label>
        <input id={`ven-${key}`} name="nameEn" className="input" defaultValue={row?.nameEn} required aria-invalid={state?.fields?.nameEn ? true : undefined} />
        <ErrorFor state={state} name="nameEn" />
      </div>
      <div>
        <label className="label" htmlFor={`vor-${key}`}>{t.admin.venueOrder}</label>
        <input id={`vor-${key}`} name="sortOrder" type="number" min={0} max={999} className="input" defaultValue={row?.sortOrder ?? 0} />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <label className="label" htmlFor={`vho-${key}`}>{t.admin.venueHouse}</label>
        <select id={`vho-${key}`} name="houseId" className="input" defaultValue={row?.houseId ?? ""}>
          <option value="">{t.admin.venueAnyHouse}</option>
          {houses.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 font-medium">
          <input type="checkbox" name="isOther" defaultChecked={row?.isOther} className="h-6 w-6 accent-accent" />
          {t.admin.venueOther}
        </label>
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          {row ? t.common.save : (<><Plus size={16} aria-hidden="true" />{t.admin.venueAdd}</>)}
        </button>
        <Msg state={state} />
      </div>
    </form>
  );
}

export function VenueManager({ rows, houses }: { rows: VenueRowData[]; houses: HouseOption[] }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.id} className="card p-4 sm:p-5">
          <VenueForm row={r} houses={houses} />
          <div className="mt-3 border-t border-line pt-3">
            <DeleteButton used={r.used} label={r.nameEn} onDelete={() => deleteVenueAction(r.id)} />
          </div>
        </div>
      ))}
      <div className="card border-dashed p-4 sm:p-5">
        <h2 className="mb-3 font-heading text-lg font-bold">{t.admin.venueAdd}</h2>
        <VenueForm houses={houses} />
      </div>
    </div>
  );
}

// ---- Houses ------------------------------------------------------------------------------------

function HouseForm({ row }: { row?: HouseRowData }) {
  const { t } = useI18n();
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminResult | null, FormData>(async (prev, fd) => {
    const res = await saveHouseAction(prev, fd);
    if (res.ok) router.refresh();
    return res;
  }, null);
  const key = row?.id ?? "new";

  return (
    <form action={action} key={state?.ok && !row ? Math.random() : key} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_90px]" noValidate>
      {row && <input type="hidden" name="id" value={row.id} />}
      <div>
        <label className="label" htmlFor={`hfr-${key}`}>{t.admin.houseNameFr}</label>
        <input id={`hfr-${key}`} name="nameFr" className="input" defaultValue={row?.nameFr} required aria-invalid={state?.fields?.nameFr ? true : undefined} />
        <ErrorFor state={state} name="nameFr" />
      </div>
      <div>
        <label className="label" htmlFor={`hen-${key}`}>{t.admin.houseNameEn}</label>
        <input id={`hen-${key}`} name="nameEn" className="input" defaultValue={row?.nameEn} required aria-invalid={state?.fields?.nameEn ? true : undefined} />
        <ErrorFor state={state} name="nameEn" />
      </div>
      <div>
        <label className="label" htmlFor={`hor-${key}`}>{t.admin.houseOrder}</label>
        <input id={`hor-${key}`} name="sortOrder" type="number" min={0} max={999} className="input" defaultValue={row?.sortOrder ?? 0} />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 font-medium">
          <input type="checkbox" name="isResidence" defaultChecked={row ? row.isResidence : true} className="h-6 w-6 accent-accent" />
          {t.admin.houseResidence}
        </label>
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          {row ? t.common.save : (<><Plus size={16} aria-hidden="true" />{t.admin.houseAdd}</>)}
        </button>
        {row && <span className="text-sm text-muted">{fmt(t.admin.houseSpaces, { count: row.spaces })}</span>}
        <Msg state={state} />
      </div>
    </form>
  );
}

export function HouseManager({ rows }: { rows: HouseRowData[] }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.id} className="card p-4 sm:p-5">
          <HouseForm row={r} />
          <div className="mt-3 border-t border-line pt-3">
            <DeleteButton used={r.used} label={r.nameEn} onDelete={() => deleteHouseAction(r.id)} />
          </div>
        </div>
      ))}
      <div className="card border-dashed p-4 sm:p-5">
        <h2 className="mb-3 font-heading text-lg font-bold">{t.admin.houseAdd}</h2>
        <HouseForm />
      </div>
    </div>
  );
}

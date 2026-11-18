import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { dayKeyOf, formatDayLong, formatTime } from "@/lib/dates";
import { placeLabel } from "@/lib/queries";
import { getLocale } from "@/lib/i18n/server";

export const alt = "Event";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

/** Share card used when an event has no uploaded image (only for published events). */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const event = await db.event.findFirst({
    where: { id, status: "PUBLISHED" },
    include: { venue: true, category: true },
  });

  const title = event?.title ?? "Cité internationale";
  const when = event ? `${formatDayLong(dayKeyOf(event.startAt), locale)} · ${formatTime(event.startAt, locale)}` : "";
  const where = event ? placeLabel(event.venue, event.customLocation, locale) : "";
  const category = event ? (locale === "fr" ? event.category.nameFr : event.category.nameEn) : "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#F7F7F3", padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", width: 72, height: 72, borderRadius: 16, background: "#1F5D4C", color: "#fff", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700 }}>CIUP</div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#16181D" }}>Cité internationale</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {category && (
            <div style={{ display: "flex", alignSelf: "flex-start", padding: "8px 22px", borderRadius: 999, fontSize: 28, fontWeight: 600, color: event!.category.color, background: event!.category.bgColor }}>{category}</div>
          )}
          <div style={{ display: "flex", fontSize: title.length > 60 ? 56 : 72, fontWeight: 700, lineHeight: 1.1, color: "#16181D" }}>{title}</div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 32, color: "#55574F", gap: 6 }}>
            <div style={{ display: "flex" }}>{when}</div>
            <div style={{ display: "flex" }}>{where}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

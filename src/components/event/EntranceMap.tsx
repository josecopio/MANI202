import { Check, X } from "lucide-react";
import type { Locale } from "@/lib/types";
import type { Messages } from "@/lib/i18n";
import { tr, type ResolvedPlan } from "@/lib/access-map-mock";

const OPEN = "#0a7d5e";
const CLOSED = "#c2261f";

/** Arrow pointing at a door from outside the building. */
function Arrow({ x, y, side }: { x: number; y: number; side: "top" | "bottom" | "left" | "right" }) {
  const rot = { top: 90, bottom: -90, left: 0, right: 180 }[side];
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M-40 0 H-12" stroke={OPEN} strokeWidth={5} strokeLinecap="round" />
      <path d="M-15 -9 L-3 0 L-15 9 Z" fill={OPEN} stroke={OPEN} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={-40} cy={0} r={4} fill={OPEN} className="map-pulse" />
    </g>
  );
}

function Cross({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={11} fill={CLOSED} stroke="#fff" strokeWidth={2.5} />
      <path d="M-4.5 -4.5 L4.5 4.5 M4.5 -4.5 L-4.5 4.5" stroke="#fff" strokeWidth={2.8} strokeLinecap="round" />
    </g>
  );
}

/** MOCK: simplified 2D plan of the house with open (arrow) and closed (cross) entrances. */
export function EntranceMap({ resolved, houseName, locale, t }: { resolved: ResolvedPlan; houseName: string; locale: Locale; t: Messages }) {
  const { plan, closedRooms, doors } = resolved;
  const open = doors.filter((d) => d.open);
  const closed = doors.filter((d) => !d.open);

  return (
    <section aria-labelledby="entrances" className="mt-6">
      <h3 id="entrances" className="text-lg font-semibold">{t.demo.mapTitle}</h3>
      <p className="mt-0.5 text-sm text-muted">{houseName}</p>
      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-[#eaf3e2]">
        <svg viewBox="0 0 360 300" role="img" aria-label={`${t.demo.mapTitle} – ${houseName}`} className="block w-full">
          <defs>
            <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="7" height="7" fill="#fbe3e1" />
              <line x1="0" y1="0" x2="0" y2="7" stroke="#f0b4ae" strokeWidth="3" />
            </pattern>
          </defs>
          <style>{`.map-pulse{animation:mp 1.6s ease-out infinite;transform-box:fill-box;transform-origin:center}@keyframes mp{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(3.2)}}`}</style>

          {/* trees */}
          {[[18, 50], [340, 60], [22, 240], [338, 236], [300, 40], [60, 236]].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={9} fill="#cfe3bf" />
          ))}

          {plan.streets.map((s) => (
            <g key={s.label.en}>
              <rect x={s.x} y={s.y} width={s.w} height={s.h} fill="#e4e1da" />
              <text x={s.x + s.w / 2} y={s.y + s.h / 2 + 4} textAnchor="middle" fontSize={11} fill="#7b7f88" fontWeight={500} letterSpacing={0.5}>
                {tr(s.label, locale)}
              </text>
            </g>
          ))}

          {plan.paved?.map((p, i) => {
            const off = resolved.closedPaved.has(i);
            return (
              <g key={i}>
                <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={off ? "url(#hatch)" : "#f1eee8"} stroke="#d9d4ca" />
                {p.label && (
                  <text x={p.x + p.w / 2} y={p.y + p.h - 10} textAnchor="middle" fontSize={10} fill="#7b7f88">{tr(p.label, locale)}</text>
                )}
              </g>
            );
          })}

          {/* building */}
          {plan.rooms.map((r) => {
            const off = closedRooms.has(r.id);
            return (
              <g key={r.id}>
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  fill={off ? "url(#hatch)" : r.outdoor ? "#d6eac6" : "#ffffff"}
                  stroke={r.outdoor ? "#a9c993" : "#3d424b"}
                  strokeWidth={r.outdoor ? 1.5 : 2}
                  strokeDasharray={r.outdoor ? "4 3" : undefined}
                />
                <text x={r.x + r.w / 2} y={r.y + (r.labelY ?? r.h / 2) + 4} textAnchor="middle" fontSize={Math.min(11, (r.w - 8) / (tr(r.label, locale).length * 0.56))} fontWeight={600} fill={off ? CLOSED : "#1e2023"}>
                  {tr(r.label, locale)}
                </text>
              </g>
            );
          })}

          {/* doors */}
          {doors.map((d) => (d.open ? <Arrow key={d.id} x={d.x} y={d.y} side={d.side} /> : <Cross key={d.id} x={d.x} y={d.y} />))}

          {/* compass */}
          <g transform="translate(338 284)">
            <path d="M0 -10 L5 4 L0 1 L-5 4 Z" fill="#3d424b" />
            <text y={-13} textAnchor="middle" fontSize={8} fontWeight={700} fill="#3d424b">N</text>
          </g>
        </svg>
      </div>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {[...open, ...closed].map((d) => (
          <li key={d.id} className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2">
            <span
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: d.open ? OPEN : CLOSED }}
              aria-hidden="true"
            >
              {d.open ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
            </span>
            <span className="font-medium">{tr(d.label, locale)}</span>
            <span className="ml-auto text-sm font-semibold" style={{ color: d.open ? OPEN : CLOSED }}>
              {d.open ? t.demo.doorOpen : t.demo.doorClosed}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

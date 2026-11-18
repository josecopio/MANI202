"use client";

import { CheckCircle2, Clock, FileEdit, XCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import type { EventStatus } from "@/lib/types";

const STYLES = {
  DRAFT: { cls: "bg-neutral-soft text-muted", Icon: FileEdit },
  PENDING: { cls: "bg-warn-soft text-warn", Icon: Clock },
  PUBLISHED: { cls: "bg-accent-soft text-accent", Icon: CheckCircle2 },
  REJECTED: { cls: "bg-danger-soft text-danger", Icon: XCircle },
} as const;

export function StatusBadge({ status }: { status: EventStatus }) {
  const { t } = useI18n();
  const { cls, Icon } = STYLES[status];
  return (
    <span className={`badge ${cls}`}>
      <Icon size={14} aria-hidden="true" />
      {t.status[status]}
    </span>
  );
}

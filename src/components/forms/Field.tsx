import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/client";
import type { ErrorKey } from "@/lib/validation";

export type FieldProps = { id: string; "aria-describedby"?: string; "aria-invalid"?: true };

/** Label + hint + error wiring shared by every form field (WCAG: programmatic labels and errors). */
export function Field({
  name,
  label,
  hint,
  error,
  optional,
  required,
  children,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  error?: ErrorKey;
  optional?: boolean;
  required?: boolean;
  className?: string;
  children: (props: FieldProps) => ReactNode;
}) {
  const { t } = useI18n();
  const id = `field-${name}`;
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ");
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span aria-hidden="true" className="text-danger"> *</span>}
        {optional && <span className="ml-1 font-normal text-muted">({t.common.optional})</span>}
      </label>
      {children({ id, "aria-describedby": describedBy || undefined, "aria-invalid": error ? true : undefined })}
      {hint && (
        <p id={`${id}-hint`} className="hint mt-1.5">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {t.errors[error]}
        </p>
      )}
    </div>
  );
}

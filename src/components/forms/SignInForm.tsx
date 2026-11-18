"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { signInAction, type SignInState } from "@/actions/session";

export function SignInForm({ callbackUrl }: { callbackUrl: string }) {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signInAction, {});
  const error =
    state.error === "email_invalid" ? t.signin.emailInvalid : state.error === "failed" ? t.common.genericError : null;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div>
        <label htmlFor="signin-email" className="label">
          {t.signin.emailLabel}
        </label>
        <input
          id="signin-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          className="input"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "signin-email-error" : undefined}
        />
        {error && (
          <p id="signin-email-error" role="alert" className="field-error">
            {error}
          </p>
        )}
      </div>
      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending}>
        <Mail size={18} aria-hidden="true" />
        {pending ? t.signin.sending : t.signin.button}
      </button>
    </form>
  );
}

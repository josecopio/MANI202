import { getI18n } from "@/lib/i18n/server";
import { Logo } from "./Logo";

export async function SiteFooter() {
  const { t } = await getI18n();
  return (
    <footer className="mt-10 bg-footer text-white">
      <div className="page flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <Logo label={t.header.markLabel} variant="white" className="h-10 w-auto" />
        <p className="max-w-xl text-sm text-white/80">{t.emails.footer}</p>
      </div>
    </footer>
  );
}

import { getI18n } from "@/lib/i18n/server";

export async function SiteFooter() {
  const { t } = await getI18n();
  return (
    <footer className="border-t border-line mt-8">
      <div className="page py-6 text-sm text-muted">{t.emails.footer}</div>
    </footer>
  );
}

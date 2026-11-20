import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <h1 className="text-3xl font-bold">{t.common.notFoundTitle}</h1>
      <p className="mt-2 text-muted">{t.common.notFoundBody}</p>
      <Link href="/calendar" className="btn btn-primary mt-6">{t.common.backToCalendar}</Link>
    </div>
  );
}

import { PrefsForm } from "@/components/prefs/PrefsForm";
import { SubscribeBox } from "@/components/calendar/SubscribeBox";
import { getI18n } from "@/lib/i18n/server";
import { getHouses } from "@/lib/houses";
import { getPrefs } from "@/lib/prefs";
import { followedHouses } from "@/lib/prefs-shared";
import { getCategories } from "@/lib/queries";
import { feedQueryFor } from "@/lib/calendar-page";
import { getBaseUrl } from "@/lib/site";

export default async function SubscriptionsPage() {
  const { locale, t } = await getI18n();
  const [houses, categories, prefs] = await Promise.all([getHouses(locale), getCategories(locale), getPrefs()]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">{t.prefs.settingsTitle}</h1>
        <p className="mt-2 max-w-2xl text-lg text-muted">{t.prefs.settingsIntro}</p>
        <div className="mt-8">
          <PrefsForm houses={houses} categories={categories} initial={prefs} mode="settings" />
        </div>
      </div>
      <div>
        <SubscribeBox
          initialBaseUrl={getBaseUrl()}
          feedQuery={feedQueryFor({
            houses: followedHouses(prefs),
            home: prefs.home,
            interests: prefs.interests,
            general: prefs.general,
            locale,
          })}
          title={t.subscribe.mineTitle}
          help={t.subscribe.mineHelp}
          withEmail
        />
      </div>
    </div>
  );
}

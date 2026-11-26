import { cookies } from "next/headers";
import { VIDEO_DEMO_COOKIE_NAME } from "@/components/demo/cookie";

/**
 * Video demo mode (product presentation). Turned on by opening /demo, which sets this cookie,
 * or by the recording script. It shows mocked features that are not built yet: the entrance
 * map on event pages and the calendar-subscription confirmation. It also hides "sample" notices.
 * Open /demo?off=1 to turn it off.
 */
export const VIDEO_DEMO_COOKIE = VIDEO_DEMO_COOKIE_NAME;

export async function isVideoDemo(): Promise<boolean> {
  return (await cookies()).get(VIDEO_DEMO_COOKIE)?.value === "1";
}

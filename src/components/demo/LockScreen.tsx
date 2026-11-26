"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flashlight, Camera, Lock } from "lucide-react";
import { VIDEO_DEMO_COOKIE_NAME } from "./cookie";

/** MOCK: iPhone-style lock screen showing the 7am notification (demo video only). */
export function LockScreen(props: { off: boolean; href: string; date: string; title: string; body: string; appName: string; now: string }) {
  const router = useRouter();
  const [shown, setShown] = useState(false);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    document.cookie = props.off
      ? `${VIDEO_DEMO_COOKIE_NAME}=; path=/; max-age=0`
      : `${VIDEO_DEMO_COOKIE_NAME}=1; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    if (props.off) return;
    router.prefetch(props.href);
    // ?manual=1 (video recording): the notification waits until the recorder calls showNotification().
    if (new URLSearchParams(window.location.search).has("manual")) {
      (window as unknown as { showNotification: () => void }).showNotification = () => setShown(true);
      return;
    }
    const id = setTimeout(() => setShown(true), 1200);
    return () => clearTimeout(id);
  }, [props.off, props.href, router]);

  if (props.off) {
    return <p className="p-8 text-lg">Video demo mode is off.</p>;
  }

  const open = () => {
    setPressed(true);
    setTimeout(() => router.push(props.href), 260);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex select-none flex-col items-center overflow-hidden text-white"
      style={{
        background:
          "radial-gradient(120% 70% at 20% 10%, #5fe0b9 0%, transparent 55%), radial-gradient(90% 60% at 90% 40%, #6b5bd6 0%, transparent 60%), radial-gradient(100% 80% at 30% 100%, #13315c 0%, transparent 70%), #1b2a4a",
      }}
    >
      <Lock size={18} className="mt-[58px] opacity-90" aria-hidden="true" />
      <p className="mt-2 text-[19px] font-medium capitalize opacity-95">{props.date}</p>
      <p className="-mt-1 text-[96px] font-semibold leading-none tracking-tight" style={{ fontFeatureSettings: '"tnum"' }}>
        7:00
      </p>

      <div className="mt-auto w-full px-3 pb-6">
        <button
          type="button"
          id="demo-notification"
          onClick={open}
          className="w-full rounded-[22px] p-3 text-left text-[#1e2023] shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all duration-500"
          style={{
            background: "rgba(245,245,248,0.82)",
            backdropFilter: "blur(24px) saturate(1.6)",
            WebkitBackdropFilter: "blur(24px) saturate(1.6)",
            transform: shown ? (pressed ? "scale(0.96)" : "translateY(0)") : "translateY(-30px)",
            opacity: shown ? 1 : 0,
            transitionTimingFunction: "cubic-bezier(.2,.9,.25,1.2)",
          }}
        >
          <span className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/apple-icon.png" alt="" className="mt-0.5 size-[38px] shrink-0 rounded-[9px]" />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-[15px] font-semibold">{props.title}</span>
                <span className="text-[13px] text-[#6b6f78]">{props.now}</span>
              </span>
              <span className="mt-0.5 block text-[15px] leading-[1.3]">{props.body}</span>
            </span>
          </span>
        </button>
      </div>

      <div className="flex w-full items-center justify-between px-12 pb-10">
        {[Flashlight, Camera].map((Icon, i) => (
          <span key={i} className="inline-flex size-[50px] items-center justify-center rounded-full bg-black/25 backdrop-blur" aria-hidden="true">
            <Icon size={22} />
          </span>
        ))}
      </div>
      <span className="mb-2 h-[5px] w-[134px] rounded-full bg-white/90" aria-hidden="true" />
    </div>
  );
}

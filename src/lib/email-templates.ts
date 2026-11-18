import { formatDayLong, formatDayShort, formatTime, dayKeyOf } from "./dates";
import { getMessagesFor } from "./i18n";
import { eventUrl, getBaseUrl } from "./site";
import { fmt } from "./utils";
import type { Mail } from "./email";
import type { Locale } from "./types";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Block = {
  heading?: string;
  paragraphs?: string[];
  quote?: string;
  button?: { label: string; url: string };
  list?: { title: string; meta: string; url: string }[];
};

function layout(blocks: Block[], footer: string, extraFooter?: { label: string; url: string }) {
  const html = blocks
    .map((b, i) => {
      const parts: string[] = [];
      if (b.heading) parts.push(`<h1 style="font:600 20px/1.3 Arial,sans-serif;margin:0 0 12px;color:#1E2023">${esc(b.heading)}</h1>`);
      for (const p of b.paragraphs ?? []) parts.push(`<p style="font:16px/1.5 Arial,sans-serif;margin:0 0 12px;color:#1E2023">${esc(p)}</p>`);
      if (b.quote) parts.push(`<blockquote style="margin:0 0 16px;padding:12px 16px;background:#E6F8F2;border-left:4px solid #47D7AC;font:16px/1.5 Arial,sans-serif;color:#1E2023">${esc(b.quote)}</blockquote>`);
      if (b.list?.length) {
        parts.push(
          `<ul style="padding:0;margin:0 0 16px;list-style:none">${b.list
            .map(
              (it) =>
                `<li style="padding:10px 0;border-top:1px solid #E2E2DA"><a href="${esc(it.url)}" style="font:600 16px/1.4 Arial,sans-serif;color:#0A7D5E;text-decoration:underline">${esc(it.title)}</a><br><span style="font:14px/1.5 Arial,sans-serif;color:#55574F">${esc(it.meta)}</span></li>`,
            )
            .join("")}</ul>`,
        );
      }
      if (b.button) parts.push(`<p style="margin:16px 0"><a href="${esc(b.button.url)}" style="display:inline-block;background:#47D7AC;color:#1E2023;text-decoration:none;font:600 16px Arial,sans-serif;padding:12px 24px;border-radius:999px">${esc(b.button.label)}</a></p><p style="font:13px/1.5 Arial,sans-serif;color:#55574F;margin:0 0 12px;word-break:break-all">${esc(b.button.url)}</p>`);
      return (i > 0 ? `<hr style="border:0;border-top:1px solid #E2E2DA;margin:24px 0">` : "") + parts.join("");
    })
    .join("");
  const unsub = extraFooter
    ? `<br><a href="${esc(extraFooter.url)}" style="color:#55574F">${esc(extraFooter.label)}</a>`
    : "";
  const fullHtml = `<!doctype html><html><body style="margin:0;padding:24px;background:#F7F7F3"><div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E2E2DA;border-radius:16px;padding:24px">${html}</div><p style="max-width:560px;margin:16px auto 0;font:12px/1.5 Arial,sans-serif;color:#55574F;text-align:center">${esc(footer)}${unsub}</p></body></html>`;

  const text =
    blocks
      .map((b) =>
        [
          b.heading,
          ...(b.paragraphs ?? []),
          b.quote ? `> ${b.quote}` : "",
          ...(b.list ?? []).map((it) => `- ${it.title} (${it.meta})\n  ${it.url}`),
          b.button ? `${b.button.label}: ${b.button.url}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      )
      .join("\n\n----------\n\n") + `\n\n${footer}${extraFooter ? `\n${extraFooter.label}: ${extraFooter.url}` : ""}`;
  return { html: fullHtml, text };
}

const both: Locale[] = ["fr", "en"]; // system emails are bilingual: the organiser's language is unknown

export function magicLinkEmail(to: string, url: string): Mail {
  const [fr, en] = both.map((l) => getMessagesFor(l).emails);
  const { html, text } = layout(
    [
      { heading: fr.magicSubject, paragraphs: [fr.magicIntro, fr.magicIgnore], button: { label: fr.magicButton, url } },
      { heading: en.magicSubject, paragraphs: [en.magicIntro, en.magicIgnore], button: { label: en.magicButton, url } },
    ],
    getMessagesFor("fr").emails.footer,
  );
  return { to, subject: `${fr.magicSubject} / ${en.magicSubject}`, text, html };
}

export function approvedEmail(to: string, event: { id: string; title: string }): Mail {
  const url = eventUrl(event.id);
  const blocks = both.map((l) => {
    const m = getMessagesFor(l).emails;
    return { heading: fmt(m.approvedSubject, { title: event.title }), paragraphs: [fmt(m.approvedBody, { title: event.title })], button: { label: m.approvedButton, url } };
  });
  const { html, text } = layout(blocks, getMessagesFor("fr").emails.footer);
  const [fr, en] = both.map((l) => fmt(getMessagesFor(l).emails.approvedSubject, { title: event.title }));
  return { to, subject: `${fr} / ${en}`, text, html };
}

export function rejectedEmail(to: string, event: { id: string; title: string }, reason: string): Mail {
  const url = `${getBaseUrl()}/my-events/${event.id}/edit`;
  const blocks = both.map((l) => {
    const m = getMessagesFor(l).emails;
    return {
      heading: fmt(m.rejectedSubject, { title: event.title }),
      paragraphs: [fmt(m.rejectedBody, { title: event.title })],
      quote: reason,
      button: { label: m.rejectedButton, url },
    } satisfies Block;
  });
  const withHelp = blocks.map((b, i) => ({ ...b, paragraphs: [...b.paragraphs, getMessagesFor(both[i]).emails.rejectedHelp] }));
  const { html, text } = layout(withHelp, getMessagesFor("fr").emails.footer);
  const [fr, en] = both.map((l) => fmt(getMessagesFor(l).emails.rejectedSubject, { title: event.title }));
  return { to, subject: `${fr} / ${en}`, text, html };
}

export function subscribeConfirmationEmail(to: string, token: string, locale: Locale): Mail {
  const m = getMessagesFor(locale).emails;
  const url = `${getBaseUrl()}/newsletter/confirm?token=${encodeURIComponent(token)}`;
  const { html, text } = layout(
    [{ heading: m.confirmSubject, paragraphs: [m.confirmBody], button: { label: m.confirmButton, url } }],
    m.footer,
  );
  return { to, subject: m.confirmSubject, text, html };
}

export type DigestEvent = {
  eventId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  place: string;
  houseSlug: string | null;
  categorySlug: string;
  audience: string;
};

export function weeklyDigestEmail(
  to: string,
  token: string,
  locale: Locale,
  range: { fromKey: string; toKey: string },
  events: DigestEvent[],
): Mail {
  const m = getMessagesFor(locale).emails;
  const unsubscribeUrl = `${getBaseUrl()}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
  const list = events.map((e) => ({
    title: e.title,
    meta: `${formatDayLong(dayKeyOf(e.startAt), locale)}, ${formatTime(e.startAt, locale)}–${formatTime(e.endAt, locale)} · ${e.place}`,
    url: eventUrl(e.eventId),
  }));
  const { html, text } = layout(
    [
      {
        heading: fmt(m.digestSubject, { count: events.length }),
        paragraphs: [
          fmt(m.digestIntro, { from: formatDayShort(range.fromKey, locale), to: formatDayShort(range.toKey, locale) }),
          ...(events.length === 0 ? [m.digestEmpty] : []),
        ],
        list,
        button: { label: m.digestOpen, url: getBaseUrl() },
      },
    ],
    m.footer,
    { label: m.unsubscribe, url: unsubscribeUrl },
  );
  return { to, subject: fmt(m.digestSubject, { count: events.length }), text, html };
}

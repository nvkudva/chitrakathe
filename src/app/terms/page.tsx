import { MERCHANT } from "@/lib/legal";
import { isLanguage } from "@/lib/i18n/ui";
import { config } from "@/lib/config";
import { rupees } from "@/lib/money";

export default async function Terms({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const price = rupees(config().PRICE_LAUNCH_PAISE);
  const rerender = rupees(config().PRICE_RERENDER_PAISE);
  const { lang: raw } = await searchParams;
  const lang = isLanguage(raw) ? raw : "en";
  return (
    <article lang={lang} className="panel panel-rel tier-2 max-w-2xl space-y-5 p-6 rise">
      <h1 className="t-title-1 ink-1">Terms of service</h1>
      <p className="t-body ink-2">
        These terms cover {MERCHANT.tradingName}, operated by {MERCHANT.legalName}, {MERCHANT.address}.
      </p>
      <ul className="space-y-3 t-body ink-2">
        <li>
          <strong className="ink-1">What you get.</strong> One rendered video per event, from the template you
          chose and the details and photos you supplied. A watermarked preview is free. {price} removes the
          watermark and gives you the file to download for 90 days.
        </li>
        <li>
          <strong className="ink-1">Re-renders.</strong> One free re-render per event after you change the
          details. Further re-renders are {rerender} each.
        </li>
        <li>
          <strong className="ink-1">Your photos stay yours.</strong> You give us permission to use them only to
          make your video. We do not sell them, share them, or train anything on them.
        </li>
        <li>
          <strong className="ink-1">What you must not upload.</strong> Photos you do not have the right to use,
          or anything sexual, violent or of a minor in distress. Every upload is checked and rejected uploads do
          not render.
        </li>
        <li>
          <strong className="ink-1">No likeness generation.</strong> The AI-generated shots are objects and
          places. We do not and will not generate a face resembling anyone in your photos.
        </li>
        <li>
          <strong className="ink-1">If a render fails.</strong> You are not charged. If you already paid and we
          cannot deliver, you are refunded in full — see the refund policy.
        </li>
        <li>
          <strong className="ink-1">What we do not promise.</strong> That the video will suit every taste. The
          preview exists so you can decide before paying, so please watch it.
        </li>
        <li>
          <strong className="ink-1">Governing law.</strong> Karnataka, India.
        </li>
      </ul>
      <p className="t-footnote ink-4">
        Questions: {MERCHANT.email} · {MERCHANT.phone}
      </p>
    </article>
  );
}

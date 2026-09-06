import { MERCHANT } from "@/lib/legal";
import { config } from "@/lib/config";
import { rupees } from "@/lib/money";

export default function Refunds() {
  const price = rupees(config().PRICE_LAUNCH_PAISE);
  return (
    <article className="glass glass-rel tier-2 max-w-2xl space-y-5 p-6 rise">
      <h1 className="t-title-1 ink-1">Refunds and cancellations</h1>
      <p className="t-body ink-2">
        You watch the whole video, watermarked, before you pay anything. That is deliberate — it means you should
        never be paying {price} for something you have not already seen.
      </p>
      <ul className="space-y-3 t-body ink-2">
        <li>
          <strong className="ink-1">Before you pay.</strong> Nothing to cancel. Close the page and you are not
          charged.
        </li>
        <li>
          <strong className="ink-1">We could not deliver.</strong> If you paid and the file will not download, or
          the video is broken, we refund in full. Tell us within 7 days.
        </li>
        <li>
          <strong className="ink-1">We got your details wrong.</strong> If the video does not match the details you
          entered — a misspelt name, the wrong date — we re-render it free. If you would rather have the money
          back, we refund in full.
        </li>
        <li>
          <strong className="ink-1">You changed your mind.</strong> Because you saw the finished video before
          paying, we do not refund a delivered file you simply did not end up using.
        </li>
        <li>
          <strong className="ink-1">How long.</strong> Approved refunds go back to the original UPI account or
          card within 5–7 working days.
        </li>
      </ul>
      <p className="t-footnote ink-4">
        To ask for a refund, message {MERCHANT.phone} or write to {MERCHANT.email} with the link to your trailer.
      </p>
    </article>
  );
}

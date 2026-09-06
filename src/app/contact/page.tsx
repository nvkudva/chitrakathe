import { MERCHANT } from "@/lib/legal";

export default function Contact() {
  return (
    <article className="glass tier-2 max-w-2xl space-y-4 p-6 rise">
      <h1 className="t-title-1 ink-1">Contact</h1>
      <p className="t-body ink-2">
        A real person answers. If a function is close and something has gone wrong, phone rather than email.
      </p>
      <dl className="space-y-3 t-body ink-2">
        <div>
          <dt className="t-caption ink-4">Business</dt>
          <dd className="ink-1">{MERCHANT.legalName}</dd>
        </div>
        <div>
          <dt className="t-caption ink-4">Address</dt>
          <dd>{MERCHANT.address}</dd>
        </div>
        <div>
          <dt className="t-caption ink-4">Phone / WhatsApp</dt>
          <dd className="ink-1">{MERCHANT.phone}</dd>
        </div>
        <div>
          <dt className="t-caption ink-4">Email</dt>
          <dd className="ink-1">{MERCHANT.email}</dd>
        </div>
      </dl>
    </article>
  );
}

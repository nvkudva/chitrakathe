export default function Privacy() {
  return (
    <article className="glass glass-rel tier-2 max-w-2xl space-y-5 p-6 rise">
      <h1 className="t-title-1 ink-1">What we do with your photos</h1>
      <p className="t-body ink-2">
        Short version: we use them to make your trailer, we delete them after 30 days, and we never generate a face.
      </p>
      <ul className="space-y-3 t-body ink-2">
        <li>
          <strong>Retention.</strong> Uploaded photos are hard-deleted 30 days after upload. Rendered videos are
          kept 90 days so you can re-download, then deleted.
        </li>
        <li>
          <strong>Location data.</strong> EXIF metadata, including GPS coordinates, is stripped the moment a photo
          reaches us. It is never stored.
        </li>
        <li>
          <strong>No likeness generation.</strong> The AI-generated shots in a trailer are objects and
          environments — a lamp, a cradle, the sea. We do not face-swap, clone or generate a likeness of anyone in
          your photos, and the software will not let us.
        </li>
        <li>
          <strong>Moderation.</strong> Every uploaded photo is checked before rendering. We store the result of
          that check, not a copy of the photo.
        </li>
        <li>
          <strong>Deletion on request.</strong> Ask and we delete everything tied to your event immediately.
        </li>
        <li>
          <strong>We do not sell or share your photos</strong> and we do not use them to train anything.
        </li>
      </ul>
    </article>
  );
}

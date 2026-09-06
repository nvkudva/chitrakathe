"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#120508", color: "#FBF3E4", fontFamily: "system-ui, sans-serif", padding: "3rem" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>Something broke on our side</h1>
        <p style={{ opacity: 0.7, marginBottom: "1.5rem" }}>
          Your render is safe and you have not been charged.
        </p>
        <button
          onClick={reset}
          style={{ background: "#D4A017", color: "#000", border: 0, borderRadius: 8, padding: "0.7rem 1.4rem" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}

import { isLanguage } from "@/lib/i18n/ui";
import LegalSummary from "@/components/LegalSummary";
const SUMMARY = {
  en: [],
  kn: [
    "ನಿಮ್ಮ ಫೋಟೋಗಳನ್ನು ನಿಮ್ಮ ವಿಡಿಯೋ ಮಾಡಲು ಮಾತ್ರ ಬಳಸುತ್ತೇವೆ.",
    "ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ 30 ದಿನಗಳ ನಂತರ ಫೋಟೋಗಳನ್ನು ಶಾಶ್ವತವಾಗಿ ಅಳಿಸುತ್ತೇವೆ. ವಿಡಿಯೋಗಳನ್ನು 90 ದಿನ ಇಡುತ್ತೇವೆ.",
    "ಫೋಟೋದಲ್ಲಿನ ಸ್ಥಳದ ಮಾಹಿತಿಯನ್ನು (GPS) ಬಂದ ತಕ್ಷಣ ತೆಗೆದುಹಾಕುತ್ತೇವೆ.",
    "ನಾವು ಎಂದಿಗೂ ಮುಖವನ್ನು ಸೃಷ್ಟಿಸುವುದಿಲ್ಲ. AI ದೃಶ್ಯಗಳು ದೀಪ, ತೊಟ್ಟಿಲು, ಸಮುದ್ರ ಮಾತ್ರ.",
    "ನಿಮ್ಮ ಫೋಟೋಗಳನ್ನು ಮಾರುವುದಿಲ್ಲ, ಹಂಚುವುದಿಲ್ಲ, ಯಾವುದನ್ನೂ ತರಬೇತಿ ಮಾಡುವುದಿಲ್ಲ.",
    "ಕೇಳಿದರೆ ಎಲ್ಲವನ್ನೂ ತಕ್ಷಣ ಅಳಿಸುತ್ತೇವೆ.",
  ],
  hi: [
    "आपकी तस्वीरें सिर्फ़ आपका वीडियो बनाने के लिए इस्तेमाल होती हैं।",
    "अपलोड के 30 दिन बाद तस्वीरें हमेशा के लिए मिटा दी जाती हैं। वीडियो 90 दिन रखे जाते हैं।",
    "तस्वीर में छिपी जगह की जानकारी (GPS) आते ही हटा दी जाती है।",
    "हम कभी चेहरा नहीं बनाते। AI दृश्य सिर्फ़ दीपक, पालना, समुद्र होते हैं।",
    "हम आपकी तस्वीरें न बेचते हैं, न साझा करते हैं, न किसी चीज़ को सिखाते हैं।",
    "कहिए तो सब कुछ तुरंत मिटा देंगे।",
  ],
  kok: [
    "तुमचीं फोटयां फकत तुमचो व्हिडिओ करपाक वापरतात.",
    "अपलोड केल्ल्या 30 दिसां उपरांत फोटयां सदांखातीर काडून उडयतात. व्हिडिओ 90 दीस दवरतात.",
    "फोटयांत आशिल्ली सुवातेची म्हायती (GPS) आयल्या बरोबर काडून उडयतात.",
    "आमी केन्नाच तोंड तयार करिनात. AI दृश्यां फकत दिवो, पाळणो, दर्या.",
    "आमी तुमचीं फोटयां विकिनात, वांटिनात, कसलेंच शिकयनात.",
    "सांगल्यार सगळें ताबडतोब काडून उडयतात.",
  ],
};

export default async function Privacy({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang: raw } = await searchParams;
  const lang = isLanguage(raw) ? raw : "en";
  return (
    <article lang={lang} className="panel panel-rel tier-2 max-w-2xl space-y-5 p-6 rise">
      <h1 className="t-title-1 ink-1">What we do with your photos</h1>
      <LegalSummary lang={lang} points={SUMMARY} />
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

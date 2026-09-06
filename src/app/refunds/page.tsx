import { MERCHANT } from "@/lib/legal";
import { isLanguage } from "@/lib/i18n/ui";
import LegalSummary from "@/components/LegalSummary";
import { config } from "@/lib/config";
import { rupees } from "@/lib/money";

const SUMMARY = {
  en: [],
  kn: [
    "ಪಾವತಿಸುವ ಮೊದಲು ಪೂರ್ತಿ ವಿಡಿಯೋವನ್ನು ವಾಟರ್‌ಮಾರ್ಕ್‌ನೊಂದಿಗೆ ನೋಡುತ್ತೀರಿ. ನೋಡದೆ ಹಣ ಕೊಡಬೇಕಿಲ್ಲ.",
    "ಪಾವತಿಸುವ ಮೊದಲು ರದ್ದು ಮಾಡಲು ಏನೂ ಇಲ್ಲ — ಪುಟ ಮುಚ್ಚಿದರೆ ಸಾಕು.",
    "ಪಾವತಿಸಿದ ನಂತರ ಫೈಲ್ ಡೌನ್‌ಲೋಡ್ ಆಗದಿದ್ದರೆ ಪೂರ್ತಿ ಹಣ ಹಿಂತಿರುಗಿಸುತ್ತೇವೆ. 7 ದಿನಗಳೊಳಗೆ ತಿಳಿಸಿ.",
    "ನೀವು ಕೊಟ್ಟ ವಿವರ ತಪ್ಪಾಗಿ ಬಂದರೆ ಉಚಿತವಾಗಿ ಮತ್ತೆ ಮಾಡಿಕೊಡುತ್ತೇವೆ, ಅಥವಾ ಪೂರ್ತಿ ಹಣ ಹಿಂತಿರುಗಿಸುತ್ತೇವೆ.",
    "ಅನುಮೋದಿತ ಮರುಪಾವತಿ 5–7 ಕೆಲಸದ ದಿನಗಳಲ್ಲಿ ಬರುತ್ತದೆ.",
  ],
  hi: [
    "भुगतान से पहले आप पूरा वीडियो वॉटरमार्क के साथ देख लेते हैं। बिना देखे पैसे नहीं देने पड़ते।",
    "भुगतान से पहले रद्द करने को कुछ नहीं है — पेज बंद कर दीजिए।",
    "भुगतान के बाद फ़ाइल डाउनलोड न हो तो पूरा पैसा वापस। 7 दिन के भीतर बताइए।",
    "आपके दिए विवरण ग़लत आए तो मुफ़्त दोबारा बनाते हैं, या पूरा पैसा वापस।",
    "मंज़ूर रिफ़ंड 5–7 कार्यदिवस में वापस आ जाता है।",
  ],
  kok: [
    "पयशे दिवच्या आदीं तुमी सगळो व्हिडिओ वॉटरमार्का सयत पळयतात. पळयनासतना पयशे दिवचे पडनात.",
    "पयशे दिवच्या आदीं रद्द करपाक कांयच ना — पानो बंद करात.",
    "पयशे दिल्या उपरांत फायल डावनलोड जाली ना जाल्यार सगळे पयशे परत. 7 दिसां भितर सांगात.",
    "तुमी दिल्ली म्हायती चुकीची आयली जाल्यार फुकट परत करतात, वा सगळे पयशे परत.",
    "मान्य केल्ली परतफेड 5–7 कामाच्या दिसांनी परत येता.",
  ],
};

export default async function Refunds({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const price = rupees(config().PRICE_LAUNCH_PAISE);
  const { lang: raw } = await searchParams;
  const lang = isLanguage(raw) ? raw : "en";
  return (
    <article lang={lang} className="glass glass-rel tier-2 max-w-2xl space-y-5 p-6 rise">
      <h1 className="t-title-1 ink-1">Refunds and cancellations</h1>
      <LegalSummary lang={lang} points={SUMMARY} />
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

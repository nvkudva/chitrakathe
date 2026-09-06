import type { Language } from "../templates/schema";

/**
 * Interface copy. Template copy lives in the templates; this is only the
 * chrome around them.
 */
type Bundle = Record<string, string>;

const en: Bundle = {
  "app.name": "Chitrakathe",
  "app.tagline": "A trailer for your family function. Minutes, not days.",
  "gallery.heading": "Pick a template",
  "gallery.sub": "Each one is a real storyboard — shot list, timing, typography. You fill in six fields.",
  "gallery.priceNote": "Watermarked preview free, {price} to download it clean.",
  "gallery.cta": "Make this one",
  "form.heading": "Tell us about the function",
  "form.language": "Language",
  "form.photos": "Photos",
  "form.photosHint": "6 to 10 photos. At least 1080px on the long edge. Screenshots and forwards look poor.",
  "form.submit": "Make my trailer",
  "form.retention": "We delete your uploaded photos 30 days after upload. Rendered videos are kept 90 days.",
  "field.babyName": "Baby's name",
  "field.childName": "Child's name",
  "field.parentsNames": "Parents' names",
  "field.grandparentsNames": "Grandparents' names",
  "field.familyName": "Family name",
  "field.partnerA": "First name",
  "field.partnerB": "Second name",
  "field.eventDate": "Date",
  "field.eventTime": "Time",
  "field.muhurtaTime": "Muhurta time",
  "field.venue": "Venue",
  "field.address": "Address",
  "field.hostedBy": "Hosted by",
  "job.rendering": "Making your trailer",
  "job.stage.prepare": "Preparing your photos",
  "job.stage.voice": "Recording the voiceover",
  "job.stage.shots": "Shooting the scenes",
  "job.stage.assemble": "Cutting it together",
  "job.stage.derive": "Finishing",
  "job.done": "Ready",
  "job.failed": "Something went wrong",
  "job.refused": "We stopped this render",
  "job.refusedBody": "It would have cost more than we allow ourselves to spend on one trailer. You have not been charged.",
  "preview.watermarked": "This preview is watermarked. Pay once to download it clean.",
  "pay.cta": "Unlock and download",
  "pay.upi": "UPI, cards, netbanking",
  "download.portrait": "Download 9:16 (WhatsApp Status)",
  "download.square": "Download 1:1 (Instagram)",
  "rerender.free": "Change something and re-render, free once",
  "rerender.paid": "Re-render",
  "form.email": "Email for delivery",
  "form.phone": "WhatsApp number",
};

/** Languages a family can read the site itself in. */
export function isLanguage(v: string | undefined): v is Language {
  return v === "kn" || v === "kok" || v === "hi" || v === "en";
}

const kn: Bundle = {
  ...en,
  "app.tagline": "ನಿಮ್ಮ ಕುಟುಂಬದ ಸಮಾರಂಭಕ್ಕೊಂದು ಟ್ರೈಲರ್. ದಿನಗಳಲ್ಲ, ನಿಮಿಷಗಳಲ್ಲಿ.",
  "gallery.heading": "ಟೆಂಪ್ಲೇಟ್ ಆರಿಸಿ",
  "gallery.cta": "ಇದನ್ನೇ ಮಾಡಿ",
  "gallery.sub": "ಪ್ರತಿಯೊಂದೂ ನಿಜವಾದ ಚಿತ್ರಕಥೆ — ದೃಶ್ಯಗಳ ಪಟ್ಟಿ, ಸಮಯ, ಅಕ್ಷರ ವಿನ್ಯಾಸ. ನೀವು ಆರು ವಿವರ ತುಂಬಿದರೆ ಸಾಕು.",
  "gallery.priceNote": "ವಾಟರ್‌ಮಾರ್ಕ್ ಇರುವ ಮಾದರಿ ಉಚಿತ, ಸ್ಪಷ್ಟ ವಿಡಿಯೋಗೆ {price}.",
  "form.photosHint": "6 ರಿಂದ 10 ಫೋಟೋಗಳು. ಉದ್ದದ ಅಂಚಿನಲ್ಲಿ ಕನಿಷ್ಠ 1080px. ಫಾರ್ವರ್ಡ್ ಆದ ಫೋಟೋಗಳು ಚೆನ್ನಾಗಿ ಕಾಣುವುದಿಲ್ಲ.",
  "form.retention": "ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ 30 ದಿನಗಳ ನಂತರ ನಿಮ್ಮ ಫೋಟೋಗಳನ್ನು ಅಳಿಸುತ್ತೇವೆ. ವಿಡಿಯೋಗಳನ್ನು 90 ದಿನ ಇಡುತ್ತೇವೆ.",
  "form.email": "ತಲುಪಿಸಲು ಇಮೇಲ್",
  "form.phone": "ವಾಟ್ಸಾಪ್ ಸಂಖ್ಯೆ",
  "form.heading": "ಸಮಾರಂಭದ ವಿವರ ನೀಡಿ",
  "form.language": "ಭಾಷೆ",
  "form.photos": "ಫೋಟೋಗಳು",
  "form.submit": "ನನ್ನ ಟ್ರೈಲರ್ ಮಾಡಿ",
  "field.babyName": "ಮಗುವಿನ ಹೆಸರು",
  "field.parentsNames": "ತಂದೆ-ತಾಯಿಯ ಹೆಸರು",
  "field.grandparentsNames": "ಅಜ್ಜ-ಅಜ್ಜಿಯ ಹೆಸರು",
  "field.eventDate": "ದಿನಾಂಕ",
  "field.eventTime": "ಸಮಯ",
  "field.venue": "ಸ್ಥಳ",
  "job.rendering": "ನಿಮ್ಮ ಟ್ರೈಲರ್ ತಯಾರಾಗುತ್ತಿದೆ",
  "job.done": "ಸಿದ್ಧ",
  "pay.cta": "ಅನ್‌ಲಾಕ್ ಮಾಡಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
};

const hi: Bundle = {
  ...en,
  "app.tagline": "आपके पारिवारिक समारोह का ट्रेलर। दिनों में नहीं, मिनटों में।",
  "gallery.heading": "टेम्पलेट चुनें",
  "gallery.cta": "यही बनाएँ",
  "gallery.sub": "हर एक असली स्टोरीबोर्ड है — शॉट सूची, समय, अक्षर विन्यास। आप बस छह विवरण भरें।",
  "gallery.priceNote": "वॉटरमार्क वाला नमूना मुफ़्त, साफ़ वीडियो के लिए {price}।",
  "form.photosHint": "6 से 10 तस्वीरें। लंबी भुजा पर कम से कम 1080px। फ़ॉरवर्ड की हुई तस्वीरें अच्छी नहीं लगतीं।",
  "form.retention": "अपलोड के 30 दिन बाद हम आपकी तस्वीरें मिटा देते हैं। वीडियो 90 दिन रखते हैं।",
  "form.email": "भेजने के लिए ईमेल",
  "form.phone": "व्हाट्सएप नंबर",
  "form.heading": "समारोह के बारे में बताएँ",
  "form.language": "भाषा",
  "form.photos": "तस्वीरें",
  "form.submit": "मेरा ट्रेलर बनाएँ",
  "field.babyName": "शिशु का नाम",
  "field.parentsNames": "माता-पिता के नाम",
  "field.eventDate": "दिनांक",
  "field.eventTime": "समय",
  "field.venue": "स्थान",
  "job.rendering": "आपका ट्रेलर बन रहा है",
  "job.done": "तैयार",
  "pay.cta": "अनलॉक करें और डाउनलोड करें",
};

const kok: Bundle = {
  ...en,
  "app.tagline": "तुमच्या कुटुंबाच्या समारंभाचो ट्रेलर. दिसांनी न्हय, मिनटांनी.",
  "gallery.heading": "टेम्पलेट वेंचात",
  "gallery.cta": "हेंच करात",
  "gallery.sub": "दर एक खरी काणी-रचणूक — शॉट वळेरी, वेळ, अक्षरां. तुमी फकत सव विवरण भरात.",
  "gallery.priceNote": "वॉटरमार्क आशिल्लो नमुनो फुकट, निवळ व्हिडिओखातीर {price}.",
  "form.photosHint": "6 ते 10 फोटयां. लांब वटेन उणीच 1080px. फॉरवर्ड केल्लीं फोटयां बरीं दिसनात.",
  "form.retention": "अपलोड केल्ल्या 30 दिसां उपरांत आमी तुमचीं फोटयां काडून उडयतात. व्हिडिओ 90 दीस दवरतात.",
  "form.email": "धाडपाक ईमेल",
  "form.phone": "व्हॉट्सॲप क्रमांक",
  "form.heading": "समारंभा विशीं सांगात",
  "form.language": "भास",
  "form.photos": "फोटयां",
  "form.submit": "म्हजो ट्रेलर करात",
  "field.babyName": "भुरग्याचें नांव",
  "field.parentsNames": "आवय-बापायचीं नांवां",
  "field.eventDate": "तारीख",
  "field.eventTime": "वेळ",
  "field.venue": "सुवात",
  "job.rendering": "तुमचो ट्रेलर तयार जाता",
  "job.done": "तयार",
  "pay.cta": "उगडात आनी डावनलोड करात",
};

const BUNDLES: Record<Language, Bundle> = { en, kn, hi, kok };

export function t(lang: Language, key: string): string {
  return BUNDLES[lang]?.[key] ?? en[key] ?? key;
}

export const LANGUAGE_NAMES: Record<Language, string> = {
  kn: "ಕನ್ನಡ",
  kok: "कोंकणी",
  hi: "हिंदी",
  en: "English",
};

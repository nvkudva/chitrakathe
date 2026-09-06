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
};

const kn: Bundle = {
  ...en,
  "app.tagline": "ನಿಮ್ಮ ಕುಟುಂಬದ ಸಮಾರಂಭಕ್ಕೊಂದು ಟ್ರೈಲರ್. ದಿನಗಳಲ್ಲ, ನಿಮಿಷಗಳಲ್ಲಿ.",
  "gallery.heading": "ಟೆಂಪ್ಲೇಟ್ ಆರಿಸಿ",
  "gallery.cta": "ಇದನ್ನೇ ಮಾಡಿ",
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

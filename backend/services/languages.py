"""Language metadata shared by translation, previews and speech generation."""

LANGUAGE_NAMES = {
    "en": "English", "ur": "Urdu", "hi": "Hindi", "ar": "Arabic",
    "es": "Spanish", "fr": "French", "de": "German", "pt": "Portuguese",
    "zh": "Chinese", "ja": "Japanese",
}

PREVIEW_TEXT = {
    "en": "Believe in yourself. Every small step brings you closer to your goal.",
    "ur": "خود پر یقین رکھیں۔ ہر چھوٹا قدم آپ کو اپنی منزل کے قریب لے جاتا ہے۔",
    "hi": "खुद पर विश्वास रखें। हर छोटा कदम आपको अपनी मंज़िल के करीब ले जाता है।",
    "ar": "آمن بنفسك. كل خطوة صغيرة تقربك من هدفك.",
    "es": "Cree en ti. Cada pequeño paso te acerca a tu objetivo.",
    "fr": "Croyez en vous. Chaque petit pas vous rapproche de votre objectif.",
    "de": "Glaube an dich. Jeder kleine Schritt bringt dich deinem Ziel näher.",
    "pt": "Acredite em si. Cada pequeno passo aproxima você do seu objetivo.",
    "zh": "相信自己。每一小步都会让你离目标更近。",
    "ja": "自分を信じてください。小さな一歩が、目標に近づく力になります。",
}

NARRATION_PRESETS = {
    "normal": {"rate": "+0%", "pitch": "+0Hz", "volume": "+0%"},
    "motivational": {"rate": "+8%", "pitch": "+2Hz", "volume": "+5%"},
    "calm": {"rate": "-12%", "pitch": "-2Hz", "volume": "+0%"},
}

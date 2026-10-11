import id from "./id.js";
import en from "./en.js";

export const translations = {
  id,
  en,
};

export function getTranslation(lang = "id") {
  return translations[lang] || translations.id;
}

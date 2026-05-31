import React, { createContext, useContext, useMemo, useState } from "react";
import en from "./en.json";
import si from "./si.json";

const translations = { en, si };

const I18nContext = createContext({
  lang: "en",
  setLang: () => {},
  t: (k, vars) => k,
});

export function I18nProvider({ children }) {
  const [lang, setLang] = useState("en");

  const t = (key, vars) => {
    const parts = key.split(".");
    let node = translations[lang] || {};
    for (const p of parts) {
      node = node?.[p];
      if (node === undefined) break;
    }
    let str = node === undefined ? key : node;
    if (vars && typeof str === "string") {
      Object.keys(vars).forEach((k) => {
        str = str.replace(`{${k}}`, vars[k]);
      });
    }
    return str;
  };

  const value = useMemo(() => ({ lang, setLang, t }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  return useContext(I18nContext);
}

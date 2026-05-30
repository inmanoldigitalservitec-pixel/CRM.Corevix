import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { en, type MessageKey } from "./messages/en";
import { es } from "./messages/es";

export type Lang = "en" | "es";

const STORAGE_KEY = "crm_lang";

type Messages = typeof en;

type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey | string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function getBrowserStoredLang(): Lang | null {
  try {
    if (typeof window === "undefined") return null;
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "es" || value === "en" ? value : null;
  } catch {
    return null;
  }
}

function storeLang(lang: Lang) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
}

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

function getMessages(lang: Lang): Messages {
  return lang === "es" ? (es as unknown as Messages) : en;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = getBrowserStoredLang();
    if (stored) setLangState(stored);
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    storeLang(next);
  }, []);

  const messages = useMemo(() => getMessages(lang), [lang]);

  const t: I18nValue["t"] = useCallback(
    (key, params) => {
      const k = String(key);
      const value = (messages as any)[k] ?? (en as any)[k] ?? k;
      return interpolate(String(value), params);
    },
    [messages],
  );

  const value = useMemo<I18nValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used within I18nProvider");
  return ctx;
}

export function statusKey(status: string) {
  return (
    "status." +
    status
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
  );
}


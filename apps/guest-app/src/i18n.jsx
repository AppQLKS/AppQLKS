import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { dishDescriptionVi, en, serverErrorPatternsVi, serverTextVi, vi } from './locales.js';

// Đa ngôn ngữ cho app khách: 'en' | 'vi'.
// Thêm màn hình mới: thêm key vào cả hai từ điển rồi dùng t('key') trong component.
const STORAGE_KEY = 'apphotel.lang';
export const LANGUAGES = [
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'vi', label: 'VI', name: 'Tiếng Việt' },
];

const dictionaries = { en, vi };
const LOCALES = { en: 'en-US', vi: 'vi-VN' };

/** Thay {biến} trong câu. */
const fill = (text, vars) => (vars ? text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : text);

function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && dictionaries[saved]) return saved;
  } catch {
    /* storage bị chặn */
  }
  // Lần đầu: theo ngôn ngữ của điện thoại / trình duyệt
  return (navigator.language || '').toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLanguage);

  const setLang = useCallback((next) => {
    if (!dictionaries[next]) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* bỏ qua */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => {
    // Thiếu bản dịch -> dùng tiếng Anh, rồi đến chính key (dễ phát hiện khi phát triển)
    const t = (key, vars) => fill(dictionaries[lang][key] ?? dictionaries.en[key] ?? key, vars);
    const locale = LOCALES[lang];
    /** Giờ theo ngôn ngữ, vd 7:12 PM / 19:12. */
    const fmtTime = (iso) => new Date(iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
    /** Ngày ngắn, vd Sun, Nov 22 / CN, 22 thg 11. */
    const fmtDate = (date, opts = { weekday: 'short', month: 'short', day: 'numeric' }) => new Date(date).toLocaleDateString(locale, opts);
    /** Dịch chữ do server trả về (tên yêu cầu, đồ dùng, loại phòng); không có bản dịch thì giữ nguyên. */
    const srv = (text) => {
      if (lang !== 'vi' || !text) return text;
      const slot = /^Scheduled Cleaning · (\d{2}:\d{2})$/.exec(text);
      if (slot) return `Hẹn dọn phòng · ${slot[1]}`;
      return serverTextVi[text] ?? text;
    };
    /** Mô tả món ăn theo ngôn ngữ. */
    const dishDesc = (item) => (lang === 'vi' && dishDescriptionVi[item.id]) || item.description;
    /** Lỗi từ API (server trả tiếng Anh): mất mạng -> câu báo chung; tiếng Việt -> dịch theo mẫu nếu có. */
    const apiError = (e) => {
      if (!e?.status) return t('login.error.network');
      if (lang !== 'vi') return e.message;
      const hit = serverErrorPatternsVi.find(([pattern]) => pattern.test(e.message));
      return hit ? e.message.replace(hit[0], hit[1]) : e.message;
    };
    return { lang, setLang, t, locale, fmtTime, fmtDate, srv, dishDesc, apiError };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

/** Nút chuyển EN / VI (dạng segmented control). */
export function LanguageSwitch({ className = '' }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t('language.label')} className={`inline-flex items-center p-[3px] rounded-full bg-surface-container-lowest border border-outline-variant shadow-sm ${className}`}>
      {LANGUAGES.map((l) => {
        const active = l.id === lang;
        return (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={l.name}
            title={l.name}
            onClick={() => setLang(l.id)}
            className={`min-w-[44px] px-md py-xs rounded-full font-label text-label-md transition-colors duration-state-change ${
              active ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}

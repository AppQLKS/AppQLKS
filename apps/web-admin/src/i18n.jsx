import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { en, serverErrorVi, serverTextVi, vi } from './locales.js';

// Đa ngôn ngữ cho web admin: 'en' | 'vi'.
// Dùng chung key localStorage với app khách để cùng trình duyệt thì cùng ngôn ngữ.
// Thêm màn hình mới: thêm key vào cả hai từ điển trong locales.js rồi dùng t('key').
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
    const fmtDate = (date, opts) => new Date(date).toLocaleDateString(locale, opts);

    /** Dịch chữ do server trả về (tên yêu cầu, đồ dùng, loại phòng); không có bản dịch thì giữ nguyên. */
    const srv = (text) => {
      if (lang !== 'vi' || !text) return text;
      const slot = /^Scheduled Cleaning · (\d{2}:\d{2})$/.exec(text);
      if (slot) return `Hẹn dọn phòng · ${slot[1]}`;
      return serverTextVi[text] ?? text;
    };

    /** Thông báo lỗi từ API (server trả tiếng Anh). */
    const apiError = (e) => {
      if (!e?.status) return t('error.network');
      if (lang !== 'vi') return e.message;
      if (serverErrorVi[e.message]) return serverErrorVi[e.message];
      const claimed = /^Already claimed by (.+?)\.?$/.exec(e.message);
      if (claimed) return `Đã được ${claimed[1]} nhận trước.`;
      return t(`error.${e.status}`) === `error.${e.status}` ? e.message : t(`error.${e.status}`);
    };

    /** "4 phút trước" / "2 giờ trước". */
    const elapsed = (iso) => {
      const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
      return m < 60 ? t('time.minutesAgo', { n: m }) : t('time.hoursAgo', { n: Math.floor(m / 60) });
    };

    /** "Nov 18 – Nov 22 (2 Guests)". */
    const stayLabel = (stay) => {
      const d = (s) => fmtDate(`${s}T00:00:00`, { month: 'short', day: 'numeric' });
      const guests = t(stay.guests > 1 ? 'room.guests' : 'room.guest', { n: stay.guests });
      return `${d(stay.checkIn)} – ${d(stay.checkOut)} (${guests})`;
    };

    return { lang, setLang, t, locale, fmtDate, srv, apiError, elapsed, stayLabel };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

/** Nút chuyển EN / VI. `dark` dùng trên nền tối (trang đăng nhập). */
export function LanguageSwitch({ className = '', dark = false }) {
  const { lang, setLang, t } = useI18n();
  const shell = dark ? 'bg-sidebar-active border-sidebar-muted/30' : 'bg-surface-low border-outline-variant shadow-sm';
  const idle = dark ? 'text-sidebar-muted hover:text-on-brand-slate' : 'text-on-surface-variant hover:text-on-surface';
  return (
    <div role="radiogroup" aria-label={t('language.label')} className={`inline-flex items-center p-[3px] rounded-full border ${shell} ${className}`}>
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
            className={`min-w-[40px] px-2.5 py-1 rounded-full text-label-md transition-colors duration-state-change ${active ? 'bg-primary text-on-primary' : idle}`}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}

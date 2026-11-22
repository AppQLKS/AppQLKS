import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Đa ngôn ngữ cho app khách: 'en' | 'vi'.
// Thêm màn hình mới: thêm key vào cả hai từ điển rồi dùng t('key') trong component.
const STORAGE_KEY = 'apphotel.lang';
export const LANGUAGES = [
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'vi', label: 'VI', name: 'Tiếng Việt' },
];

const dictionaries = {
  en: {
    'login.eyebrow': 'AppHotel • Boutique Stay',
    'login.title': 'Welcome to Your Stay',
    'login.subtitle': 'Enter the 6-character code from your suite keycard to unlock in-room dining, housekeeping, and concierge.',
    'login.codeLabel': 'Dynamic Room Code',
    'login.example': 'Example: A8K-92P',
    'login.codeAria': '6-character room access code',
    'login.submit': 'Access Room Services',
    'login.checking': 'Checking code…',
    'login.or': 'or',
    'login.scanQr': 'Scan Room QR Code',
    'login.qrHint': 'Open your phone camera and point it at the QR code on your keycard sleeve — you will be signed in automatically.',
    'login.staffSection': 'For Hotel Staff & Operations',
    'login.staffTitle': 'Staff Portal Login',
    'login.staffDepartments': 'Housekeeping • Kitchen • Reception',
    'login.help': 'Need assistance? Dial 0 from your suite phone.',
    'login.expired': 'Your session ended (the room code was changed). Please enter the new code.',
    'login.error.invalid': 'That code is not valid. Check your keycard or dial 0 for reception.',
    'login.error.locked': 'Too many attempts. Please wait a few minutes or dial 0 for reception.',
    'login.error.format': 'Room code must be 6 characters.',
    'login.error.network': 'Cannot reach the hotel server. Please try again.',
    'language.label': 'Language',
  },
  vi: {
    'login.eyebrow': 'AppHotel • Boutique Stay',
    'login.title': 'Chào mừng quý khách',
    'login.subtitle': 'Nhập mã 6 ký tự trên thẻ phòng để sử dụng dịch vụ ăn uống tại phòng, dọn phòng và trợ lý ảo.',
    'login.codeLabel': 'Mã phòng',
    'login.example': 'Ví dụ: A8K-92P',
    'login.codeAria': 'Mã phòng gồm 6 ký tự',
    'login.submit': 'Vào dịch vụ phòng',
    'login.checking': 'Đang kiểm tra mã…',
    'login.or': 'hoặc',
    'login.scanQr': 'Quét mã QR của phòng',
    'login.qrHint': 'Mở camera điện thoại và hướng vào mã QR trên bìa thẻ phòng — quý khách sẽ được đăng nhập tự động.',
    'login.staffSection': 'Dành cho nhân viên khách sạn',
    'login.staffTitle': 'Đăng nhập nhân viên',
    'login.staffDepartments': 'Buồng phòng • Bếp • Lễ tân',
    'login.help': 'Cần hỗ trợ? Bấm số 0 trên điện thoại trong phòng.',
    'login.expired': 'Phiên đã kết thúc (mã phòng đã được đổi). Vui lòng nhập mã mới.',
    'login.error.invalid': 'Mã không hợp lệ. Vui lòng kiểm tra thẻ phòng hoặc bấm số 0 để gọi lễ tân.',
    'login.error.locked': 'Nhập sai quá nhiều lần. Vui lòng đợi vài phút hoặc bấm số 0 để gọi lễ tân.',
    'login.error.format': 'Mã phòng gồm 6 ký tự.',
    'login.error.network': 'Không kết nối được máy chủ khách sạn. Vui lòng thử lại.',
    'language.label': 'Ngôn ngữ',
  },
};

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
    const t = (key) => dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
    return { lang, setLang, t };
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

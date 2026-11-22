import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { BackButton, Icon, money } from '../../components/ui.jsx';
import { useI18n } from '../../i18n.jsx';

const SUGGESTIONS = ['chat.suggest1', 'chat.suggest2', 'chat.suggest3', 'chat.suggest4'];

const ACTION_ICON = { food_order: 'room_service', housekeeping: 'cleaning_services', checkout: 'logout' };

/** Hiển thị **đậm** và xuống dòng trong câu trả lời của chatbot. */
function RichText({ text }) {
  return text.split('\n').map((line, li) => (
    <span key={li} className="block">
      {line.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <span key={i} className="font-semibold">{part}</span> : part))}
    </span>
  ));
}

/** Thẻ xác nhận cho thao tác chatbot đã chuẩn bị (tool calling). */
function ActionCard({ action, roomNumber, onChange }) {
  const { t } = useI18n();
  const k = `chat.action.${action.kind}`;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const act = async (verb) => {
    setBusy(true);
    setError('');
    try {
      onChange(await api(`/chat/actions/${action.id}/${verb}`, { method: 'POST' }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`w-full card p-lg flex flex-col gap-md ${action.status === 'pending' ? '!border-accent' : ''}`}>
      <header className="flex items-center justify-between gap-sm">
        <div className="flex items-center gap-xs">
          <Icon name={ACTION_ICON[action.kind]} className="text-title-md text-secondary" />
          <span className="font-label text-label-md text-secondary uppercase tracking-wider">{t(`${k}.title`)}</span>
        </div>
        {action.total !== null && <span className="font-mono text-mono-sm tabular-nums">{money(action.total)}</span>}
      </header>
      <p className="font-title text-title-sm text-pretty">
        {t(`${k}.ask`)}: {action.summary}
        {action.kind !== 'checkout' && ` ${t('chat.toRoom', { n: roomNumber })}`}?
      </p>

      {error && <p role="alert" className="text-body-sm text-error">{error}</p>}

      {action.status === 'pending' && (
        <footer className="flex items-center gap-sm pt-xs">
          <button type="button" onClick={() => act('confirm')} disabled={busy} className="btn-primary flex-1 py-sm px-lg !text-label-md">
            {busy ? t('common.sending') : t('chat.confirm')}
          </button>
          <button
            type="button"
            onClick={() => act('dismiss')}
            disabled={busy}
            className="py-sm px-lg rounded-md bg-surface-container-low border border-outline-variant font-label text-label-md hover:bg-surface-container transition-colors duration-state-change"
          >
            {t('chat.edit')}
          </button>
        </footer>
      )}
      {action.status === 'confirmed' && (
        <div className="w-full py-sm px-md rounded-md bg-success-container text-on-success-container font-label text-label-md flex items-center justify-center gap-xs text-center">
          <Icon name="check_circle" className="text-title-md shrink-0" />
          <span>
            {t(`${k}.done`)}
            {action.result?.requestId && ` (#${action.result.requestId})`}
          </span>
        </div>
      )}
      {action.status === 'dismissed' && <p className="text-body-sm text-on-surface-variant">{t('chat.dismissed')}</p>}
      {action.status === 'failed' && <p className="text-body-sm text-error">{t('chat.failed', { error: action.result?.error })}</p>}
    </article>
  );
}

export default function Concierge() {
  const { room, guest } = useAuth().session;
  const { t, fmtTime: timeOf } = useI18n();
  const [messages, setMessages] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    api('/chat')
      .then((data) => {
        setEnabled(data.enabled);
        setMessages(data.messages);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, thinking]);

  const send = async (text) => {
    const message = text.trim();
    if (!message || thinking) return;
    setError('');
    setDraft('');
    const now = new Date().toISOString();
    setMessages((m) => [...m, { role: 'guest', text: message, at: now, actions: [] }]);
    setThinking(true);
    try {
      const res = await api('/chat', { method: 'POST', body: JSON.stringify({ message }) });
      setMessages((m) => [...m, { role: 'assistant', text: res.reply, at: res.at, actions: res.actions }]);
    } catch (e) {
      // Lượt lỗi không được lưu ở server -> bỏ tin vừa gửi, trả lại ô nhập
      setMessages((m) => m.slice(0, -1));
      setDraft(message);
      setError(e.message);
      if (e.status === 503) setEnabled(false);
    } finally {
      setThinking(false);
    }
  };

  const updateAction = (updated) =>
    setMessages((list) => list.map((m) => ({ ...m, actions: m.actions.map((a) => (a.id === updated.id ? updated : a)) })));

  const newChat = async () => {
    await api('/chat', { method: 'DELETE' }).catch(() => {});
    setMessages([]);
    setError('');
  };

  return (
    <div className="min-h-screen max-w-[390px] mx-auto flex flex-col pb-24">
      <header className="sticky top-0 z-10 bg-surface px-page-margin pt-2xl pb-md flex items-center justify-between gap-md border-b border-outline-variant/60">
        <div className="flex items-center gap-md">
          <BackButton to="/home" />
          <div className="flex items-center gap-sm">
            <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center">
              <Icon name="auto_awesome" className="text-title-md text-secondary" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-headline text-title-lg">{t('chat.title')}</h1>
              <span className="text-body-sm text-on-surface-variant">{t('common.room', { n: room.number })} • {enabled ? t('chat.online') : t('chat.offline')}</span>
            </div>
          </div>
        </div>
        {messages.length > 0 ? (
          <button type="button" onClick={newChat} aria-label={t('chat.newChat')} title={t('chat.newChatShort')} className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:text-on-surface">
            <Icon name="edit_square" className="text-title-md" />
          </button>
        ) : (
          <span className="px-md py-xs rounded-full bg-success-container text-on-success-container font-label text-label-sm">24/7</span>
        )}
      </header>

      <main className="px-page-margin py-lg flex flex-col gap-lg flex-1" aria-live="polite">
        {loaded && messages.length === 0 && (
          <div className="flex flex-col items-start gap-md">
            <div className="max-w-[88%] card !rounded-bl-sm px-lg py-md">
              <p className="text-body-md text-pretty">
                {t('chat.welcome', { name: guest.name.split(' ')[0] })}
              </p>
            </div>
            <div className="flex flex-wrap gap-sm">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" disabled={!enabled} onClick={() => send(t(s))} className="pill pill-idle disabled:opacity-50">
                  {t(s)}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === 'guest' ? (
            <div key={i} className="flex flex-col items-end gap-xs">
              <div className="max-w-[85%] bg-primary text-on-primary rounded-lg rounded-br-sm px-lg py-md shadow-sm">
                <p className="text-body-md text-pretty whitespace-pre-wrap">{m.text}</p>
              </div>
              <span className="font-mono text-mono-sm text-on-surface-variant tabular-nums">{timeOf(m.at)}</span>
            </div>
          ) : (
            <div key={i} className="flex flex-col items-start gap-sm">
              <div className="max-w-[88%] card !rounded-bl-sm px-lg py-md">
                <div className="text-body-md text-pretty">
                  <RichText text={m.text} />
                </div>
              </div>
              {m.actions.map((a) => (
                <ActionCard key={a.id} action={a} roomNumber={room.number} onChange={updateAction} />
              ))}
              <span className="font-mono text-mono-sm text-on-surface-variant tabular-nums">{timeOf(m.at)}</span>
            </div>
          ),
        )}

        {thinking && (
          <div className="card !rounded-bl-sm px-lg py-md self-start flex items-center gap-xs" role="status" aria-label={t('chat.typing')}>
            {[0, 1, 2].map((d) => (
              <span key={d} className="w-2 h-2 rounded-full bg-outline animate-bounce" style={{ animationDelay: `${d * 150}ms` }} />
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="flex items-start gap-xs p-md rounded-md bg-error-container text-error text-body-sm">
            <Icon name="error" className="text-title-sm shrink-0 mt-[1px]" />
            {error}
          </p>
        )}

        {!enabled && loaded && (
          <p className="text-body-sm text-on-surface-variant text-center">
            {t('chat.offlineNote', { dining: '@@DINING@@', housekeeping: '@@HK@@' })
              .split(/(@@DINING@@|@@HK@@)/)
              .map((part, i) =>
                part === '@@DINING@@' ? (
                  <Link key={i} to="/dining" className="text-primary font-semibold">{t('nav.dining')}</Link>
                ) : part === '@@HK@@' ? (
                  <Link key={i} to="/housekeeping" className="text-primary font-semibold">{t('nav.suiteCare')}</Link>
                ) : (
                  part
                ),
              )}
          </p>
        )}
        <div ref={bottomRef} />
      </main>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        aria-label={t('chat.composer')}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-surface-container-lowest border-t border-outline-variant px-page-margin py-md z-20 flex items-center gap-sm"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={1000}
          disabled={!enabled}
          aria-label={t('chat.inputAria')}
          placeholder={enabled ? t('chat.placeholder') : t('chat.placeholderOffline')}
          className="flex-1 px-lg py-md rounded-full bg-surface-container-low border border-outline-variant text-body-md placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!enabled || thinking || !draft.trim()}
          aria-label={t('chat.send')}
          className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-primary text-on-primary hover:opacity-90 active:scale-95 disabled:opacity-50 transition duration-state-change shrink-0"
        >
          <Icon name="send" className="text-title-md" />
        </button>
      </form>
    </div>
  );
}

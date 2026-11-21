import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, DEMO_ROOM } from '../../api.js';
import { BackButton, Icon, money } from '../../components/ui.jsx';

// Hội thoại mẫu theo mockup.
// TODO(feature/ai-chatbot): gửi tin nhắn tới POST /api/chat; render thẻ xác nhận từ tool call thật.
const SAMPLE = [
  { from: 'guest', time: '7:18 PM', text: 'What time is breakfast tomorrow? Also, can you order 1 Beef Pho and 1 Iced Coffee to my room?' },
  {
    from: 'ai',
    time: '7:18 PM',
    text: 'Breakfast is served from **6:30 AM to 10:30 AM** in the Garden Conservatory, or anytime via in-suite dining. I’ve staged your order below—just confirm to send it to the kitchen.',
    action: { kind: 'order', summary: '1x Beef Pho & 1x Iced Coffee', total: 24.5 },
  },
];

function Bold({ text }) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <span key={i} className="font-semibold">{part}</span> : part));
}

export default function Concierge() {
  const [messages, setMessages] = useState(SAMPLE);
  const [draft, setDraft] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [checkoutRequested, setCheckoutRequested] = useState(false);
  const [folio, setFolio] = useState(null);
  const checkoutRef = useRef(null);
  const { hash } = useLocation();

  useEffect(() => {
    api(`/rooms/${DEMO_ROOM}`).then((r) => setFolio(r.folio)).catch(() => {});
  }, []);

  useEffect(() => {
    if (hash === '#checkout') checkoutRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  const send = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    setMessages((m) => [...m, { from: 'guest', time, text }, { from: 'ai', time, text: 'The AI concierge is not connected yet (coming in feature/ai-chatbot).' }]);
    setDraft('');
  };

  return (
    <div className="min-h-screen max-w-[390px] mx-auto flex flex-col pb-24">
      <header className="px-page-margin pt-2xl pb-md flex items-center justify-between gap-md border-b border-outline-variant/60">
        <div className="flex items-center gap-md">
          <BackButton to="/home" />
          <div className="flex items-center gap-sm">
            <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center">
              <Icon name="auto_awesome" className="text-title-md text-secondary" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-headline text-title-lg">AI Concierge</h1>
              <span className="text-body-sm text-on-surface-variant">Room {DEMO_ROOM} • Online</span>
            </div>
          </div>
        </div>
        <span className="px-md py-xs rounded-full bg-success-container text-on-success-container font-label text-label-sm">24/7</span>
      </header>

      <main className="px-page-margin py-lg flex flex-col gap-lg flex-1">
        {messages.map((m, i) =>
          m.from === 'guest' ? (
            <div key={i} className="flex flex-col items-end gap-xs">
              <div className="max-w-[85%] bg-primary text-on-primary rounded-lg rounded-br-sm px-lg py-md shadow-sm">
                <p className="text-body-md text-pretty">{m.text}</p>
              </div>
              <span className="font-mono text-mono-sm text-on-surface-variant tabular-nums">{m.time}</span>
            </div>
          ) : (
            <div key={i} className="flex flex-col items-start gap-sm">
              <div className="max-w-[88%] card !rounded-bl-sm px-lg py-md">
                <p className="text-body-md text-pretty"><Bold text={m.text} /></p>
              </div>
              {m.action && (
                <article className="w-full card !border-accent p-lg flex flex-col gap-md">
                  <header className="flex items-center justify-between gap-sm">
                    <div className="flex items-center gap-xs">
                      <Icon name="room_service" className="text-title-md text-secondary" />
                      <span className="font-label text-label-md text-secondary uppercase tracking-wider">Kitchen Order Ready</span>
                    </div>
                    <span className="font-mono text-mono-sm tabular-nums">{money(m.action.total)}</span>
                  </header>
                  <p className="font-title text-title-sm text-pretty">Confirm Order: {m.action.summary} to Room {DEMO_ROOM}?</p>
                  {confirmed ? (
                    <div className="w-full py-sm px-md rounded-md bg-success-container text-on-success-container font-label text-label-md flex items-center justify-center gap-xs">
                      <Icon name="check_circle" className="text-title-md" />
                      Order Confirmed • Sent to Kitchen
                    </div>
                  ) : (
                    <footer className="flex items-center gap-sm pt-xs">
                      <button type="button" onClick={() => setConfirmed(true)} className="btn-primary flex-1 py-sm px-lg !text-label-md">Confirm</button>
                      <button type="button" className="py-sm px-lg rounded-md bg-surface-container-low border border-outline-variant font-label text-label-md hover:bg-surface-container transition-colors duration-state-change">Edit</button>
                    </footer>
                  )}
                </article>
              )}
              <span className="font-mono text-mono-sm text-on-surface-variant tabular-nums">{m.time}</span>
            </div>
          ),
        )}

        <section ref={checkoutRef} id="checkout" aria-labelledby="checkout-summary-heading" className="pt-sm scroll-mt-lg">
          <article className="card !shadow-md !border-outline-variant p-xl flex flex-col gap-md">
            <header className="flex items-start justify-between gap-md">
              <div className="flex flex-col gap-xs">
                <span className="font-label text-label-sm text-secondary uppercase tracking-wider">Express Checkout Summary</span>
                <h2 id="checkout-summary-heading" className="font-title text-title-md">Room {DEMO_ROOM} Folio</h2>
              </div>
              <span className="font-headline text-headline-md tabular-nums">{folio ? money(folio.total) : '—'}</span>
            </header>
            <div className="flex items-center justify-between text-body-sm text-on-surface-variant border-t border-outline-variant/60 pt-md">
              <span>Total room service charges</span>
              <span className="font-mono text-mono-sm text-on-surface tabular-nums">{folio ? `${folio.lines.length} items` : ''}</span>
            </div>
            {/* TODO(feature/express-checkout): POST /api/checkout/:room/request */}
            <button type="button" disabled={checkoutRequested} onClick={() => setCheckoutRequested(true)} className="btn-primary w-full px-xl py-md">
              <Icon name={checkoutRequested ? 'hourglass_top' : 'logout'} className="text-title-md" />
              {checkoutRequested ? 'Waiting for Reception Approval' : 'Request Fast Check-out'}
            </button>
          </article>
        </section>
      </main>

      <form onSubmit={send} aria-label="Chat composer" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-surface-container-lowest border-t border-outline-variant px-page-margin py-md z-20 flex items-center gap-sm">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Message AI Concierge"
          placeholder="Ask about attractions, spa, or dining..."
          className="flex-1 px-lg py-md rounded-full bg-surface-container-low border border-outline-variant text-body-md placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <button type="submit" aria-label="Send message" className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-primary text-on-primary hover:opacity-90 active:scale-95 transition duration-state-change shrink-0">
          <Icon name="send" className="text-title-md" />
        </button>
      </form>
    </div>
  );
}

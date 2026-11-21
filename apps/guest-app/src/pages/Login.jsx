import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LENGTH = 6;

export default function Login() {
  const [chars, setChars] = useState(Array(LENGTH).fill(''));
  const inputs = useRef([]);
  const navigate = useNavigate();

  const setChar = (i, value) => {
    const v = value.replace(/[^a-z0-9]/gi, '').slice(-1).toUpperCase();
    const next = [...chars];
    next[i] = v;
    setChars(next);
    if (v && i < LENGTH - 1) inputs.current[i + 1]?.focus();
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !chars[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const code = chars.join('');

  const submit = (e) => {
    e.preventDefault();
    // TODO(feature/guest-auth-room-code): gọi POST /api/auth/guest, lưu token phiên
    navigate('/home');
  };

  return (
    <div className="screen login">
      <div className="logo">A</div>
      <p className="eyebrow">APPHOTEL • BOUTIQUE STAY</p>
      <h1>Welcome to Your Stay</h1>
      <p className="muted center">Enter the 6-character code from your suite keycard to unlock in-room dining, housekeeping, and concierge.</p>

      <form className="card" onSubmit={submit}>
        <div className="row-between small">
          <span className="label">Dynamic Room Code</span>
          <span className="mono muted">Example: A8K-92P</span>
        </div>
        <div className="code-boxes">
          {chars.map((c, i) => (
            <span key={i} className="code-slot">
              {i === 3 && <span className="code-dash">-</span>}
              <input
                ref={(el) => (inputs.current[i] = el)}
                value={c}
                onChange={(e) => setChar(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                maxLength={2}
                inputMode="text"
                autoCapitalize="characters"
                aria-label={`Ký tự ${i + 1}`}
                className="code-box"
              />
            </span>
          ))}
        </div>
        <button className="btn btn-primary" disabled={code.length < LENGTH}>Access Room Services</button>
        <div className="divider small muted">or</div>
        <button type="button" className="btn btn-outline">Scan Room QR Code</button>
      </form>
    </div>
  );
}

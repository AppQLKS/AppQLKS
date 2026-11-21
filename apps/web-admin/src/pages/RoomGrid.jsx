import { useEffect, useState } from 'react';
import { api } from '../api.js';

const statusLabel = { occupied: 'Occupied', vacant: 'Vacant', cleaning: 'Needs Cleaning' };

export default function RoomGrid() {
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api('/rooms').then(setRooms).catch((e) => setError(e.message));
  }, []);

  const count = (s) => rooms.filter((r) => r.status === s).length;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Live Property Operations</h1>
          <p className="muted">The Laurel Boutique Hotel · {rooms.length} Suites & Lofts</p>
        </div>
        <span className="badge badge-green"><span className="dot dot-green" /> Sync Live</span>
      </header>

      <section className="card">
        <h2>Room Status & Dynamic Access Grid</h2>
        <p className="muted small">Click any occupied room to inspect guest stay, dynamic door code, and room service folio.</p>
        <div className="legend small">
          <span><span className="dot dot-green" /> Occupied ({count('occupied')})</span>
          <span><span className="dot dot-gray" /> Vacant ({count('vacant')})</span>
          <span><span className="dot dot-amber" /> Needs Cleaning ({count('cleaning')})</span>
        </div>

        {error && <p className="error">Không tải được dữ liệu: {error}. Đã chạy API (npm run dev:api) chưa?</p>}

        <div className="room-grid">
          {rooms.map((room) => (
            <button
              key={room.number}
              className={`room room-${room.status}${selected === room.number ? ' selected' : ''}`}
              onClick={() => setSelected(room.number)}
              title={statusLabel[room.status]}
            >
              <div className="room-top">
                <strong>{room.number}</strong>
                <span className={`dot ${room.status === 'occupied' ? 'dot-green' : room.status === 'cleaning' ? 'dot-amber' : 'dot-gray'}`} />
              </div>
              <div className="room-sub">{room.guestName ?? statusLabel[room.status]}</div>
            </button>
          ))}
        </div>
      </section>
      {/* TODO(feature/staff-web-portal): panel chi tiết phòng, mã cửa động, folio; bảng task queue */}
    </>
  );
}

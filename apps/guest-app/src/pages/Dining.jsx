import { useEffect, useState } from 'react';
import { api } from '../api.js';

const categories = [
  { id: '', label: 'All' },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'local', label: 'Local Cuisine' },
  { id: 'drinks', label: 'Drinks' },
];

export default function Dining() {
  const [menu, setMenu] = useState([]);
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/menu${category ? `?category=${category}` : ''}`)
      .then(setMenu)
      .catch((e) => setError(e.message));
  }, [category]);

  return (
    <>
      <h1>Room Service & Dining</h1>
      <p className="muted small">Delivering to Room 305</p>

      <div className="chips">
        {categories.map((c) => (
          <button key={c.id} className={`chip${category === c.id ? ' active' : ''}`} onClick={() => setCategory(c.id)}>
            {c.label}
          </button>
        ))}
      </div>

      {error && <p className="error small">Không tải được menu: {error}</p>}

      <div className="list">
        {menu.map((item) => (
          <div key={item.id} className="card menu-item">
            <div>
              <strong>{item.name}</strong>
              <p className="muted small">{item.description}</p>
              <span className="price">${item.price.toFixed(2)}</span>
              <span className="muted small"> · {item.prepMinutes} min</span>
            </div>
            {/* TODO(feature/room-service-dining): giỏ hàng + Place Order */}
            <button className="add-btn" aria-label={`Thêm ${item.name}`}>+</button>
          </div>
        ))}
      </div>
    </>
  );
}

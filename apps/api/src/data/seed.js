// Dữ liệu mẫu khớp với mockup – sẽ thay bằng CSDL thật sau.

/** @typedef {'occupied'|'vacant'|'cleaning'} RoomStatus */
/** @typedef {'pending'|'claimed'|'in_progress'|'completed'|'cancelled'} RequestStatus */
/** @typedef {'food'|'housekeeping'|'amenity'} RequestType */

const occupied = {
  101: 'Arthur P.', 102: 'Claire D.', 104: 'Liam O.', 106: 'Nadia Al.', 107: 'Kenji Tak.',
  201: 'Sofia Lin', 203: 'Marcus', 204: 'Elena Vance', 205: 'Hannah', 206: 'Mateo M.',
  208: 'Priya Nair', 301: 'Julian M.', 302: 'Amara O.', 303: 'Lucas W.', 305: 'Chloe Be.',
  306: 'Omar Fa.', 307: 'Grace Kim', 308: 'Daniel Br.',
};
const cleaning = [105, 202, 304];
const roomNumbers = [
  101, 102, 103, 104, 105, 106, 107, 108,
  201, 202, 203, 204, 205, 206, 207, 208,
  301, 302, 303, 304, 305, 306, 307, 308,
];

export function seed() {
  const rooms = roomNumbers.map((number) => ({
    number: String(number),
    floor: Math.floor(number / 100),
    type: number % 100 >= 4 ? 'Deluxe King Suite' : 'Superior Queen',
    /** @type {RoomStatus} */
    status: occupied[number] ? 'occupied' : cleaning.includes(number) ? 'cleaning' : 'vacant',
  }));

  const fixedCodes = { 204: 'X7M41Q', 305: 'A8K92P' };
  const stays = Object.entries(occupied).map(([room, guestName], i) => ({
    id: `stay-${room}`,
    roomNumber: room,
    guestName,
    guests: 2,
    checkIn: '2026-11-18',
    checkOut: '2026-11-22',
    // Mã phòng động 6 ký tự (hiển thị dạng XXX-XXX)
    accessCode: fixedCodes[room] ?? `R${room}${String.fromCharCode(65 + (i % 26))}${i % 10}`,
    active: true,
  }));

  const menu = [
    { id: 'm1', name: 'Tenderloin Beef Pho', description: '12-hour star anise broth, rice noodles, fresh herbs', price: 18, prepMinutes: 18, category: 'local' },
    { id: 'm2', name: 'Artisan Iced Coffee', description: 'Single-origin espresso over cold milk & ice', price: 6.5, prepMinutes: 5, category: 'drinks' },
    { id: 'm3', name: 'Sourdough Avocado Toast', description: 'Poached farm egg, toasted sesame, microgreens', price: 15, prepMinutes: 12, category: 'breakfast' },
    { id: 'm4', name: 'Warm Butter Croissants', description: 'Two French pastries, wildflower honeycomb, figs', price: 11, prepMinutes: 8, category: 'breakfast' },
    { id: 'm5', name: 'Truffle Wagyu Burger', description: 'Wagyu patty, truffle aioli, brioche', price: 28, prepMinutes: 20, category: 'mains' },
    { id: 'm6', name: 'Sparkling Mineral Water', description: '750ml bottle', price: 7, prepMinutes: 2, category: 'drinks' },
  ];

  const staff = [
    { id: 'RC-01', name: 'Maya Lin', department: 'reception' },
    { id: 'KT-02', name: 'Marco Rossi', department: 'kitchen' },
    { id: 'HK-04', name: 'Minh Anh', department: 'housekeeping' },
    { id: 'HK-05', name: 'Soraia Silva', department: 'housekeeping' },
  ];

  /**
   * @type {Array<{id:string, roomNumber:string, type:RequestType,
   *   items:Array<{name:string, qty:number, price?:number}>, note?:string,
   *   status:RequestStatus, assignedTo?:string, createdAt:string}>}
   */
  const requests = [];

  return { rooms, stays, menu, staff, requests };
}

// Dữ liệu mẫu khớp với mockup – sẽ thay bằng CSDL thật sau.
import { hashPassword } from '../auth/passwords.js';

export const DEMO_STAFF_PASSWORD = process.env.DEMO_STAFF_PASSWORD || 'shift2026';

/** @typedef {'occupied'|'vacant'|'cleaning'} RoomStatus */
/** @typedef {'pending'|'in_progress'|'completed'|'cancelled'} RequestStatus */
/** @typedef {'food'|'housekeeping'|'amenity'} RequestType */

// [số phòng, loại phòng, trạng thái, khách, nhận phòng, trả phòng, số khách, mã cửa]
const ROOMS = [
  ['101', 'Garden Studio', 'occupied', 'Arthur Pendelton', '2026-11-19', '2026-11-21', 1, 'K4R92B'],
  ['102', 'Garden Studio', 'occupied', 'Claire Dubois', '2026-11-18', '2026-11-21', 2, 'P9T31W'],
  ['103', 'Garden Studio', 'vacant'],
  ['104', 'Courtyard Queen', 'occupied', "Liam O'Connor", '2026-11-20', '2026-11-23', 2, 'M2V84N'],
  ['105', 'Courtyard Queen', 'cleaning'],
  ['106', 'Courtyard Queen', 'occupied', 'Nadia Al-Mansoor', '2026-11-19', '2026-11-22', 1, 'J6L15H'],
  ['107', 'Deluxe King', 'occupied', 'Kenji Takahashi', '2026-11-17', '2026-11-21', 2, 'Q8C50Z'],
  ['108', 'Deluxe King', 'vacant'],
  ['201', 'Terrace Queen', 'occupied', 'Sofia Lindqvist', '2026-11-19', '2026-11-24', 1, 'B3F77D'],
  ['202', 'Terrace Queen', 'cleaning'],
  ['203', 'Terrace Queen', 'occupied', 'Marcus Vance', '2026-11-20', '2026-11-22', 2, 'W5Y28K'],
  ['204', 'Deluxe King Suite', 'occupied', 'Elena Vance', '2026-11-18', '2026-11-22', 2, 'X7M41Q'],
  ['205', 'Deluxe King', 'occupied', 'Hannah Abbott', '2026-11-19', '2026-11-21', 1, 'R1N63P'],
  ['206', 'Deluxe King', 'occupied', 'Mateo Morales', '2026-11-18', '2026-11-21', 2, 'T4G90J'],
  ['207', 'Corner Loft', 'vacant'],
  ['208', 'Corner Loft', 'occupied', 'Priya Nair', '2026-11-19', '2026-11-23', 2, 'Z9A12E'],
  ['301', 'Skyline Loft', 'occupied', 'Julian Mercer', '2026-11-18', '2026-11-22', 1, 'C2H48X'],
  ['302', 'Skyline Loft', 'occupied', 'Amara Okafor', '2026-11-20', '2026-11-24', 2, 'D7K39S'],
  ['303', 'Penthouse Studio', 'occupied', 'Lucas Weber', '2026-11-19', '2026-11-22', 2, 'F5M81L'],
  ['304', 'Penthouse Studio', 'cleaning'],
  ['305', 'Deluxe King', 'occupied', 'Elena Rostova', '2026-11-18', '2026-11-22', 2, 'A8K92P'],
  ['306', 'Penthouse Suite', 'occupied', 'Omar Farooq', '2026-11-19', '2026-11-23', 1, 'H3Q67U'],
  ['307', 'Terrace Suite', 'occupied', 'Grace Kim', '2026-11-20', '2026-11-22', 2, 'N6W14Y'],
  ['308', 'Terrace Suite', 'occupied', 'Daniel Brooks', '2026-11-18', '2026-11-21', 1, 'V9S55T'],
];

const IMG = 'https://lh3.googleusercontent.com/aida/';

const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();

export function seed() {
  const rooms = ROOMS.map(([number, type, status]) => ({
    number,
    floor: Number(number[0]),
    type,
    /** @type {RoomStatus} */
    status,
  }));

  const stays = ROOMS.filter((r) => r[2] === 'occupied').map(
    ([roomNumber, , , guestName, checkIn, checkOut, guests, accessCode]) => ({
      id: `stay-${roomNumber}`,
      roomNumber,
      guestName,
      guests,
      checkIn,
      checkOut,
      // Mã phòng động 6 ký tự (hiển thị dạng XXX-XXX)
      accessCode,
      active: true,
      checkoutRequested: false,
    }),
  );

  const menu = [
    { id: 'm1', name: 'Tenderloin Beef Pho', description: '12-hour star anise broth, rice noodles, fresh herbs', price: 18, prepMinutes: 18, category: 'local', image: `${IMG}ALJJyrARChHchC1XD8VjsTcgicK4vPwAS5rqiDMDsWmJvJG8iqGDhGE8XTO8dr2Fcvuhm8p20n8hG2S3C8up6L8xQCHXs5O4N9tOH0gqL1RDHblD-awGIhOUE-Izb-C2xBp04u-r2DO6GSSAgrB1MhAnvb0bnFZ_f_NC10vMpOo1lzgmTaO10jkjpHW0KmsmO8sxXWHoyUghurDt_li5ir7_sn1zTfXRrmSDX7lmy60k13Uf9Z8bL69Ahw` },
    { id: 'm2', name: 'Artisan Iced Coffee', description: 'Single-origin espresso over cold milk & ice', price: 6.5, prepMinutes: 5, category: 'drinks', image: `${IMG}ALJJyrCMYIItfEv5XovK45h0F12AtlwyNZuRGL-ifkV9shfTW4dulHgtYPWtiM4MwiyqtZ_Vzob1IhyLSlu45np4Ca9L3sMzJbk4Ej6hbFV_eydci5PaU0-r8yohFIbEgtV2C-ivlz6QDJ8ce5WcaRo0ilvRnkdu8h4iAfW9D1VThVoM-ijFTJtXAPtdN2VH_uIRZZaSe_18KRdUyGaK74nX2WGCflikyv2bJtybkeMh0zfyd945Ld_0zrF22V8` },
    { id: 'm3', name: 'Sourdough Avocado Toast', description: 'Poached farm egg, toasted sesame, microgreens', price: 15, prepMinutes: 12, category: 'breakfast', image: `${IMG}ALJJyrBBmhrffFToFdgT98DsBWaCy4B1PkDKo75LX2Eeuxw0PVAFiyAC33hbJPCQdsQgcLfnipszAenjejv7fKJ2CRNI9Dub1Nf44YLT8s87HGYVqbHZjcFyllrvOjkKPBJYnRTOtSbCXKuR67alRn6y0DA36JTmDJfHa_zxYr3bON83UT13TEdMAIRNL-prLZr5N9kX_DA4nHvX5v58Av-MGoBAdc0ENQ-cVH1fnC7KsgPaFabbkLqecQ2lmo6ADQ` },
    { id: 'm4', name: 'Warm Butter Croissants', description: 'Two French pastries, wildflower honeycomb, figs', price: 11, prepMinutes: 8, category: 'breakfast', image: `${IMG}ALJJyrAaldzKcLsXyQhT-jGJOuaSmIY0JZFwXnsGlhUQcsK8UqdThpMuo7j1qZcMRwuBUwXWZUCknUKl-dOebpnQymAOIan8U2T5H_DrqqhMq7lu57SIjl-VrlO6bV8PeYx0qdrJsEbYTLZPBgm9afYBMovgtPqa3x5UFjJA834FqROj6DbBlRxgO8kdMHsn3n2IFrvOruiVUCZalsv7PMmBmYnPKbkwE4CYZa1TXiB-J5W4iyKoAZXoeHxy4m0_G-o29E2elA` },
    { id: 'm5', name: 'Truffle Wagyu Burger', description: 'Wagyu patty, truffle aioli, brioche', price: 28, prepMinutes: 20, category: 'local', image: null },
    { id: 'm6', name: 'Sparkling Mineral Water', description: '750ml bottle', price: 7, prepMinutes: 2, category: 'drinks', image: null },
  ];

  // Tài khoản demo — mật khẩu chung DEMO_STAFF_PASSWORD, chỉ dùng khi phát triển
  const staff = [
    { id: 'RC-01', name: 'Maya Lin', department: 'reception', email: 'maya@apphotel.vn' },
    { id: 'KT-02', name: 'Marco Rossi', department: 'kitchen', email: 'marco@apphotel.vn' },
    { id: 'HK-04', name: 'Minh Anh', department: 'housekeeping', email: 'minhanh@apphotel.vn' },
    { id: 'HK-05', name: 'Soraia Silva', department: 'housekeeping', email: 'soraia@apphotel.vn' },
    { id: 'MG-01', name: 'David Park', department: 'manager', email: 'david@apphotel.vn' },
  ].map((s) => ({ ...s, passwordHash: hashPassword(DEMO_STAFF_PASSWORD) }));

  /**
   * department suy ra từ type: food -> kitchen, còn lại -> housekeeping
   * @type {Array<{id:string, roomNumber:string, type:RequestType, title:string,
   *   items:Array<{name:string, qty:number, price?:number}>, note?:string,
   *   status:RequestStatus, assignedTo?:string|null, createdAt:string}>}
   */
  const requests = [
    { id: 'REQ-412', roomNumber: '204', type: 'food', title: 'Room Service', items: [{ name: 'Truffle Wagyu Burger', qty: 1, price: 28 }, { name: 'Sparkling Mineral Water', qty: 1, price: 7 }], note: 'Medium-rare, no caramelized onions', status: 'pending', assignedTo: null, createdAt: minutesAgo(4) },
    { id: 'REQ-411', roomNumber: '105', type: 'housekeeping', kind: 'turnover', title: 'Turnover Cleaning', items: [{ name: 'Full Linen & Bath Reset', qty: 1 }], note: 'Next check-in scheduled at 21:00', status: 'pending', assignedTo: null, createdAt: minutesAgo(7) },
    { id: 'REQ-410', roomNumber: '302', type: 'food', title: 'F&B Order', items: [{ name: 'Grilled Salmon Bowl', qty: 1, price: 27 }, { name: 'Herbal Tea', qty: 1, price: 5 }], note: 'Dressing on the side, allergy: sesame', status: 'in_progress', assignedTo: 'KT-02', createdAt: minutesAgo(11) },
    { id: 'REQ-409', roomNumber: '202', type: 'amenity', title: 'Amenity Request', items: [{ name: 'Hypoallergenic Pillows', qty: 2 }, { name: 'Towels', qty: 2 }], note: 'Deliver quietly, baby sleeping', status: 'pending', assignedTo: null, createdAt: minutesAgo(14) },
    { id: 'REQ-408', roomNumber: '107', type: 'food', title: 'Beverage Bar', items: [{ name: 'Sparkling Sake Carafe', qty: 1, price: 32 }, { name: 'Edamame', qty: 1, price: 6 }], note: 'Include 2 chilled glasses', status: 'in_progress', assignedTo: 'KT-02', createdAt: minutesAgo(19) },
    { id: 'REQ-407', roomNumber: '304', type: 'housekeeping', title: 'Deep Sanitization', items: [{ name: 'Post-Checkout Refresh', qty: 1 }], note: 'Minibar restock verified', status: 'completed', assignedTo: 'HK-05', createdAt: minutesAgo(28) },
    { id: 'REQ-405', roomNumber: '204', type: 'food', title: 'Bar Order', items: [{ name: 'Espresso Martini', qty: 1, price: 18 }], status: 'completed', assignedTo: 'KT-02', createdAt: minutesAgo(180) },
    { id: 'REQ-302', roomNumber: '305', type: 'food', title: 'Room Service', items: [{ name: 'Tenderloin Beef Pho', qty: 1, price: 18 }, { name: 'Artisan Iced Coffee', qty: 1, price: 6.5 }], status: 'completed', assignedTo: 'KT-02', createdAt: minutesAgo(95) },
    { id: 'REQ-305', roomNumber: '305', type: 'housekeeping', title: 'Clean Room Now', items: [{ name: 'Full room tidying & bed making', qty: 1 }, { name: 'Mineral Water bottles', qty: 2 }, { name: 'Fresh Bath Towels', qty: 2 }], note: 'Please knock softly, baby sleeping.', status: 'in_progress', assignedTo: 'HK-04', createdAt: minutesAgo(6) },
  ];

  return { rooms, stays, menu, staff, requests };
}

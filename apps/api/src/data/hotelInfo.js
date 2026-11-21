// Kiến thức cho chatbot "hướng dẫn viên ảo" – dữ liệu mẫu, khách sạn sửa lại cho đúng thực tế.
// Chatbot CHỈ trả lời dựa trên dữ liệu này (qua tool get_hotel_info), không tự bịa.

export const HOTEL_TIMEZONE = 'Asia/Ho_Chi_Minh';

export const hotelInfo = {
  hotel: {
    name: 'The Laurel Boutique Hotel',
    address: '24 Hang Bac Street, Hoan Kiem, Hanoi',
    phone: 'Dial 0 from your suite phone (reception, 24/7)',
    checkIn: '14:00',
    checkOut: '12:00',
  },
  breakfast: {
    hours: '06:30 – 10:30 daily',
    venue: 'Garden Conservatory, ground floor',
    style: 'Buffet with Vietnamese and Western dishes; phở station until 10:00',
    inRoom: 'Breakfast items can be ordered to the room any time through Room Service',
    included: 'Included for all suites',
  },
  dining: {
    roomService: '24 hours via the app (Dining tab) or the AI concierge',
    restaurant: 'Laurel Bistro – lunch 11:30–14:00, dinner 18:00–22:00',
    bar: 'Rooftop Bar – 16:00–24:00, happy hour 17:00–19:00',
  },
  amenities: [
    { name: 'Spa', detail: 'Level 5, 09:00–21:00; book via reception, 60-min Vietnamese massage from $45' },
    { name: 'Gym', detail: 'Level 5, open 24h with your room keycard' },
    { name: 'Rooftop pool', detail: 'Level 8, 07:00–20:00; towels at the pool desk' },
    { name: 'Laundry', detail: 'Same-day if requested before 10:00 – ask housekeeping' },
    { name: 'Luggage storage', detail: 'Free at reception before check-in and after check-out' },
    { name: 'Airport transfer', detail: 'Private car to Noi Bai Airport ~45 min, $25 – book at reception 3 hours ahead' },
  ],
  policies: {
    housekeeping: 'Daily cleaning 09:00–17:00; pick a time slot in the app or ask for Clean Room Now',
    lateCheckout: 'Until 14:00 free on request, subject to availability; after that half-day rate',
    smoking: 'Non-smoking hotel; smoking area on the rooftop terrace',
    pets: 'Not allowed',
    quietHours: '22:00 – 07:00',
  },
  wifi: { network: 'Laurel_Guest', password: 'Given on your keycard sleeve', note: 'Free high-speed Wi-Fi in all areas' },
  attractions: [
    { name: 'Hoan Kiem Lake & Ngoc Son Temple', distance: '5 min walk', tip: 'Best at sunrise; the lakeside streets are pedestrian-only on weekend evenings' },
    { name: 'Hanoi Old Quarter (36 streets)', distance: 'Right outside the hotel', tip: 'Try street food on Ta Hien and egg coffee nearby' },
    { name: 'Thang Long Water Puppet Theatre', distance: '7 min walk', tip: 'Shows from 15:00 to 20:00; reception can book tickets' },
    { name: 'Dong Xuan Market', distance: '12 min walk', tip: 'Largest covered market in Hanoi, open 06:00–18:00' },
    { name: 'Temple of Literature', distance: '10 min by taxi', tip: 'Vietnam’s first university, open 08:00–17:00' },
    { name: 'Hanoi Train Street', distance: '15 min walk', tip: 'Check train times with reception before going' },
  ],
  transport: {
    taxi: 'Reception can call a metered taxi or a ride-hailing car (Grab, Xanh SM)',
    walking: 'Most Old Quarter sights are within a 15-minute walk',
  },
};

export const HOTEL_INFO_TOPICS = ['breakfast', 'dining', 'amenities', 'policies', 'wifi', 'attractions', 'transport', 'hotel'];

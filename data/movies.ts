
import { Movie } from '../types';

export const movies: Movie[] = [
  {
    id: '1',
    title: {
      en: 'The Cosmic Horizon',
      ru: 'Космический Горизонт',
      uz: 'Koinot Gorizonti'
    },
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1600&q=80',
    videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
    year: 2024,
    genre: ['Sci-Fi', 'Adventure'],
    rating: 8.9,
    description: {
      en: 'An intrepid crew of explorers embarks on a journey beyond the edge of the known universe.',
      ru: 'Отважная команда исследователей отправляется в путешествие за край известной вселенной.',
      uz: 'Jasur tadqiqotchilar jamoasi ma\'lum koinot chekkasidan tashqariga sayohatga chiqadi.'
    },
    duration: '2h 15m',
    country: 'USA',
    isTrending: true,
    isNew: true,
    views: 125430
  },
  {
    id: '2',
    title: {
      en: 'Midnight in Tashkent',
      ru: 'Полночь в Ташкенте',
      uz: 'Toshkentda yarim tun'
    },
    poster: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80',
    videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
    year: 2023,
    genre: ['Drama', 'Mystery'],
    rating: 7.5,
    description: {
      en: 'A detective is pulled into a web of conspiracy in the heart of Uzbekistan.',
      ru: 'Детектив оказывается втянут в паутину заговора в самом сердце Узбекистана.',
      uz: 'Detektiv O\'zbekiston markazida fitna to\'riga tushib qoladi.'
    },
    duration: '1h 50m',
    country: 'Uzbekistan',
    isTrending: true,
    views: 89020
  }
];

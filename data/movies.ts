import { Movie } from '../types';

export const movies: Movie[] = [
  {
    id: '282b83943421',
    title: {
      en: 'SocialLink',
      ru: 'СоцСвязь',
      uz: 'Dastur',
    },
    description: {
      en: 'ConnectMe is a modern social media application where users can create profiles, follow each other, like posts, write comments, share content, and save favorite posts.',
      ru: 'СвяжиМеня - современное приложение социальной сети для профилей, подписок, лайков, комментариев, публикаций и сохранения постов.',
      uz: "MeniBog'la - foydalanuvchilar profil yaratishi, kuzatishi, layk bosishi, kommentariya yozishi, ulashishi va postlarni saqlashi mumkin bo'lgan zamonaviy ijtimoiy tarmoq dasturi.",
    },
    poster: 'https://img.kinochilar.com/uploads/posts/1732659724-2098248055-dastur-kinochilar-com.jpg',
    backdrop: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1600&q=80',
    videoUrl: 'https://Movie-uz.b-cdn.net/Dastur_720.mp4',
    year: 2023,
    genre: ['Fantastic'],
    rating: 10,
    duration: '1h 41m',
    country: 'Kazakh',
    isTrending: true,
    isNew: true,
    views: 18,
  },
  {
    id: '27bdd5ff1829',
    title: {
      en: 'Avengers ',
      ru: 'Мстители',
      uz: 'Qasoskorlar',
    },
    description: {
      en: 'When Loki threatens Earth, Nick Fury brings together Iron Man, Captain America, Thor, Hulk, Black Widow, and Hawkeye to form the Avengers.',
      ru: 'Когда Локи угрожает Земле, Ник Фьюри собирает Железного человека, Капитана Америку, Тора, Халка, Чёрную вдову и Соколиного глаза.',
      uz: "Loki Yerga tahdid solganda, Nik Fyuri Iron Man, Kapitan Amerika, Tor, Halk, Black Widow va Hawkeye kabi qahramonlarni bir jamoaga yig'adi.",
    },
    poster: 'https://m.media-amazon.com/images/M/MV5BNGE0YTVjNzUtNzJjOS00NGNlLTgxMzctZTY4YTE1Y2Y1ZTU4XkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1600&q=80',
    videoUrl: 'https://Movie-uz.b-cdn.net/Avenger.mp4',
    year: 2012,
    genre: ['Action'],
    rating: 0,
    duration: '2h 23 m',
    country: 'USA',
    isTrending: false,
    isNew: true,
    views: 68,
  },
];

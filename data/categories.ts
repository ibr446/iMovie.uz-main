import { Language } from '../types';

export interface MovieCategory {
  genre: string;
  label: Record<Language, string>;
  description: Record<Language, string>;
  accent: string;
  icon: 'sparkles' | 'sword' | 'rocket' | 'laugh' | 'heart' | 'ghost' | 'clapper' | 'search' | 'compass';
}

export const movieCategories: MovieCategory[] = [
  {
    genre: 'Action',
    label: { en: 'Action', ru: 'Боевики', uz: 'Jangari' },
    description: {
      en: 'Fast cuts, big stakes, nonstop energy.',
      ru: 'Быстрый монтаж, большие ставки и непрерывная энергия.',
      uz: 'Tez sahnalar, katta xavf va kuchli temp.'
    },
    accent: 'from-red-500/25 via-orange-500/10 to-zinc-900',
    icon: 'sword'
  },
  {
    genre: 'Adventure',
    label: { en: 'Adventure', ru: 'Приключение', uz: 'Sarguzasht' },
    description: {
      en: 'Journeys, discoveries, and bold heroes.',
      ru: 'Путешествия, открытия и смелые герои.',
      uz: 'Sayohat, kashfiyot va jasur qahramonlar.'
    },
    accent: 'from-emerald-500/25 via-cyan-500/10 to-zinc-900',
    icon: 'compass'
  },
  {
    genre: 'Comedy',
    label: { en: 'Comedy', ru: 'Комедия', uz: 'Komediya' },
    description: {
      en: 'Easy watches for a lighter mood.',
      ru: 'Лёгкие фильмы для хорошего настроения.',
      uz: 'Kayfiyatni ko‘taradigan yengil filmlar.'
    },
    accent: 'from-yellow-400/25 via-lime-400/10 to-zinc-900',
    icon: 'laugh'
  },
  {
    genre: 'Drama',
    label: { en: 'Drama', ru: 'Драма', uz: 'Drama' },
    description: {
      en: 'Character stories with real emotional weight.',
      ru: 'Истории персонажей с настоящей эмоциональной глубиной.',
      uz: 'His-tuyg‘usi kuchli, hayotga yaqin hikoyalar.'
    },
    accent: 'from-sky-500/25 via-indigo-500/10 to-zinc-900',
    icon: 'clapper'
  },
  {
    genre: 'Horror',
    label: { en: 'Horror', ru: 'Ужастики', uz: 'Qo‘rqinchli' },
    description: {
      en: 'Dark rooms, tense scenes, sharp surprises.',
      ru: 'Тёмные комнаты, напряжённые сцены и резкие неожиданные моменты.',
      uz: 'Sirli muhit, keskin sahnalar va kutilmagan burilishlar.'
    },
    accent: 'from-violet-500/25 via-fuchsia-500/10 to-zinc-900',
    icon: 'ghost'
  },
  {
    genre: 'Mystery',
    label: { en: 'Mystery', ru: 'Мистические', uz: 'Sirli' },
    description: {
      en: 'Clues, secrets, and twists until the end.',
      ru: 'Улики, тайны и неожиданные повороты до самого конца.',
      uz: 'Izlar, sirlar va oxirigacha qiziq burilishlar.'
    },
    accent: 'from-zinc-400/25 via-slate-500/10 to-zinc-900',
    icon: 'search'
  },
  {
    genre: 'Romance',
    label: { en: 'Romance', ru: 'Романтика', uz: 'Romantika' },
    description: {
      en: 'Love stories, warm scenes, and soft tension.',
      ru: 'Истории о любви, тёплые сцены и мягкое напряжение.',
      uz: 'Muhabbat, iliq sahnalar va mayin hayajon.'
    },
    accent: 'from-pink-500/25 via-rose-500/10 to-zinc-900',
    icon: 'heart'
  },
  {
    genre: 'fantastic',
    label: { en: 'fantastic', ru: 'Фантастика', uz: 'Fantastika' },
    description: {
      en: 'Future worlds, space, tech, and big ideas.',
      ru: 'Будущие миры, космос, технологии и большие идеи.',
      uz: 'Kelajak, kosmos, texnologiya va katta g‘oyalar.'
    },
    accent: 'from-cyan-400/25 via-blue-500/10 to-zinc-900',
    icon: 'rocket'
  }
];

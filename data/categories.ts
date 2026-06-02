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
    label: { en: 'Action', ru: 'Action', uz: 'Jangari' },
    description: {
      en: 'Fast cuts, big stakes, nonstop energy.',
      ru: 'Fast cuts, big stakes, nonstop energy.',
      uz: 'Tez sahnalar, katta xavf va kuchli temp.'
    },
    accent: 'from-red-500/25 via-orange-500/10 to-zinc-900',
    icon: 'sword'
  },
  {
    genre: 'Adventure',
    label: { en: 'Adventure', ru: 'Adventure', uz: 'Sarguzasht' },
    description: {
      en: 'Journeys, discoveries, and bold heroes.',
      ru: 'Journeys, discoveries, and bold heroes.',
      uz: 'Sayohat, kashfiyot va jasur qahramonlar.'
    },
    accent: 'from-emerald-500/25 via-cyan-500/10 to-zinc-900',
    icon: 'compass'
  },
  {
    genre: 'Comedy',
    label: { en: 'Comedy', ru: 'Comedy', uz: 'Komediya' },
    description: {
      en: 'Easy watches for a lighter mood.',
      ru: 'Easy watches for a lighter mood.',
      uz: 'Kayfiyatni ko‘taradigan yengil filmlar.'
    },
    accent: 'from-yellow-400/25 via-lime-400/10 to-zinc-900',
    icon: 'laugh'
  },
  {
    genre: 'Drama',
    label: { en: 'Drama', ru: 'Drama', uz: 'Drama' },
    description: {
      en: 'Character stories with real emotional weight.',
      ru: 'Character stories with real emotional weight.',
      uz: 'His-tuyg‘usi kuchli, hayotga yaqin hikoyalar.'
    },
    accent: 'from-sky-500/25 via-indigo-500/10 to-zinc-900',
    icon: 'clapper'
  },
  {
    genre: 'Horror',
    label: { en: 'Horror', ru: 'Horror', uz: 'Qo‘rqinchli' },
    description: {
      en: 'Dark rooms, tense scenes, sharp surprises.',
      ru: 'Dark rooms, tense scenes, sharp surprises.',
      uz: 'Sirli muhit, keskin sahnalar va kutilmagan burilishlar.'
    },
    accent: 'from-violet-500/25 via-fuchsia-500/10 to-zinc-900',
    icon: 'ghost'
  },
  {
    genre: 'Mystery',
    label: { en: 'Mystery', ru: 'Mystery', uz: 'Sirli' },
    description: {
      en: 'Clues, secrets, and twists until the end.',
      ru: 'Clues, secrets, and twists until the end.',
      uz: 'Izlar, sirlar va oxirigacha qiziq burilishlar.'
    },
    accent: 'from-zinc-400/25 via-slate-500/10 to-zinc-900',
    icon: 'search'
  },
  {
    genre: 'Romance',
    label: { en: 'Romance', ru: 'Romance', uz: 'Romantika' },
    description: {
      en: 'Love stories, warm scenes, and soft tension.',
      ru: 'Love stories, warm scenes, and soft tension.',
      uz: 'Muhabbat, iliq sahnalar va mayin hayajon.'
    },
    accent: 'from-pink-500/25 via-rose-500/10 to-zinc-900',
    icon: 'heart'
  },
  {
    genre: 'Sci-Fi',
    label: { en: 'Sci-Fi', ru: 'Sci-Fi', uz: 'Fantastika' },
    description: {
      en: 'Future worlds, space, tech, and big ideas.',
      ru: 'Future worlds, space, tech, and big ideas.',
      uz: 'Kelajak, kosmos, texnologiya va katta g‘oyalar.'
    },
    accent: 'from-cyan-400/25 via-blue-500/10 to-zinc-900',
    icon: 'rocket'
  }
];

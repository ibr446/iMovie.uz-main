
export interface Movie {
  id: string;
  title: Record<Language, string>;
  poster: string;
  backdrop: string;
  videoUrl: string;
  year: number;
  genre: string[];
  rating: number;
  description: Record<Language, string>;
  duration: string;
  country: string;
  isTrending?: boolean;
  isNew?: boolean;
  views: number;
}

export type Language = 'en' | 'ru' | 'uz';

export interface Comment {
  id: string;
  movieId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  date: string;
  rating: number;
  parentId?: string | null;
  isEdited?: boolean;
  replies?: Comment[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'user' | 'admin';
  watchHistory: string[];
  savedMovies: string[];
}

export type Theme = 'dark' | 'light';

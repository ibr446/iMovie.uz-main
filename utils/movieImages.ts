import { Movie } from '../types';

const GENERIC_IMAGE_HOSTS = [
  'images.unsplash.com',
  'source.unsplash.com',
  'picsum.photos',
];

const LOCAL_BACKDROPS = [
  {
    patterns: ['avengers', 'мстители'],
    image: '/photos/The_Avengers_(2012_film)_poster.jpg',
  },
  {
    patterns: ['dastur', 'дастур'],
    image: '/photos/dastur.webp',
  },
];

function getMovieSearchText(movie: Movie): string {
  return Object.values(movie.title).join(' ').toLowerCase();
}

export function getLocalMovieBackdrop(movie: Movie): string {
  const text = getMovieSearchText(movie);
  return LOCAL_BACKDROPS.find(item => item.patterns.some(pattern => text.includes(pattern)))?.image || '';
}

export function isGenericMovieImage(url?: string): boolean {
  if (!url) return true;

  try {
    const host = new URL(url).hostname.toLowerCase();
    return GENERIC_IMAGE_HOSTS.some(genericHost => host === genericHost || host.endsWith(`.${genericHost}`));
  } catch {
    return false;
  }
}

export function getMovieHeroImage(movie: Movie): string {
  const localBackdrop = getLocalMovieBackdrop(movie);
  if (localBackdrop) {
    return localBackdrop;
  }

  const backdrop = movie.backdrop?.trim();
  const poster = movie.poster?.trim();

  if (backdrop && backdrop !== poster && !isGenericMovieImage(backdrop)) {
    return backdrop;
  }

  return poster || backdrop || '';
}

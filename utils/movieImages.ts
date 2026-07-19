import { Movie } from '../types';

const GENERIC_IMAGE_HOSTS = [
  'images.unsplash.com',
  'source.unsplash.com',
  'picsum.photos',
];

type BackdropRule = {
  patterns: string[];
  image: string;
};

const DESKTOP_BACKDROPS: BackdropRule[] = [
  {
    patterns: ['avengers', 'qasoskorlar'],
    image: '/photos/01-avengers-2012.webp',
  },
  {
    patterns: ['dastur', 'sociallink'],
    image: '/photos/maxresdefault.jpg',
  },
  {
    patterns: ['true education', 'haqiqiy ta’lim'],
    image: '/photos/true.jpg'
  },
  {
    patterns: ['bloodhounds', 'ovchi itla'],
    image: '/photos/blood.jfif'
  },
  {
    patterns: ['agent kim', 'agent kim'],
    image: '/photos/agent.jpg'
  }
];

const MOBILE_BACKDROPS: BackdropRule[] = [
  {
    patterns: ['avengers', 'qasoskorlar'],
    image: '/photos/The_Avengers_(2012_film)_poster.jpg',
  },
  {
    patterns: ['dastur', 'sociallink'],
    image: '/photos/dastur.webp',
  },
  {
    patterns: ['true education', 'haqiqiy ta’lim'],
    image: '/photos/true.jfif'
  },
  {
    patterns: ['bloodhounds', 'ovchi itla'],
    image: '/photos/bloodhounds.jfif'
  },
  {
    patterns: ['agent kim', 'agent kim'],
    image: '/photos/agent.jfif'
  }
];

function getMovieSearchText(movie: Movie): string {
  return Object.values(movie.title).join(' ').toLowerCase();
}

export function getLocalMovieBackdrop(movie: Movie): string {
  const text = getMovieSearchText(movie);
  return DESKTOP_BACKDROPS.find(item => item.patterns.some(pattern => text.includes(pattern)))?.image || '';
}

export function getLocalMovieMobileBackdrop(movie: Movie): string {
  const text = getMovieSearchText(movie);
  return MOBILE_BACKDROPS.find(item => item.patterns.some(pattern => text.includes(pattern)))?.image || '';
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

export function getMovieMobileHeroImage(movie: Movie): string {
  return getLocalMovieMobileBackdrop(movie) || getMovieHeroImage(movie);
}

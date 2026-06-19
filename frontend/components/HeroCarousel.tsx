
import React, { useState, useEffect } from 'react';
import { Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie } from '../../types';
import GlassButton from './GlassButton';
import { useTranslation } from '../context/LanguageContext';
import { getLocalMovieBackdrop, getMovieHeroImage, getMovieMobileHeroImage, isGenericMovieImage } from '../../utils/movieImages';

interface HeroCarouselProps {
  movies: Movie[];
  onPlay: (id: string) => void;
  onInfo: (id: string) => void;
}

const HeroCarousel: React.FC<HeroCarouselProps> = ({ movies, onPlay, onInfo }) => {
  const { t, lang } = useTranslation();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (movies.length < 2) return;
    const timer = setInterval(() => setCurrent(prev => (prev + 1) % movies.length), 10000);
    return () => clearInterval(timer);
  }, [movies.length]);

  if (!movies.length) return null;
  const activeMovie = movies[current];

  return (
    <div className="relative h-[86svh] min-h-[620px] w-full overflow-hidden md:h-[90vh]">
      {movies.map((movie, idx) => (
        <div 
          key={movie.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === current ? 'opacity-100' : 'opacity-0'}`}
        >
          {(() => {
            const heroImage = getMovieHeroImage(movie);
            const mobileHeroImage = getMovieMobileHeroImage(movie);
            const isLocalHero = heroImage === getLocalMovieBackdrop(movie);
            const isPosterHero = !isLocalHero && (heroImage === movie.poster || isGenericMovieImage(movie.backdrop));

            return (
              <>
                <picture className="block h-full w-full">
                  <source media="(max-width: 767px)" srcSet={mobileHeroImage} />
                  <img
                    src={heroImage}
                    alt={movie.title[lang]}
                    className={`h-full w-full object-cover ${isPosterHero ? 'scale-125 blur-xl opacity-80' : 'scale-105'}`}
                    onError={(event) => {
                      if (movie.poster && event.currentTarget.src !== movie.poster) {
                        event.currentTarget.src = movie.poster;
                      }
                    }}
                  />
                </picture>
                {isPosterHero && movie.poster && (
                  <img
                    src={movie.poster}
                    alt=""
                    aria-hidden="true"
                    className="absolute right-[10%] top-1/2 hidden h-[72%] -translate-y-1/2 rotate-3 rounded-3xl object-cover opacity-25 shadow-2xl lg:block"
                  />
                )}
              </>
            );
          })()}
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-black via-black/45 to-transparent" />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-zinc-950 via-zinc-950/25 to-transparent" />
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/70 via-transparent to-transparent md:from-transparent" />
        </div>
      ))}

      <div className="absolute inset-0 z-20 flex items-end pb-28 pt-24 md:items-center md:pb-0 md:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl space-y-4 md:space-y-6">
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-8 duration-700">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-md md:px-4 md:text-[10px]">
                {t('premium_content')}
              </span>
              <span className="text-zinc-400 text-sm font-bold">{activeMovie.year} • {activeMovie.duration}</span>
            </div>
            
            <h1 className="max-w-[92vw] text-5xl font-black leading-[0.9] tracking-tight text-white animate-in fade-in slide-in-from-left-12 duration-1000 delay-100 sm:text-6xl md:text-8xl">
              {activeMovie.title[lang]}
            </h1>
            
            <p className="line-clamp-3 max-w-[320px] text-sm font-medium leading-6 text-zinc-200 animate-in fade-in slide-in-from-left-16 duration-1000 delay-200 sm:max-w-2xl sm:text-base md:line-clamp-none md:text-xl md:text-zinc-400">
              {activeMovie.description[lang]}
            </p>

            <div className="grid w-full max-w-[320px] grid-cols-1 gap-3 pt-3 animate-in fade-in slide-in-from-left-20 duration-1000 delay-300 sm:flex sm:max-w-none sm:flex-wrap sm:gap-4 md:pt-4">
              <GlassButton onClick={() => onPlay(activeMovie.id)} className="w-full justify-center px-5 py-4 text-sm sm:w-auto sm:px-8 md:px-10 md:py-5 md:text-lg">
                <Play className="h-5 w-5 fill-current md:h-6 md:w-6" /> {t('watch_now')}
              </GlassButton>
              <GlassButton variant="secondary" onClick={() => onInfo(activeMovie.id)} className="w-full justify-center px-5 py-4 text-sm sm:w-auto sm:px-8 md:px-10 md:py-5 md:text-lg">
                <Info className="h-5 w-5 md:h-6 md:w-6" /> {t('more_details')}
              </GlassButton>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-7 right-4 z-30 flex items-center gap-3 md:bottom-12 md:right-12 md:gap-4">
        <button onClick={() => setCurrent(prev => (prev - 1 + movies.length) % movies.length)} className="rounded-full border-white/10 p-3 text-white transition-all glass hover:bg-white/20 md:p-4">
          <ChevronLeft size={24} />
        </button>
        <button onClick={() => setCurrent(prev => (prev + 1) % movies.length)} className="rounded-full border-white/10 p-3 text-white transition-all glass hover:bg-white/20 md:p-4">
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

export default HeroCarousel;

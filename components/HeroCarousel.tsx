
import React, { useState, useEffect } from 'react';
import { Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie } from '../types';
import GlassButton from './GlassButton';
import { useTranslation } from '../context/LanguageContext';
import { getLocalMovieBackdrop, getMovieHeroImage, isGenericMovieImage } from '../utils/movieImages';

interface HeroCarouselProps {
  movies: Movie[];
  onPlay: (id: string) => void;
  onInfo: (id: string) => void;
}

const HeroCarousel: React.FC<HeroCarouselProps> = ({ movies, onPlay, onInfo }) => {
  const { t, lang } = useTranslation();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrent(prev => (prev + 1) % movies.length), 10000);
    return () => clearInterval(timer);
  }, [movies.length]);

  if (!movies.length) return null;
  const activeMovie = movies[current];

  return (
    <div className="relative w-full h-[75vh] md:h-[90vh] overflow-hidden">
      {movies.map((movie, idx) => (
        <div 
          key={movie.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === current ? 'opacity-100' : 'opacity-0'}`}
        >
          {(() => {
            const heroImage = getMovieHeroImage(movie);
            const isLocalHero = heroImage === getLocalMovieBackdrop(movie);
            const isPosterHero = !isLocalHero && (heroImage === movie.poster || isGenericMovieImage(movie.backdrop));

            return (
              <>
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
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10" />
        </div>
      ))}

      <div className="absolute inset-0 z-20 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-8 duration-700">
              <span className="px-4 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-black text-white uppercase tracking-[0.2em]">
                {t('premium_content')}
              </span>
              <span className="text-zinc-400 text-sm font-bold">{activeMovie.year} • {activeMovie.duration}</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black text-white leading-[0.9] tracking-tighter animate-in fade-in slide-in-from-left-12 duration-1000 delay-100">
              {activeMovie.title[lang]}
            </h1>
            
            <p className="text-lg md:text-xl text-zinc-400 line-clamp-3 md:line-clamp-none max-w-2xl animate-in fade-in slide-in-from-left-16 duration-1000 delay-200 font-medium">
              {activeMovie.description[lang]}
            </p>

            <div className="flex flex-wrap gap-4 pt-4 animate-in fade-in slide-in-from-left-20 duration-1000 delay-300">
              <GlassButton onClick={() => onPlay(activeMovie.id)} className="text-lg px-10 py-5">
                <Play className="w-6 h-6 fill-current" /> {t('watch_now')}
              </GlassButton>
              <GlassButton variant="secondary" onClick={() => onInfo(activeMovie.id)} className="text-lg px-10 py-5">
                <Info className="w-6 h-6" /> {t('more_details')}
              </GlassButton>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 right-12 z-30 flex items-center gap-4">
        <button onClick={() => setCurrent(prev => (prev - 1 + movies.length) % movies.length)} className="p-4 rounded-full glass border-white/10 text-white hover:bg-white/20 transition-all">
          <ChevronLeft size={28} />
        </button>
        <button onClick={() => setCurrent(prev => (prev + 1) % movies.length)} className="p-4 rounded-full glass border-white/10 text-white hover:bg-white/20 transition-all">
          <ChevronRight size={28} />
        </button>
      </div>
    </div>
  );
};

export default HeroCarousel;

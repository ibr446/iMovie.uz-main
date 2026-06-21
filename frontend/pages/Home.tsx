
import React from 'react';
import {
  ChevronRight,
  Clapperboard,
  Compass,
  Ghost,
  Heart,
  Laugh,
  Rocket,
  Search,
  Sparkles,
  Swords
} from 'lucide-react';
import { useMovies } from '../context/MovieContext';
import HeroCarousel from '../components/HeroCarousel';
import MovieCard from '../components/MovieCard';
import { useTranslation } from '../context/LanguageContext';
import { movieCategories, MovieCategory } from '../../data/categories';

interface HomeProps {
  onMovieClick: (id: string) => void;
  onWatchClick: (id: string) => void;
  onCategoryClick: (genre: string) => void;
}

const categoryIcons: Record<MovieCategory['icon'], React.ElementType> = {
  sparkles: Sparkles,
  sword: Swords,
  rocket: Rocket,
  laugh: Laugh,
  heart: Heart,
  ghost: Ghost,
  clapper: Clapperboard,
  search: Search,
  compass: Compass
};

const Home: React.FC<HomeProps> = ({ onMovieClick, onWatchClick, onCategoryClick }) => {
  const { t, lang } = useTranslation();
  const { movies } = useMovies();
  
  const featuredMovies = movies.slice(0, 3);
  const trending = movies.filter(m => m.isTrending || m.rating >= 8);
  const newlyReleased = movies.filter(m => m.isNew || m.year === 2024 || m.year === 2025);
  const allMoviesTitle = lang === 'uz' ? 'Barcha filmlar' : lang === 'ru' ? 'Все фильмы' : 'All Movies';
  
  const MovieRow = ({ title, data }: { title: string, data: typeof movies }) => (
    <section className="mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 md:mb-12">
      <div className="mb-4 flex items-center justify-between px-1 md:mb-6 md:px-2">
        <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">{title}</h2>
        <button className="hidden items-center text-sm font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:text-white sm:flex">
          See All <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6">
        {data.map(movie => (
          <MovieCard key={movie.id} movie={movie} onClick={onMovieClick} />
        ))}
      </div>
    </section>
  );

  return (
    <main className="min-h-screen bg-zinc-950">
      <HeroCarousel 
        movies={featuredMovies} 
        onPlay={onWatchClick} 
        onInfo={onMovieClick} 
      />
      
      <div className="relative z-20 mx-auto -mt-20 max-w-7xl space-y-14 px-4 py-10 sm:px-6 md:space-y-24 md:py-12 lg:px-8">
        <MovieRow title={t('trending')} data={trending} />
        <MovieRow title={t('new_releases')} data={newlyReleased} />
        <MovieRow title={allMoviesTitle} data={movies} />
        
        <section id="categories" className="scroll-mt-28 overflow-hidden border-y border-white/5 py-10 md:py-12">
          <div className="mb-6 px-1 md:mb-8 md:px-2">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">{t('categories')}</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">Pick Your Mood</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
            {movieCategories.map((category) => {
              const Icon = categoryIcons[category.icon];
              const count = movies.filter(movie => movie.genre.includes(category.genre)).length;

              return (
                <button
                  key={category.genre}
                  type="button"
                  onClick={() => onCategoryClick(category.genre)}
                  className="group relative min-h-36 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 p-4 text-left transition-all hover:-translate-y-1 hover:border-white/25 hover:bg-zinc-900 md:min-h-40 md:p-5"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.accent} opacity-80 transition-opacity group-hover:opacity-100`} />
                  <div className="relative z-10 flex h-full flex-col justify-between gap-8">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white md:h-11 md:w-11">
                        <Icon size={20} />
                      </div>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-bold text-zinc-300 md:text-xs">
                        {count} films
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-white md:text-2xl">{category.label[lang]}</h3>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-300 md:text-sm">{category.description[lang]}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <MovieRow title={t('top_rated')} data={[...movies].sort((a,b) => b.rating - a.rating)} />
      </div>
    </main>
  );
};

export default Home;

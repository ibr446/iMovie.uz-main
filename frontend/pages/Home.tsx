
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
  
  const MovieRow = ({ title, data }: { title: string, data: typeof movies }) => (
    <section className="mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center justify-between mb-6 px-2">
        <h2 className="text-3xl font-black tracking-tighter text-white">{title}</h2>
        <button className="flex items-center text-sm font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">
          See All <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-24 relative z-20 -mt-20">
        <MovieRow title={t('trending')} data={trending} />
        <MovieRow title={t('new_releases')} data={newlyReleased} />
        
        <section id="categories" className="scroll-mt-28 py-12 border-y border-white/5 overflow-hidden">
          <div className="mb-8 px-2">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">{t('categories')}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tighter text-white">Pick Your Mood</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {movieCategories.map((category) => {
              const Icon = categoryIcons[category.icon];
              const count = movies.filter(movie => movie.genre.includes(category.genre)).length;

              return (
                <button
                  key={category.genre}
                  type="button"
                  onClick={() => onCategoryClick(category.genre)}
                  className="group relative min-h-40 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 p-5 text-left transition-all hover:-translate-y-1 hover:border-white/25 hover:bg-zinc-900"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.accent} opacity-80 transition-opacity group-hover:opacity-100`} />
                  <div className="relative z-10 flex h-full flex-col justify-between gap-8">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white">
                        <Icon size={22} />
                      </div>
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-zinc-300">
                        {count} films
                      </span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tight text-white">{category.label[lang]}</h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-zinc-300">{category.description[lang]}</p>
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

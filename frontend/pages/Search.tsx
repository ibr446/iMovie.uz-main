import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, SlidersHorizontal, X } from 'lucide-react';
import { useMovies } from '../context/MovieContext';
import MovieCard from '../components/MovieCard';
import { useTranslation } from '../context/LanguageContext';
import { Movie } from '../../types';
import { apiGet } from '../../api';
import { movieCategories } from '../../data/categories';

interface SearchProps {
  onMovieClick: (id: string) => void;
  initialGenre?: string;
}

const Search: React.FC<SearchProps> = ({ onMovieClick, initialGenre = 'All' }) => {
  const { lang } = useTranslation();
  const [query, setQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState(initialGenre);
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const { movies } = useMovies();

  const genres = [
    { genre: 'All', label: { en: 'All', ru: 'All', uz: 'Barchasi' } },
    ...movieCategories.map(category => ({ genre: category.genre, label: category.label }))
  ];

  useEffect(() => {
    setActiveGenre(initialGenre);
  }, [initialGenre]);

  // Fetch from API with search and genre params
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (query) params.set('search', query);
        if (activeGenre !== 'All') params.set('genre', activeGenre);
        const queryStr = params.toString();
        const data = await apiGet<Movie[]>(`/movies${queryStr ? `?${queryStr}` : ''}`);
        if (data.length > 0) {
          setResults(data);
        } else {
          // API returned empty — fallback to client-side filtering across ALL languages
          const q = query.toLowerCase().trim();
          const filtered = movies.filter(movie => {
            const matchesQuery = !q || 
              (movie.title.en && movie.title.en.toLowerCase().includes(q)) ||
              (movie.title.ru && movie.title.ru.toLowerCase().includes(q)) ||
              (movie.title.uz && movie.title.uz.toLowerCase().includes(q));
            const matchesGenre = activeGenre === 'All' || movie.genre.includes(activeGenre);
            return matchesQuery && matchesGenre;
          });
          setResults(filtered);
        }
      } catch (err) {
        console.error('Search failed:', err);
        // Fallback to client-side filtering — search across ALL languages
        const q = query.toLowerCase().trim();
        const filtered = movies.filter(movie => {
          const matchesQuery = !q || 
            (movie.title.en && movie.title.en.toLowerCase().includes(q)) ||
            (movie.title.ru && movie.title.ru.toLowerCase().includes(q)) ||
            (movie.title.uz && movie.title.uz.toLowerCase().includes(q));
          const matchesGenre = activeGenre === 'All' || movie.genre.includes(activeGenre);
          return matchesQuery && matchesGenre;
        });
        setResults(filtered);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timer);
  }, [query, activeGenre, lang, movies]);

  return (
    <div className="min-h-screen bg-zinc-950 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Search Header */}
        <div className="relative group">
          <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={24} />
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for movies, series, actors..."
            className="w-full bg-zinc-900/50 border border-white/10 rounded-3xl py-6 pl-16 pr-24 text-2xl font-medium text-white focus:outline-none focus:ring-4 focus:ring-blue-600/20 focus:bg-zinc-900 transition-all placeholder:text-zinc-600"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="absolute right-20 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/10 text-zinc-400"
            >
              <X size={20} />
            </button>
          )}
          <button className="absolute right-6 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10">
            <SlidersHorizontal size={24} />
          </button>
        </div>

        {/* Genre Tags */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
          {genres.map(category => (
            <button
              key={category.genre}
              onClick={() => setActiveGenre(category.genre)}
              className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                activeGenre === category.genre 
                  ? 'bg-white text-black shadow-lg shadow-white/10' 
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5'
              }`}
            >
              {category.label[lang]}
            </button>
          ))}
        </div>

        {/* Results Grid */}
        <div className="space-y-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black tracking-tight text-white">
              {query ? `Results for "${query}"` : 'All Movies'}
            </h2>
            <span className="text-sm font-medium text-zinc-500">
              {loading ? 'Searching...' : `${results.length} items found`}
            </span>
          </div>

          {results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {results.map(movie => (
                <MovieCard key={movie.id} movie={movie} onClick={onMovieClick} />
              ))}
            </div>
          ) : !loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5">
                <SearchIcon size={32} className="text-zinc-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">No results found</h3>
                <p className="text-zinc-500">Try adjusting your filters or search terms.</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Search;

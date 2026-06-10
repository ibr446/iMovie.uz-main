
import React from 'react';
import { Star, PlayCircle } from 'lucide-react';
import { Movie } from '../../types';
import { useTranslation } from '../context/LanguageContext';

interface MovieCardProps {
  movie: Movie;
  onClick: (id: string) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onClick }) => {
  const { lang } = useTranslation();
  return (
    <div 
      onClick={() => onClick(movie.id)}
      className="group relative cursor-pointer overflow-hidden rounded-[24px] bg-zinc-900 transition-all duration-500 hover:scale-[1.05] hover:shadow-[0_20px_40px_rgba(0,0,0,0.7)] border border-white/5"
    >
      <div className="aspect-[2/3] w-full overflow-hidden">
        <img 
          src={movie.poster} 
          alt={movie.title[lang]} 
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
      </div>
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col justify-end p-5">
        <div className="translate-y-4 transition-transform duration-500 group-hover:translate-y-0">
          <div className="flex items-center gap-1 mb-1">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <span className="text-sm font-black text-white">{movie.rating}</span>
          </div>
          <h3 className="text-lg font-bold text-white leading-tight mb-2 truncate">{movie.title[lang]}</h3>
          <div className="flex flex-wrap gap-2">
            {movie.genre.slice(0, 2).map(g => (
              <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/10 uppercase tracking-widest font-black">
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        {movie.isTrending && (
          <span className="bg-orange-600 text-white text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-widest shadow-xl">Trending</span>
        )}
        {movie.isNew && (
          <span className="bg-blue-600 text-white text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-widest shadow-xl">New</span>
        )}
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 scale-50 group-hover:scale-100 transition-transform duration-500 shadow-2xl">
          <PlayCircle className="w-10 h-10 text-white" />
        </div>
      </div>
    </div>
  );
};

export default MovieCard;

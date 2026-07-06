
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Movie } from '../../types';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api';
import { movies as fallbackMovies } from '../../data/movies';

interface MovieContextType {
  movies: Movie[];
  loading: boolean;
  addMovie: (movie: Omit<Movie, 'id' | 'views'>) => Promise<void>;
  updateMovie: (movie: Movie) => Promise<void>;
  deleteMovie: (id: string) => Promise<void>;
  getMovieById: (id: string) => Movie | undefined;
  refreshMovies: () => Promise<void>;
}

const MovieContext = createContext<MovieContextType | undefined>(undefined);

const isTrueEducationMovie = (movie: Movie) => (
  Object.values(movie.title || {})
    .join(' ')
    .toLowerCase()
    .includes('true education')
);

const normalizeMovieContent = (movie: Movie): Movie => {
  // Keep backend truth: если contentType === 'series', то episodes должны быть сериальными.
  // Сейчас логика ниже может "переклеивать" не-True-Education фильмы в series.

  // True Education special: auto-generate episodes if missing.
  if (isTrueEducationMovie(movie)) {
    if (movie.contentType !== 'series') {
      return {
        ...movie,
        contentType: 'series',
        episodes: Array.from({ length: 10 }, (_, index) => ({
          number: index + 1,
          title: `${index + 1}-seriya`,
          videoUrl: movie.videoUrl,
        })),
      };
    }

    if (movie.episodes?.length) {
      return {
        ...movie,
        contentType: 'series',
        episodes: movie.episodes,
      };
    }

    return {
      ...movie,
      contentType: 'series',
      episodes: Array.from({ length: 10 }, (_, index) => ({
        number: index + 1,
        title: `${index + 1}-seriya`,
        videoUrl: movie.videoUrl,
      })),
    };
  }

  // Non-True-Education: never force into series.
  return {
    ...movie,
    // If backend says series - keep it. Otherwise keep as movie.
    contentType: movie.contentType || 'movie',
    episodes: movie.episodes || [],
  };
};

const normalizeMovies = (items: Movie[]) => items.map(normalizeMovieContent);

export const MovieProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [movies, setMovies] = useState<Movie[]>(normalizeMovies(fallbackMovies));
  const [loading, setLoading] = useState(true);

  const fetchMovies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet<Movie[]>('/movies');
      if (data.length > 0) {
        setMovies(normalizeMovies(data as Movie[]));
      } else {
        setMovies(normalizeMovies(fallbackMovies));
      }
    } catch (err) {
      console.error('Failed to fetch movies:', err);
      setMovies(normalizeMovies(fallbackMovies));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const addMovie = async (movieData: Omit<Movie, 'id' | 'views'>) => {
    try {
      const newMovie = await apiPost<Movie>('/movies', movieData);
      setMovies(prev => [normalizeMovieContent(newMovie), ...prev]);
    } catch (err) {
      console.error('Failed to add movie:', err);
      throw err;
    }
  };

  const updateMovie = async (movie: Movie) => {
    try {
      const updated = await apiPut<Movie>(`/movies/${movie.id}`,{
        title: movie.title,
        description: movie.description,
        poster: movie.poster,
        backdrop: movie.backdrop,
        videoUrl: movie.videoUrl,
        contentType: movie.contentType || 'movie',
        episodes: movie.episodes || [],
        year: movie.year,
        genre: movie.genre,
        rating: movie.rating,
        duration: movie.duration,
        country: movie.country,
        isTrending: movie.isTrending,
        isNew: movie.isNew,
      });
      setMovies(prev => prev.map(m => m.id === movie.id ? normalizeMovieContent(updated) : m));
    } catch (err) {
      console.error('Failed to update movie:', err);
      throw err;
    }
  };

  const deleteMovie = async (id: string) => {
    try {
      await apiDelete(`/movies/${id}`);
      setMovies(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Failed to delete movie:', err);
      throw err;
    }
  };

  const getMovieById = (id: string) => {
    return movies.find(m => m.id === id);
  };

  return (
    <MovieContext.Provider value={{ movies, loading, addMovie, updateMovie, deleteMovie, getMovieById, refreshMovies: fetchMovies }}>
      {children}
    </MovieContext.Provider>
  );
};

export const useMovies = () => {
  const context = useContext(MovieContext);
  if (!context) throw new Error('useMovies must be used within a MovieProvider');
  return context;
};

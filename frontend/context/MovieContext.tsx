import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  fetchMovieById: (id: string) => Promise<Movie | undefined>;
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
  // IMPORTANT: preserve backend-provided contentType.
  // Only apply auto-mapping for "true education" when contentType is missing.

  if (isTrueEducationMovie(movie)) {
    // If admin/server explicitly set contentType, do not override it.
    if (movie.contentType === 'series') {
      return {
        ...movie,
        episodes: movie.episodes || [],
      };
    }

    if (movie.contentType === 'movie') {
      return {
        ...movie,
        episodes: [],
      };
    }

    // contentType is missing/undefined => apply default mapping.
    return {
      ...movie,
      contentType: 'series',
      episodes: movie.episodes?.length
        ? movie.episodes
        : Array.from({ length: 10 }, (_, index) => ({
            number: index + 1,
            title: `${index + 1}-seriya`,
            videoUrl: movie.videoUrl,
          })),
    };
  }

  return {
    ...movie,
    contentType: movie.contentType || 'movie',
    episodes: movie.episodes || [],
  };
};


const normalizeMovies = (items: Movie[]) => items.map(normalizeMovieContent);

export const MovieProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [movies, setMovies] = useState<Movie[]>(fallbackMovies);
  const [loading, setLoading] = useState<boolean>(true);

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

  const fetchMovieById = useCallback(async (id: string) => {
    try {
      const data = await apiGet<Movie>(`/movies/${id}`);
      return normalizeMovieContent(data as Movie);
    } catch (err) {
      console.error('Failed to fetch movie by id:', err);
      return undefined;
    }
  }, []);

  const addMovie = async (movieData: Omit<Movie, 'id' | 'views'>) => {
    try {
      const newMovie = await apiPost<Movie>('/movies', movieData);
      setMovies((prev: Movie[]) => [normalizeMovieContent(newMovie), ...prev]);
    } catch (err) {
      console.error('Failed to add movie:', err);
      throw err;
    }
  };

  const updateMovie = async (movie: Movie) => {
    try {
      const updated = await apiPut<Movie>(`/movies/${movie.id}`, {
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

      setMovies((prev: Movie[]) => prev.map(m => (m.id === movie.id ? normalizeMovieContent(updated) : m)));
    } catch (err) {
      console.error('Failed to update movie:', err);
      throw err;
    }
  };

  const deleteMovie = async (id: string) => {
    try {
      await apiDelete(`/movies/${id}`);
      setMovies((prev: Movie[]) => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Failed to delete movie:', err);
      throw err;
    }
  };

  const getMovieById = (id: string) => {
    return movies.find(m => m.id === id);
  };

  return (
    <MovieContext.Provider
      value={{
        movies,
        loading,
        addMovie,
        updateMovie,
        deleteMovie,
        getMovieById,
        fetchMovieById,
        refreshMovies: fetchMovies,
      }}
    >
      {children}
    </MovieContext.Provider>
  );
};

export const useMovies = () => {
  const context = useContext(MovieContext);
  if (!context) throw new Error('useMovies must be used within a MovieProvider');
  return context;
};


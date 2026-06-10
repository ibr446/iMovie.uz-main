
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Movie } from '../../types';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api';

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

export const MovieProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMovies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet<Movie[]>('/movies');
      setMovies(data);
    } catch (err) {
      console.error('Failed to fetch movies:', err);
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
      setMovies(prev => [newMovie, ...prev]);
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
        year: movie.year,
        genre: movie.genre,
        rating: movie.rating,
        duration: movie.duration,
        country: movie.country,
        isTrending: movie.isTrending,
        isNew: movie.isNew,
      });
      setMovies(prev => prev.map(m => m.id === movie.id ? updated : m));
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

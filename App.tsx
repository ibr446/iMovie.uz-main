
import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MovieProvider, useMovies } from './context/MovieContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import MovieDetails from './pages/MovieDetails';
import Watch from './pages/Watch';
import Shorts from './pages/Shorts';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import AdminPanel from './pages/Admin';

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [isWatching, setIsWatching] = useState(false);
  const { isAdmin } = useAuth();
  const { movies } = useMovies();

  const handleNavigate = (page: string) => {
    if (page === 'categories') {
      setCurrentPage('home');
      setTimeout(() => {
        document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
      return;
    }

    if (page.startsWith('category-')) {
      setSelectedGenre(page.substring(9));
      setCurrentPage('search');
      window.scrollTo(0, 0);
      return;
    }

    if (page === 'search') {
      setSelectedGenre('All');
    }

    if (page.startsWith('movie-')) {
      setSelectedMovieId(page.substring(6)); // Remove 'movie-' prefix
      setCurrentPage('movie-detail');
    } else {
      setCurrentPage(page);
    }
    window.scrollTo(0, 0);
  };

  const selectedMovie = movies.find(m => m.id === selectedMovieId);

  const renderHome = () => (
    <Home 
      onMovieClick={(id) => { setSelectedMovieId(id); setCurrentPage('movie-detail'); }}
      onWatchClick={(id) => { setSelectedMovieId(id); setIsWatching(true); }}
      onCategoryClick={(genre) => {
        setSelectedGenre(genre);
        setCurrentPage('search');
        window.scrollTo(0, 0);
      }}
    />
  );

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return renderHome();
      case 'movie-detail':
        return selectedMovie ? (
          <MovieDetails movie={selectedMovie} onWatch={() => setIsWatching(true)} onNavigate={handleNavigate} />
        ) : renderHome();
      case 'shorts': return <Shorts />;
      case 'search': return <Search initialGenre={selectedGenre} onMovieClick={(id) => { setSelectedMovieId(id); setCurrentPage('movie-detail'); }} />;
      case 'profile': return <Profile onNavigate={handleNavigate} />;
      case 'auth': return <Auth onSuccess={() => setCurrentPage('home')} />;
      case 'admin': return isAdmin ? <AdminPanel /> : renderHome();
      default: return renderHome();
    }
  };

  if (isWatching && selectedMovie) {
    return <Watch movie={selectedMovie} onBack={() => setIsWatching(false)} />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar onNavigate={handleNavigate} currentPage={currentPage} />
      <div className="flex-grow pt-0 md:pt-0">
        {renderPage()}
      </div>
      {currentPage !== 'shorts' && currentPage !== 'auth' && <Footer />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <MovieProvider>
            <AppContent />
          </MovieProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;

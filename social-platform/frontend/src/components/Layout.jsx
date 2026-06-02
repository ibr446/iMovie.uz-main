import { Bell, Compass, Home, PlusSquare, User } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { UploadModal } from './UploadModal.jsx';
import { useState } from 'react';
import { useAuth } from '../state/AuthContext.jsx';

const nav = [
  { to: '/', icon: Home, label: 'Feed' },
  { to: '/explore', icon: Compass, label: 'Explore' },
  { to: '/notifications', icon: Bell, label: 'Alerts' }
];

export function Layout() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="h-screen bg-zinc-950 text-white">
      <aside className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/10 bg-zinc-950/90 px-4 py-3 backdrop-blur-xl md:bottom-auto md:right-auto md:top-0 md:h-screen md:w-20 md:flex-col md:justify-center md:border-r md:border-t-0">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `rounded-2xl p-3 transition ${isActive ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>
            <item.icon size={24} />
          </NavLink>
        ))}
        <button onClick={() => setUploadOpen(true)} className="rounded-2xl bg-blue-600 p-3 text-white shadow-glow transition hover:bg-blue-500">
          <PlusSquare size={24} />
        </button>
        <NavLink to={`/profile/${user?._id}`} className="rounded-2xl p-3 text-zinc-400 transition hover:text-white">
          <User size={24} />
        </NavLink>
      </aside>
      <Outlet />
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export function AdminPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/dashboard').then(({ data }) => setStats(data));
  }, []);

  return (
    <main className="min-h-screen overflow-y-auto px-5 pb-28 pt-8 md:ml-20 md:px-10">
      <h1 className="text-3xl font-black">Admin Dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {['users', 'videos', 'comments', 'views'].map((key) => (
          <div key={key} className="glass rounded-3xl p-6">
            <p className="text-xs font-black uppercase text-zinc-500">{key}</p>
            <p className="mt-2 text-3xl font-black">{stats?.[key] || 0}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

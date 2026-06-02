import { Search } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/client.js';

export function ExplorePage() {
  const [q, setQ] = useState('');
  const [videos, setVideos] = useState([]);
  const [users, setUsers] = useState([]);

  const search = async () => {
    const [videoRes, userRes] = await Promise.all([
      api.get(`/videos/search?q=${encodeURIComponent(q)}`),
      api.get(`/users/search?q=${encodeURIComponent(q)}`)
    ]);
    setVideos(videoRes.data.videos);
    setUsers(userRes.data.users);
  };

  return (
    <main className="min-h-screen overflow-y-auto px-5 pb-28 pt-8 md:ml-20 md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3 rounded-3xl bg-white/10 px-5 py-4">
          <Search className="text-zinc-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} className="flex-1 bg-transparent text-xl outline-none" placeholder="Search users, videos, hashtags" />
        </div>
        <h2 className="mt-10 text-2xl font-black">Suggested users</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {users.map((user) => <div key={user._id} className="glass rounded-3xl p-4 font-bold">@{user.username}</div>)}
        </div>
        <h2 className="mt-10 text-2xl font-black">Videos</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          {videos.map((video) => <div key={video._id} className="aspect-[9/16] rounded-2xl bg-zinc-900" />)}
        </div>
      </div>
    </main>
  );
}


import { CheckCircle2, Grid3X3, Heart, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, mediaUrl } from '../api/client.js';
import { useAuth } from '../state/AuthContext.jsx';

export function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get(id ? `/users/${id}` : '/users/me').then(({ data }) => {
      setProfile(data.user);
      setStats(data.stats);
    });
  }, [id]);

  const follow = async () => {
    const { data } = await api.post(`/social/follow/${profile._id}`);
    setProfile((prev) => ({ ...prev, followers: Array.from({ length: data.followers }) }));
  };

  if (!profile) return <div className="grid h-screen place-items-center">Loading profile...</div>;
  const ownProfile = profile._id === currentUser?._id;

  return (
    <main className="min-h-screen overflow-y-auto px-5 pb-28 pt-10 md:ml-20 md:px-10">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          <img src={mediaUrl(profile.avatar)} className="h-32 w-32 rounded-full border-4 border-white object-cover" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="flex items-center gap-2 text-3xl font-black">@{profile.username}{profile.isVerified && <CheckCircle2 className="text-blue-400" />}</h1>
              {ownProfile ? (
                <button className="rounded-xl bg-white/10 px-4 py-2 font-bold"><Settings size={18} /></button>
              ) : (
                <button onClick={follow} className="rounded-xl bg-blue-600 px-5 py-2 font-black">Follow</button>
              )}
            </div>
            <p className="mt-3 max-w-lg text-zinc-400">{profile.bio || 'No bio yet.'}</p>
            <div className="mt-6 flex gap-8 text-sm">
              <span><b className="text-white">{stats?.videosCount || 0}</b> videos</span>
              <span><b className="text-white">{profile.followers?.length || 0}</b> followers</span>
              <span><b className="text-white">{profile.following?.length || 0}</b> following</span>
            </div>
          </div>
        </div>
        <div className="mt-10 flex border-t border-white/10 text-sm font-black uppercase tracking-widest text-zinc-500">
          <button className="flex items-center gap-2 border-t-2 border-white px-6 py-4 text-white"><Grid3X3 size={16} /> Videos</button>
          <button className="flex items-center gap-2 px-6 py-4"><Heart size={16} /> Liked</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {profile.savedVideos?.slice(0, 9).map((video) => (
            <div key={video._id} className="aspect-[9/16] rounded-xl bg-zinc-900" />
          ))}
        </div>
      </section>
    </main>
  );
}


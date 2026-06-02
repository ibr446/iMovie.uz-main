import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { LoadingSkeleton } from '../components/LoadingSkeleton.jsx';
import { ReelCard } from '../components/ReelCard.jsx';

export function FeedPage() {
  const [videos, setVideos] = useState([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const wheelLock = useRef(false);

  useEffect(() => {
    api.get('/videos/feed').then(({ data }) => setVideos(data.videos)).finally(() => setLoading(false));
  }, []);

  const next = () => setActive((idx) => Math.min(idx + 1, Math.max(videos.length - 1, 0)));
  const prev = () => setActive((idx) => Math.max(idx - 1, 0));

  const onWheel = (e) => {
    if (wheelLock.current || Math.abs(e.deltaY) < 40) return;
    wheelLock.current = true;
    e.deltaY > 0 ? next() : prev();
    window.setTimeout(() => { wheelLock.current = false; }, 650);
  };

  return (
    <main className="flex h-screen items-center justify-center px-0 md:px-24" onWheel={onWheel}>
      {loading ? <LoadingSkeleton /> : videos.length > 0 ? (
        <div className="relative h-full w-full md:h-[86vh] md:max-h-[860px] md:w-[430px]">
          <ReelCard key={videos[active]._id} video={videos[active]} active />
          <div className="absolute left-full top-1/2 ml-5 hidden -translate-y-1/2 flex-col gap-4 md:flex">
            <button onClick={prev} className="rounded-full bg-white/10 p-3 text-white backdrop-blur-md"><ChevronUp /></button>
            <button onClick={next} className="rounded-full bg-white/10 p-3 text-white backdrop-blur-md"><ChevronDown /></button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-3xl font-black">No videos yet</h2>
          <p className="mt-2 text-zinc-500">Upload the first short to start the feed.</p>
        </div>
      )}
    </main>
  );
}


import { AnimatePresence, motion } from 'framer-motion';
import { Music2, Play, Volume2, VolumeX } from 'lucide-react';
import { useRef, useState } from 'react';
import { api, mediaUrl } from '../api/client.js';
import { useAuth } from '../state/AuthContext.jsx';
import { ActionRail } from './ActionRail.jsx';
import { CommentsDrawer } from './CommentsDrawer.jsx';
import { ShareModal } from './ShareModal.jsx';

export function ReelCard({ video, active }) {
  const videoRef = useRef(null);
  const { user, setUser } = useAuth();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [heartBurst, setHeartBurst] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [localVideo, setLocalVideo] = useState(video);

  const liked = user?.likedVideos?.some((id) => id === video._id) || localVideo.likes?.some((id) => id === user?._id);
  const saved = user?.savedVideos?.some((id) => id === video._id);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().then(() => setIsPlaying(true));
    else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const next = !isMuted;
    setIsMuted(next);
    if (videoRef.current) {
      videoRef.current.muted = next;
      videoRef.current.volume = next ? 0 : 1;
    }
  };

  const like = async () => {
    setHeartBurst(true);
    window.setTimeout(() => setHeartBurst(false), 650);
    const { data } = await api.post(`/videos/${video._id}/like`);
    setLocalVideo((prev) => ({ ...prev, likes: Array.from({ length: data.likes }) }));
  };

  const save = async () => {
    const { data } = await api.post(`/videos/${video._id}/save`);
    setUser((prev) => ({
      ...prev,
      savedVideos: data.saved
        ? [...(prev.savedVideos || []), video._id]
        : (prev.savedVideos || []).filter((id) => id !== video._id)
    }));
  };

  const share = async () => {
    await api.post(`/videos/${video._id}/share`);
    setShareOpen(true);
  };

  return (
    <section className="relative h-full w-full overflow-hidden bg-black md:h-[86vh] md:max-h-[860px] md:w-[430px] md:rounded-[28px] md:border md:border-white/10 md:shadow-2xl">
      <video
        ref={videoRef}
        src={mediaUrl(video.videoUrl)}
        className="h-full w-full object-cover"
        muted={isMuted}
        autoPlay={active}
        loop
        playsInline
        onClick={togglePlay}
        onDoubleClick={like}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20" />
      <button onClick={toggleMute} className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md">
        {isMuted ? <VolumeX /> : <Volume2 />}
      </button>
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-7">
        <div className="max-w-[74%] space-y-3">
          <div className="flex items-center gap-3">
            <img src={mediaUrl(video.userId?.avatar)} className="h-10 w-10 rounded-full border-2 border-white object-cover" />
            <div>
              <p className="text-sm font-black">@{video.userId?.username}</p>
              <button className="mt-1 rounded-lg border border-white/40 px-3 py-0.5 text-[11px] font-black">Follow</button>
            </div>
          </div>
          <p className="line-clamp-3 text-sm font-semibold">{video.caption}</p>
          <div className="flex flex-wrap gap-2">
            {video.hashtags?.map((tag) => <span key={tag} className="text-xs font-bold text-white/80">#{tag}</span>)}
          </div>
          <div className="flex w-fit max-w-full items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-xs font-bold">
            <Music2 size={14} />
            <span className="truncate">Original sound</span>
          </div>
        </div>
      </div>
      <ActionRail video={localVideo} liked={liked} saved={saved} onLike={like} onComments={() => setCommentsOpen(true)} onShare={share} onSave={save} />
      {!isPlaying && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-black/35 backdrop-blur-md"><Play className="ml-1 fill-current" size={42} /></div>
        </div>
      )}
      <AnimatePresence>
        {heartBurst && (
          <motion.div className="pointer-events-none absolute inset-0 grid place-items-center text-red-500" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }} exit={{ opacity: 0 }}>
            <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-10-9.2C-.3 7.5 2.3 3 6.7 3 9 3 10.7 4.3 12 6c1.3-1.7 3-3 5.3-3C21.7 3 24.3 7.5 22 11.8 19.5 16.4 12 21 12 21z"/></svg>
          </motion.div>
        )}
      </AnimatePresence>
      <CommentsDrawer open={commentsOpen} onClose={() => setCommentsOpen(false)} video={video} />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} video={video} />
    </section>
  );
}

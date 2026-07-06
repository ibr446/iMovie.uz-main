import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Play,
  Send,
  Share2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { apiGet, apiPost } from '../../api';
import { useMovies } from '../context/MovieContext';
import { Movie } from '../../types';

interface ShortItem {
  id: string;
  movieId?: string | null;
  author: string;
  name: string;
  avatar: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  videoUrl: string;
  caption: string;
  audio: string;
  location: string;
  tags: string[];
  isLiked?: boolean;
  isSaved?: boolean;
}

interface ShortComment {
  id: string;
  shortId: string;
  userId: string;
  user: string;
  avatar: string;
  text: string;
  date: string;
}

interface ShortsProps {
  onNavigate: (page: string) => void;
}

const fallbackShorts: ShortItem[] = [
  {
    id: 'short-1',
    movieId: '282b83943421',
    author: '@imovie_official',
    name: 'iMovie.uz',
    avatar: 'https://picsum.photos/seed/imovie-official/96/96',
    likes: 0,
    comments: 3,
    shares: 842,
    views: 118000,
    videoUrl: 'Movie.mp4',
    caption: "The Cosmic Horizon sahnasidan maxsus lavha. Katta ekranga tayyormisiz?",
    audio: 'iMovie.uz Original Sound',
    location: 'Tashkent',
    tags: ['cinema', 'behindthescenes', 'uzbekistan'],
  },
  {
    id: 'short-2',
    movieId: '27bdd5ff1829',
    author: '@cine_lover',
    name: 'Cine Lover',
    avatar: 'https://picsum.photos/seed/cine-lover/96/96',
    likes: 0,
    comments: 0,
    shares: 2100,
    views: 540000,
    videoUrl: 'videoplayback.mp4',
    caption: "Aktyorlar kulgudan sahnani tugata olmagan payt. Bu kadrni ko'ring!",
    audio: 'Comedy Club Tashkent - Bloopers',
    location: 'Samarkand',
    tags: ['bloopers', 'comedy', 'shorts'],
  },
  {
    id: 'short-3',
    movieId: 'avengers-local-2',
    author: '@moviecuts',
    name: 'Movie Cuts',
    avatar: 'https://picsum.photos/seed/movie-cuts/96/96',
    likes: 0,
    comments: 0,
    shares: 1600,
    views: 276000,
    videoUrl: 'videoplayback.mp4',
    caption: "Eng kuchli trailer momentlari bir joyda. Saqlab qo'ying.",
    audio: 'Epic Trailer Mix',
    location: 'Bukhara',
    tags: ['trailer', 'action', 'movie'],
  },
];

const fallbackComments: ShortComment[] = [
  { id: 'fallback-1', shortId: 'short-1', userId: 'fallback-user-1', user: 'azizbek', text: "Zo'r sahna ekan, full filmini kutyapman.", avatar: 'https://picsum.photos/seed/azizbek/48/48', date: '' },
  { id: 'fallback-2', shortId: 'short-1', userId: 'fallback-user-2', user: 'madina', text: "Instagram reels kabi juda qulay bo'libdi.", avatar: 'https://picsum.photos/seed/madina/48/48', date: '' },
  { id: 'fallback-3', shortId: 'short-1', userId: 'fallback-user-3', user: 'diyor', text: 'Keyingisini ham tashlang.', avatar: 'https://picsum.photos/seed/diyor/48/48', date: '' },
];

const formatCount = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`;
  return value.toString();
};

const encodePath = (path: string) => (
  path
    .replace(/\\/g, '/')
    .split('/')
    .map(encodeURIComponent)
    .join('/')
);

const getPlayableShortUrl = (url: string) => {
  const rawUrl = url.trim();
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  if (rawUrl.startsWith('/shorts/')) return rawUrl;

  const backendOrigin = import.meta.env.PROD ? '' : `http://${window.location.hostname}:8000`;
  if (rawUrl.startsWith('/')) return `${backendOrigin}${rawUrl}`;

  return `${backendOrigin}/short-videos/${encodePath(rawUrl)}`;
};

const normalizeSearchText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

const getVideoToken = (url: string) => {
  const cleanUrl = url.trim().replace(/\\/g, '/').split(/[?#]/)[0];
  const fileName = cleanUrl.split('/').pop() || cleanUrl;
  return normalizeSearchText(fileName.replace(/\.[^.]+$/, ''));
};

const findRelatedMovie = (short: ShortItem, movies: Movie[]) => {
  if (short.movieId) {
    const exactMovie = movies.find((movie) => String(movie.id) === String(short.movieId));
    if(exactMovie) return exactMovie;
  }

  const shortVideoToken = getVideoToken(short.videoUrl);
  const videoMatch = movies.find((movie) => getVideoToken(movie.videoUrl) === shortVideoToken);
  if (videoMatch) return videoMatch;

  const shortText = normalizeSearchText([short.caption, short.audio, short.name, short.videoUrl].join(' '));
  const titleMatch = movies.find((movie) => (
    Object.values(movie.title).some((title) => {
      const titleToken = normalizeSearchText(title);
      short.caption.toLowerCase().includes(title.toLowerCase());
    })
  ));

  if(titleMatch) return titleMatch;

  return movies.length > 0 ? movies[0] : n
};
  

const Shorts: React.FC<ShortsProps> = ({ onNavigate }) => {
  const { movies } = useMovies();
  const [shorts, setShorts] = useState<ShortItem[]>(fallbackShorts);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [shortComments, setShortComments] = useState<ShortComment[]>(fallbackComments);
  const [commentText, setCommentText] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const wheelLockRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const activeShort = shorts[activeIdx] || shorts[0] || fallbackShorts[0];
  const activeShortVideoUrl = useMemo(
    () => getPlayableShortUrl(activeShort.videoUrl),
    [activeShort.videoUrl],
  );
  const relatedMovie = useMemo(
    () => findRelatedMovie(activeShort, movies),
    [activeShort, movies],
  );
  const isLiked = !!activeShort.isLiked;
  const isSaved = !!activeShort.isSaved;

  

  const updateShort = (shortId: string, updater: (short: ShortItem) => ShortItem) => {
    setShorts((items) => items.map((short) => (short.id === shortId ? updater(short) : short)));
  };

  const replaceShort = (nextShort: ShortItem) => {
    setShorts((items) => items.map((short) => (short.id === nextShort.id ? nextShort : short)));
  };

  useEffect(() => {
    apiGet<ShortItem[]>('/shorts')
      .then((data) => {
        if (data.length > 0) {
          setShorts(data);
          setActiveIdx(0);
        }
      })
      .catch(() => {
        setShareMessage('Backend shorts ulanmagan');
        window.setTimeout(() => setShareMessage(''), 1600);
      });
  }, []);

  useEffect(() => {
    if (activeIdx >= shorts.length) setActiveIdx(0);
  }, [activeIdx, shorts.length]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsInfoExpanded(false);
    video.currentTime = 0;
    video.muted = isMuted;
    video.volume = 1;
    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    }
  }, [activeIdx, activeShortVideoUrl]);

  useEffect(() => {
    apiPost<ShortItem>(`/shorts/${activeShort.id}/view`)
      .then(replaceShort)
      .catch(() => {});
  }, [activeShort.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;
    if (!isMuted) video.volume = 1;
  }, [isMuted]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goToNext();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrevious();
      }
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleMute();
      }
      if (e.key === 'Escape') {
        setShowComments(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const goToNext = () => {
    setActiveIdx((idx) => (idx + 1) % shorts.length);
    setIsPlaying(true);
    setShowComments(false);
  };

  const goToPrevious = () => {
    setActiveIdx((idx) => (idx - 1 + shorts.length) % shorts.length);
    setIsPlaying(true);
    setShowComments(false);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const setVideoMuted = (muted: boolean) => {
    const video = videoRef.current;
    setIsMuted(muted);

    if (!video) return;
    video.muted = muted;
    video.volume = muted ? 0 : 1;

    if (!muted) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleMute = () => {
    setVideoMuted(!isMuted);
  };

  const handleMutePress = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setVideoMuted(!isMuted);
  };

  const toggleLike = () => {
    const nextLiked = !isLiked;
    updateShort(activeShort.id, (short) => ({
      ...short,
      isLiked: nextLiked,
      likes: Math.max(0, short.likes + (nextLiked ? 1 : -1)),
    }));

    apiPost<ShortItem>(`/shorts/${activeShort.id}/like`)
      .then(replaceShort)
      .catch(() => {
        updateShort(activeShort.id, (short) => ({
          ...short,
          isLiked,
          likes: Math.max(0, short.likes + (nextLiked ? -1 : 1)),
        }));
        setShareMessage('Like uchun login kerak');
        window.setTimeout(() => setShareMessage(''), 1600);
      });
  };

  const toggleSave = () => {
    const nextSaved = !isSaved;
    updateShort(activeShort.id, (short) => ({ ...short, isSaved: nextSaved }));

    apiPost<ShortItem>(`/shorts/${activeShort.id}/save`)
      .then(replaceShort)
      .catch(() => {
        updateShort(activeShort.id, (short) => ({ ...short, isSaved }));
        setShareMessage('Saqlash uchun login kerak');
        window.setTimeout(() => setShareMessage(''), 1600);
      });
  };

  const openComments = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setShowComments(true);

    const video = videoRef.current;
    if (!video) return;

    video.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const handleShare = async () => {
    const text = `${activeShort.author}: ${activeShort.caption}`;
    apiPost<ShortItem>(`/shorts/${activeShort.id}/share`).then(replaceShort).catch(() => {});
    try {
      await navigator.clipboard.writeText(text);
      setShareMessage('Link copied');
    } catch {
      setShareMessage('Ready to share');
    }
    window.setTimeout(() => setShareMessage(''), 1600);
  };

  const openRelatedMovie = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!relatedMovie) {
      setShareMessage('Kino topilmadi');
      window.setTimeout(() => setShareMessage(''), 1600);
      return;
    }

    onNavigate(`movie-${relatedMovie.id}`);
  };

  useEffect(() => {
    if (!showComments) return;

    apiGet<ShortComment[]>(`/shorts/${activeShort.id}/comments`)
      .then((data) => setShortComments(data.length > 0 ? data : fallbackComments))
      .catch(() => setShortComments(fallbackComments));
  }, [showComments, activeShort.id]);

  const handleAddComment = () => {
    const text = commentText.trim();
    if (!text) return;

    apiPost<ShortComment>(`/shorts/${activeShort.id}/comments`, { text })
      .then((comment) => {
        setShortComments((items) => [comment, ...items]);
        setCommentText('');
        updateShort(activeShort.id, (short) => ({ ...short, comments: short.comments + 1 }));
      })
      .catch(() => {
        setShareMessage('Comment uchun login kerak');
        window.setTimeout(() => setShareMessage(''), 1600);
      });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) < 40 || wheelLockRef.current) return;

    wheelLockRef.current = true;
    if (e.deltaY > 0) goToNext();
    else goToPrevious();
    window.setTimeout(() => {
      wheelLockRef.current = false;
    }, 650);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (showComments) return;

    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (showComments || !touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    touchStartRef.current = null;

    if (Math.abs(deltaY) < 55 || Math.abs(deltaY) < Math.abs(deltaX)) return;

    if (deltaY < 0) goToNext();
    else goToPrevious();
  };

  return (
    <div
      className="fixed inset-0 z-30 overflow-hidden bg-black pt-20 text-white md:pt-24"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* <div className="pointer-events-none absolute inset-x-0 top-24 z-40 px-8 md:top-28 shorts">
        <div className="mx-auto flex max-w-[340px] items-center justify-between rounded-full bg-black/30 px-3 py-1.5 opacity-80 backdrop-blur-md">
          <div className="flex items-center gap-4 text-xs font-black">
            <span className="text-white/45">Following</span>
            <span className="relative text-white">
              For You
              <span className="absolute -bottom-1.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-white" />
            </span>
          </div>
          <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white/70 backdrop-blur-md">
            Shorts
          </span>
        </div>
      </div> */}

      <main className="flex h-full items-center justify-center px-0 pb-4 md:px-30 margin-top:20px">
        <div className="relative h-full w-full md:h-[86vh] md:max-h-[860px] md:w-[430px]">
          <section className="relative h-full w-full overflow-hidden bg-black md:rounded-[28px] md:border md:border-white/10 md:shadow-2xl">
          <video
            key={activeShort.id}
            ref={videoRef}
            src={activeShortVideoUrl}
            className="h-full w-full object-cover"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            onClick={togglePlay}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onVolumeChange={(e) => setIsMuted(e.currentTarget.muted || e.currentTarget.volume === 0)}
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-black/35" />

          <button
            type="button"
            onPointerDown={handleMutePress}
            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            title={isMuted ? 'Unmute video' : 'Mute video'}
            className={`absolute right-4 top-5 z-50 flex h-12 w-12 touch-manipulation items-center justify-center rounded-full text-white backdrop-blur-md transition active:scale-95 md:top-100 ${
              isMuted ? 'bg-red-500/80 hover:bg-red-500' : 'bg-black/45 hover:bg-black/65'
            }`}
          >
            <span className="sr-only">{isMuted ? 'Unmute video' : 'Mute video'}</span>
            {isMuted ? <VolumeX size={20} className="pointer-events-none" /> : <Volume2 size={20} className="pointer-events-none" />}
          </button>

          <div className="absolute bottom-0 left-0 right-0 p-3 pb-5">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsInfoExpanded((value) => !value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsInfoExpanded((value) => !value);
                }
              }}
              className={`cursor-pointer text-left backdrop-blur-sm transition-all duration-300 ${
                isInfoExpanded
                  ? 'max-w-[72%] space-y-2 rounded-2xl bg-black/35 p-3'
                  : 'max-w-[58%] space-y-1.5 rounded-xl bg-black/20 p-2'
              }`}
            >
              <div className={`flex items-center ${isInfoExpanded ? 'gap-2.5' : 'gap-2'}`}>
                <img
                  src={activeShort.avatar}
                  alt={activeShort.name}
                  className={`${isInfoExpanded ? 'h-9 w-9 border-2' : 'h-7 w-7 border'} rounded-full border-white object-cover`}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`truncate font-black text-white ${isInfoExpanded ? 'text-sm' : 'text-xs'}`}>{activeShort.author}</p>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className={`${isInfoExpanded ? 'px-2.5 py-0.5' : 'px-2 py-0.5'} rounded-md border border-white/35 text-[10px] font-black text-white transition hover:bg-white hover:text-black`}
                    >
                      Follow
                    </button>
                  </div>
                  {isInfoExpanded && <p className="text-xs font-semibold text-white/65">{activeShort.location}</p>}
                </div>
              </div>  

              <p className={`${isInfoExpanded ? 'line-clamp-2 text-sm' : 'line-clamp-1 text-xs'} font-semibold leading-snug text-white drop-shadow`}>
                {activeShort.caption}
              </p>

              <button
                type="button"
                onClick={openRelatedMovie}
                className={`${isInfoExpanded ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} flex w-fit max-w-full items-center gap-1.5 whitespace-nowrap rounded-full bg-white text-black font-black shadow-lg transition hover:bg-yellow-300 active:scale-95`}
              >
                <Play size={isInfoExpanded ? 14 : 12} className="fill-current" />
                <span>Kinoni ko'rish</span>
              </button>

              {isInfoExpanded && (
                <>
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    {activeShort.tags.map((tag) => (
                      <span key={tag} className="text-[11px] font-bold text-white/85">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex w-fit max-w-full items-center gap-2 rounded-full bg-black/45 px-3 py-1 text-[11px] font-bold text-white">
                    <Music2 size={13} />
                    <span className="truncate">{activeShort.audio}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="absolute bottom-8 right-3 flex flex-col items-center gap-5">
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={toggleLike}
                className={`flex h-12 w-12 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-md transition active:scale-90 ${isLiked ? 'text-red-500' : 'hover:text-red-400'}`}
              >
                <Heart size={28} fill={isLiked ? 'currentColor' : 'none'} />
              </button>
              <span className="text-[11px] font-black text-white">{formatCount(activeShort.likes)}</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={openComments}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-md transition hover:text-blue-300 active:scale-90"
              >
                <MessageCircle size={27} />
              </button>
              <span className="text-[11px] font-black text-white">{formatCount(activeShort.comments)}</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={handleShare}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-md transition hover:text-emerald-300 active:scale-90"
              >
                <Share2 size={25} />
              </button>
              <span className="text-[11px] font-black text-white">{formatCount(activeShort.shares)}</span>
            </div>

            <button
              type="button"
              onClick={toggleSave}
              className={`flex h-12 w-12 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-md transition active:scale-90 ${isSaved ? 'text-yellow-300' : 'hover:text-yellow-200'}`}
            >
              <Bookmark size={25} fill={isSaved ? 'currentColor' : 'none'} />
            </button>

            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-md transition hover:bg-black/45">
              <MoreHorizontal size={24} />
            </button>
          </div>

          {!isPlaying && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md">
                <Play className="ml-1 fill-current" size={42} />
              </div>
            </div>
          )}

          {shareMessage && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-black text-black shadow-2xl">
              {shareMessage}
            </div>
          )}

          </section>

          <div className="absolute left-full top-1/2 ml-5 hidden -translate-y-1/2 flex-col gap-4 md:flex">
            <button
              type="button"
              onClick={goToPrevious}
              className="rounded-full bg-white/10 p-3 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
            >
              <ChevronUp size={24} />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="rounded-full bg-white/10 p-3 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
            >
              <ChevronDown size={24} />
            </button>
          </div>
        </div>
      </main>

      <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-1.5">
        {shorts.map((short, idx) => (
          <button
            key={short.id}
            type="button"
            onClick={() => setActiveIdx(idx)}
            className={`h-1.5 rounded-full transition-all ${idx === activeIdx ? 'w-8 bg-white' : 'w-1.5 bg-white/35'}`}
          />
        ))}
      </div>

      {showComments && (
        <div className="absolute inset-x-0 bottom-0 z-40 mx-auto max-h-[72vh] max-w-[520px] rounded-t-[28px] bg-zinc-950 p-5 text-white shadow-2xl md:bottom-10 md:rounded-[28px] md:border md:border-white/10">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black">Comments</h3>
              <p className="text-xs font-bold text-zinc-500">{formatCount(activeShort.comments)} comments</p>
            </div>
            <button
              type="button"
              onClick={() => setShowComments(false)}
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto pr-1">
            {shortComments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <img src={comment.avatar} alt={comment.user} className="h-9 w-9 rounded-full object-cover" />
                <div>
                  <p className="text-xs font-black text-zinc-400">@{comment.user}</p>
                  <p className="text-sm font-medium leading-relaxed text-white">{comment.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
              placeholder="Add a comment..."
            />
            <button type="button" onClick={handleAddComment} className="text-blue-400">
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shorts;

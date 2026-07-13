import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, Play, Pause, Volume2, Settings, Maximize2, Minimize2, SkipForward, SkipBack, VolumeX, X, Subtitles, Gauge } from 'lucide-react';
import { Movie } from '../../types';
import { useTranslation } from '../context/LanguageContext';
import { apiPost } from '../../api';
import { useMovies } from '../context/MovieContext';
import styles from "./Watch.module.css";
import Hls from "hls.js"

interface WatchProps {
  movie: Movie;
  initialEpisodeNumber?: number;
  onBack: () => void;
}

// Generate subtitles that repeat for the full video duration
function generateSubs(lines: string[], cycleSec = 4): Array<{ start: number; end: number; text: string }> {
  const result: Array<{ start: number; end: number; text: string }> = [];
  // Generate enough subtitles for up to 3 hours of video
  for (let i = 0; i < 2700; i++) {
    result.push({ start: i * cycleSec, end: i * cycleSec + cycleSec - 0.5, text: lines[i % lines.length] });
  }
  return result;
}

const qualityOptions = [
  { label: '4K Ultra HD', value: '2160p', badge: '4K' },
  { label: '1080p Full HD', value: '1080p', badge: 'FHD' },
  { label: '720p HD', value: '720p', badge: 'HD' },
  { label: '480p', value: '480p', badge: 'SD' },
  { label: '360p', value: '360p', badge: '' },
  { label: 'Auto', value: 'auto', badge: '⚡' },
];

const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const demoVideoUrl = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const languageLabels: Record<string, string> = {
  original: 'Original',
  en: 'English',
  ru: 'Rus',
  uz: "O'zbek",
};
const audioLabels: Record<string, string> = {
  original: 'Original',
  en: 'Eng Original',
  ru: 'Rus Dublyaj',
  uz: 'Uz Dublyaj',
};

const Watch: React.FC<WatchProps> = ({ movie, initialEpisodeNumber, onBack }) => {
  const { lang } = useTranslation();
  const episodeOptions = useMemo(() => (
    (movie.contentType === 'series' && movie.episodes?.length)
      ? [...movie.episodes].sort((a, b) => a.number - b.number)
      : []
  ), [movie.contentType, movie.episodes]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'main' | 'quality' | 'speed' | 'subtitle'>('main');
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedAudioLang, setSelectedAudioLang] = useState('original');
  const [selectedEpisodeNumber, setSelectedEpisodeNumber] = useState(initialEpisodeNumber || episodeOptions[0]?.number || 1);

  // Subtitles
  const [subtitleLang, setSubtitleLang] = useState<string | null>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [availableSubLangs, setAvailableSubLangs] = useState<string[]>([]);

  // Buffering
  const [buffered, setBuffered] = useState(0);
  const [videoError, setVideoError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<number | null>(null);
  // Video ustiga bosilganda controlsni DARHOL yashirish uchun flag.
  // togglePlay() -> isPlaying o'zgaradi -> useEffect resetControlsTimer()ni chaqiradi,
  // shu effekt "auto-show"ni bir marta o'tkazib yuborishi uchun ishlatiladi.
  const skipNextAutoShowRef = useRef(false);

  const backendOrigin = useMemo(() => (
    import.meta.env.PROD ? '' : `http://${window.location.hostname}:8000`
  ), []);

  const resolveMediaUrl = useCallback((url: string) => {
    const rawUrl = url.trim();

    if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
    if (rawUrl.startsWith('/')) return `${backendOrigin}${rawUrl}`;
    if (import.meta.env.PROD) return demoVideoUrl;

    const mediaPath = rawUrl.split('/').map(encodeURIComponent).join('/');
    return `${backendOrigin}/media/${mediaPath}`;
  }, [backendOrigin]);

  useEffect(() => {
    const requestedEpisode = episodeOptions.find(episode => episode.number === initialEpisodeNumber);
    setSelectedEpisodeNumber(requestedEpisode?.number || episodeOptions[0]?.number || 1);
  }, [episodeOptions, initialEpisodeNumber, movie.id]);

  const selectedEpisode = episodeOptions.find(episode => episode.number === selectedEpisodeNumber) || episodeOptions[0];
  const activeVideoUrl = selectedEpisode?.videoUrl?.trim() || movie.videoUrl;

  const audioOptions = useMemo(() => {
    const urls = movie.audioUrls || {};
    const options: Array<{ code: string; label: string; url: string }> = [];
    const seenUrls = new Set<string>();

    const addOption = (code: string, url?: string) => {
      if (!url) return;
      const resolved = resolveMediaUrl(url);
      if (seenUrls.has(resolved) && code !== 'original') return;
      seenUrls.add(resolved);
      options.push({
        code,
        label: audioLabels[code] || code.toUpperCase(),
        url,
      });
    };

    addOption('original', selectedEpisode?.videoUrl || urls.original || movie.videoUrl);
    if (selectedEpisode) return options;

    addOption('en', urls.en);
    addOption('ru', urls.ru);
    addOption('uz', urls.uz);

    return options.length ? options : [{ code: 'original', label: audioLabels.original, url: activeVideoUrl }];
  }, [activeVideoUrl, movie.audioUrls, movie.videoUrl, resolveMediaUrl, selectedEpisode]);

  useEffect(() => {
    const preferred = audioOptions.find(option => option.code === lang)?.code || audioOptions[0]?.code || 'original';
    setSelectedAudioLang(preferred);
  }, [audioOptions, lang, movie.id]);

  const selectedAudioOption = audioOptions.find(option => option.code === selectedAudioLang) || audioOptions[0];
  const videoSrc = useMemo(() => (
    resolveMediaUrl(selectedAudioOption?.url || activeVideoUrl)
  ), [activeVideoUrl, resolveMediaUrl, selectedAudioOption]);
  const isHtmlSource = /\.html?($|[?#])/i.test(videoSrc);

  // Auto-play on mount + track view
  useEffect(() => {
    const video = videoRef.current;
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setVideoError('');

    if (video) {
      video.playbackRate = playbackSpeed;
      video.volume = volume;
      video.muted = isMuted;
      video.play().catch(() => setIsPlaying(false));
    }

    apiPost(`/movies/${movie.id}/view`).catch(() => {});
    apiPost(`/users/history/${movie.id}`).catch(() => {});
  }, [movie.id, videoSrc]);

  // Hide controls after inactivity
  const resetControlsTimer = useCallback(() => {
    if (skipNextAutoShowRef.current) {
      // Video ustiga bosilganda ataylab yashirilgan controlsni qayta ko'rsatmaymiz
      skipNextAutoShowRef.current = false;
    } else {
      setShowControls(true);
    }
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [isPlaying, resetControlsTimer]);

  // Update subtitle text based on current time
  // Load real subtitles from movie.subtitleUrls when available, otherwise fallback to mock subs
  const [remoteSubs, setRemoteSubs] = useState<Record<string, Array<{ start: number; end: number; text: string }>>|null>(null);

  useEffect(() => {
    let mounted = true;

    const toSeconds = (value: string) => {
      const time = value.trim().split(/\s+/)[0];
      const parts = time.split(':');
      if (parts.length < 2) return Number.NaN;

      const secondsRaw = parts.pop() || '0';
      const seconds = Number(secondsRaw.replace(',', '.'));
      const minutes = Number(parts.pop() || '0');
      const hours = Number(parts.pop() || '0');

      return hours * 3600 + minutes * 60 + seconds;
    };

    const parseSubtitleText = (text: string) => {
      const normalized = text.replace(/^\uFEFF/, '').replace(/^WEBVTT[^\n]*(\r?\n)+/i, '');
      const items = normalized.split(/\r?\n\r?\n/).map(block => block.trim()).filter(Boolean);

      return items.map(block => {
        const lines = block.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        const timeIndex = lines.findIndex(line => line.includes('-->'));
        if (timeIndex === -1) return null;

        const [startRaw, endRaw] = lines[timeIndex].split('-->').map(part => part.trim());
        const start = toSeconds(startRaw);
        const end = toSeconds(endRaw);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

        const textLines = lines.slice(timeIndex + 1).join('\n').trim();
        if (!textLines) return null;
        return { start, end, text: textLines };
      }).filter((item): item is { start: number; end: number; text: string } => item !== null);
    };

    async function loadSubtitle(url: string) {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const text = await res.text();
        return parseSubtitleText(text);
      } catch {
        return null;
      }
    }

    (async () => {
      if (!movie.subtitleUrls) {
        if (mounted) {
          setRemoteSubs(null);
          setAvailableSubLangs([]);
          setSubtitleLang(null);
        }
        return;
      }

      const entries: Record<string, Array<{ start: number; end: number; text: string }>> = {};
      for (const code of Object.keys(movie.subtitleUrls) as Array<string>) {
        const url = (movie.subtitleUrls as Record<string, string | undefined>)[code];
        if (!url) continue;

        const parsed = await loadSubtitle(resolveMediaUrl(url));
        if (parsed?.length) entries[code] = parsed;
      }

      const loadedLangs = Object.keys(entries);
      if (mounted) {
        setRemoteSubs(loadedLangs.length ? entries : null);
        setAvailableSubLangs(loadedLangs);
        setSubtitleLang(loadedLangs.find(code => code === lang) || loadedLangs[0] || null);
      }
    })().catch(() => {});

    return () => { mounted = false; };
  }, [lang, movie.id, movie.subtitleUrls, resolveMediaUrl]);

  useEffect(() => {
    if (subtitleLang) {
      const subs = (remoteSubs && remoteSubs[subtitleLang]);
      if (!subs) { setCurrentSubtitle(''); return; }
      const active = subs.find(s => currentTime >= s.start && currentTime < s.end);
      setCurrentSubtitle(active ? active.text : '');
    } else {
      setCurrentSubtitle('');
    }
  }, [currentTime, subtitleLang, remoteSubs]);

  const seekTo = useCallback((targetTime: number) => {
    const video = videoRef.current;
    if (!video) return;

    if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
      return;
    }

    const mediaDuration = Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : duration;
    let minTime = 0;
    let maxTime = Number.isFinite(mediaDuration) && mediaDuration > 0 ? mediaDuration : 0;

    if (video.seekable.length > 0) {
      minTime = video.seekable.start(0);
      maxTime = video.seekable.end(video.seekable.length - 1);
    }

    if (!Number.isFinite(maxTime) || maxTime <= minTime) {
      maxTime = Number.isFinite(mediaDuration) && mediaDuration > 0
        ? mediaDuration
        : video.currentTime;
    }

    const nextTime = Math.min(Math.max(targetTime, minTime), maxTime);
    if (!Number.isFinite(nextTime)) return;

    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    resetControlsTimer();
  }, [duration, resetControlsTimer]);

  const seekBy = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    const baseTime = Number.isFinite(video.currentTime) ? video.currentTime : currentTime;
    seekTo(baseTime + seconds);
  }, [currentTime, seekTo]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekBy(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekBy(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(v => Math.min(1, v + 0.1));
          if (videoRef.current) videoRef.current.volume = Math.min(1, volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(v => Math.max(0, v - 0.1));
          if (videoRef.current) videoRef.current.volume = Math.max(0, volume - 0.1);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'Escape':
          if (showSettings) setShowSettings(false);
          else onBack();
          break;
      }
      resetControlsTimer();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, isPlaying, showSettings, seekBy, resetControlsTimer, onBack]);

  // Fullscreen change listener (Safari/webkit uchun ham)
  useEffect(() => {
    const handler = () => {
      const doc = document as any;
      setIsFullscreen(!!(document.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      // Update buffer progress
      if (videoRef.current.buffered.length > 0) {
        setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(Number.isFinite(videoDuration) && videoDuration > 0 ? videoDuration : 0);
      setVideoError('');
    }
  };

  const formatTime = (time: number) => {
    const hrs = Math.floor(time / 3600);
    const mins = Math.floor((time % 3600) / 60);
    const secs = Math.floor(time % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const clickedTime = (x / rect.width) * duration;
      seekTo(clickedTime);
    }
  };

  const toggleFullscreen = () => {
    const el = containerRef.current as any;
    const doc = document as any;
    const isFs = document.fullscreenElement || doc.webkitFullscreenElement;

    if (!isFs) {
      if (el?.requestFullscreen) {
        el.requestFullscreen();
      } else if (el?.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if ((videoRef.current as any)?.webkitEnterFullscreen) {
        // iOS Safari uchun fallback - faqat video elementda ishlaydi
        (videoRef.current as any).webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    setSettingsTab('main');
  };

  const handleQualityChange = (quality: string) => {
    setSelectedQuality(quality);
    setSettingsTab('main');
    // In production, you would switch the video source here
  };

  const handleSubtitleChange = (lang: string | null) => {
    setSubtitleLang(lang);
    setSettingsTab('main');
  };

  const getQualityLabel = () => {
    const q = qualityOptions.find(o => o.value === selectedQuality);
    return q?.badge || q?.label || 'Auto';
  };

  if (isHtmlSource) {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 bg-black z-[100] flex items-center justify-center overflow-hidden px-6"
      >
        <button
          type="button"
          onClick={onBack}
          className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-full bg-black/70 px-4 py-3 text-white shadow-xl backdrop-blur-md transition hover:bg-black/90"
        >
          <ChevronLeft size={26} />
          <span className="text-sm font-black">Back</span>
        </button>

        <div className="max-w-xl rounded-2xl border border-white/10 bg-zinc-950/90 p-6 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-300">
            <X size={28} />
          </div>
          <h2 className="text-2xl font-black text-white">Bu fayl video emas</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Admin paneldagi Video URL maydoniga HTML sahifa emas, haqiqiy video fayl yozilishi kerak.
            Masalan: <span className="font-black text-white">videoplayback.mp4</span> yoki
            <span className="font-black text-white"> /media/videoplayback.mp4</span>.
          </p>
          <p className="mt-3 break-all rounded-xl bg-white/5 px-4 py-3 text-xs text-zinc-400">
            Hozirgi URL: {activeVideoUrl}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center overflow-hidden"
      onMouseMove={resetControlsTimer}
      onClick={(e) => {
        if (showSettings) { setShowSettings(false); return; }
        if ((e.target as HTMLElement).tagName === 'VIDEO') {
          // Video ustiga bosilganda: play/pause + hamma UI darhol yashirinsin
          skipNextAutoShowRef.current = true;
          togglePlay();
          if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
          setShowControls(false);
        }
      }}
    >
      <video 
        ref={videoRef}
        src={videoSrc}
        className="h-full w-full cursor-pointer object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          setVideoError('Video fayl topilmadi yoki storage link ishlamayapti.');
        }}
        playsInline
      />

      {videoError && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 px-6">
          <div className="max-w-lg rounded-2xl border border-white/10 bg-zinc-950/95 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-300">
              <X size={28} />
            </div>
            <h2 className="text-2xl font-black text-white">Video ochilmadi</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">{videoError}</p>
            <p className="mt-3 break-all rounded-xl bg-white/5 px-4 py-3 text-xs text-zinc-400">
              {activeVideoUrl}
            </p>
            <button
              type="button"
              onClick={onBack}
              className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-zinc-200"
            >
              Orqaga
            </button>
          </div>
        </div>
      )}

{/* Subtitle Display */}
       {currentSubtitle && (
         <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
           <div className="bg-black/80 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/10">
             <p className="text-white text-lg md:text-2xl font-medium text-center leading-relaxed drop-shadow-lg font-sans" style={{fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'}}>
               {currentSubtitle}
             </p>
           </div>
         </div>
       )}

      {/* Overlay UI */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60 pointer-events-none" />

        {/* Top Header */}
        <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between p-4 pt-[calc(1rem+env(safe-area-inset-top))] md:p-8">
          <button 
            onClick={(e) => { e.stopPropagation(); onBack(); }}
            className="flex items-center gap-2 text-white hover:text-zinc-400 transition-colors"
          >
            <ChevronLeft size={32} />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Streaming Now</span>
              <span className="max-w-[62vw] truncate text-lg font-black tracking-tight md:max-w-none md:text-xl">{movie.title[lang]}</span>
            </div>
          </button>

          <div className="flex items-center gap-3">
          {episodeOptions.length > 0 && (
            <label className="flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-black text-white shadow-xl backdrop-blur-md">
              <span className="text-xs uppercase tracking-widest text-white/55">Episode</span>
              <select
                value={selectedEpisodeNumber}
                onClick={e => e.stopPropagation()}
                onChange={e => setSelectedEpisodeNumber(parseInt(e.target.value, 10))}
                className="max-w-[170px] bg-transparent text-sm font-black text-white outline-none"
              >
                {episodeOptions.map(episode => (
                  <option key={episode.number} value={episode.number} className="bg-zinc-950">
                    {episode.number}. {episode.title || `${episode.number}-seriya`}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className={styles.choose__lan}>
            <label className={styles.choose} aria-label="Audio language">
              <Volume2 className={styles.choose__icon} size={16} />
              <select
                name="language"
                id="language"
                className={styles.choose__type}
                value={selectedAudioLang}
                disabled={audioOptions.length <= 1}
                onClick={e => e.stopPropagation()}
                onChange={e => setSelectedAudioLang(e.target.value)}
              >
                {audioOptions.map(option => (
                  <option key={option.code} value={option.code} className={styles.option}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          </div>
        </div>

        {/* Center Play/Pause Button */}
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex items-center gap-7 md:gap-16">
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); seekBy(-10); }}
              className="text-white/70 transition-all hover:scale-110 hover:text-white active:scale-90"
            >
              <SkipBack size={40} />
              <span className="text-[10px] font-black block text-center mt-1">10s</span>
            </button>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); togglePlay(); }}
              className="flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-[0_0_60px_rgba(59,130,246,0.3)] backdrop-blur-2xl transition-all hover:scale-110 hover:bg-white/20 active:scale-95 md:h-24 md:w-24"
            >
              {isPlaying ? <Pause size={40} fill="white" /> : <Play size={40} fill="white" className="ml-1" />}
            </button>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); seekBy(10); }}
              className="text-white/70 transition-all hover:scale-110 hover:text-white active:scale-90"
            >
              <SkipForward size={40} />
              <span className="text-[10px] font-black block text-center mt-1">10s</span>
            </button>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-8" onClick={e => e.stopPropagation()}>
          {/* Progress Bar */}
          <div 
            onClick={handleProgressClick}
            className="relative h-1.5 w-full bg-white/20 rounded-full overflow-hidden group/bar cursor-pointer mb-4 hover:h-3 transition-all"
          >
            {/* Buffered */}
            <div 
              className="absolute inset-y-0 left-0 bg-white/30 rounded-full" 
              style={{ width: `${(buffered / (duration || 1)) * 100}%` }} 
            />
            {/* Progress */}
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all" 
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} 
            />
            {/* Thumb */}
            <div 
              className="absolute top-1/2 w-4 h-4 rounded-full bg-white -translate-y-1/2 -translate-x-1/2 shadow-lg opacity-0 group-hover/bar:opacity-100 transition-opacity" 
              style={{ left: `${(currentTime / (duration || 1)) * 100}%` }} 
            />
          </div>

          <div className="flex items-center justify-between">
            {/* Left controls */}
            <div className="flex items-center gap-3 md:gap-6">
              {/* Play/Pause mini */}
              <button type="button" onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-white hover:text-blue-400 transition-colors">
                {isPlaying ? <Pause size={22} /> : <Play size={22} />}
              </button>

              {/* Skip buttons */}
              <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); seekBy(-10); }} className="text-white/60 hover:text-white transition-colors hidden md:block">
                <SkipBack size={20} />
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); seekBy(10); }} className="text-white/60 hover:text-white transition-colors hidden md:block">
                <SkipForward size={20} />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2 group/vol">
                <button onClick={toggleMute} className="text-white hover:text-blue-400 transition-colors">
                  {isMuted || volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
                </button>
                <input 
                  type="range" 
                  min="0" max="1" step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-0 group-hover/vol:w-20 transition-all duration-300 accent-blue-500 cursor-pointer h-1"
                />
              </div>

              {/* Time */}
              <span className="text-xs font-mono tracking-tighter text-white/80 sm:text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Speed indicator */}
              {playbackSpeed !== 1 && (
                <span className="text-[10px] font-black bg-white/10 px-2 py-1 rounded-md text-white">
                  {playbackSpeed}x
                </span>
              )}

              {/* Subtitle toggle */}
              <button 
                onClick={() => {
                  setShowSettings(true);
                  setSettingsTab('subtitle');
                }}
                className={`p-1.5 rounded-lg transition-colors ${subtitleLang ? 'text-blue-400 bg-blue-500/20' : 'text-white/60 hover:text-white'}`}
              >
                <Subtitles size={22} />
              </button>

              {/* Settings */}
              <button 
                onClick={() => { setShowSettings(!showSettings); setSettingsTab('main'); }}
                className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'text-blue-400 bg-blue-500/20' : 'text-white/60 hover:text-white'}`}
              >
                <Settings size={22} />
              </button>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="text-white/60 hover:text-white transition-colors">
                {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div 
            className="absolute bottom-24 right-4 md:right-8 w-72 glass-dark rounded-2xl border border-white/10 overflow-hidden shadow-2xl z-30 animate-in slide-in-from-bottom-4 fade-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            {settingsTab === 'main' && (
              <div className="py-2">
                <div className="px-4 py-3 border-b border-white/5">
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Settings</h3>
                </div>
                <button 
                  onClick={() => setSettingsTab('quality')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm font-medium text-white">Quality</span>
                  <span className="text-sm text-zinc-400">{qualityOptions.find(o => o.value === selectedQuality)?.label}</span>
                </button>
                <button 
                  onClick={() => setSettingsTab('speed')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm font-medium text-white">Playback Speed</span>
                  <span className="text-sm text-zinc-400">{playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}</span>
                </button>
                <button 
                  onClick={() => setSettingsTab('subtitle')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm font-medium text-white">Subtitles / CC</span>
                  <span className="text-sm text-zinc-400">{subtitleLang ? subtitleLang.toUpperCase() : 'Off'}</span>
                </button>
              </div>
            )}

            {settingsTab === 'quality' && (
              <div className="py-2">
                <button 
                  onClick={() => setSettingsTab('main')}
                  className="w-full flex items-center gap-2 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <ChevronLeft size={16} className="text-zinc-400" />
                  <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Quality</span>
                </button>
                {qualityOptions.map(q => (
                  <button 
                    key={q.value}
                    onClick={() => handleQualityChange(q.value)}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors ${selectedQuality === q.value ? 'text-blue-400' : 'text-white'}`}
                  >
                    <span className="text-sm font-medium">{q.label}</span>
                    <div className="flex items-center gap-2">
                      {q.badge && <span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded">{q.badge}</span>}
                      {selectedQuality === q.value && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {settingsTab === 'speed' && (
              <div className="py-2">
                <button 
                  onClick={() => setSettingsTab('main')}
                  className="w-full flex items-center gap-2 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <ChevronLeft size={16} className="text-zinc-400" />
                  <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Speed</span>
                </button>
                {speedOptions.map(s => (
                  <button 
                    key={s}
                    onClick={() => handleSpeedChange(s)}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors ${playbackSpeed === s ? 'text-blue-400' : 'text-white'}`}
                  >
                    <span className="text-sm font-medium">{s === 1 ? 'Normal' : `${s}x`}</span>
                    {playbackSpeed === s && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </button>
                ))}
              </div>
            )}

            {settingsTab === 'subtitle' && (
              <div className="py-2">
                <button 
                  onClick={() => setSettingsTab('main')}
                  className="w-full flex items-center gap-2 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <ChevronLeft size={16} className="text-zinc-400" />
                  <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Subtitles</span>
                </button>
                <button 
                  onClick={() => handleSubtitleChange(null)}
                  className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors ${subtitleLang === null ? 'text-blue-400' : 'text-white'}`}
                >
                  <span className="text-sm font-medium">Off</span>
                  {subtitleLang === null && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                </button>
                {[
                  { code: 'en', label: 'English' },
                  { code: 'ru', label: 'Русский' },
                  { code: 'uz', label: "O'zbek" },
                ].map(sub => (
                  <button 
                    key={sub.code}
                    onClick={() => handleSubtitleChange(sub.code)}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors ${subtitleLang === sub.code ? 'text-blue-400' : 'text-white'}`}
                  >
                    <span className="text-sm font-medium">{sub.label}</span>
                    {subtitleLang === sub.code && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Big play icon when paused */}
      {!isPlaying && !showSettings && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-5">
          <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center animate-pulse border border-white/20 shadow-[0_0_80px_rgba(59,130,246,0.2)]">
            <Play className="w-12 h-12 text-white fill-current ml-1" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Watch;
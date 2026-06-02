import { Bookmark, Heart, MessageCircle, MoreHorizontal, Share2 } from 'lucide-react';

export function ActionRail({ video, liked, saved, onLike, onComments, onShare, onSave }) {
  return (
    <div className="absolute bottom-8 right-3 flex flex-col items-center gap-5">
      <ButtonGroup count={video.likes?.length || 0}>
        <button onClick={onLike} className={`grid h-12 w-12 place-items-center rounded-full bg-black/35 backdrop-blur-md transition active:scale-90 ${liked ? 'text-red-500' : 'text-white hover:text-red-300'}`}>
          <Heart fill={liked ? 'currentColor' : 'none'} />
        </button>
      </ButtonGroup>
      <ButtonGroup count={video.commentsCount || 0}>
        <button onClick={onComments} className="grid h-12 w-12 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md transition hover:text-blue-300 active:scale-90">
          <MessageCircle />
        </button>
      </ButtonGroup>
      <ButtonGroup count={video.shares || 0}>
        <button onClick={onShare} className="grid h-12 w-12 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md transition hover:text-emerald-300 active:scale-90">
          <Share2 />
        </button>
      </ButtonGroup>
      <button onClick={onSave} className={`grid h-12 w-12 place-items-center rounded-full bg-black/35 backdrop-blur-md transition active:scale-90 ${saved ? 'text-yellow-300' : 'text-white hover:text-yellow-200'}`}>
        <Bookmark fill={saved ? 'currentColor' : 'none'} />
      </button>
      <button className="grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md"><MoreHorizontal /></button>
    </div>
  );
}

function ButtonGroup({ children, count }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {children}
      <span className="text-[11px] font-black text-white">{count}</span>
    </div>
  );
}

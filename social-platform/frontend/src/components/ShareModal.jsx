import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Send, X } from 'lucide-react';

export function ShareModal({ open, onClose, video }) {
  const link = `${window.location.origin}/videos/${video?._id || ''}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-4 md:place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="glass w-full max-w-md rounded-[28px] p-5" initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-black">Share video</h3>
              <button onClick={onClose} className="rounded-full bg-white/10 p-2"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <a className="rounded-2xl bg-emerald-500/15 p-4 text-center font-bold text-emerald-300" href={`https://wa.me/?text=${encodeURIComponent(link)}`} target="_blank">WhatsApp</a>
              <a className="rounded-2xl bg-sky-500/15 p-4 text-center font-bold text-sky-300" href={`https://t.me/share/url?url=${encodeURIComponent(link)}`} target="_blank">Telegram</a>
              <button className="rounded-2xl bg-pink-500/15 p-4 font-bold text-pink-300">Instagram</button>
              <button onClick={copyLink} className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 p-4 font-bold"><Copy size={18} /> Copy</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


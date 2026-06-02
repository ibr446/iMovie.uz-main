import { AnimatePresence, motion } from 'framer-motion';
import { Upload, X } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/client.js';

export function UploadModal({ open, onClose }) {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('general');
  const [progress, setProgress] = useState(0);

  const upload = async () => {
    if (!file) return;
    const form = new FormData();
    form.append('video', file);
    form.append('caption', caption);
    form.append('category', category);
    await api.post('/videos', form, {
      onUploadProgress: (event) => setProgress(Math.round((event.loaded * 100) / event.total))
    });
    setFile(null);
    setCaption('');
    setProgress(0);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="glass w-full max-w-lg rounded-[32px] p-6" initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 20 }}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-black">Upload Short</h2>
              <button onClick={onClose} className="rounded-full bg-white/10 p-2"><X /></button>
            </div>
            <label className="grid min-h-48 cursor-pointer place-items-center rounded-3xl border border-dashed border-white/20 bg-white/5 p-6 text-center">
              <input type="file" accept="video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0])} />
              <div>
                <Upload className="mx-auto mb-3" />
                <p className="font-bold">{file ? file.name : 'Choose short video'}</p>
                <p className="mt-1 text-sm text-zinc-500">Compression and thumbnails can be handled in a worker pipeline.</p>
              </div>
            </label>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} className="mt-4 min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 p-4 outline-none" placeholder="Caption with #hashtags" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-4 w-full rounded-2xl border border-white/10 bg-zinc-900 p-4 outline-none">
              <option value="general">General</option>
              <option value="comedy">Comedy</option>
              <option value="cinema">Cinema</option>
              <option value="music">Music</option>
            </select>
            {progress > 0 && <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-blue-500" style={{ width: `${progress}%` }} /></div>}
            <button onClick={upload} className="mt-5 w-full rounded-2xl bg-blue-600 py-4 font-black transition hover:bg-blue-500">Publish</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


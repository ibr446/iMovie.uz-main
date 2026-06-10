
import React from 'react';
import { Facebook, Twitter, Instagram, Youtube, Play } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-zinc-950 border-t border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-current" />
              </div>
              <span className="text-xl font-bold tracking-tighter text-white">iMovie.uz</span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Experience the future of cinematic entertainment. Stream thousands of premium movies and series in ultra-high definition.
            </p>
            <div className="flex items-center gap-4">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, idx) => (
                <a key={idx} href="#" className="p-2 rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Explore</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-white transition-colors">Movies</a></li>
              <li><a href="#" className="hover:text-white transition-colors">TV Series</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Trending Now</a></li>
              <li><a href="#" className="hover:text-white transition-colors">New Releases</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Support</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Use</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Newsletter</h4>
            <p className="text-zinc-500 text-sm mb-4">Get the latest updates on new releases and features.</p>
            <div className="relative">
              <input 
                type="email" 
                placeholder="Your email address" 
                className="w-full bg-white/5 border border-white/10 rounded-full py-3 px-5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              />
              <button className="absolute right-2 top-1.5 bottom-1.5 px-4 bg-white text-black text-xs font-bold rounded-full hover:bg-zinc-200 transition-colors">
                Join
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 text-center text-zinc-600 text-xs">
          <p>© 2024 iMovie.uz - Built with Passion. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

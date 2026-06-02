
import React from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
}

const GlassButton: React.FC<GlassButtonProps> = ({ variant = 'primary', children, className, ...props }) => {
  const baseStyles = "px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center justify-center gap-2 active:scale-95";
  
  const variants = {
    primary: "bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.3)]",
    secondary: "bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/20",
    ghost: "bg-transparent text-white hover:bg-white/5 border-none"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default GlassButton;

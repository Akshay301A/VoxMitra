import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
}

export const VoxMitraLogo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showWordmark = true,
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Custom V-inspired acoustic mark */}
      <div className={`relative ${iconSizes[size]} shrink-0 rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-[1.5px] shadow-sm`}>
        <div className="w-full h-full rounded-[10px] bg-slate-950/90 flex items-center justify-center overflow-hidden border border-indigo-500/30">
          <svg
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-5/6 h-5/6"
          >
            <defs>
              <linearGradient id="vm-v-grad" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38BDF8" />
                <stop offset="0.5" stopColor="#6366F1" />
                <stop offset="1" stopColor="#A855F7" />
              </linearGradient>
              <linearGradient id="vm-wave-grad" x1="12" y1="10" x2="24" y2="26" gradientUnits="userSpaceOnUse">
                <stop stopColor="#60A5FA" />
                <stop offset="1" stopColor="#818CF8" />
              </linearGradient>
            </defs>
            {/* Primary V Stroke */}
            <path
              d="M7 8L18 29L29 8"
              stroke="url(#vm-v-grad)"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Acoustic sound wave inner pulse */}
            <path
              d="M13 13L18 23L23 13"
              stroke="url(#vm-wave-grad)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
            {/* Central focal node */}
            <circle cx="18" cy="18" r="1.6" fill="#38BDF8" />
          </svg>
        </div>
      </div>

      {showWordmark && (
        <span className={`font-bold tracking-tight text-white font-sans ${textSizes[size]}`}>
          Vox<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400">Mitra</span>
        </span>
      )}
    </div>
  );
};

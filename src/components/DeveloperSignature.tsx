import React from 'react';
import { useHadiCloudStore } from '../store';

export const DeveloperSignature: React.FC = () => {
  const theme = useHadiCloudStore((state) => state.theme);

  const textColor = 
    theme === 'light' 
      ? 'text-slate-400' 
      : theme === 'fade' 
        ? 'text-slate-500' 
        : 'text-white/30';

  return (
    <div id="developer-signature" className={`text-[10px] ${textColor} text-center flex flex-col items-center mt-8 px-4 leading-relaxed`}>
      <span className="max-w-md break-words">Developed by Abdullah Al Hadi | Email: abdullahalhadidev@gmail.com | Phone: +8801723257754</span>
    </div>
  );
};

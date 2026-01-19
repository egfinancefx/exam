
import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const percentage = Math.min(((current + 1) / total) * 100, 100);

  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-blue-400">التقدم: {Math.round(percentage)}%</span>
        <span className="text-sm font-medium text-slate-400">السؤال {current + 1} من {total}</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
        <div 
          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;

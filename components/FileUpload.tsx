
import React, { useRef } from 'react';

interface FileUploadProps {
  onFileSelect: (base64: string | null) => void;
  currentFile: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, currentFile }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onFileSelect(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFile = () => {
    onFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="mt-6 p-4 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50 hover:border-blue-500 transition-colors group">
      <label className="block text-center cursor-pointer">
        <span className="text-slate-300 group-hover:text-blue-400 text-sm font-semibold transition-colors">
          📎 أرفق صورة لتحليلك أو شارت (اختياري)
        </span>
        <input 
          type="file" 
          className="hidden" 
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange} 
        />
      </label>
      
      {currentFile && (
        <div className="mt-4 relative group/img bg-slate-900 rounded-lg p-1">
          <img 
            src={currentFile} 
            alt="Preview" 
            className="w-full h-auto max-h-60 object-contain rounded-lg border border-slate-600 shadow-lg" 
          />
          <button 
            onClick={clearFile}
            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;

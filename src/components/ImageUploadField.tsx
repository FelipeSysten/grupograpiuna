import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, X, Loader2 } from 'lucide-react';

const CLOUD_NAME = "dutpp0jvs";
const UPLOAD_PRESET = "grupograpiuna";
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;


// Adicione esta linha:
console.log("Variáveis do Cloudinary:", { CLOUD_NAME, UPLOAD_PRESET });


interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({ label, value, onChange, folder = 'uploads' }) => {
  const [mode, setMode] = useState<'url' | 'upload'>(value.startsWith('http') || !value ? 'url' : 'upload');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        setProgress((event.loaded / event.total) * 100);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        onChange(data.secure_url);
      } else {
        console.error('Cloudinary upload error:', xhr.responseText);
        alert('Erro ao fazer upload da imagem. Verifique o upload preset no Cloudinary.');
      }
      setUploading(false);
      setProgress(0);
    });

    xhr.addEventListener('error', () => {
      console.error('Cloudinary upload network error');
      alert('Erro de rede ao fazer upload da imagem.');
      setUploading(false);
      setProgress(0);
    });

    setUploading(true);
    xhr.open('POST', UPLOAD_URL);
    xhr.send(formData);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="block text-xs font-bold uppercase text-gray-400">{label}</label>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${mode === 'url' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}
          >
            <LinkIcon size={12} className="inline mr-1" /> URL
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${mode === 'upload' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}
          >
            <Upload size={12} className="inline mr-1" /> UPLOAD
          </button>
        </div>
      </div>

      {mode === 'url' ? (
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://exemplo.com/imagem.jpg"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600"
        />
      ) : (
        <div className="relative">
          {value && !uploading ? (
            <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200">
              <img src={value} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center hover:border-red-600 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 size={32} className="text-red-600 animate-spin mb-2" />
                  <span className="text-sm font-bold text-gray-500">{Math.round(progress)}% Carregando...</span>
                </>
              ) : (
                <>
                  <Upload size={32} className="text-gray-300 mb-2" />
                  <span className="text-sm font-bold text-gray-400 uppercase">Clique para selecionar</span>
                </>
              )}
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};

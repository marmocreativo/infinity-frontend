import { useRef, useState } from 'react';

interface PhotoCaptureProps {
  onCapture: (file: File) => void;
}

export default function PhotoCapture({ onCapture }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    onCapture(file);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <img src={preview} alt="Evidencia" className="w-full h-48 object-cover rounded-lg" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 bg-primary text-white font-body text-xs px-3 py-1.5 rounded-lg"
          >
            Cambiar foto
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-48 border-2 border-dashed border-base-light/20 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
        >
          <span className="text-3xl">📷</span>
          <span className="font-body text-sm text-base-light/70">Tomar foto</span>
        </button>
      )}
    </div>
  );
}

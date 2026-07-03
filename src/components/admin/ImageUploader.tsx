'use client';
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { Upload, X, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  video: string;
  onVideoChange: (v: string) => void;
}

function uploadWithProgress(file: File | Blob, filename: string, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file, filename);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data.url);
        else reject(new Error(data.error || 'Upload failed'));
      } catch { reject(new Error('Upload failed')); }
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(fd);
  });
}

export function ImageUploader({ images, onChange, video, onVideoChange }: ImageUploaderProps) {
  const [progress, setProgress] = useState<Record<string, number>>({});

  const processAndUpload = useCallback(async (file: File) => {
    const key = file.name + Date.now();
    setProgress(p => ({ ...p, [key]: 0 }));
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 2000,
        useWebWorker: true,
        fileType: 'image/webp',
      });
      const uploadName = file.name.replace(/\.[^.]+$/, '.webp');
      const url = await uploadWithProgress(compressed, uploadName, pct => setProgress(p => ({ ...p, [key]: pct })));
      onChange([...images, url]);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setProgress(p => { const { [key]: _drop, ...rest } = p; return rest; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  const onDrop = useCallback((accepted: File[]) => {
    const valid = accepted.filter(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= 8 * 1024 * 1024);
    if (valid.length < accepted.length) toast.error('Some files were skipped (must be JPG/PNG/WebP, under 8MB)');
    valid.forEach(f => processAndUpload(f));
  }, [processAndUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    multiple: true,
  });

  const removeImage = (i: number) => onChange(images.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const t = i + dir;
    if (t < 0 || t >= images.length) return;
    const next = [...images];
    [next[i], next[t]] = [next[t], next[i]];
    onChange(next);
  };

  const progressEntries = Object.entries(progress);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Product Images</label>
        <div {...getRootProps()}
          className={`border border-dashed h-36 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition ${isDragActive ? 'border-amber-400 bg-amber-400/5' : 'border-white/30 hover:border-amber-400'}`}>
          <input {...getInputProps()} />
          <Upload size={26} className="text-amber-400 mb-2" />
          <div className="text-sm">{isDragActive ? 'Drop images here...' : 'Drag & drop images, or click to browse'}</div>
          <div className="text-xs text-white/50 mt-1">JPG, PNG, WebP • Max 8MB each • Compressed & converted automatically</div>
        </div>

        {progressEntries.length > 0 && (
          <div className="mt-3 space-y-2">
            {progressEntries.map(([key, pct]) => (
              <div key={key} className="flex items-center gap-2 text-xs text-white/60">
                <Loader2 size={12} className="animate-spin text-amber-400" />
                <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-amber-400 h-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-9 text-right">{pct}%</span>
              </div>
            ))}
          </div>
        )}

        {images.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {images.map((img, i) => (
              <div key={img + i} className="relative group">
                <img src={img} className={`w-16 h-16 rounded-xl object-cover border-2 ${i === 0 ? 'border-amber-400' : 'border-white/10'}`} alt="" />
                <button type="button" onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full w-5 h-5 text-[10px] opacity-0 group-hover:opacity-100 transition">
                  <X size={11} className="mx-auto" />
                </button>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="bg-zinc-800 rounded-full w-4 h-4 flex items-center justify-center disabled:opacity-20"><ArrowUp size={9} /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="bg-zinc-800 rounded-full w-4 h-4 flex items-center justify-center disabled:opacity-20"><ArrowDown size={9} /></button>
                </div>
                {i === 0 && <div className="absolute top-0 inset-x-0 bg-amber-400 text-black text-[7px] text-center rounded-t-lg">MAIN</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <input
        placeholder="Product Video URL (optional)"
        value={video}
        onChange={e => onVideoChange(e.target.value)}
        className="w-full bg-black border border-white/15 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-amber-400"
      />
    </div>
  );
}
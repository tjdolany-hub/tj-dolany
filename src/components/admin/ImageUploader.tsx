"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, Trash2, Check } from "lucide-react";

interface UploadedImage {
  url: string;
  alt?: string;
}

interface ImageUploaderProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  folder: string;
  multiple?: boolean;
}

export default function ImageUploader({
  images,
  onChange,
  folder,
  multiple = true,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList) => {
    setUploading(true);
    const newImages: UploadedImage[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.url) {
          newImages.push({ url: data.url });
        }
      } catch {
        // skip failed uploads
      }
    }

    if (multiple) {
      onChange([...images, ...newImages]);
    } else {
      onChange(newImages.slice(0, 1));
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) {
      upload(e.dataTransfer.files);
    }
  };

  const remove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
    setSelected((prev) => {
      const next = new Set<number>();
      prev.forEach((s) => {
        if (s < index) next.add(s);
        else if (s > index) next.add(s - 1);
      });
      return next;
    });
  };

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(images.map((_, i) => i)));
  };

  const deleteSelected = () => {
    onChange(images.filter((_, i) => !selected.has(i)));
    setSelected(new Set());
    setSelectMode(false);
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-brand-red bg-red-50"
            : "border-border hover:border-text-muted"
        }`}
      >
        <Upload className="mx-auto mb-2 text-text-muted" size={24} />
        <p className="text-sm text-text-muted">
          {uploading
            ? "Nahrávám..."
            : "Přetáhněte obrázky sem nebo klikněte pro výběr"}
        </p>
        <p className="text-xs text-text-muted/60 mt-1">JPG, PNG, WebP — max 5 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={multiple}
          onChange={(e) => e.target.files && upload(e.target.files)}
          className="hidden"
        />
      </div>

      {images.length > 0 && (
        <div className="mt-4">
          {/* Toolbar */}
          {multiple && images.length > 1 && (
            <div className="flex items-center gap-2 mb-3">
              {!selectMode ? (
                <button
                  type="button"
                  onClick={() => setSelectMode(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-border text-text-muted hover:text-text transition-colors"
                >
                  <Check size={14} />
                  Označit
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-border text-text-muted hover:text-text transition-colors"
                  >
                    Vybrat vše
                  </button>
                  {selected.size > 0 && (
                    <button
                      type="button"
                      onClick={deleteSelected}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                      Smazat ({selected.size})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={exitSelectMode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text transition-colors"
                  >
                    Zrušit
                  </button>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {images.map((img, i) => {
              const isSelected = selected.has(i);
              return (
                <div
                  key={i}
                  className={`relative group rounded-lg overflow-hidden cursor-pointer ${isSelected ? "ring-3 ring-brand-red" : ""}`}
                  onClick={selectMode ? () => toggleSelect(i) : undefined}
                >
                  <div className="relative aspect-square">
                    <Image
                      src={img.url}
                      alt={img.alt || `Obrázek ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                  </div>
                  {/* Overlay */}
                  <div className={`absolute inset-0 transition-colors pointer-events-none ${isSelected ? "bg-brand-red/30" : selectMode ? "bg-black/0" : "bg-black/0 group-hover:bg-black/20"}`} />
                  {/* Checkmark when selected */}
                  {selectMode && (
                    <div className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center pointer-events-none ${
                      isSelected
                        ? "bg-brand-red text-white"
                        : "bg-black/40 border-2 border-white/70"
                    }`}>
                      {isSelected && <Check size={16} strokeWidth={3} />}
                    </div>
                  )}
                  {/* Single delete — only when NOT in select mode */}
                  {!selectMode && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); remove(i); }}
                      className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

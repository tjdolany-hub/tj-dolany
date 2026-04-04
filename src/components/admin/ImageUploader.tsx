"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, GripVertical, Trash2, CheckSquare, Square } from "lucide-react";

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
    if (selected.size === images.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(images.map((_, i) => i)));
    }
  };

  const deleteSelected = () => {
    onChange(images.filter((_, i) => !selected.has(i)));
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
          {/* Bulk actions bar */}
          {multiple && images.length > 1 && (
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={selectAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-border text-text-muted hover:text-text transition-colors"
              >
                {selected.size === images.length ? <CheckSquare size={14} /> : <Square size={14} />}
                {selected.size === images.length ? "Zrušit výběr" : "Vybrat vše"}
              </button>
              {selected.size > 0 && (
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                  Smazat vybrané ({selected.size})
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {images.map((img, i) => {
              const isSelected = selected.has(i);
              return (
                <div key={i} className="relative group rounded-lg overflow-hidden">
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
                  <div className={`absolute inset-0 transition-colors ${isSelected ? "bg-brand-red/30" : "bg-black/0 group-hover:bg-black/30"}`} />
                  {/* Checkbox — always visible on mobile, hover on desktop */}
                  {multiple && images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => toggleSelect(i)}
                      className={`absolute top-1.5 left-1.5 w-6 h-6 rounded flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-brand-red text-white"
                          : "bg-black/50 text-white/70 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      }`}
                    >
                      {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  )}
                  {/* Single delete button */}
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                  {/* Selection ring */}
                  {isSelected && (
                    <div className="absolute inset-0 ring-2 ring-inset ring-brand-red rounded-lg pointer-events-none" />
                  )}
                  {multiple && !isSelected && (
                    <div className="absolute top-1 left-1 text-white opacity-0 group-hover:opacity-0 transition-opacity">
                      <GripVertical size={16} />
                    </div>
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

"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, GripVertical } from "lucide-react";

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {images.map((img, i) => (
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
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              <button
                onClick={() => remove(i)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
              {multiple && (
                <div className="absolute top-1 left-1 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical size={16} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

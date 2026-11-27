"use client";

import { useRef, useState, useTransition } from "react";
import { AlertCircle, Loader2, UploadCloud, X } from "lucide-react";
import {
  compressImageFile,
  formatFileSize,
  MAX_LISTING_TOTAL_BYTES,
} from "@/lib/media/image-upload";

type SelectedFileItem = {
  id: string;
  file: File;
};

type CompressedUploadFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  fileFieldName: string;
  accept: string;
  multiple?: boolean;
  maxFiles?: number;
  requiredFile?: boolean;
  allowPdf?: boolean;
  label: string;
  helperText: string;
  submitLabel: string;
  pendingLabel?: string;
  buttonClassName?: string;
  className?: string;
  children: React.ReactNode;
};

export function CompressedUploadForm({
  action,
  fileFieldName,
  accept,
  multiple = false,
  maxFiles = 5,
  requiredFile = false,
  allowPdf = false,
  label,
  helperText,
  submitLabel,
  pendingLabel = "Uploading...",
  buttonClassName = "min-h-11 w-full rounded-full bg-[#241e14] px-5 text-sm font-semibold text-white hover:bg-[#382f20] transition cursor-pointer disabled:opacity-60",
  className = "space-y-4",
  children,
}: CompressedUploadFormProps) {
  const [files, setFiles] = useState<SelectedFileItem[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pickerRef = useRef<HTMLInputElement>(null);

  const totalBytes = files.reduce((sum, item) => sum + item.file.size, 0);

  const processFiles = async (rawList: File[]) => {
    if (!rawList.length) return;
    setError(null);

    const limitCount = multiple ? Math.max(0, maxFiles - files.length) : 1;
    if (limitCount <= 0) {
      setError(`You can attach at most ${maxFiles} files at once.`);
      return;
    }

    const candidates = rawList.slice(0, limitCount);
    setIsOptimizing(true);
    try {
      const processed: SelectedFileItem[] = [];
      for (const file of candidates) {
        const isPdf =
          allowPdf &&
          (file.type === "application/pdf" || /\.pdf$/i.test(file.name));

        if (isPdf) {
          if (file.size > 4 * 1024 * 1024) {
            setError(`PDF "${file.name}" exceeds 4 MB. Please compress it first.`);
            continue;
          }
          processed.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            file,
          });
          continue;
        }

        const isImage =
          file.type.startsWith("image/") ||
          /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
        if (!isImage) {
          setError(
            allowPdf
              ? `"${file.name}" is not supported. Upload a PDF, JPG, or PNG file.`
              : `"${file.name}" is not supported. Upload JPG, PNG, or WebP images.`
          );
          continue;
        }

        const result = await compressImageFile(file, {
          allowWebpDirect: !allowPdf,
        });
        if (result.error) {
          setError(result.error);
          continue;
        }
        processed.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file: result.file,
        });
      }

      if (!processed.length) return;

      const nextFiles = multiple
        ? [...files, ...processed].slice(0, maxFiles)
        : processed.slice(0, 1);
      const nextBytes = nextFiles.reduce((sum, item) => sum + item.file.size, 0);
      if (nextBytes > MAX_LISTING_TOTAL_BYTES) {
        setError(
          `Total upload size (${formatFileSize(nextBytes)}) exceeds the 3.5 MB fast-upload limit. Remove an item and try again.`
        );
        return;
      }
      setFiles(nextFiles);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    await processFiles(picked);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (requiredFile && files.length === 0) {
      setError(`Please select ${label.toLowerCase()} before submitting.`);
      return;
    }

    if (totalBytes > MAX_LISTING_TOTAL_BYTES) {
      setError("Total attachment size must be 3.5 MB or less.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.delete(fileFieldName);
    for (const item of files) {
      formData.append(fileFieldName, item.file, item.file.name);
    }

    startTransition(async () => {
      try {
        await action(formData);
      } catch (err) {
        // Ignore NEXT_REDIRECT thrown by Next.js server actions during navigation
        const digest = (err as { digest?: string } | null)?.digest ?? "";
        if (!digest.startsWith("NEXT_REDIRECT")) {
          setError("Upload failed. Check your connection and file sizes, then try again.");
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      {children}

      <div className="space-y-2">
        <span className="block text-xs font-semibold text-[#5f574d]">{label}</span>
        <input
          ref={pickerRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="sr-only"
        />
        <button
          type="button"
          onClick={() => !isOptimizing && pickerRef.current?.click()}
          disabled={isOptimizing || isPending}
          className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-[#d0c1ab] bg-white/75 px-4 py-3 text-left transition hover:border-[#241e14] hover:bg-white cursor-pointer disabled:opacity-60"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#eee9e2] text-[#241e14]">
            {isOptimizing ? <Loader2 size={17} className="animate-spin" /> : <UploadCloud size={17} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-[#241e14]">
              {isOptimizing
                ? "Optimizing image for fast upload..."
                : files.length > 0 && multiple
                ? `Add more photos (${files.length}/${maxFiles} selected · ${formatFileSize(totalBytes)})`
                : files.length > 0
                ? `Replace selected file (${formatFileSize(totalBytes)})`
                : "Choose file from device"}
            </span>
            <span className="mt-0.5 block text-[11px] text-[#736b60]">{helperText}</span>
          </span>
        </button>

        {files.length > 0 && (
          <ul className="space-y-1.5 pt-1">
            {files.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[#d0c1ab]/50 bg-[#eee9e2]/50 px-3 py-1.5 text-xs text-[#241e14]"
              >
                <span className="truncate font-medium">
                  {item.file.name}{" "}
                  <span className="text-[#736b60]">({formatFileSize(item.file.size)})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((f) => f.id !== item.id))}
                  aria-label={`Remove ${item.file.name}`}
                  className="grid size-6 shrink-0 place-items-center rounded-full text-[#736b60] hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                >
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-900"
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-700" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || isOptimizing}
        className={buttonClassName}
      >
        {isPending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}

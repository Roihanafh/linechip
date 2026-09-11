interface AvatarUploadOverlayProps {
  progress: number;
  isUploading: boolean;
}

export default function AvatarUploadOverlay({
  progress,
  isUploading,
}: AvatarUploadOverlayProps) {
  if (!isUploading) return null;

  return (
    <div
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Mengupload foto... ${progress}%`}
      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50"
    >
      <span className="text-sm font-semibold text-white">{progress}%</span>
    </div>
  );
}

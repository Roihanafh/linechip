/**
 * ProfileSkeleton — skeleton loading placeholder untuk halaman profil.
 * Mencerminkan layout ProfileClient: Avatar, nama, badge, email, school, createdAt, tombol.
 * Requirement 1.5
 */
export default function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-border shadow-sm p-8 flex flex-col items-center gap-6 animate-pulse">

        {/* Avatar placeholder */}
        <div className="w-20 h-20 rounded-full bg-gray-200 flex-shrink-0" />

        {/* Nama placeholder */}
        <div className="w-48 h-6 rounded bg-gray-200" />

        {/* Badge Auth Provider placeholder */}
        <div className="w-32 h-5 rounded-full bg-gray-200" />

        {/* Divider */}
        <div className="w-full border-t border-border" />

        {/* Info rows */}
        <div className="w-full flex flex-col gap-4">

          {/* Email row */}
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded bg-gray-200 flex-shrink-0" />
            <div className="flex-1 h-4 rounded bg-gray-200" />
          </div>

          {/* School row */}
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded bg-gray-200 flex-shrink-0" />
            <div className="flex-1 h-4 rounded bg-gray-200 max-w-[75%]" />
          </div>

          {/* createdAt row */}
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded bg-gray-200 flex-shrink-0" />
            <div className="w-36 h-4 rounded bg-gray-200" />
          </div>

        </div>

        {/* Divider */}
        <div className="w-full border-t border-border" />

        {/* Button placeholder */}
        <div className="w-full h-10 rounded-xl bg-gray-200" />

      </div>
    </div>
  );
}

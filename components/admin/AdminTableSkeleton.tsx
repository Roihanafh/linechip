// components/admin/AdminTableSkeleton.tsx
// Skeleton loading placeholder for admin data tables.

interface AdminTableSkeletonProps {
  rows?: number;     // default: 20
  columns?: number;  // default: 7
}

// Column width classes cycle through to simulate realistic column widths
const CELL_WIDTHS = ['w-8', 'w-24', 'w-32', 'w-20', 'w-16', 'w-24', 'w-12'];

export default function AdminTableSkeleton({
  rows = 20,
  columns = 7,
}: AdminTableSkeletonProps) {
  return (
    <tbody aria-busy="true" aria-label="Memuat data…">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-slate-100">
          {Array.from({ length: columns }, (_, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <div
                className={`h-4 bg-slate-200 animate-pulse rounded ${
                  CELL_WIDTHS[colIndex % CELL_WIDTHS.length]
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

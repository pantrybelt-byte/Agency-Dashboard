import React, { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  /** Visible header text. Use `srLabel` when this is an abbreviation. */
  label: string;
  /** Fuller header text announced to assistive technology. */
  srLabel?: string;
  sortable?: boolean;
  /** Value to sort on. Defaults to the raw field named by `key`. */
  sortValue?: (item: T) => string | number;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  /**
   * When the table has `onRowClick`, this column's cell content is wrapped in
   * a button so the row is reachable by keyboard. Defaults to the first column.
   */
  isRowTrigger?: boolean;
}

interface DataTableProps<T> {
  /** Accessible name for the table. Required — every data table needs one. */
  caption: string;
  /** Render the caption visibly instead of only for screen readers. */
  captionVisible?: boolean;
  columns: Column<T>[];
  data: T[];
  /** Stable identity per row. Index keys reorder badly under sorting. */
  rowKey: (item: T) => string;
  /** Omit for no pagination. */
  pageSize?: number;
  onRowClick?: (item: T) => void;
  isRowSelected?: (item: T) => boolean;
  /** Accessible name for the row trigger button. */
  rowLabel?: (item: T) => string;
  emptyMessage?: string;
  initialSortKey?: string;
  initialSortDirection?: 'asc' | 'desc';
}

const alignClass = (align: Column<unknown>['align']) =>
  align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

const justifyClass = (align: Column<unknown>['align']) =>
  align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

/**
 * Sortable, optionally paginated data table.
 *
 * Accessibility notes: the table is named by a caption, headers carry `scope`
 * and `aria-sort`, sorting is driven by real buttons rather than click handlers
 * on `<th>`, and a clickable row exposes a button in its trigger column so it
 * can be reached without a mouse.
 */
export function DataTable<T>({
  caption,
  captionVisible = false,
  columns,
  data,
  rowKey,
  pageSize,
  onRowClick,
  isRowSelected,
  rowLabel,
  emptyMessage = 'No matching records.',
  initialSortKey,
  initialSortDirection = 'desc',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(initialSortKey ?? null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSortDirection);
  const [currentPage, setCurrentPage] = useState(0);

  const triggerKey = (columns.find((column) => column.isRowTrigger) ?? columns[0])?.key;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(initialSortDirection);
    }
    setCurrentPage(0);
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const column = columns.find((candidate) => candidate.key === sortKey);

    const valueOf = (item: T): string | number => {
      if (column?.sortValue) return column.sortValue(item);
      const raw = (item as Record<string, unknown>)[sortKey];
      return typeof raw === 'number' ? raw : String(raw ?? '');
    };

    return [...data].sort((a, b) => {
      const left = valueOf(a);
      const right = valueOf(b);
      if (typeof left === 'number' && typeof right === 'number') {
        return sortDirection === 'asc' ? left - right : right - left;
      }
      return sortDirection === 'asc'
        ? String(left).localeCompare(String(right))
        : String(right).localeCompare(String(left));
    });
  }, [data, columns, sortKey, sortDirection]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(sortedData.length / pageSize)) : 1;
  const safePage = Math.min(currentPage, totalPages - 1);
  const visibleRows = pageSize ? sortedData.slice(safePage * pageSize, (safePage + 1) * pageSize) : sortedData;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className={captionVisible ? 'text-[12px] text-slate-300 text-left pb-2' : 'sr-only'}>
            {caption}
            {sortKey
              ? `, sorted by ${columns.find((column) => column.key === sortKey)?.label ?? sortKey}, ${
                  sortDirection === 'asc' ? 'ascending' : 'descending'
                }`
              : ''}
          </caption>
          <thead>
            <tr className="border-b border-white/[0.08]">
              {columns.map((column) => {
                const isSorted = sortKey === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                    style={{ width: column.width }}
                    className={`py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-300 ${alignClass(
                      column.align,
                    )}`}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className={`inline-flex items-center gap-1 w-full uppercase tracking-wider hover:text-white transition-colors cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${justifyClass(
                          column.align,
                        )}`}
                      >
                        <span>{column.label}</span>
                        {column.srLabel && <span className="sr-only">{column.srLabel}</span>}
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-3 h-3" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="w-3 h-3" aria-hidden="true" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3 h-3 opacity-50" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      <>
                        <span>{column.label}</span>
                        {column.srLabel && <span className="sr-only">{column.srLabel}</span>}
                      </>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-10 text-center text-[13px] text-slate-300">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              visibleRows.map((item) => {
                const selected = isRowSelected?.(item) ?? false;
                return (
                  <tr
                    key={rowKey(item)}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                    className={`border-b border-white/[0.04] transition-colors ${
                      onRowClick ? 'cursor-pointer' : ''
                    } ${selected ? 'bg-emerald-500/[0.08]' : onRowClick ? 'hover:bg-white/[0.03]' : ''}`}
                  >
                    {columns.map((column) => {
                      const content = column.render
                        ? column.render(item)
                        : String((item as Record<string, unknown>)[column.key] ?? '');

                      // The trigger column carries the keyboard-reachable
                      // control, so a mouse click on the row and a keyboard
                      // activation do the same thing.
                      const wrap = onRowClick && column.key === triggerKey;

                      return (
                        <td key={column.key} className={`py-3 px-3 text-[13px] ${alignClass(column.align)}`}>
                          {wrap ? (
                            <button
                              type="button"
                              aria-pressed={selected}
                              aria-label={rowLabel?.(item)}
                              onClick={(event) => {
                                event.stopPropagation();
                                onRowClick(item);
                              }}
                              className={`text-left w-full rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${justifyClass(
                                column.align,
                              )}`}
                            >
                              {content}
                            </button>
                          ) : (
                            content
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pageSize && totalPages > 1 && (
        <nav
          aria-label={`${caption} pagination`}
          className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.08]"
        >
          <p className="text-[12px] text-slate-300">
            Showing {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, sortedData.length)} of{' '}
            {sortedData.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
              aria-label="Previous page"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentPage(index)}
                aria-label={`Page ${index + 1}`}
                aria-current={safePage === index ? 'page' : undefined}
                className={`w-7 h-7 rounded-lg text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                  safePage === index
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {index + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(totalPages - 1, safePage + 1))}
              disabled={safePage === totalPages - 1}
              aria-label="Next page"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

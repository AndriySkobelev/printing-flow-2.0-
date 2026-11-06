import { lazy, Suspense, useState, useId } from 'react';
import { type HeaderObject, type CellClickProps, QuickFilterConfig, RowSelectionChangeProps} from 'simple-table-core';
import { Search } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import 'simple-table-core/styles.css';

const SimpleTable = lazy(() =>
  import('simple-table-core').then(m => ({ default: m.SimpleTable }))
);

interface AppTableProps {
  rows: any[];
  isLoading?: boolean;
  rowGrouping?: string[];
  height?: number | string;
  fallback?: React.ReactNode;
  editColumns?: boolean;
  selectableCells?: boolean;
  expandAll?: boolean;
  enableRowSelection?: boolean;
  ref?: React.Ref<any>;
  hideHeader?: boolean;
  className?: string;
  enableStickyParents?: boolean;
  defaultHeaders: HeaderObject[];
  quickFilter?: QuickFilterConfig,
  onRowSelectionChange?: (data: RowSelectionChangeProps) => void;
  onCellClick?: (data: CellClickProps) => void;
  getRowId?: (row: any) => string | number;
  shouldPaginate?: boolean;
  rowsPerPage?: number;
  onPageChange?: (page: number) => void;
  // Renders a built-in search box above the table and drives quickFilter from
  // it, so pages don't each need their own search state/form/button.
  withSearch?: boolean;
  searchPlaceholder?: string;
  // Restricts the search box to these accessors instead of every column.
  columnSearch?: string[];
  // Rendered before the search box, on the same row (e.g. an "add" button).
  toolbar?: React.ReactNode;
  // Highlights the row whose getRowId equals this (e.g. the one picked by a click).
  selectedRowId?: string | null;
  rowHeight?: number;
}

const AppTable = ({ fallback, className, defaultHeaders, height, rows, isLoading, getRowId, withSearch, searchPlaceholder, columnSearch, quickFilter, toolbar, selectedRowId, rowHeight = 40, ...props }: AppTableProps) => {
  const [search, setSearch] = useState('');
  const tableId = useId();

  // simple-table has no row-class API; its cells carry data-row-id = "<index path>-<getRowId>".
  const selectedStyle = selectedRowId && (
    <style>{`
      [data-app-table="${tableId}"] .st-cell[data-row-id$="-${CSS.escape(selectedRowId)}"] {
        background-color: color-mix(in oklab, var(--primary) 10%, var(--background, #fff));
        font-weight: 600;
      }
      [data-app-table="${tableId}"] .st-cell[data-row-id$="-${CSS.escape(selectedRowId)}"][data-col-index="0"] {
        box-shadow: inset 3px 0 0 var(--primary);
      }
    `}</style>
  );

  const table = (
    <div data-app-table={tableId} className="contents">
    {selectedStyle}
    <Suspense fallback={fallback ?? <div className="flex items-center justify-center w-full h-32"><Spinner className="w-5 h-5" /></div>}>
      <SimpleTable
        rows={rows}
        height={height || 650}
        defaultHeaders={defaultHeaders}
        getRowId={getRowId}
        isLoading={isLoading}
        theme={'modern-light'}
        className={className}
        customTheme={{ rowHeight, headerHeight: 50 }}
        quickFilter={withSearch ? { mode: 'smart', text: search, caseSensitive: false, columns: columnSearch } : quickFilter}
        {...props}  />
    </Suspense>
    </div>
  );

  if (!withSearch) return table;

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      <div className="flex items-center gap-2 shrink-0">
        {toolbar}
        <div className="relative w-64">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder ?? 'Пошук...'}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {table}
      </div>
    </div>
  );
};

export default AppTable;

import { lazy, Suspense } from 'react';
import { type HeaderObject, type CellClickProps, QuickFilterConfig, RowSelectionChangeProps} from 'simple-table-core';
import { Spinner } from '@/components/ui/spinner';
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
}

const AppTable = ({ fallback, className, defaultHeaders, height, rows, isLoading, getRowId, ...props }: AppTableProps) => (
  <Suspense fallback={fallback ?? <div className="flex items-center justify-center w-full h-32"><Spinner className="w-5 h-5" /></div>}>
    <SimpleTable
      rows={rows}
      height={height || 650}
      defaultHeaders={defaultHeaders}
      getRowId={getRowId}
      isLoading={isLoading}
      theme={'modern-light'}
      className={className}
      customTheme={{ rowHeight: 40, headerHeight: 50 }}
      {...props}  />
  </Suspense>
);

export default AppTable;

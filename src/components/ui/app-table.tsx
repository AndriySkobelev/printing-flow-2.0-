import { lazy, Suspense } from 'react';
import { type SimpleTable as SimpleTableType, type HeaderObject, QuickFilterConfig, RowSelectionChangeProps} from 'simple-table-core';
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
  enableStickyParents?: boolean;
  defaultHeaders: HeaderObject[];
  quickFilter?: QuickFilterConfig,
  onRowSelectionChange?: (data: RowSelectionChangeProps) => void;
  getRowId?: (row: any) => string | number;
}

const AppTable = ({ fallback, defaultHeaders, height, rows, isLoading, getRowId, ...props }: AppTableProps) => (
  <Suspense fallback={fallback ?? <div className="flex items-center justify-center w-full h-32"><Spinner className="w-5 h-5" /></div>}>
    <SimpleTable
      rows={rows}
      height={height || 650}
      defaultHeaders={defaultHeaders}
      getRowId={getRowId}
      isLoading={isLoading}
      theme={'modern-light'}
      customTheme={{ rowHeight: 40, headerHeight: 50 }}
      {...props}  />
  </Suspense>
);

export default AppTable;

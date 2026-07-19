import * as React from "react";
import {
  type Column,
  type ColumnDef,
  type ColumnOrderState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Columns3,
  Download,
  FileSpreadsheet,
  FileText,
  GripVertical,
  Inbox,
  Printer,
  Search,
  X,
} from "lucide-react";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { Input } from "../primitives/input";
import { Skeleton } from "../primitives/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../primitives/dropdown-menu";
import { EmptyState } from "./empty-state";
import { exportToCsv, exportToExcel, exportToPdf, printTable, type ExportTable } from "../lib/export";

// Re-exported so consuming apps define columns without their own TanStack
// dependency (and without risking two copies of the types).
export type { ColumnDef } from "@tanstack/react-table";

const SELECT_COLUMN_ID = "__select";

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  isLoading?: boolean;
  /** Heading used for export documents and print. */
  title?: string;
  exportFilename?: string;
  searchPlaceholder?: string;
  enableSelection?: boolean;
  /** Toolbar content shown while rows are selected. */
  bulkActions?: (selectedRows: TData[]) => React.ReactNode;
  /** Toolbar content shown on the right (e.g. a "New" button). */
  toolbarActions?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  getRowId?: (row: TData, index: number) => string;
}

function headerLabel<TData>(column: Column<TData, unknown>): string {
  const header = column.columnDef.header;
  if (typeof header === "string") return header;
  const meta = column.columnDef.meta as { exportHeader?: string } | undefined;
  return meta?.exportHeader ?? column.id;
}

/**
 * The one table used across Connect Affairs.
 *
 * Sticky header · sorting · global search · column show/hide · column reorder
 * (drag) · column resize · row selection · bulk actions · pagination ·
 * CSV/Excel/PDF/Print export · loading skeletons · empty state.
 *
 * Because every module renders through this component, those behaviours are
 * guaranteed everywhere rather than re-implemented per screen.
 */
export function DataTable<TData>({
  data,
  columns,
  isLoading = false,
  title = "Export",
  exportFilename = "export",
  searchPlaceholder = "Search…",
  enableSelection = false,
  bulkActions,
  toolbarActions,
  emptyTitle = "Nothing to show",
  emptyDescription = "No records match your current search or filters.",
  pageSize = 10,
  getRowId,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [draggedColumn, setDraggedColumn] = React.useState<string | null>(null);

  const allColumns = React.useMemo<ColumnDef<TData, unknown>[]>(() => {
    if (!enableSelection) return columns;

    const selectColumn: ColumnDef<TData, unknown> = {
      id: SELECT_COLUMN_ID,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      size: 44,
      header: ({ table }) => (
        <input
          type="checkbox"
          aria-label="Select all rows"
          className="h-4 w-4 cursor-pointer accent-primary"
          checked={table.getIsAllPageRowsSelected()}
          ref={(el) => {
            if (el) el.indeterminate = table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected();
          }}
          onChange={(event) => table.toggleAllPageRowsSelected(event.target.checked)}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label="Select row"
          className="h-4 w-4 cursor-pointer accent-primary"
          checked={row.getIsSelected()}
          onChange={(event) => row.toggleSelected(event.target.checked)}
        />
      ),
    };
    return [selectColumn, ...columns];
  }, [columns, enableSelection]);

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, globalFilter, columnVisibility, columnOrder, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    enableRowSelection: enableSelection,
    getRowId,
    initialState: { pagination: { pageSize } },
  });

  // Seed the order once the table knows its columns.
  React.useEffect(() => {
    if (columnOrder.length === 0) {
      setColumnOrder(table.getAllLeafColumns().map((column) => column.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, columnOrder.length]);

  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
  const filteredCount = table.getFilteredRowModel().rows.length;

  /** Exports always cover every filtered+sorted row, not just the visible page. */
  const buildExport = React.useCallback((): ExportTable => {
    const exportColumns = table
      .getVisibleLeafColumns()
      .filter((column) => column.id !== SELECT_COLUMN_ID);

    return {
      filename: exportFilename,
      title,
      headers: exportColumns.map((column) => headerLabel(column)),
      rows: table.getSortedRowModel().rows.map((row) =>
        exportColumns.map((column) => {
          const value = row.getValue(column.id);
          if (value === null || value === undefined) return "";
          if (value instanceof Date) return value.toLocaleDateString();
          if (typeof value === "object") return JSON.stringify(value);
          return value as string | number;
        }),
      ),
    };
  }, [table, exportFilename, title]);

  const handleDrop = (targetId: string) => {
    if (!draggedColumn || draggedColumn === targetId) return;
    const order = [...(columnOrder.length ? columnOrder : table.getAllLeafColumns().map((c) => c.id))];
    const from = order.indexOf(draggedColumn);
    const to = order.indexOf(targetId);
    if (from === -1 || to === -1) return;
    order.splice(to, 0, order.splice(from, 1)[0] as string);
    setColumnOrder(order);
    setDraggedColumn(null);
  };

  const hideableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide() && column.id !== SELECT_COLUMN_ID);

  return (
    <div className="space-y-3">
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 pr-8"
          />
          {globalFilter ? (
            <button
              type="button"
              onClick={() => setGlobalFilter("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52">
              <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hideableColumns.map((column) => (
                <DropdownMenuItem
                  key={column.id}
                  onSelect={(event) => {
                    event.preventDefault();
                    column.toggleVisibility(!column.getIsVisible());
                  }}
                >
                  <input
                    type="checkbox"
                    readOnly
                    checked={column.getIsVisible()}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  {headerLabel(column)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44">
              <DropdownMenuLabel>Export {filteredCount} rows</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => exportToCsv(buildExport())}>
                <FileText />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void exportToExcel(buildExport())}>
                <FileSpreadsheet />
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void exportToPdf(buildExport())}>
                <FileText />
                PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => printTable(buildExport())}>
                <Printer />
                Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {toolbarActions}
        </div>
      </div>

      {/* ── Bulk action bar ─────────────────────────────────────── */}
      {enableSelection && selectedRows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium text-primary">
            {selectedRows.length} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">{bulkActions?.(selectedRows)}</div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => table.resetRowSelection()}
          >
            Clear
          </Button>
        </div>
      ) : null}

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="relative overflow-auto rounded-lg border bg-card" style={{ maxHeight: "70vh" }}>
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const isSelectCol = header.column.id === SELECT_COLUMN_ID;
                  return (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="group relative border-b px-3 py-2.5 text-left font-medium text-muted-foreground"
                      draggable={!isSelectCol}
                      onDragStart={() => setDraggedColumn(header.column.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleDrop(header.column.id)}
                    >
                      <div className="flex items-center gap-1.5">
                        {!isSelectCol ? (
                          <GripVertical className="h-3 w-3 cursor-grab text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100" />
                        ) : null}
                        <button
                          type="button"
                          disabled={!canSort}
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "flex min-w-0 flex-1 items-center gap-1 truncate text-left",
                            canSort && "cursor-pointer hover:text-foreground",
                          )}
                        >
                          <span className="truncate">
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          {canSort ? (
                            sorted === "asc" ? (
                              <ArrowUp className="h-3 w-3 shrink-0" />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="h-3 w-3 shrink-0" />
                            ) : (
                              <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-30" />
                            )
                          ) : null}
                        </button>
                      </div>

                      {header.column.getCanResize() ? (
                        <span
                          role="separator"
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none bg-transparent hover:bg-primary/40"
                        />
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b last:border-0">
                  {table.getVisibleLeafColumns().map((column) => (
                    <td key={column.id} className="px-3 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={table.getVisibleLeafColumns().length} className="p-0">
                  <EmptyState
                    icon={Inbox}
                    title={emptyTitle}
                    description={emptyDescription}
                    className="border-0"
                  />
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className="border-b transition-colors last:border-0 hover:bg-muted/50 data-[state=selected]:bg-primary/5"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="truncate px-3 py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {filteredCount === 0
            ? "No rows"
            : `Showing ${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–${Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                filteredCount,
              )} of ${filteredCount}`}
          {enableSelection && selectedRows.length > 0 ? ` · ${selectedRows.length} selected` : ""}
        </p>

        <div className="flex items-center gap-2">
          <select
            aria-label="Rows per page"
            value={table.getState().pagination.pageSize}
            onChange={(event) => table.setPageSize(Number(event.target.value))}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <span className="text-xs text-muted-foreground">
            {table.getPageCount() === 0 ? 0 : table.getState().pagination.pageIndex + 1} /{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

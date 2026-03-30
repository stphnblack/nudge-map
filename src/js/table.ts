// @ts-nocheck - need to update Tabulator filtering to fit nudge data

import {
  Tabulator,
  FilterModule,
  FormatModule,
  SortModule,
  ResizeColumnsModule,
  MoveColumnsModule,
  ExportModule,
  DownloadModule,
  ColumnDefinition,
  FrozenColumnsModule,
  PageModule,
  CellComponent,
  RowComponent,
  SortDirection,
  ColumnComponent,
} from "tabulator-tables";

import { PlaceFilterManager } from "./state/FilterState";
import { Date } from "./model/types";
import { ViewStateObservable } from "./layout/viewToggle";

function formatBoolean(cell: CellComponent): string {
  const v = cell.getValue() as boolean;
  return v ? "✓" : "";
}

function formatDate(cell: CellComponent): string {
  const v = cell.getValue() as Date | null;
  return v ? v.format() : "";
}

export function compareDates(
  a: Date | undefined,
  b: Date | undefined,
  _aRow: RowComponent,
  _bRow: RowComponent,
  _col: ColumnComponent,
  dir: SortDirection,
): number {
  if (a === b) return 0;
  if (dir === "asc") {
    if (!a) return 1;
    if (!b) return -1;
  } else {
    if (!a) return -1;
    if (!b) return 1;
  }
  return a.parsed.valueOf() - b.parsed.valueOf();
}

function compareStringArrays(a: string[], b: string[]): number {
  return a.join(",").localeCompare(b.join(","));
}

function formatStringArrays(cell: CellComponent): string {
  const v = cell.getValue() as string[] | null;
  return v ? v.join("; ") : "";
}

const PLACE_COLUMNS: ColumnDefinition[] = [
  {
    title: "Place",
    field: "place",
    width: 180,
    frozen: true,
    formatter: "link",
    formatterParams: {
      urlField: "url",
      labelField: "place",
      target: "_blank",
    },
  },
  { title: "State", field: "state", width: 120 },
  { title: "Country", field: "country", width: 120 },
];

const DATE_COLUMN: ColumnDefinition = {
  title: "Date",
  field: "date",
  width: 110,
  formatter: formatDate,
  sorter: compareDates,
};

export function tableDownloadFileName(
  policyType: PolicyTypeFilter,
  status: ReformStatus,
): string {
  const policy = {
    "any parking reform": "overview",
    "add parking maximums": "maximums",
    "remove parking minimums": "remove-minimums",
    "reduce parking minimums": "reduce-minimums",
    "parking benefit district": "benefit-district",
  }[policyType];
  return `parking-reforms--${policy}--${status}.csv`;
}

function updateCounterDownload(
  table: Tabulator,
  policyType: PolicyTypeFilter,
  status: ReformStatus,
): void {
  const button = document.querySelector(".counter-table-download");
  if (!button) return;
  button.addEventListener("click", () =>
    table.download("csv", tableDownloadFileName(policyType, status)),
  );
}

export default function initTable(
  filterManager: PlaceFilterManager,
  viewToggle: ViewStateObservable,
): Tabulator {
  Tabulator.registerModule([
    FilterModule,
    FormatModule,
    FrozenColumnsModule,
    SortModule,
    ResizeColumnsModule,
    MoveColumnsModule,
    PageModule,
    ExportModule,
    DownloadModule,
  ]);

  const data = Object.entries(filterManager.entries).map(
    ([placeId, entry]) => ({
      placeId,
      place: entry.place.name,
      state: entry.place.state,
      country: entry.place.country,
      url: entry.place.url,
    }),
  );

  const table = new Tabulator("#table", {
    data: data,
    columns: PLACE_COLUMNS,
    layout: "fitColumns",
    movableColumns: true,
    // We use pagination to avoid performance issues.
    pagination: true,
    paginationSize: 100,
    paginationCounter: (
      _pageSize,
      _currentRow,
      currentPage,
      _totalRows,
      totalPages,
    ) => `Page ${currentPage} of ${totalPages}`,
  });

  // We use Tabulator's filter to add/remove records based on FilterState,
  // as it's much faster than resetting the data.
  //
  // Note that the same filter works for every PolicyTypeFilter, meaning we
  // don't need to re-set this up based on which is chosen.
  let tableBuilt = false;
  table.on("tableBuilt", () => {
    tableBuilt = true;
    table.setFilter((row) => {
      const entry = filterManager.matchedPlaces[row.placeId];
      if (!entry) return false;
      if (entry.type === "any") {
        return true;
      }
      // With search, we ignore the normal filters like jurisdiction. However,
      // we do still have to pay attention to what dataset is loaded
      // (policy type x status).
      if (entry.type === "search") {
        // With 'any parking reform', each reform status has a different dataset already.
        // So, it's safe to include the entry from search.
        if (currentPolicyTypeFilter === "any parking reform") {
          return true;
        }
        return row.status === currentStatus;
      }
      return entry.matchingIndexes.includes(row.policyIdx);
    });
  });

// Either re-filter the data or load an entirely new dataset.
  const updateData = (
    newPolicyTypeFilter: PolicyTypeFilter,
    newStatus: ReformStatus,
  ): void => {
    if (
      newPolicyTypeFilter === currentPolicyTypeFilter &&
      newStatus === currentStatus
    ) {
      table.refreshFilter();
    } else {
      currentPolicyTypeFilter = newPolicyTypeFilter;
      currentStatus = newStatus;
      const [columns2, data2] =
        filterStateToConfig[newPolicyTypeFilter][newStatus];
      table.setColumns(columns2);
      table.setData(data2);
    }
  };

  // When on map view, we should only lazily update the table the next time
  // we switch to table view.
  let dataRefreshQueued = false;

  filterManager.subscribe(
    "update table's records",
    ({ policyTypeFilter, status }) => {
      updateCounterDownload(table, policyTypeFilter, status);
      if (!tableBuilt) return;
      if (viewToggle.getValue() === "map") {
        dataRefreshQueued = true;
        return;
      }

      updateData(policyTypeFilter, status);
    },
  );

  viewToggle.subscribe((view) => {
    if (view === "map" || !dataRefreshQueued) return;
    dataRefreshQueued = false;
    const state = filterManager.getState();
    updateData(state.policyTypeFilter, state.status);
  }, "apply queued table data refresh");

  return table;
}

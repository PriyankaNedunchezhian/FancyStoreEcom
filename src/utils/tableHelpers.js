export function normalizeSearch(query) {
  return String(query || '')
    .trim()
    .toLowerCase();
}

export function filterRows(rows, query, getSearchText) {
  const q = normalizeSearch(query);
  if (!q) return rows;
  return rows.filter((row) =>
    String(getSearchText(row) || '')
      .toLowerCase()
      .includes(q),
  );
}

function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  const aTime = a instanceof Date ? a.getTime() : Date.parse(a);
  const bTime = b instanceof Date ? b.getTime() : Date.parse(b);
  if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
    return aTime - bTime;
  }

  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export function sortRows(rows, sortKey, sortDir, getValue) {
  if (!sortKey) return rows;
  const dir = sortDir === 'desc' ? -1 : 1;
  return [...rows].sort((left, right) => {
    const a = getValue(left, sortKey);
    const b = getValue(right, sortKey);
    return compareValues(a, b) * dir;
  });
}

export function nextSortState(currentKey, currentDir, nextKey) {
  if (currentKey !== nextKey) {
    return { sortKey: nextKey, sortDir: 'asc' };
  }
  if (currentDir === 'asc') {
    return { sortKey: nextKey, sortDir: 'desc' };
  }
  return { sortKey: '', sortDir: 'asc' };
}

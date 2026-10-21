import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Printer,
  Search,
} from 'lucide-react';
import './DataTableToolbar.css';

function FileTypeIcon({ src, alt }) {
  return (
    <img
      src={src}
      alt={alt}
      className="dtt-file-icon"
      width={32}
      height={32}
      draggable={false}
    />
  );
}

export default function DataTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  countLabel,
  exportDisabled = false,
  onExportExcel,
  onExportPdf,
  onPrint,
  children,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function onPointerDown(e) {
      if (!menuRef.current?.contains(e.target)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="dtt-toolbar">
      <div className="dtt-toolbar-left">
        <label className="dtt-search">
          <Search size={18} strokeWidth={2.25} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </label>
        {countLabel ? <p className="dtt-count">{countLabel}</p> : null}
      </div>

      <div className="dtt-toolbar-right">
        <div className="dtt-export" ref={menuRef}>
          <button
            type="button"
            className="products-btn secondary dtt-icon-only"
            disabled={exportDisabled}
            title="Download"
            aria-label="Download"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Download size={22} strokeWidth={2.25} aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div className="dtt-export-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                title="Excel (.xlsx)"
                aria-label="Download Excel"
                onClick={() => {
                  setMenuOpen(false);
                  onExportExcel?.();
                }}
              >
                <FileTypeIcon src="/icons/excel.svg" alt="" />
              </button>
              <button
                type="button"
                role="menuitem"
                title="PDF"
                aria-label="Download PDF"
                onClick={() => {
                  setMenuOpen(false);
                  onExportPdf?.();
                }}
              >
                <FileTypeIcon src="/icons/pdf.svg" alt="" />
              </button>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="products-btn secondary dtt-icon-only"
          disabled={exportDisabled}
          title="Print"
          aria-label="Print"
          onClick={() => onPrint?.()}
        >
          <Printer size={22} strokeWidth={2.25} aria-hidden="true" />
        </button>

        {children}
      </div>
    </div>
  );
}

export function SortableTh({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className = '',
}) {
  const active = activeKey === sortKey;
  const ariaSort = active
    ? direction === 'desc'
      ? 'descending'
      : 'ascending'
    : 'none';

  const SortIcon = active
    ? direction === 'desc'
      ? ArrowDown
      : ArrowUp
    : ArrowUpDown;

  return (
    <th className={`dtt-sortable ${className}`.trim()} aria-sort={ariaSort}>
      <button
        type="button"
        className={`dtt-sort-btn${active ? ' active' : ''}`}
        title={`Sort by ${label}`}
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        <SortIcon
          className="dtt-sort-icon"
          size={14}
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

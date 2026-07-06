import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Columns3, FileDown, FileUp, MoreHorizontal } from 'lucide-react';
import { useToast } from '@boilerplate/ui-common';
import {
  downloadEmployeeExport,
  startEmployeeExport,
  startEmployeeImport,
  waitForEmployeeCsvJob,
  type EmployeeImportSummary,
} from '../api';

type EmployeeCsvActionsProps = {
  search: string;
  departmentId: string;
  onImported: () => void;
  onColumnsClick: () => void;
};

/**
 * Full-dataset CSV export/import — enqueued to the worker service and
 * polled to completion, unlike the table's built-in "Export CSV" which
 * only covers the currently loaded page.
 */
export function EmployeeCsvActions({ search, departmentId, onImported, onColumnsClick }: EmployeeCsvActionsProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const { jobId } = await startEmployeeExport({
        search: search.trim() || undefined,
        departmentId: departmentId || undefined,
      });
      await waitForEmployeeCsvJob(jobId);
      const blob = await downloadEmployeeExport(jobId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'employees.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('employees.exportFailed'), 'error');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImportFile(file: File) {
    setIsImporting(true);
    try {
      const csv = await file.text();
      const { jobId } = await startEmployeeImport(csv);
      const status = await waitForEmployeeCsvJob(jobId);
      const summary = status.result as EmployeeImportSummary;
      showToast(
        t('employees.importSummary', {
          created: summary.created,
          updated: summary.updated,
          skipped: summary.skipped,
        }),
        summary.skipped > 0 ? 'info' : 'success',
      );
      onImported();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('employees.importFailed'), 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleImportFile(file);
        }}
      />
      <div className="employee-table-actions">
        <button
          type="button"
          className="employee-table-actions__trigger"
          onClick={() => setIsOpen((current) => !current)}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label="More employee table actions"
        >
          <MoreHorizontal size={18} />
        </button>
        {isOpen && (
          <div className="employee-table-actions__menu" role="menu">
            <button
              type="button"
              role="menuitem"
              disabled={isImporting}
              onClick={() => {
                setIsOpen(false);
                fileInputRef.current?.click();
              }}
            >
              <FileUp size={14} />
              {isImporting ? t('employees.importing') : t('employees.importCsv')}
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={isExporting}
              onClick={() => {
                setIsOpen(false);
                void handleExport();
              }}
            >
              <FileDown size={14} />
              {isExporting ? t('employees.exporting') : t('employees.exportAll')}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onColumnsClick();
              }}
            >
              <Columns3 size={14} />
              {t('employees.columnsButton')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

import { Filter, List, MoreHorizontal, ArrowUpDown, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type ViewToolbarProps = {
  viewName: string;
  count?: number;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onFilter?: () => void;
  onSort?: () => void;
  onOptions?: () => void;
};

export function ViewToolbar({
  viewName,
  count,
  primaryActionLabel,
  onPrimaryAction,
  onFilter,
  onSort,
  onOptions,
}: ViewToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="boilerplate-view-toolbar">
      <div className="boilerplate-view-tabs">
        <div className="boilerplate-view-tab">
          <List size={14} className="boilerplate-view-tab-icon" />
          <span>{viewName}</span>
          {count !== undefined && <span className="boilerplate-view-tab-count">{count}</span>}
        </div>
      </div>

      <div className="boilerplate-view-actions">
        {onPrimaryAction && (
          <button type="button" className="ui-button ui-button--primary ui-button--sm" onClick={onPrimaryAction}>
            <Plus size={14} />
            <span>{primaryActionLabel ?? t('boilerplate.create', 'Create')}</span>
          </button>
        )}
        {onFilter && (
          <button type="button" className="boilerplate-view-action-btn" onClick={onFilter}>
            <Filter size={14} />
            <span>{t('boilerplate.filter', 'Filter')}</span>
          </button>
        )}
        {onSort && (
          <button type="button" className="boilerplate-view-action-btn" onClick={onSort}>
            <ArrowUpDown size={14} />
            <span>{t('boilerplate.sort', 'Sort')}</span>
          </button>
        )}
        {onOptions && (
          <button type="button" className="boilerplate-view-action-btn" onClick={onOptions}>
            <span>{t('boilerplate.options', 'Options')}</span>
            <MoreHorizontal size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

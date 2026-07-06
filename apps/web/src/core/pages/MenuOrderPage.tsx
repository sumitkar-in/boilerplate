import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  Folder,
  GripVertical,
  LayoutList,
  Save,
} from 'lucide-react';
import { Button, useTenant } from '@boilerplate/ui-common';
import { useTranslation } from 'react-i18next';
import {
  apiGetGlobalMenuOrder,
  apiGetTenantMenuOrder,
  apiUpdateGlobalMenuOrder,
  apiUpdateTenantMenuOrder,
} from '../api-client';
import type { CustomMenuItem } from '@boilerplate/contracts';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type AvailableMenuItem = {
  key: string;
  labelKey?: string;
};

// Labels are translation keys, not display text — resolved via t() below.
const TENANT_ITEMS = [
  { key: 'dashboard', labelKey: 'menuOrder.itemDashboard' },
  { key: 'tenant-settings', labelKey: 'menuOrder.itemTenantSettings' },
  { key: 'security', labelKey: 'menuOrder.itemSecurity' },
  { key: 'members', labelKey: 'menuOrder.itemMembers' },
  { key: 'settings.menu', labelKey: 'menuOrder.itemMenuOrder' },
  { key: 'settings.roles', labelKey: 'menuOrder.itemRoles' },
];

const PLATFORM_ITEMS = [
  { key: 'admin.tenants', labelKey: 'menuOrder.itemTenants' },
  { key: 'admin.menu', labelKey: 'menuOrder.itemMenuOrder' },
];

function normalizeMenuOrder(itemOrder: Array<CustomMenuItem | string>): CustomMenuItem[] {
  return itemOrder.map((item) =>
    typeof item === 'string' ? { id: item } : item,
  );
}

function SortableItem({
  id,
  item,
  label,
  childCount,
  isChild = false,
  onToggleHidden,
}: {
  id: string;
  item: CustomMenuItem;
  label: string;
  childCount: number;
  isChild?: boolean;
  onToggleHidden: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} className={`menu-order-row${isChild ? ' menu-order-row--child' : ''}${item.hidden ? ' menu-order-row--hidden' : ''}`} style={style}>
      <button
        type="button"
        className="menu-order-row__handle"
        aria-label={`Drag ${label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <div className="menu-order-row__icon">
        {item.children ? <Folder size={18} /> : <LayoutList size={18} />}
      </div>
      <div className="menu-order-row__content">
        <strong>{label}</strong>
        <small>
          {item.hidden
            ? 'Hidden from sidebar'
            : item.children
            ? `${childCount} nested ${childCount === 1 ? 'item' : 'items'}`
            : id}
        </small>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleHidden}
        aria-label={`${item.hidden ? 'Show' : 'Hide'} ${label}`}
      >
        {item.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
        {item.hidden ? 'Hidden' : 'Shown'}
      </Button>
    </div>
  );
}

function PreviewItem({
  item,
  labels,
}: {
  item: CustomMenuItem;
  labels: Map<string, string>;
}) {
  if (item.hidden) return null;
  const label = item.label || labels.get(item.id) || item.id;

  return (
    <div className="menu-preview-item">
      <div className="menu-preview-item__label">
        {item.children ? <Folder size={15} /> : <LayoutList size={15} />}
        <span>{label}</span>
      </div>
      {item.children && (
        <div className="menu-preview-item__children">
          {item.children.filter((child) => !child.hidden).map((child) => (
            <PreviewItem key={child.id} item={child} labels={labels} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MenuOrderPage({ scope, embedded }: { scope: 'tenant' | 'global'; embedded?: boolean }) {
  const { t } = useTranslation();
  const { enabledFeatureKeys } = useTenant();
  
  const availableItems = useMemo<AvailableMenuItem[]>(
    () =>
      scope === 'global'
        ? PLATFORM_ITEMS
        : [
            ...TENANT_ITEMS,
            ...Array.from(enabledFeatureKeys).map((key) => ({ key, labelKey: undefined as string | undefined })),
          ],
    [enabledFeatureKeys, scope],
  );

  const [itemOrder, setItemOrder] = useState<CustomMenuItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    let cancelled = false;
    const request = scope === 'global' ? apiGetGlobalMenuOrder() : apiGetTenantMenuOrder();
    request.then(
      (res) => {
        if (!cancelled) {
          if (res.itemOrder.length > 0) {
            setItemOrder(normalizeMenuOrder(res.itemOrder));
          } else {
            // Seed default menu structure
            const defaultMenu: CustomMenuItem[] = scope === 'global' ? 
              availableItems.map(i => ({ id: i.key })) :
              [
                { id: 'dashboard' },
                { id: 'custom-people', label: 'People', children: [{ id: 'employees' }, { id: 'departments' }] },
                { id: 'custom-work', label: 'Work', children: [{ id: 'tasks' }] },
                { id: 'custom-knowledge', label: 'Knowledge', children: [{ id: 'notes' }, { id: 'documents' }] },
                { id: 'settings.menu' }
              ];
            
            // Add missing items to a 'More' folder
            const usedKeys = new Set<string>();
            const traverse = (items: CustomMenuItem[]) => {
              for (const item of items) {
                usedKeys.add(item.id);
                if (item.children) traverse(item.children);
              }
            };
            traverse(defaultMenu);
            
            const missing = availableItems.filter(i => !usedKeys.has(i.key));
            if (missing.length > 0) {
              defaultMenu.push({
                id: 'custom-more',
                label: 'More',
                children: missing.map(i => ({ id: i.key }))
              });
            }
            setItemOrder(defaultMenu);
          }
        }
      },
      (err: unknown) => {
        if (!cancelled) setMessage(err instanceof Error ? err.message : t('menuOrder.loadFailed'));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [availableItems, scope, t]);

  async function save() {
    setMessage(null);
    try {
      const res =
        scope === 'global'
          ? await apiUpdateGlobalMenuOrder(itemOrder)
          : await apiUpdateTenantMenuOrder(itemOrder);
      setItemOrder(normalizeMenuOrder(res.itemOrder));
      setMessage(t('menuOrder.saveSuccess'));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('menuOrder.saveFailed'));
    }
  }

  const labels = new Map(
    availableItems.map((item) => [item.key, item.labelKey ? t(item.labelKey) : item.key]),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItemOrder((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(items, oldIndex, newIndex);
        }

        const parentIndex = items.findIndex((item) => {
          const children = item.children ?? [];
          return children.some((child) => child.id === active.id) && children.some((child) => child.id === over.id);
        });
        if (parentIndex === -1) return items;

        return items.map((item, index) => {
          if (index !== parentIndex || !item.children) return item;
          const childOldIndex = item.children.findIndex((child) => child.id === active.id);
          const childNewIndex = item.children.findIndex((child) => child.id === over.id);
          return { ...item, children: arrayMove(item.children, childOldIndex, childNewIndex) };
        });
      });
    }
  }

  function toggleHidden(itemId: string) {
    setItemOrder((items) => toggleHiddenInTree(items, itemId));
  }
  
  return (
    <section className={embedded ? "menu-order-page menu-order-page--embedded" : "boilerplate-view-container menu-order-page"} aria-label={t('menuOrder.title')}>
      {!embedded && (
        <div className="menu-order-hero">
          <div>
            <span className="metric-label">
              {scope === 'global' ? 'Platform navigation' : 'Tenant navigation'}
            </span>
            <h1>{t('menuOrder.title')}</h1>
            <p className="hint-text">
              Arrange the navigation items that users see in the sidebar.
            </p>
          </div>
          <Button variant="primary" onClick={() => void save()}>
            <Save size={16} />
            {t('menuOrder.saveButton')}
          </Button>
        </div>
      )}

      {embedded && (
        <div className="menu-order-hero menu-order-hero--embedded" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 className="section-title" style={{ margin: 0 }}><LayoutList size={20} /> {t('menuOrder.title')}</h2>
            <p className="hint-text" style={{ marginTop: '4px' }}>Arrange the navigation items that users see in the sidebar.</p>
          </div>
          <Button variant="primary" onClick={() => void save()}>
            <Save size={16} />
            {t('menuOrder.saveButton')}
          </Button>
        </div>
      )}

      {message && <p className="menu-order-message">{message}</p>}

      <div className="menu-order-shell">
        <section className="menu-order-panel menu-order-panel--editor">
          <div className="menu-order-panel__header">
            <div>
              <h2>Menu structure</h2>
              <p className="hint-text">
                Drag root-level items and folders into the preferred order.
              </p>
            </div>
            <span className="badge">{itemOrder.length} items</span>
          </div>
            
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={itemOrder.map(i => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="menu-order-list">
                {itemOrder.map((item) => (
                  <div className="menu-order-tree" key={item.id}>
                    <SortableItem
                      id={item.id}
                      item={item}
                      label={item.label || labels.get(item.id) || item.id}
                      childCount={item.children?.length ?? 0}
                      onToggleHidden={() => toggleHidden(item.id)}
                    />
                    {item.children && item.children.length > 0 && (
                      <SortableContext
                        items={item.children.map((child) => child.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="menu-order-children">
                          {item.children.map((child) => (
                            <SortableItem
                              key={child.id}
                              id={child.id}
                              item={child}
                              label={child.label || labels.get(child.id) || child.id}
                              childCount={0}
                              isChild
                              onToggleHidden={() => toggleHidden(child.id)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>
        
        <aside className="menu-order-panel menu-order-panel--preview">
          <div className="menu-order-panel__header">
            <div>
              <h2>Live preview</h2>
              <p className="hint-text">Approximate sidebar order after saving.</p>
            </div>
            <Eye size={18} />
          </div>
          <div className="menu-preview-frame">
            <div className="menu-preview-brand">
              <div className="menu-preview-brand__mark">
                <LayoutList size={18} />
              </div>
              <strong>{scope === 'global' ? 'Platform Admin' : 'Boilerplate'}</strong>
            </div>
            <nav className="menu-preview-nav">
              {itemOrder.map((item) => (
                <PreviewItem key={item.id} item={item} labels={labels} />
              ))}
            </nav>
          </div>
        </aside>
      </div>
    </section>
  );
}

function toggleHiddenInTree(items: CustomMenuItem[], itemId: string): CustomMenuItem[] {
  return items.map((item) => ({
    ...item,
    hidden: item.id === itemId ? !item.hidden : item.hidden,
    children: item.children ? toggleHiddenInTree(item.children, itemId) : undefined,
  }));
}

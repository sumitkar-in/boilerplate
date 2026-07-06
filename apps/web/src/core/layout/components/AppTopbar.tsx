import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import { AppIcon } from './AppIcon';
import type { ShellNavItem } from './AppSidebar';

type AppTopbarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: ShellNavItem[];
  onSelectSearchResult: (path: string) => void;
  onOpenSidebar: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  tenantName?: string;
  hideSearch?: boolean;
};

export function AppTopbar({
  searchQuery,
  onSearchChange,
  searchResults,
  onSelectSearchResult,
  onOpenSidebar,
  sidebarCollapsed,
  onToggleSidebarCollapse,
  tenantName,
  hideSearch = false,
}: AppTopbarProps) {
  const { t } = useTranslation();
  const searchRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const hasQuery = searchQuery.trim().length > 0;
  const showResults = isSearchOpen && (hasQuery || searchResults.length > 0);
  const selectedIndex = Math.min(activeIndex, Math.max(searchResults.length - 1, 0));

  useEffect(() => {
    function handleDocumentMouseDown(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }

    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setIsSearchOpen(true);
      }
    }

    document.addEventListener('mousedown', handleDocumentMouseDown);
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  function selectResult(item: ShellNavItem) {
    setIsSearchOpen(false);
    onSelectSearchResult(item.path);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const item = searchResults[selectedIndex] ?? searchResults[0];
    if (item) selectResult(item);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsSearchOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(searchResults.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsSearchOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      if (searchQuery) onSearchChange('');
      setIsSearchOpen(false);
    }
  }

  return (
    <header className="app-shell__topbar">
      <button
        type="button"
        className="app-shell__mobile-menu"
        onClick={onOpenSidebar}
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      <button
        type="button"
        className="app-shell__collapse-toggle app-shell__collapse-toggle--topbar"
        onClick={onToggleSidebarCollapse}
        aria-label={sidebarCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
        aria-expanded={!sidebarCollapsed}
        title={sidebarCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
      >
        {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>

      {hideSearch ? (
        <div className="app-shell__tenant-name">{tenantName ?? 'Workspace'}</div>
      ) : (
        <form className="app-shell__search" ref={searchRef} role="search" onSubmit={handleSearchSubmit}>
          <div className="app-shell__search-field">
            <Search size={15} className="app-shell__search-icon" />
            <input
              ref={inputRef}
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(event) => {
                onSearchChange(event.target.value);
                setActiveIndex(0);
                setIsSearchOpen(true);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search pages... (⌘K)"
              autoComplete="off"
              aria-label="Search pages"
              aria-expanded={showResults}
              aria-controls="app-shell-search-results"
              aria-activedescendant={showResults && searchResults[selectedIndex] ? `search-result-${searchResults[selectedIndex].key}` : undefined}
            />
            <kbd className="app-shell__shortcut-badge">⌘K</kbd>
          </div>

          {showResults && (
            <div className="app-shell__search-results" id="app-shell-search-results" role="listbox">
              <div className="app-shell__search-results-head">
                {hasQuery ? 'Search results' : 'Quick navigation'}
              </div>
              {searchResults.length > 0 ? (
                searchResults.map((item, index) => (
                  <button
                    key={`${item.key}:${item.path}`}
                    id={`search-result-${item.key}`}
                    type="button"
                    className={`app-shell__search-result${index === selectedIndex ? ' app-shell__search-result--active' : ''}`}
                    role="option"
                    aria-selected={index === selectedIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectResult(item)}
                  >
                    <span className="app-shell__search-result-icon">
                      <AppIcon name={item.icon || item.key} size={16} />
                    </span>
                    <span className="app-shell__search-result-main">
                      <span className="app-shell__search-result-label">{item.label}</span>
                      <span className="app-shell__search-result-description">
                        {item.description ?? item.path}
                      </span>
                    </span>
                    <span className="app-shell__search-result-meta">
                      <span>{item.category ?? 'View'}</span>
                      <span className="app-shell__search-result-path">{item.path}</span>
                    </span>
                  </button>
                ))
              ) : (
                <div className="app-shell__search-empty">{t('shell.searchEmpty')}</div>
              )}
            </div>
          )}
        </form>
      )}

      <div className="app-shell__topbar-spacer" />
    </header>
  );
}

import React from 'react';
import { createPortal } from 'react-dom';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, helperText, className = '', id, ...props }) => {
  const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <div className="ui-field">
      {label && (
        <label htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`${error ? 'ui-input--error' : ''} ${className}`.trim()}
        {...props}
      />
      {error && <span className="ui-field__error">{error}</span>}
      {!error && helperText && <span className="ui-field__hint">{helperText}</span>}
    </div>
  );
};

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string | number }[];
}

export const Select: React.FC<SelectProps> = ({ label, error, options, className = '', id, ...props }) => {
  const selectId = id || (label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <div className="ui-field">
      {label && (
        <label htmlFor={selectId}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`${error ? 'ui-input--error' : ''} ${className}`.trim()}
        {...props}
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="ui-field__error">{error}</span>}
    </div>
  );
};

export interface SearchableSelectOption {
  label: string;
  value: string | number;
  description?: string;
}

export interface SearchableSelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  options: SearchableSelectOption[];
  value: string | number;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
}

function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  if (!node) return null;
  let parent = node.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    const hasScrollClass = parent.classList.contains('ui-modal__body');
    const isScrollable =
      parent.scrollHeight > parent.clientHeight &&
      (style.overflowY === 'auto' || style.overflowY === 'scroll');

    if (hasScrollClass || isScrollable) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  error,
  helperText,
  options,
  value,
  placeholder = 'Select',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found',
  className = '',
  id,
  disabled,
  onValueChange,
}) => {
  const selectId = id || (label ? `searchable-select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [openUpwards, setOpenUpwards] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [popoverStyle, setPopoverStyle] = React.useState<React.CSSProperties>({});
  
  const selected = options.find((option) => String(option.value) === String(value));
  const filteredOptions = options.filter((option) => {
    const normalized = `${option.label} ${option.description ?? ''}`.toLowerCase();
    return normalized.includes(query.trim().toLowerCase());
  });

  React.useEffect(() => {
    function updatePosition() {
      if (isOpen && buttonRef.current && containerRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const scrollParent = getScrollParent(containerRef.current);
        
        let spaceBelow = window.innerHeight - buttonRect.bottom;
        let spaceAbove = buttonRect.top;
        
        if (scrollParent) {
          const parentRect = scrollParent.getBoundingClientRect();
          spaceBelow = parentRect.bottom - buttonRect.bottom;
          spaceAbove = buttonRect.top - parentRect.top;
        }
        
        const shouldOpenUpwards = spaceBelow < 280 && spaceAbove > spaceBelow;
        // Use viewport coords (no scroll offset) because position:fixed is
        // relative to the viewport, not the document. getBoundingClientRect()
        // already gives viewport-relative values.
        const top = shouldOpenUpwards
          ? buttonRect.top - 4
          : buttonRect.bottom + 4;

        setPopoverStyle({
          position: 'fixed',
          zIndex: 1050,
          top: `${top}px`,
          left: `${buttonRect.left}px`,
          width: `${buttonRect.width}px`,
          right: 'auto',
          transform: shouldOpenUpwards ? 'translateY(-100%)' : 'none',
        });
        setOpenUpwards(shouldOpenUpwards);
      }
    }

    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const clickedInsideContainer = containerRef.current?.contains(target);
      const clickedInsidePopover = document.querySelector('.ui-searchable-select__popover')?.contains(target);
      
      if (!clickedInsideContainer && !clickedInsidePopover) {
        setIsOpen(false);
        setQuery('');
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  function choose(nextValue: string | number) {
    onValueChange(String(nextValue));
    setQuery('');
    setIsOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className={`ui-field ui-searchable-select ${className}`.trim()}
    >
      {label && (
        <label htmlFor={selectId}>
          {label}
        </label>
      )}
      <button
        ref={buttonRef}
        id={selectId}
        type="button"
        className={`${error ? 'ui-input--error' : ''}`.trim()}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{selected?.label ?? placeholder}</span>
      </button>
      {isOpen && createPortal(
        <div 
          className={`ui-searchable-select__popover ${openUpwards ? 'ui-searchable-select__popover--up' : ''}`.trim()}
          style={popoverStyle}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            autoFocus
          />
          <div className="ui-searchable-select__list" role="listbox" aria-label={label ?? placeholder}>
            {filteredOptions.length === 0 ? (
              <p>{emptyMessage}</p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  role="option"
                  aria-selected={String(option.value) === String(value)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option.value)}
                >
                  <span>{option.label}</span>
                  {option.description && <small>{option.description}</small>}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
      {error && <span className="ui-field__error">{error}</span>}
      {!error && helperText && <span className="ui-field__hint">{helperText}</span>}
    </div>
  );
};

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, helperText, className = '', id, rows = 4, ...props }) => {
  const textareaId = id || (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <div className="ui-field">
      {label && (
        <label htmlFor={textareaId}>
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={`${error ? 'ui-input--error' : ''} ${className}`.trim()}
        {...props}
      />
      {error && <span className="ui-field__error">{error}</span>}
      {!error && helperText && <span className="ui-field__hint">{helperText}</span>}
    </div>
  );
};

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, className = '', id, ...props }) => {
  const checkboxId = id || `checkbox-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <label htmlFor={checkboxId} className={`checkbox-row ${className}`.trim()}>
      <input id={checkboxId} type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
};

export interface PillsInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export const PillsInput: React.FC<PillsInputProps> = ({
  label,
  error,
  helperText,
  value = [],
  onChange,
  placeholder,
  id,
  className = '',
  disabled,
}) => {
  const inputId = id || (label ? `pills-input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const [inputValue, setInputValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const addPill = (text: string) => {
    const parts = text
      .trim()
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (parts.length === 0) return;

    const newPills = [...value];
    let changed = false;
    for (const part of parts) {
      if (!newPills.includes(part)) {
        newPills.push(part);
        changed = true;
      }
    }
    if (changed) {
      onChange(newPills);
    }
    setInputValue('');
  };

  const removePill = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPill(inputValue);
    } else if (e.key === ',' || e.key === 'Comma') {
      e.preventDefault();
      addPill(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      removePill(value.length - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.endsWith(',')) {
      addPill(val.slice(0, -1));
    } else {
      setInputValue(val);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addPill(inputValue);
    }
  };

  return (
    <div className={`ui-field ui-pills-input ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId}>
          {label}
        </label>
      )}
      <div 
        className={`ui-pills-input__container ${error ? 'ui-input--error' : ''} ${disabled ? 'ui-pills-input__container--disabled' : ''}`.trim()}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((pill, index) => (
          <span key={`${pill}-${index}`} className="ui-pill">
            <span className="ui-pill__text">{pill}</span>
            {!disabled && (
              <button
                type="button"
                className="ui-pill__remove"
                onClick={(e) => {
                  e.stopPropagation();
                  removePill(index);
                }}
                aria-label={`Remove ${pill}`}
              >
                &times;
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled}
        />
      </div>
      {(error || helperText) && (
        <div className="ui-pills-input__footer">
          {error && <span className="ui-field__error">{error}</span>}
          {!error && helperText && <span className="ui-field__hint">{helperText}</span>}
        </div>
      )}
    </div>
  );
};

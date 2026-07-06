import React from 'react';

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
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const selected = options.find((option) => String(option.value) === String(value));
  const filteredOptions = options.filter((option) => {
    const normalized = `${option.label} ${option.description ?? ''}`.toLowerCase();
    return normalized.includes(query.trim().toLowerCase());
  });

  function choose(nextValue: string | number) {
    onValueChange(String(nextValue));
    setQuery('');
    setIsOpen(false);
  }

  return (
    <div
      className={`ui-field ui-searchable-select ${className}`.trim()}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
          setQuery('');
        }
      }}
    >
      {label && (
        <label htmlFor={selectId}>
          {label}
        </label>
      )}
      <button
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
      {isOpen && (
        <div className="ui-searchable-select__popover">
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
        </div>
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

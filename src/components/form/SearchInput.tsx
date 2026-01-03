'use client';

import { Search, X } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  showClearButton?: boolean;
  showSearchButton?: boolean;
  className?: string;
}

export function SearchInput({
  value = '',
  onChange,
  onSearch,
  showClearButton = true,
  showSearchButton = false,
  placeholder = '検索...',
  className,
  disabled,
  ...props
}: SearchInputProps) {
  const [internalValue, setInternalValue] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  const handleClear = () => {
    setInternalValue('');
    onChange?.('');
    onSearch?.('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      e.preventDefault();
      onSearch(internalValue);
    }
  };

  const handleSearch = () => {
    onSearch?.(internalValue);
  };

  return (
    <div className={cn('relative flex items-center', className)}>
      <div className="relative flex-1">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          type="search"
          value={internalValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn('pl-9', showClearButton && internalValue && 'pr-9')}
          {...props}
        />
        {showClearButton && internalValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={handleClear}
            disabled={disabled}
            aria-label="検索をクリア"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {showSearchButton && (
        <Button
          type="button"
          variant="default"
          size="default"
          className="ml-2"
          onClick={handleSearch}
          disabled={disabled}
        >
          検索
        </Button>
      )}
    </div>
  );
}

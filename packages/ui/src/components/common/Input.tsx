/**
 * Input Component
 *
 * Base input components with consistent glassmorphism styling.
 * Includes text input, textarea, and select variants.
 */

import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

// ============================================================================
// Types
// ============================================================================

export type InputSize = "sm" | "md" | "lg";
export type InputVariant = "default" | "ghost" | "filled";

interface BaseInputProps {
  /** Size variant */
  size?: InputSize;
  /** Visual variant */
  variant?: InputVariant;
  /** Error state */
  error?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Label text */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Left icon/element */
  leftElement?: ReactNode;
  /** Right icon/element */
  rightElement?: ReactNode;
  /** Full width */
  fullWidth?: boolean;
}

export interface TextInputProps
  extends BaseInputProps, Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {}

export interface TextAreaProps
  extends BaseInputProps, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> {
  /** Number of rows */
  rows?: number;
  /** Auto-resize based on content */
  autoResize?: boolean;
}

export interface SelectInputProps
  extends BaseInputProps, Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  /** Select options */
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  /** Placeholder option */
  placeholder?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SIZE_CLASSES: Record<InputSize, string> = {
  sm: "px-2.5 py-1.5 text-sm",
  md: "px-3 py-2 text-base",
  lg: "px-4 py-2.5 text-lg",
};

const VARIANT_CLASSES: Record<InputVariant, string> = {
  default: `
    bg-ui-surface-sunken border border-ui-border
    focus:border-ui-border-active focus:ring-2 focus:ring-ui-accent-primary/20
    hover:border-ui-border-hover
  `,
  ghost: `
    bg-transparent border border-transparent
    hover:bg-ui-surface-sunken hover:border-ui-border
    focus:bg-ui-surface-sunken focus:border-ui-border-active focus:ring-2 focus:ring-ui-accent-primary/20
  `,
  filled: `
    bg-ui-background/70 border border-ui-border/50
    focus:border-ui-border-active focus:ring-2 focus:ring-ui-accent-primary/20
    hover:border-ui-border-hover
  `,
};

const BASE_CLASSES = `
  w-full rounded-md
  text-ui-text-primary placeholder-ui-text-muted
  transition-all duration-200
  focus:outline-none
  disabled:opacity-50 disabled:cursor-not-allowed
`;

// ============================================================================
// Text Input Component
// ============================================================================

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      size = "md",
      variant = "default",
      error = false,
      errorMessage,
      label,
      helperText,
      leftElement,
      rightElement,
      fullWidth = true,
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? `input-${Math.random().toString(36).slice(2, 9)}`;
    const errorClasses = error
      ? "border-status-error focus:border-status-error focus:shadow-glow-error"
      : "";

    const getAriaDescribedBy = (): string | undefined => {
      if (errorMessage !== undefined && errorMessage !== "") return `${inputId}-error`;
      if (helperText !== undefined && helperText !== "") return `${inputId}-helper`;
      return undefined;
    };

    return (
      <div className={fullWidth ? "w-full" : "w-auto"}>
        {label !== undefined && label !== "" && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-ui-text-secondary mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftElement !== undefined && leftElement !== null && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-text-muted">
              {leftElement}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              ${BASE_CLASSES}
              ${SIZE_CLASSES[size]}
              ${VARIANT_CLASSES[variant]}
              ${errorClasses}
              ${leftElement !== undefined && leftElement !== null ? "pl-10" : ""}
              ${rightElement !== undefined && rightElement !== null ? "pr-10" : ""}
              ${className}
            `}
            aria-invalid={error}
            aria-describedby={getAriaDescribedBy()}
            {...props}
          />
          {rightElement !== undefined && rightElement !== null && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-ui-text-muted">
              {rightElement}
            </div>
          )}
        </div>
        {errorMessage !== undefined && errorMessage !== "" && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-status-error">
            {errorMessage}
          </p>
        )}
        {helperText !== undefined &&
          helperText !== "" &&
          (errorMessage === undefined || errorMessage === "") && (
            <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-ui-text-muted">
              {helperText}
            </p>
          )}
      </div>
    );
  }
);

TextInput.displayName = "TextInput";

// ============================================================================
// TextArea Component
// ============================================================================

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      size = "md",
      variant = "default",
      error = false,
      errorMessage,
      label,
      helperText,
      fullWidth = true,
      rows = 4,
      autoResize = false,
      className = "",
      id,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? `textarea-${Math.random().toString(36).slice(2, 9)}`;
    const errorClasses = error
      ? "border-status-error focus:border-status-error focus:shadow-glow-error"
      : "";

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      if (autoResize) {
        e.target.style.height = "auto";
        e.target.style.height = `${String(e.target.scrollHeight)}px`;
      }
      onChange?.(e);
    };

    const getAriaDescribedBy = (): string | undefined => {
      if (errorMessage !== undefined && errorMessage !== "") return `${inputId}-error`;
      if (helperText !== undefined && helperText !== "") return `${inputId}-helper`;
      return undefined;
    };

    return (
      <div className={fullWidth ? "w-full" : "w-auto"}>
        {label !== undefined && label !== "" && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-ui-text-secondary mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={`
            ${BASE_CLASSES}
            ${SIZE_CLASSES[size]}
            ${VARIANT_CLASSES[variant]}
            ${errorClasses}
            resize-none
            ${className}
          `}
          aria-invalid={error}
          aria-describedby={getAriaDescribedBy()}
          onChange={handleChange}
          {...props}
        />
        {errorMessage !== undefined && errorMessage !== "" && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-status-error">
            {errorMessage}
          </p>
        )}
        {helperText !== undefined &&
          helperText !== "" &&
          (errorMessage === undefined || errorMessage === "") && (
            <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-ui-text-muted">
              {helperText}
            </p>
          )}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";

// ============================================================================
// Select Component
// ============================================================================

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  (
    {
      size = "md",
      variant = "default",
      error = false,
      errorMessage,
      label,
      helperText,
      fullWidth = true,
      options,
      placeholder,
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? `select-${Math.random().toString(36).slice(2, 9)}`;
    const errorClasses = error
      ? "border-status-error focus:border-status-error focus:shadow-glow-error"
      : "";

    const getAriaDescribedBy = (): string | undefined => {
      if (errorMessage !== undefined && errorMessage !== "") return `${inputId}-error`;
      if (helperText !== undefined && helperText !== "") return `${inputId}-helper`;
      return undefined;
    };

    return (
      <div className={fullWidth ? "w-full" : "w-auto"}>
        {label !== undefined && label !== "" && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-ui-text-secondary mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={`
              ${BASE_CLASSES}
              ${SIZE_CLASSES[size]}
              ${VARIANT_CLASSES[variant]}
              ${errorClasses}
              appearance-none pr-10
              ${className}
            `}
            aria-invalid={error}
            aria-describedby={getAriaDescribedBy()}
            {...props}
          >
            {placeholder !== undefined && placeholder !== "" && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ui-text-muted">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        {errorMessage !== undefined && errorMessage !== "" && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-status-error">
            {errorMessage}
          </p>
        )}
        {helperText !== undefined &&
          helperText !== "" &&
          (errorMessage === undefined || errorMessage === "") && (
            <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-ui-text-muted">
              {helperText}
            </p>
          )}
      </div>
    );
  }
);

SelectInput.displayName = "SelectInput";

// ============================================================================
// Input Group Component
// ============================================================================

export interface InputGroupProps {
  children: ReactNode;
  className?: string;
}

export function InputGroup({ children, className = "" }: InputGroupProps): React.ReactElement {
  return <div className={`flex ${className}`}>{children}</div>;
}

// ============================================================================
// Search Input Component
// ============================================================================

export interface SearchInputProps extends Omit<TextInputProps, "leftElement" | "type"> {
  /** Callback when search is submitted */
  onSearch?: (value: string) => void;
  /** Show clear button */
  showClear?: boolean;
  /** Callback when cleared */
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, showClear = true, onClear, value, onChange, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === "Enter" && onSearch !== undefined) {
        onSearch((e.target as HTMLInputElement).value);
      }
    };

    const handleClear = (): void => {
      onClear?.();
    };

    const searchIcon = (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    );

    // Check if value is truthy (handles string, number, and array types)
    const hasValue = typeof value === "string" ? value !== "" : value !== undefined;
    const clearButton =
      showClear && hasValue ? (
        <button
          type="button"
          onClick={handleClear}
          className="p-1 hover:bg-ui-border/30 rounded transition-colors"
          aria-label="Clear search"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      ) : null;

    return (
      <TextInput
        ref={ref}
        type="search"
        leftElement={searchIcon}
        rightElement={clearButton}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);

SearchInput.displayName = "SearchInput";

export default TextInput;

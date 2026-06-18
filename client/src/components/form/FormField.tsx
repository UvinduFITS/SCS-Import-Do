import type { FieldDef } from '@scs/shared';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { ImportDoForm } from '@scs/shared';

interface Props {
  field: FieldDef;
  register: UseFormRegister<ImportDoForm>;
  errors: FieldErrors<ImportDoForm>;
  /** When true the control is shown but locked (read-only / not editable). */
  disabled?: boolean;
}

/**
 * Renders a single form control based on the field's type. All values are
 * registered through React Hook Form; checkbox groups / multi-selects collect
 * into arrays automatically because their default value is an array.
 */
export function FormField({ field, register, errors, disabled = false }: Props) {
  const name = field.key as keyof ImportDoForm & string;
  const error = errors[name]?.message as string | undefined;
  const inputClass = `field-input ${error ? 'field-input-error' : ''} ${disabled ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`;

  const labelEl = (
    <label htmlFor={name} className="field-label">
      {field.label}
      {field.required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );

  switch (field.type) {
    case 'textarea':
      return (
        <div>
          {labelEl}
          <textarea id={name} rows={3} disabled={disabled} placeholder={field.placeholder} className={inputClass} {...register(name)} />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      );

    case 'number':
      return (
        <div>
          {labelEl}
          <input
            id={name}
            type="number"
            min={0}
            step="any"
            disabled={disabled}
            placeholder={field.placeholder}
            className={inputClass}
            {...register(name)}
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      );

    case 'date':
      return (
        <div>
          {labelEl}
          <input id={name} type="date" disabled={disabled} className={inputClass} {...register(name)} />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      );

    case 'datetime':
      return (
        <div>
          {labelEl}
          <input id={name} type="datetime-local" disabled={disabled} className={inputClass} {...register(name)} />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      );

    case 'radio':
      return (
        <div>
          {labelEl}
          <div className="flex flex-wrap gap-4 pt-1">
            {(field.options ?? []).map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" value={opt} className="h-4 w-4 text-brand-600" {...register(name)} />
                {opt}
              </label>
            ))}
          </div>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      );

    case 'checkbox':
      return (
        <div className="pt-1">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 rounded text-brand-600" {...register(name)} />
            {field.label}
          </label>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      );

    case 'checkboxGroup':
    case 'multiselect':
      return (
        <div>
          {labelEl}
          <div className="flex flex-wrap gap-2 pt-1">
            {(field.options ?? []).map((opt) => (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input type="checkbox" value={opt} className="h-4 w-4 rounded text-brand-600" {...register(name)} />
                {opt}
              </label>
            ))}
          </div>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      );

    case 'phone':
    case 'text':
    default:
      return (
        <div>
          {labelEl}
          <input
            id={name}
            type="text"
            inputMode={field.type === 'phone' ? 'tel' : undefined}
            disabled={disabled}
            placeholder={field.placeholder}
            className={inputClass}
            {...register(name)}
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      );
  }
}

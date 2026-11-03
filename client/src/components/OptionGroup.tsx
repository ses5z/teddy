import { Button } from './Button';

interface OptionGroupProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

// Selected state is exposed through aria-pressed and the filled button style.
export function OptionGroup<T extends string>({ label, value, options, onChange }: OptionGroupProps<T>) {
  return (
    <fieldset>
      <legend className="mb-1 font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            variant={option.value === value ? 'primary' : 'secondary'}
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}

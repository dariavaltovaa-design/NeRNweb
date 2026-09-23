interface Option<T extends string> {
  value: T;
  label: string;
  /** Set when the label is in another language, e.g. "English" on a Ukrainian screen. */
  lang?: string;
}

interface SegmentedProps<T extends string> {
  /** Visible label; empty string when a heading nearby already names the choice. */
  legend: string;
  name: string;
  value: T;
  options: ReadonlyArray<Option<T>>;
  onChange: (value: T) => void;
}

/**
 * One choice out of a few. Built on real radio buttons, so arrow keys and screen readers
 * work without extra code.
 */
export function Segmented<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <fieldset>
      {legend && <legend className="kicker mb-3 text-muted">{legend}</legend>}
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-button p-1 ring-1 ring-hairline ring-inset">
        {options.map((option) => (
          <label
            key={option.value}
            className={
              'flex min-h-11 cursor-pointer items-center justify-center rounded-inner px-3 text-center text-14 ' +
              'text-muted transition-colors duration-160 ease-out ' +
              'has-checked:bg-text has-checked:font-medium has-checked:text-bg ' +
              'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent'
            }
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span lang={option.lang}>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

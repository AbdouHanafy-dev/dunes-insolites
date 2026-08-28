export type FieldDef =
  | { type: "text"; key: string; label: string; required?: boolean; hint?: string }
  | { type: "textarea"; key: string; label: string; hint?: string }
  | { type: "number"; key: string; label: string; required?: boolean; step?: number }
  | { type: "select"; key: string; label: string; options: { value: string; label: string }[] }
  | { type: "checkbox"; key: string; label: string }
  // A repeatable group — an array of objects, each shaped by `fields`.
  // Not handled by FieldInput below (that returns one control, this is a
  // whole add/remove/reorder list of them) — see PageBuilder.tsx's
  // "repeater" case and payload/RepeaterField.tsx for the actual UI.
  | { type: "repeater"; key: string; label: string; itemLabel: string; fields: FieldDef[] };

export type ColumnDef<T> = {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
};

export const inputClass =
  "w-full rounded-[9px] border border-navy-700/15 bg-surface-alt px-3.5 py-2.5 text-[14px] text-navy-800 outline-none transition placeholder:text-navy-700/30 focus:border-gold/60 focus:bg-white focus:ring-3 focus:ring-gold/15";
export const labelClass = "text-[13px] font-medium text-navy-700/70";

export function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.type === "repeater") {
    // Callers must render RepeaterField for this case instead — see
    // PageBuilder.tsx. Rendering nothing is safer than a broken text input
    // bound to an array value.
    return null;
  }
  if (field.type === "textarea") {
    return (
      <textarea
        id={field.key}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} min-h-32`}
      />
    );
  }
  if (field.type === "select") {
    return (
      <select
        id={field.key}
        value={(value as string) ?? field.options[0]?.value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "checkbox") {
    return (
      <input
        id={field.key}
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
      />
    );
  }
  return (
    <input
      id={field.key}
      type={field.type === "number" ? "number" : "text"}
      step={field.type === "number" ? (field.step ?? "any") : undefined}
      required={"required" in field ? field.required : false}
      value={(value as string | number) ?? ""}
      onChange={(e) => onChange(field.type === "number" ? e.target.valueAsNumber : e.target.value)}
      className={inputClass}
    />
  );
}

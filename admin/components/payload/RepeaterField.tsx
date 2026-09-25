import { FieldInput, labelClass, type FieldDef } from "./fields";

/**
 * Payload's "array field" pattern: an add/remove/reorder list of objects,
 * each shaped by `fields`. Used by the "team" block (guide profiles) —
 * see admin/components/pages/blockTypes.tsx.
 */
export default function RepeaterField({
  itemLabel,
  fields,
  items,
  onChange,
}: {
  itemLabel: string;
  fields: FieldDef[];
  items: Record<string, unknown>[];
  onChange: (items: Record<string, unknown>[]) => void;
}) {
  function addItem() {
    // A <select> shows its first option, so a new row must actually hold it - otherwise
    // the row is sent without the value and the server rejects it as missing.
    const blank: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.type === "select" && f.options[0]) blank[f.key] = f.options[0].value;
    }
    onChange([...items, blank]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function moveItem(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function patchItem(index: number, patch: Record<string, unknown>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-xl border border-navy-700/10 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-navy-700/40">
              {itemLabel} {index + 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveItem(index, -1)}
                disabled={index === 0}
                className="h-7 w-7 rounded-md text-navy-700/50 hover:bg-navy-700/8 disabled:opacity-25"
                title="Monter"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveItem(index, 1)}
                disabled={index === items.length - 1}
                className="h-7 w-7 rounded-md text-navy-700/50 hover:bg-navy-700/8 disabled:opacity-25"
                title="Descendre"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="rounded-md border border-rose/25 px-2.5 py-1 text-xs font-medium text-rose hover:bg-rose/8"
              >
                Supprimer
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div
                key={f.key}
                className={`flex flex-col gap-1 ${f.type === "textarea" ? "sm:col-span-2" : ""}`}
              >
                <label className={labelClass}>{f.label}</label>
                <FieldInput
                  field={f}
                  value={item[f.key]}
                  onChange={(v) => patchItem(index, { [f.key]: v })}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="rounded-lg border border-dashed border-navy-700/20 px-4 py-3 text-sm font-medium text-navy-700/70 hover:border-gold/50 hover:text-navy-800"
      >
        + Ajouter — {itemLabel.toLowerCase()}
      </button>
    </div>
  );
}

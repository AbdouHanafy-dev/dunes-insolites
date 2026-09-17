"use client";

import { useState } from "react";
import { inputClass } from "@/components/payload/fields";

/** A plain add/remove list of short strings — highlights, included /
 *  not-included items. Lighter than RepeaterField for a single-value list. */
export default function StringListField({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            className={inputClass}
            value={item}
            onChange={(e) => onChange(items.map((it, i) => (i === index ? e.target.value : it)))}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            className="rounded-md border border-rose/25 px-2.5 py-2 text-xs font-medium text-rose hover:bg-rose/8"
          >
            Retirer
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          className={inputClass}
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          onClick={add}
          className="rounded-lg border border-dashed border-navy-700/20 px-3 py-2 text-sm font-medium text-navy-700/70 hover:border-gold/50 hover:text-navy-800"
        >
          + Ajouter
        </button>
      </div>
    </div>
  );
}

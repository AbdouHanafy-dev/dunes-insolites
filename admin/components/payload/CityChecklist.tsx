"use client";

import { CITY_OPTIONS } from "@/lib/cities";

/**
 * Checklist of the cities a product offers. The booking steps on the site show only
 * the ticked ones. Departure needs at least one; return may be left empty, which
 * hides the return question for that product.
 */
export default function CityChecklist({
  value,
  onChange,
  required = false,
}: {
  value: string[];
  onChange: (cities: string[]) => void;
  required?: boolean;
}) {
  const selected = new Set(value);

  function toggle(city: string) {
    const next = new Set(selected);
    if (next.has(city)) next.delete(city);
    else next.add(city);
    onChange(CITY_OPTIONS.map((c) => c.value).filter((c) => next.has(c)));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {CITY_OPTIONS.map((city) => (
          <label
            key={city.value}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
              selected.has(city.value)
                ? "border-gold/60 bg-gold/10 text-navy-800"
                : "border-navy-700/15 bg-white text-navy-700/70 hover:border-navy-700/30"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(city.value)}
              onChange={() => toggle(city.value)}
              className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
            />
            {city.label}
          </label>
        ))}
      </div>
      <div className="flex gap-3 text-[12px]">
        <button
          type="button"
          onClick={() => onChange(CITY_OPTIONS.map((c) => c.value))}
          className="font-medium text-navy-700/60 underline hover:text-navy-800"
        >
          Tout cocher
        </button>
        <button
          type="button"
          onClick={() => onChange([])}
          className="font-medium text-navy-700/60 underline hover:text-navy-800"
        >
          Tout décocher
        </button>
      </div>
      {required && value.length === 0 && (
        <p className="text-[12px] font-semibold text-red-600">Cochez au moins une ville.</p>
      )}
    </div>
  );
}

"use client";

export type ListView = "cards" | "list";

const MODES: { mode: ListView; label: string; icon: string }[] = [
  { mode: "cards", label: "Cartes", icon: "bi-grid-3x2-gap" },
  { mode: "list", label: "Liste", icon: "bi-list-ul" },
];

/** The cards / list switch shared by every back-office list. */
export default function ViewToggle({ view, onView }: { view: ListView; onView: (next: ListView) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-navy-700/15 p-0.5" role="group" aria-label="Affichage">
      {MODES.map(({ mode, label, icon }) => (
        <button
          key={mode}
          type="button"
          aria-pressed={view === mode}
          onClick={() => onView(mode)}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition ${
            view === mode ? "bg-navy-800 text-white" : "text-navy-700/60 hover:text-navy-800"
          }`}
        >
          <i className={`bi ${icon}`} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}

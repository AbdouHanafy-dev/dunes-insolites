"use client";

export default function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-start justify-center overflow-y-auto bg-navy-950/40 p-2.5 pt-6 backdrop-blur-sm sm:p-4 sm:pt-12"
      onClick={onClose}
    >
      <div
        className={`card w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl p-4 sm:p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-800">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-700/50 transition hover:bg-navy-700/8 hover:text-navy-800 active:scale-95"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

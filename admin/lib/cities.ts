/** The pickup / drop-off city vocabulary, same as the backend's DepartureCity enum. */
export const CITY_OPTIONS = [
  { value: "TUNIS", label: "Tunis" },
  { value: "SOUSSE", label: "Sousse" },
  { value: "HAMMAMET", label: "Hammamet" },
  { value: "DJERBA", label: "Djerba" },
  { value: "MAHDIA", label: "Mahdia" },
  { value: "MONASTIR", label: "Monastir" },
  { value: "TOZEUR", label: "Tozeur" },
] as const;

export const ALL_CITIES: string[] = CITY_OPTIONS.map((c) => c.value);

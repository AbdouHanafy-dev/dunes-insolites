import { getCountryCallingCode, type Country } from "react-phone-number-input";

/** "+216 55 123 456" - the dial code of the chosen country followed by the typed number. */
export function composePhone(country: Country, number: string): string {
  let dial = "";
  try {
    dial = `+${getCountryCallingCode(country)}`;
  } catch {
    dial = "";
  }
  return `${dial} ${number.trim()}`.trim();
}

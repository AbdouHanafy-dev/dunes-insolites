"use client";

import { useState, type ReactNode } from "react";
import { formatApiFailure, parseApiFailure } from "@/lib/apiError";
import { issuesFromServer, summarizeFormIssues, type FieldLike, type FormIssue } from "@/lib/formIssues";
import { inputClass } from "@/components/payload/fields";

/**
 * One way for every admin form to show exact problems: a red panel listing
 * each one, the message under its field, and the field outlined in red.
 * `fields` names the form's inputs (key + French label) so a backend error on
 * `phoneNumber` reads as "Téléphone : …" and lands under the right input.
 *
 * Usage:
 *   const fi = useFormIssues(FIELDS);
 *   fi.clear();                                   // start of submit
 *   if (bad) { toast.error(fi.local([fi.issue("email", "requis")])); return; }
 *   if (!res.ok) { toast.error(await fi.fromResponse(res, "Création refusée")); return; }
 *   ... <input className={fi.inputClass("email")} />{fi.errs("email")} ... {fi.panel()}
 */
export function useFormIssues(fields: FieldLike[]) {
  const [issues, setIssues] = useState<FormIssue[]>([]);

  const has = (key: string) => issues.some((i) => i.key === key);

  function focus(key: string | undefined) {
    if (!key) return;
    const el = document.getElementById(key) ?? document.querySelector<HTMLElement>(`[data-field="${key}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus();
  }

  return {
    issues,
    clear: () => setIssues([]),
    /** Build one local problem; the label comes from `fields`. */
    issue(key: string, message: string): FormIssue {
      return { key, path: key, label: fields.find((f) => f.key === key)?.label ?? key, message };
    },
    /** Show local problems; returns the text to put in the toast. */
    local(list: FormIssue[]): string {
      setIssues(list);
      focus(list[0]?.key);
      return `Enregistrement impossible — ${summarizeFormIssues(list)}`;
    },
    /** Show a refused response's field errors; returns the text to put in the toast. */
    async fromResponse(res: Response, fallback: string): Promise<string> {
      const failure = await parseApiFailure(res);
      const list = issuesFromServer(fields, failure.fields, formatApiFailure(failure, fallback));
      setIssues(list);
      focus(list.find((i) => i.key)?.key);
      return `${fallback} — ${summarizeFormIssues(list)} (HTTP ${failure.status})`;
    },
    has,
    inputClass: (key: string) => (has(key) ? inputClass.replace("border-navy-700/15", "border-rose") : inputClass),
    errs(key: string): ReactNode {
      return issues
        .filter((i) => i.key === key)
        .map((i, n) => (
          <p key={n} className="text-[12px] font-medium text-rose">
            {i.message}
          </p>
        ));
    },
    panel(): ReactNode {
      if (issues.length === 0) return null;
      return (
        <div role="alert" className="rounded-xl border border-rose/25 bg-rose/8 px-4 py-3 text-[13px] text-rose">
          <p className="font-semibold">{issues.length} problème(s) à corriger :</p>
          <ul className="mt-2 flex flex-col gap-1">
            {issues.map((i, n) => (
              <li key={`${i.path}-${n}`}>
                <strong>{i.label}</strong> : {i.message}
              </li>
            ))}
          </ul>
        </div>
      );
    },
  };
}

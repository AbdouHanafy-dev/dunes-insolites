"use client";

import { useState } from "react";
import FaqColumns from "@/components/FaqColumns";

type Group = { id: string; heading: string; items: { q: string; a?: string }[] };

/**
 * The FAQ split into categories: a row of tabs, one category on screen at a
 * time. Every category is still rendered (the inactive ones just hidden), so
 * all questions and answers stay in the page HTML for search engines.
 */
export default function FaqTabs({ groups }: { groups: Group[] }) {
  const [active, setActive] = useState(groups[0]?.id ?? "");
  if (groups.length === 0) return null;

  return (
    <div className="faq-tabs">
      <div className="faq-tablist" role="tablist">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            role="tab"
            id={`faq-tab-${group.id}`}
            aria-selected={group.id === active}
            aria-controls={`faq-panel-${group.id}`}
            className="faq-tab"
            onClick={() => setActive(group.id)}
          >
            {group.heading}
            <span className="faq-tab-count">{group.items.length}</span>
          </button>
        ))}
      </div>
      {groups.map((group) => (
        <div
          key={group.id}
          role="tabpanel"
          id={`faq-panel-${group.id}`}
          aria-labelledby={`faq-tab-${group.id}`}
          hidden={group.id !== active}
        >
          <FaqColumns items={group.items} />
        </div>
      ))}
    </div>
  );
}

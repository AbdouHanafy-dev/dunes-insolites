# Pending content — real operational facts needed, not code

Content gaps that are **not mine to fill**: they need real, confirmed facts
from whoever actually runs the activity/product, not a plausible-sounding
guess. Per the root `CLAUDE.md` rule against fabricating tourism info, these
stay empty in the UI until the real answer comes in — an empty section is
honest; an invented one is a liability the moment a guest checks it against
reality on-site.

---

## Quad Safari (`quad-desert`) — opened 30 Aug 2026

Found during the UI/UX audit: every other activity (`camel-trek`,
`sandboarding-desert`, `bedouin-diner-sahara-tunisien`,
`soirees-sous-les-etoiles`, `le-pain-de-sabel`) has a real "what's
included" list (3–5 items), a real "what's not included" list, and a short
about-text blurb. `quad-desert` had none of these — confirmed directly
against the database, not assumed. Its cover photo and meeting point are
now fixed (same session); these three fields are the one part still open:

- **What's included** — e.g. does the 35 TND / 30-minute price cover a
  helmet, fuel, a guide, insurance? Unknown — not filled in.
- **What's not included** — same uncertainty.
- **Short about-text** — a sentence or two describing the actual experience
  (every sibling activity has one).

**Explicitly not guessed**, per the business's own instruction (30 Aug
2026): helmet availability, fuel, guide presence, minimum age, insurance,
photos, safety equipment, and transfer are all real operational facts that
must come from whoever actually runs the quad activity, not from a
plausible-sounding assumption.

**Not a launch blocker** — the product is live, bookable, correctly priced,
and now has its real photo; it just reads thinner than its siblings until
this lands. Once the real list is provided, wire it into `extras` the same
way `camel-trek`'s is structured (`extra_included_items`,
`extra_not_included_items`, `extras.about_text`) and update the backoffice
Extras editor the same way.

**Status:** pending business input. No code or content change should
invent these values.

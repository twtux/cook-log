# Cook Log — Live-use feedback (from Tom, 2026-07-24, first real cook)

Captured while Tom logged his first rotisserie cook. Fix in a pass after the cook.

1. **Editable / backdatable timestamps on timeline events.**
   Tapping "Fire Lit" (and every timeline event) stamps the *current* time. When logging
   after the fact you can't set the real time. Each event needs an editable time field
   (default "now", tap to change; also editable after the fact). Applies to all timeline events.

2. **Auto-save has no visible confirmation.** App auto-saves every entry (no Save button by
   design), but Tom expected to "go down the list and click Save" — the absence felt like it
   wasn't saving. Data IS safe; it's a *confidence* gap. Fix: add a clear "Saved ✓" / "All
   changes saved" indicator (toast or persistent line) so the user knows it stored. Consider
   this across all entry screens.

3. **Fuel / gear discoverability.** Fuel, wood, config, target-temp live in the cook *setup*
   (fire chip section), not on the live-timeline screen. Tom expected them together and
   couldn't find "fuel and all that stuff." Options: surface fuel/gear on/near the timeline,
   or add a clear jump to the setup section from the timeline view.

4. **Built-in "Tips" / Pitmaster Tips feature (SELLING POINT).** Tom's idea: bake bite-sized
   pro tips into the app so it actively makes people better cooks (helps justify the $3–5 price).
   Seed content from tonight's hard-won lessons:
   - Fire-start: light a small chimney (~8–12 briquettes), lay a half-chimney unlit bed
     concentrated by the fan, dump the hot coals on top → fast, guaranteed fire.
   - RULE #0: confirm every fire starter is flaming AND coals are catching before you close the lid.
   - Concentrate coals where a fan controller's intake blows; don't spread them thin.
   - Rotisserie doesn't need even coals — the spin evens it out.
   - Pull chicken at 160–165 breast / 175 thigh; rest ~12–15 min; torch skin (twine off first).
   - Ideas: contextual tips per protein/step, a "Tip of the day," or a pro-tips library tab.
   - **GRILL-SPECIFIC (Tom, important):** tips must adapt to the user's grill. Pick your grill →
     get the best fire-start / get-to-temp method for THAT rig. Research accurate methods per type:
     • Weber kettle (no fan) — more charcoal, vent control, banked coals (harder, more fuel).
     • Huntsman / fan-controller (Venom, BBQ Guru, Fireboard) — hot-coals-on-top, let the fan drive.
     • Kamado (heavy ceramic) — small lit spot, slow ramp, don't overshoot (hard to bring down).
     • Pellet grill — set-and-forget, no fire-building.
     • Offset/stick burner — chimney + splits, manage the burn.
     Store a per-user "my grills" profile so the app knows which method to show.

5. **AI INTEGRATION (Tom's idea — potentially THE flagship feature).** Tonight was a live proof:
   an AI coached a chaotic first rotisserie in real time. Bake that into the app:
   - **AI Cook Coach (chat):** ask mid-cook ("fire won't climb", "where do I probe", "is 150 done?")
     — grill-aware + protein-aware. This is the differentiator.
   - **Auto-logging:** user talks / snaps photos, AI fills the timeline. SOLVES the "forgot to log"
     problem (the app's own weakness tonight).
   - **AI cook planner:** protein + eat-time + grill → generated fire-start + timeline (smarter Cook Clock).
   - **Post-cook debrief:** AI writes up the cook + lessons.
   - Business reality: AI API calls cost $. For a $3–5 one-time app, bundle limited usage, use a
     cheap/small model, or make the AI coach a premium/subscription tier. Needs a cost plan.
   - CAUTION from tonight: don't trust AI reading temps off dim photos (misread 150 as 165). Use AI
     photo input for coaching/fire-state, NOT safety-critical temp calls — always confirm typed number.

6. **Link each cook's time-lapse recap to its Cook Log entry (Tom).** Every saved cook should carry a
   link/button to its hosted time-lapse page (tomwood.dev/pit-plan/cooks/<date>/). Auto-generate the
   recap page on save and store its URL on the entry. Also add a **"Cooks" index page** at
   /pit-plan/cooks/ that lists all cooks and links each recap (a hub instead of loose URLs).

7. **Salt / rub calculator (ties to Tom's #1 pain).** App computes the ONE salt step by weight
   (e.g. dry brine = ½ tsp kosher/lb) and warns "you already salted — don't add more." Directly
   solves the over-salted bird. Big beginner value.
8. **Auto shopping/prep list** from the cook plan (fuel, wood chunk, rub, injection, foil pan, etc.).
9. **Built-in cook timers + reminders** (bake in the crank/pull/refuel pings we ran by hand tonight).
10. **Doneness temp reference card** + wrap/rest guidance, per protein.
11. **Cook history w/ ratings + notes** so it learns the user's preferences over time.
12. **Share/export the recap** (the time-lapse) to text/social.

## DIRECTION DECISION (Tom, 2026-07-24)
**Build the FULL AI product — NOT a static-file download.** Make it professional with the AI baked in.
What that requires (architect properly as its own project, not a one-nighter):
- **Backend** to run the AI safely (Claude API key can't live in the browser) — serverless (Cloudflare
  Workers / Vercel functions) or a small Node service on the VPS.
- **Accounts + payments** (Stripe / Lemon Squeezy) for the paid tier / subscription.
- **Cloud data per user** (move off localStorage, or localStorage + sync) so it works across devices.
- Cost control: cheap/small model + usage caps to protect margin.
- We already have the frontend shell + full feature spec, so not starting from zero.

## Pricing positioning
- Plain loggers are free/$3 (race to the bottom). The **AI Cook Coach + auto-recap + salt calc**
  is the differentiator that justifies **$7–9 one-time**, or freemium (logging free, AI = paid unlock,
  or small sub). Cap AI usage / cheap model to protect margin.

## Notes
- All good, real-world "dogfooding" feedback — the kind that makes it sellable.
- Data is in browser localStorage; redeploys don't wipe entries.
- App must coach ANY BBQ: any fuel (charcoal/gas/pellet/kamado/offset), any level (beginner→comp),
  any technique (rubs/brines/injections/wraps/smoke). Grill-aware + protein-aware = gets users good fast.

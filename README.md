# Role Profiles — a self-reflection exercise

A small, calm React app for a self-reflection exercise: review a list of
"roles" and sort them into four categories based on how each relates to your
sense of self. A role can live in more than one category at once, and you can
rearrange as often as you like. Everything persists to `localStorage`, so
nothing is lost on refresh.

## Source

This exercise is **Role Profiles**, a drama therapy assessment developed by
Robert J. Landy. Participants sort archetypal role cards — drawn from Landy's
*Taxonomy of Roles* — into four groups reflecting their relationship to each
role: "I am this," "I am not this," "I'm not sure," and "I want to be this."

- Landy, R. J., Luck, B., Conner, E., & McMullian, S. (2003). *Role Profiles:
  A drama therapy assessment instrument.* The Arts in Psychotherapy, 30(3),
  151–161.
- Landy, R. J. (1993). *A Taxonomy of Roles: A Blueprint for the Possibilities
  of Being.* The Arts in Psychotherapy.

## Run it

```bash
npm install
npm run dev
```

Then open the printed URL (default http://localhost:5173).

## How it works

- **Role bank** — every role starts here. Drag a role into any category.
- **Copy, don't move** — dragging a role into a category *copies* it there; the
  role stays in the bank and can be dropped into several categories at once. A
  small badge on a bank chip shows how many categories currently hold it.
- **Remove** — click the `×` on a placed chip to remove it from that one
  category, leaving it untouched everywhere else.
- **Counts** — each column header shows how many roles it holds.
- **Reset** — clears every category back to the starting state (asks to
  confirm first).
- **Persistence** — the full state is saved to `localStorage` on every change
  and restored on load.

Drag-and-drop is built with [@dnd-kit](https://dndkit.com/) and works with
mouse, touch, and keyboard.

## Tech

Vite + React 18, `@dnd-kit/core` for drag-and-drop, plain CSS.

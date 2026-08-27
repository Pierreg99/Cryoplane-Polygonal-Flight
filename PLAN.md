# Plan

Cryoplane stays a single-player polar flyer. Scope is hangar → sortie → crash or land.

## Constraints

- Low-poly, readable, no photoreal textures
- A banks left under chase cam (controls self-test)
- Overlay uses the hangar token set (accent ice, danger rust)
- No accounts. Prefs in localStorage
- Radar is heading-up DOM canvas, not a second 3D camera

## Loop

1. Hangar: map, plane, mode, build
2. Sortie: rings, strip, interceptors in combat
3. Downed: relight or hangar

## Radar

- Center = you, nose up
- Range 260 m, three range rings, sweep
- Accent = active waypoint, danger = live hostile, muted = traffic / strip

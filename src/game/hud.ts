export const hud = {
  altitude: 0,
  speed: 0,
  heading: 0,
  nightMix: 0,
  scraping: 0,
  stall: 0,
  throttle: 0,
  mode: "Cruise",
  wpDist: 0,
  rings: 0,
  landings: 0,
  landingScore: 0,
  onRunway: 0,
  wind: 0,
  hull: 1,
  kills: 0,
  crashed: 0,
};

export function writeHud(partial: Partial<typeof hud>) {
  Object.assign(hud, partial);
}

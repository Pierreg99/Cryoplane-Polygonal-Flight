export const hud = {
  altitude: 0,
  speed: 0,
  heading: 0,
  nightMix: 0,
  scraping: 0,
};

export function writeHud(partial: Partial<typeof hud>) {
  Object.assign(hud, partial);
}

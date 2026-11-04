// Autosave at shelters (localStorage). Continue restores story, puzzles, props, batteries, flashlight and time.
// v2: puzzles were redesigned (stage 9); v1 saves would restore impossible states
const KEY = 'clearhaven947.save.v2';
export const Save = {
  has() { try { return !!localStorage.getItem(KEY); } catch { return false; } },
  read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } },
  clear() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } },
  write(G) {
    const d = {
      v: 1, at: Date.now(), story: G.story.serialize(), shelter: G.shelters.current.id,
      fl: { has: G.flashlight.has, level: +G.flashlight.level.toFixed(3) },
      props: G.props.serialize(), bat: G.batteries.filter((b) => b.taken && !b.shelter).map((b) => b.id), hour: +G.time.hour.toFixed(3),
    };
    try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; }
  },
  apply(G, d) {
    G.story.restore(d.story);
    G.puzzles.restore(G.story.flags);
    G.props.restore(d.props);
    for (const b of G.batteries) if (d.bat && d.bat.includes(b.id)) { b.taken = true; b.mesh.visible = false; }
    if (d.fl && d.fl.has) { G.flashlight.give(); G.flashlight.level = d.fl.level; if (G.flashlightPickup) { G.flashlightPickup.mesh.visible = false; G.interact.remove(G.flashlightPickup.it); } }
    G.shelters.current = G.shelters.get(d.shelter) || G.shelters.list[0];
    G.time.set(d.hour, true);
    G.shelters.respawnPlayer();
  },
};

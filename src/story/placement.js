// Places movable props (crates, fuses, bottles) at the anchors registered by the region builders.
export const BOUNDS = {
  r1: [-80, -5, 120.6, 80, 12, 266],
};
export function placeProps(G) {
  const A = (id) => { const a = G.world.anchors.get(id); if (!a) throw new Error('missing anchor ' + id); return a.pos; };
  for (const id of ['crate_r1_a', 'crate_r1_b', 'crate_r1_c']) G.props.addCrate(id, A(id), BOUNDS.r1);
  G.props.addItem('fuse_r1', 'fuse', A('fuse_r1'), { bounds: BOUNDS.r1, lying: true });
}

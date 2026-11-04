// Story content metadata (texts live in i18n: notes.<id>, obs.<id>, thoughts.<id>, obj.<id>).
// style: hand = my handwriting, hand2 = someone else's handwriting, print = printed document.
export const NOTES = [
  { id: 'n_r1_table', region: 'r1', style: 'hand', thought: 't_note1' },
  { id: 'n_r1_haram', region: 'r1', style: 'hand2' },
  { id: 'n_r1_notice', region: 'r1', style: 'print', noMesh: true },
  { id: 'n_r1_neighbor', region: 'r1', style: 'hand2' },
  { id: 'n_r1_garage', region: 'r1', style: 'hand', wall: 0, thought: 't_hand' },
  { id: 'n_r2_photo', region: 'r2', style: 'hand2' },
  { id: 'n_r2_vendor', region: 'r2', style: 'hand2' },
  { id: 'n_r2_colleague', region: 'r2', style: 'hand2', thought: 't_colleague' },
  { id: 'n_r2_station_log', region: 'r2', style: 'print' },
  { id: 'n_r2_code', region: 'r2', style: 'hand', wall: Math.PI },
  { id: 'n_r2_code2', region: 'r2', style: 'hand' },
  { id: 'n_r2_rescuer', region: 'r2', style: 'hand2' },
  { id: 'n_r2_fuses', region: 'r2', style: 'hand' },
  { id: 'n_r3_record', region: 'r3', style: 'print', thought: 't_record' },
  { id: 'n_r3_research', region: 'r3', style: 'hand' },
  { id: 'n_r3_closure', region: 'r3', style: 'print' },
  { id: 'n_r3_years', region: 'r3', style: 'hand', thought: 't_years' },
  { id: 'n_r3_tower', region: 'r3', style: 'hand' },
  { id: 'n_r3_final', region: 'r3', style: 'hand' },
];
export const OBS = [
  { id: 'o_chalk', region: 'r1', draw: { kind: 'chalk', w: 1.5, h: 1.3 }, dark: true }, { id: 'o_clock_house', region: 'r1' }, { id: 'o_device', region: 'r1' }, { id: 'o_photo_home', region: 'r1', image: 'home', thought: 't_photo' },
  { id: 'o_laundry', region: 'r1' }, { id: 'o_sticker', region: 'r1' }, { id: 'o_graffiti', region: 'r1' }, { id: 'o_busstop_clock', region: 'r1' }, { id: 'o_gate_sign', region: 'r1', draw: { kind: 'areamap', w: 1.1, h: 1.25 } },
  { id: 'o_billboard', region: 'r2', thought: 't_billboard' }, { id: 'o_stage', region: 'r2' }, { id: 'o_reservation', region: 'r2' }, { id: 'o_studio_a', region: 'r2', image: 'p_raincoat' }, { id: 'o_studio_b', region: 'r2', image: 'p_us' }, { id: 'o_studio_c', region: 'r2', image: 'p_grad' }, { id: 'o_studio_d', region: 'r2', image: 'p_solo' }, { id: 'o_bridge', region: 'r2' },
  { id: 'o_bags', region: 'r2' }, { id: 'o_panel_diagram', region: 'r2', draw: { kind: 'diagram', w: 1.3, h: 0.92 } }, { id: 'o_train', region: 'r2' },
  { id: 'o_chairs', region: 'r3' }, { id: 'o_fountain', region: 'r3' }, { id: 'o_tower_clock', region: 'r3' }, { id: 'o_archive_model', region: 'r3' }, { id: 'o_my_desk', region: 'r3' }, { id: 'o_board', region: 'r3', draw: { kind: 'board', w: 3.0, h: 1.3 }, dark: true }, { id: 'o_gen_card', region: 'r3', draw: { kind: 'card', w: 0.6, h: 0.75 } },
];
// anchors: notes use note_<id without n_>, observations obs_<id without o_>
export const noteAnchor = (id) => 'note_' + id.slice(2);
export const obsAnchor = (id) => 'obs_' + id.slice(2);
// story steps: a vague direction for the journal (dir.<key>), [min, max] hour range
export const STEPS = [
  { id: 'wake', dir: 'look', time: [14.0, 14.6] },
  { id: 'flashlight', dir: 'upstairs', time: [14.0, 15.2] },
  { id: 'gate', dir: 'north', time: [14.3, 15.8] },
  { id: 'fuse_r1', dir: 'gatePower', time: [14.6, 16.3] },
  { id: 'cross', dir: 'cross', time: [17.3, 18.9] },
  { id: 'office', dir: 'office', time: [17.6, 19.7] },
  { id: 'fuses_u', dir: 'shutter', time: [20.0, 21.6] },
  { id: 'tunnel', dir: 'tunnel', time: [20.4, 22.0] },
  { id: 'tower', dir: 'tower', time: [25.0, 26.4] },
  { id: 'generator', dir: 'towerPower', time: [25.2, 27.0] },
  { id: 'climb', dir: 'climb', time: [27.2, 28.6] },
  { id: 'core', dir: 'core', time: [28.8, 29.25] },
  { id: 'ending', time: [29.25, 29.3] },
];

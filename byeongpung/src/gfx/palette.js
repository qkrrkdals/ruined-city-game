// 색. 한지 바탕 + 먹 농담 + 인주·쪽빛·금박 포인트. (값은 선형이 아닌 sRGB 16진수)
import * as THREE from 'three';

export const HEX = {
  paper: 0xefe7d6, paperDark: 0xd9cdb4, ink: 0x15151b, inkSoft: 0x3a3a42, inkPale: 0x8a8a8c,
  red: 0xc5341f, redDark: 0x8e2416, indigo: 0x2c4c7c, indigoPale: 0x6f8fb8, gold: 0xc9a24a,
  celadon: 0xa9c4b4, white: 0xfbf8f0, wood: 0x8a6a48, woodDark: 0x5a4330, thatch: 0xc8ab6a, tile: 0x3c3f46,
  pine: 0x4f7358, pineDark: 0x33503f, bamboo: 0x7fa063, bambooDark: 0x58764a, reed: 0xb9a56a, plum: 0xd8697a,
  lotus: 0xe89aa8, leaf: 0x6f9a62, stone: 0x8d8d88, stoneDark: 0x5c5d60, tiger: 0xe2a13a, tigerPale: 0xf3e3c0,
};
const c = (h) => new THREE.Color(h);
export const COL = Object.fromEntries(Object.entries(HEX).map(([k, v]) => [k, c(v)]));
export const rgb = (h) => { const k = c(h); return [k.r, k.g, k.b]; }; // 선형 RGB 배열(정점 색용)

// 구역별 땅 색(색이 돌아온 뒤의 담채 기준. 번진 곳에서는 셰이더가 먹빛으로 바꾼다)
export const GROUND = [
  { ground: rgb(0xf3eee2), path: rgb(0xf3eee2), rock: rgb(0xe9e2d2), peak: rgb(0xdfd7c6) }, // 여백
  { ground: rgb(0xb9c79a), path: rgb(0xdccfa8), rock: rgb(0x8e9a86), peak: rgb(0x5f6c68) }, // 솔숲
  { ground: rgb(0xcdc594), path: rgb(0xe2d2a8), rock: rgb(0x9aa088), peak: rgb(0x6c7670) }, // 붓골
  { ground: rgb(0xa9c78c), path: rgb(0xd6cfa4), rock: rgb(0x86a07c), peak: rgb(0x5d7462) }, // 대숲
  { ground: rgb(0xa3b98c), path: rgb(0xc9c29a), rock: rgb(0x7c8a74), peak: rgb(0x5c6a60) }, // 갈대늪
  { ground: rgb(0xb7b6ac), path: rgb(0xd2cbb8), rock: rgb(0x858890), peak: rgb(0x50545f) }, // 벼룻길
];

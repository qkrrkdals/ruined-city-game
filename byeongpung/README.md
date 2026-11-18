# 마르지 않는 병풍 — 제1폭 「까치와 범」

3D 로우폴리 수묵 액션 RPG (1장 데모). PC 브라우저, 키보드·마우스, 한국어.

화공이 그리다 만 여덟 폭 병풍. 낙관이 찍히지 않아 먹이 마르지 않고 번지는 그림 속에서,
윤곽만 그려진 채 잊힌 **밑그림**이 화공이 떨어뜨린 **몽당붓**을 들고 번짐을 맺어 나간다.

## 바로 하기
- **`play.html` 을 브라우저로 연다.** 서버도 설치도 필요 없다(모든 코드·글꼴이 한 파일에 들어 있다).
- `main` 에 병합되면 GitHub Pages 에서도 열린다: `https://qkrrkdals.github.io/ruined-city-game/byeongpung/`

## 조작
| 키 | 동작 |
|---|---|
| W A S D / 마우스 | 걷기 / 둘러보기 |
| Shift | 달리기 |
| 좌클릭 | 가는 획(4연타) |
| 우클릭 | 굵은 획 — 누르고 있으면 모아서 크게 긋는다 |
| Space | 여백(회피) — 아슬아슬하게 피하면 세상이 백지로 멈추고 다음 획이 세진다 |
| E | 말 걸기·살피기 / 흐트러진 적에게 **맺음**(붉은 낙관) |
| R | 호리병(회복) |
| Q · F · C | 획: 점찍기 · 삐침 · 파임 (때려서 모은 먹을 쓴다) |
| T · 휠 클릭 | 조준 고정(휠로 대상 바꾸기) |
| M / Esc | 지도 / 멈춤(설정·조작법) |

연계: 약→강 올려 긋기 · 약약→강 찌르기 · 약약약→강 뛰어 내려찍기 · 달리다 약 달려 찌르기.
설정에서 어려움(이야기/보통)·감도·품질·음량을 바꿀 수 있다. 연적에서 쉬면 저장된다.

## 개발
```
npm ci
npm run bp:dev        # 개발 서버
npm run bp:build      # 글꼴 자르기 → 빌드 → HTML 한 장으로 묶기(dist/byeongpung/index.html)
node byeongpung/scripts/pack.mjs --release   # 묶은 파일을 byeongpung/play.html 로 복사
```
점검(헤드리스, 먼저 `npm run bp:build`):
```
node byeongpung/scripts/check.cjs byeongpung/scripts/scenarios/play.cjs real 60   # 처음부터 결말까지 자동 플레이
node byeongpung/scripts/check.cjs byeongpung/scripts/scenarios/ui.cjs             # 화면들 찍기 → shots/
node byeongpung/scripts/check.cjs byeongpung/scripts/scenarios/audio.cjs          # 소리 크기 측정
```
그 밖의 시나리오: `world`(둘러보기) `combat`(전투) `boss`(보스) `moments`(주요 장면) `live`(입력 배선) `death`(죽음·부활) `poses`(자세).
주소 끝에 `#debug` 를 붙이면 `window.__game` 디버그 훅을 쓸 수 있다.

## 구조
```
DESIGN.md                 기획서
src/core/     game(부팅·루프) flow(제목↔놀이↔멈춤) input config debug autoplay(자동 플레이)
src/gfx/      renderer(수묵 후처리) materials(담채 복원 셰이더) camera particles slash(붓 획) stamp(낙관) ribbon textures geo palette
src/world/    layout(지도) field(거리장·높이·충돌) terrain scatter sky props kit regions_a/b(배치) world
src/entity/   rig(IK 자세) humanoid hanim(자세 함수) player player_act moves combat enemy enemies/ shots npc
src/systems/  fx prog(성장) save interact spawner shrines pickups loot audio/(engine sfx music)
src/story/    story(순서 실행기·발동 지점) chapter(제1폭 진행) ending
src/ui/       ui(HUD) dialog menus screens map icons styles.css
src/data/     text.ko.json (모든 문장)
```
모든 모델·질감·소리는 코드로 만든다. 글꼴은 동해독도·연성·송명(SIL OFL, `OFL-fonts.txt`)을 쓰는 글자만 잘라 넣는다.

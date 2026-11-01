# CLAUDE.md — 9시 47분 / 9:47 (청안시 / Clearhaven)

이 파일만 읽으면 작업을 이어갈 수 있게 유지한다. **매 단계 커밋 때 갱신.**

## 프로젝트
- Three.js(r187) + Vite 8, 1인칭 폐허 도시 탐험·미스터리 게임. PC 브라우저 전용.
- 승인된 기획서 전문: `docs/DESIGN.md` (A안 「등불의 열쇠」, 제목 9시 47분, 용어표 포함). 이야기·퍼즐·쪽지 목록은 거기를 기준으로.
- 배포: GitHub Actions(`.github/workflows/deploy.yml`) → GitHub Pages, `main` 푸시에 반응. Vite `base: '/ruined-city-game/'`.
- 플레이 주소: https://qkrrkdals.github.io/ruined-city-game/ (디버그: 뒤에 `?debug`)
- 작업 브랜치: `claude/new-session-9q2t95` → PR로 `main`에 병합(사용자가 직접). 사용자는 1·4·6단계 끝에 PR 병합.

## 규칙 (사용자 요구)
- 커밋 메시지는 한국어: "1단계: 월드 기초 완성" 형식. 단계를 작게 나눠 자주 커밋. 푸시하는 커밋은 항상 빌드·헤드리스 점검 통과.
- 모든 게임 내 문장은 i18n JSON. 코드에 문장 하드코딩 금지. 외부 3D 모델·텍스처·음원 금지(캔버스·코드 생성만). 폰트는 OFL 손글씨(@fontsource) 사용 승인됨.
- 파일 400줄 넘으면 분리. 사양에 없는 기능 추가 금지(아이디어는 아래 "나중에 할 것"). Ctrl·Tab 키 금지.
- "마무리 모드"라고 하면: 새 기능 중단 → 배포·플레이 가능 확인 → 이 파일에 완성/미완성/버그 정리.

## 점검 방법
```
npm run build
node scripts/check.cjs                      # 기본 샷 3장 + 콘솔 에러 JSON
node scripts/check.cjs name:teleport:hour:yaw:pitch ...   # 예: plaza:plaza:25.2::0.18
```
- 헤드리스는 SwiftShader라 느림 → 렌더링을 멈추고(`__game.freeze`) 샷마다 한 번만 그림(`renderOnce`). FPS는 의미 없음.
- 스크린샷은 `shots/`(gitignore). 구도·색감 확인용.
- `window.__game`(개발 서버 또는 `?debug`): `start()`, `tp(name|[x,y,z,yaw], hour, yaw, pitch)`, `setHour(h)`, `info()`, `sim(n)`, `freeze()`, `renderOnce()`. 텔레포트 이름은 `src/world/layout.js`의 `TP`.

## 폴더 구조
```
src/main.js                  진입점(폰트·CSS 로드)
src/core/  game.js(상태머신·루프) renderer.js(렌더러·블룸·품질) input.js(포인터 잠금→자동 일시정지) config.js(밸런스 상수) settings.js debug.js events.js
src/world/ world.js(지역 조립·존·표면·가시성) geo.js(로우폴리 지오메트리 빌더) materials.js(높이 안개·바람 셰이더 패치)
           buildings.js(절차적 폐허 건물·room 셸) streets.js(지면·도로·인도·소품) kit.js(인스턴싱 소품) vegetation.js(풀·덩굴·덤불)
           textures.js(캔버스 텍스처: 간판·포스터·사진·광고판·시계) sky.js(하늘·구름·별) collision.js(박스→Octree, 동적 Octree) palette.js layout.js
           regions/ r1.js r1_places.js(집·마당·편의점·주차장·게이트·놀이터·공원·정류장) r2.js(상업·기념식 거리·사진관·광고판·운하) under.js(지하, 3단계) r3.js r3_institute.js(연구소·시계탑) far.js(원경)
src/player/ player.js(Capsule 이동·앉기·점프·발소리)
src/systems/ timeofday.js(이야기 연동 시간대·존 조명) lights.js(포인트 라이트 풀)
src/story/   (4단계)  src/ui/ ui.js styles.css   src/i18n/ ko.json en.json i18n.js
scripts/check.cjs  docs/DESIGN.md
```
- 앵커: 지역 빌더가 `k.anchor(id, x,y,z, data)`로 퍼즐·쪽지·쉼터 위치를 등록 → `G.world.anchors`. 쉼터 앵커는 `lamp`, `r`(반경) 포함.
- 충돌: 보이는 메시와 별개의 박스(`k.col.addBox`, `k.solid`=보이는 박스+충돌). 문·게이트·상자는 `col.setDyn(id, box)`(동적 Octree).
- 존: `k.zone({id, kind: indoor|garage|underground|outdoor, box:[x0,y0,z0,x1,y1,z1], surf, reverb})` → 조명·발소리·잔향.

## 진행 상황
- [x] 0단계 기획서 승인 (A안, 용어표 반영)
- [x] 1단계 월드 기초: 프로젝트·i18n·배포 파이프라인, 시작 화면, 1인칭 이동·충돌, 3지역 외관(주거 지구 상세, 상업 지구·운하, 중심부 광장·연구소·시계탑), 하늘·높이 안개·구름·별, 바람 셰이더, 시간대 키프레임, 램프 라이트 풀, 디버그 훅
- [x] 2단계 플레이어 동작: 달리기·점프(코요테 타임·점프 버퍼)·앉기(천장 확인), 상호작용(E, 각도·거리·시야 레이), 들기·옮기기·내려놓기, 상자 쌓기(정렬 스냅, 아래 상자 빼면 위 상자 낙하), 작은 물건 구 물리·던지기(좌클릭), 범위 밖 → 원위치, 1인칭 노란 소매 팔. P1(상자 3개 → 발코니 2.7m) 헤드리스로 풀이 확인
- [ ] 3단계 생존과 위협: 손전등·배터리, 지하 구간·실내(쇼핑몰), 잔류체 AI, 경고 연출, 쉼터·다시 시작, (던지기)
- [ ] 4단계 미스터리: 쪽지·관찰·일지, 퍼즐 P1~P6, 게이트·셔터, 연구소 내부·탑 내부, 저장, 엔딩
- [ ] 5단계 연출: 이야기 연동 시간 진행, 비·먼지 바람·꽃가루, 사운드 합성, 후처리 다듬기
- [ ] 6단계 마무리: 타이틀·설정(언어·감도·품질·음량)·이어하기, 밸런스, 성능, 버그

## 다음 할 일 (3단계)
1. `src/systems/flashlight.js`: SpotLight(카메라 부착, 그림자는 품질별), 배터리(3분, +35%, 15% 깜빡임, 0% 꺼짐), HUD.
2. `src/world/regions/under.js`: 역 계단(상업 지구 x -28..-12, z 38..42 구멍), 대합실·역무실(쉼터3)·지하상가·창고(4m 선반)·승강장·셔터·터널·중심부 역 출구(x -44..-28, z -74..-70). r2/r3의 groundTiles·groundBoxes에 구멍 추가. 쇼핑몰 내부.
3. `src/systems/navgrid.js` + `src/systems/remnants.js`: 잔류체(배회·의심·예고·추적·놓침), 빛·소리 감지, 경고 연출(화면 가장자리·소리), 잡힘 → 암전 → 쉼터.
4. `src/systems/shelters.js`: 쉼터 반경(잔류체 진입 불가), 다시 채워지는 배터리, 다시 시작 지점.
- 상호작용 API: `G.interact.add({ id, pos|getPos, r, verb, name, enabled, onUse, accepts, onInsert })`. 물건: `G.props.addCrate/addItem`, `placeAt`, `returnCarried`, `serialize/restore`.

## 알려진 문제 / 메모
- 헤드리스 스크린샷에서 FPS 판단 금지.
- 실내 조명은 존 배수 + 램프 라이트 풀(3개)로 처리. 그림자 맵은 해(플레이어 주변 ±36m)와 손전등만.

## 나중에 할 것 (사양 외 아이디어)
- (없음)

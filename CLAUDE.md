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
- [x] 3단계 생존과 위협: 손전등(SpotLight·채움광, 품질별 그림자)·배터리(3분, +35%, 15% 깜빡임, 0% 꺼짐, 화면 깜빡임), 지하 구간(역 계단·대합실·역무실 쉼터3·지하상가·창고 4m 선반·승강장 셔터·터널과 멈춘 열차·광장역 출구), 쇼핑몰 내부, 잔류체(배회→조사→1초 예고→추적→수색, 빛·소리·어둠 감지, 키 큰 풀에서 앉으면 숨기, 쉼터 진입 불가), 화면 가장자리 경고(방향 표시), 잡힘 → 암전 → 마지막 쉼터, 배터리 18곳(쉼터 배터리는 다시 채워짐), 던진 물건 소리로 유인
- [x] 4단계 미스터리: 쪽지 18개·관찰 19개(한/영 본문), 일지(J: 목표·실마리·나의 기록 / 쪽지 / 관찰), 쪽지·사진 보기, 키패드, 퍼즐 P2 게이트·P3 역무실(0314)·P4 배전반 2칸→셔터·P5 발전기→탑 문·무너진 계단(상자 3개)·P6 중앙 제어 장치(2147/0947), 연구소 내부(로비·연구실·기록 보관실·발전기실)·탑 내부(0/8/16/24층, 6개 계단), 이야기 단계·목표·실마리(150초 후·오답 2회), 쉼터 자동 저장·이어하기(새로 고침 방식), 엔딩(시계 움직임·종·기억 조각·새벽·일지 문장·크레딧). 헤드리스로 전체 진행 자동 점검 통과
- [x] 5단계 연출: 이야기 단계별 시간 범위(지역 전환 시 빠르게 흐름), 꽃가루·먼지 바람·비(GPU 입자, 실내에서는 숨김), 바람 세기·비 안개, Web Audio 사운드 전체(이름 레지스트리 32종, 바닥 재질별 발소리, 바람·비·새·물방울, 잔류체 3D 목소리, 긴장음·심장 박동, 지역별 패드 음악·피아노 같은 플럭, 방/홀 잔향 교차, 종소리), 블룸 세기 밤낮 조절
- [ ] 6단계 마무리: 타이틀·설정(언어·감도·품질·음량)·이어하기, 밸런스, 성능, 버그

## 다음 할 일 (6단계)
1. 설정 화면(언어 즉시 전환·마우스 감도·그래픽 품질 3단계·음량), 타이틀에서 설정 열기, 일시정지 메뉴에서 설정.
2. 밸런스(배터리 소모·잔류체 속도·감지), 성능(드로우콜·그림자 범위), 눈에 띄는 버그 수정.
3. (여유) 기어오르기.
- 사운드는 `src/systems/audio/sounds.js`의 SOUNDS(이름 → 합성 함수). 파일로 바꾸려면 `G.audio.register(name, G.audio.fromFile(url))`.
- 저장 키: `clearhaven947.save.v1`. 새 게임/이어하기는 한 번 플레이한 뒤라면 sessionStorage 플래그 + 새로 고침으로 깨끗하게 시작.
- 잔류체 스폰 정의: `src/systems/remnants.js`의 SPAWNS(앵커 이름 기준). 배터리 목록: `src/story/placement.js`의 BATTERIES.
- 상호작용 API: `G.interact.add({ id, pos|getPos, r, verb, name, enabled, onUse, accepts, onInsert })`. 물건: `G.props.addCrate/addItem`, `placeAt`, `returnCarried`, `serialize/restore`.

## 알려진 문제 / 메모
- 헤드리스 스크린샷에서 FPS 판단 금지.
- 실내 조명은 존 배수 + 램프 라이트 풀(3개)로 처리. 그림자 맵은 해(플레이어 주변 ±36m)와 손전등만.

## 나중에 할 것 (사양 외 아이디어)
- (없음)

# tasks.md — P0 Implementation Plan (MVP Week 1)

> 목표(P0): "명령 → 이벤트 저장 → WS 실시간 스트리밍 → 말풍선 UI 렌더 → Stub agent 응답"이 한 바퀴 돈다.
> SoT: events(Postgres), tasks(MD), approvals(approval_requests)

---

## Backend P0

### 0) Prereqs / Conventions
- Runtime: Node.js + Express
- DB: PostgreSQL
- WS: ws (or socket.io if already used; P0는 ws 추천)
- Validation: zod (추천, 없으면 최소 런타임 검증)
- IDs: uuid v4
- Time: timestamptz (UTC)
- Env vars:
  - DATABASE_URL
  - JWT_SECRET (P0에서는 dev mode로 optional 가능)
  - WS_ALLOW_NOAUTH=true (P0 개발용 옵션)

#### Acceptance Criteria (전체)
- POST /api/commands → 이벤트 1개 저장(human.command) + WS로 broadcast
- Stub agent가 해당 이벤트를 감지 → 1~3초 후 agent.message 저장 + WS broadcast
- 프론트에서 실시간 말풍선 2개(인간/에이전트)가 순서대로 보임
- WS 재연결 시 `last_event_id`로 누락분 복구 가능

---

### 1) migrations/ (events, agents, tasks, approval_requests)

#### 1.1 Create migrations folder
- [ ] `backend/src/migrations/001_init.sql` (or tool used in repo e.g. knex/prisma/drizzle)
- [ ] 마이그레이션 실행 스크립트 추가 (npm run migrate)

#### 1.2 SQL: events
- [ ] events 테이블 생성
- [ ] 인덱스: ts DESC, type, actor_id, thread_id

#### 1.3 SQL: agents (P0 minimal)
- [ ] agents 테이블 생성
- [ ] P0에서는 permissions JSONB, status, role 정도만 실제 사용 (나머지 nullable 가능)

#### 1.4 SQL: tasks (P0 minimal)
- [ ] tasks 테이블 생성
- [ ] P0에서는 조회/생성은 나중(P1)이라, schema만 준비

#### 1.5 SQL: approval_requests (P0 minimal + pending list)
- [ ] approval_requests 테이블 생성
- [ ] fields: request_id, action, status, requested_by, details, expires_at, created_at, resolved_at
- [ ] index: status, expires_at

AC
- [ ] 로컬/Render 환경에서 migrate 1회로 테이블 4개 생성됨

---

### 2) services/eventService.ts

#### Responsibilities
- 이벤트 insert/query
- 커서 기반 조회
- 타입별 최소 payload 요구 검증

#### Implement
- [ ] createEvent(input): Promise<Event>
  - validate:
    - message types: payload.text required
    - trade types: payload.symbol, payload.mode required
    - task types: payload.task_id required
    - approval types: payload.request_id required
- [ ] listEvents(params): Promise<Event[]>
  - supports: limit, types[], actor_ids[], thread_id, after_id, after_ts
  - 우선순위 규칙: after_id > after_ts > since > latest
- [ ] getLatestCursor(): Promise<{last_event_id, last_ts}> (optional)

AC
- [ ] `createEvent`가 잘못된 payload면 400 에러로 실패
- [ ] `listEvents(after_id=...)`가 이후 이벤트만 반환

---

### 3) websocket/server.ts

#### Responsibilities
- 클라이언트 연결 관리
- `auth` 처리 (P0는 optional)
- subscribe 처리 + backlog push + live broadcast
- 서버 남부 broadcast API 제공

#### Implement
- [ ] WS endpoint /ws
- [ ] 메시지 타입:
  - from client:
    - auth {token}
    - subscribe {filters, last_event_id?, after_ts?}
  - from server:
    - event {payload: Event}
    - hello {server_time, version}
    - error {message}
- [ ] Subscribe flow:
  1. backlog: `eventService.listEvents(...)`로 최근 N개 또는 after 기준으로 fetch
  2. backlog를 시간순으로 push
  3. 이후 broadcast는 실시간으로 push

#### Internal API
- [ ] `broadcastEvent(evt: Event)` exported (routes/worker에서 사용)

AC
- [ ] 새로 접속한 클라이언트는 최신 200개(또는 limit) 받음
- [ ] `last_event_id` 주면 누락분만 받음
- [ ] 이벤트 insert 후 broadcastEvent 호출 시 모든 subscriber가 받음

---

### 4) routes/commands.ts

#### Responsibilities
- 인간 명령 입력 받기
- 이벤트 저장 + broadcast
- (P0) approval gate는 UI만, 서버는 최소 구조만

#### Implement
- [ ] POST /api/commands
  - body: { to_agent_id, text, thread_id? }
  - server:
    - thread_id 없으면 생성(예: thread_${uuid})
    - createEvent with:
      - type: human.command
      - actor: human
      - actor_id: user (or dongshin)
      - target_id: to_agent_id
      - payload: { text, to_agent_id }
      - thread_id
    - broadcastEvent(evt)
  - response: { ok: true, thread_id, event_id }

AC
- [ ] curl로 명령 별낼면 DB에 event 1건 저장 + WS로 즉시 전달
- [ ] 응답으로 thread_id가 반환됨

---

## Frontend P0

### 0) UI Goal (P0)
- "말풍선 타임라인"이 실시간으로 흐른다
- 필터(에이전트/타입/스레드) 최소 1개는 된다
- Approval drawer는 "pending approval_requests" 목록을 보여줄 준비만 한다(더미로도 OK)

---

### 1) hooks/useWebSocket.ts

#### Responsibilities
- WS connect/reconnect
- subscribe 요청
- event 수신 핸들링
- last_event_id 저장(localStorage)

#### Implement
- [ ] useWebSocket({ url, filters })
  - on open:
    - send subscribe with:
      - filters
      - last_event_id from localStorage if exists
  - on message:
    - if type === 'event': eventStore.add(evt)
    - update localStorage last_event_id
  - reconnect with exponential backoff

AC
- [ ] 새로고침핟도 이벤트가 끊기지 않고 이어짐(last_event_id 기반)

---

### 2) stores/eventStore.ts

#### Responsibilities
- 이벤트 리스트 상태 관리
- thread_id 기반 grouping
- filtering/sorting

#### Implement (zustand/redux/whatever repo uses)
- [ ] state:
  - events: Event[]
  - filters
- [ ] actions:
  - addEvent(evt)
  - setEvents(evts)
  - setFilter(...)
  - getThread(thread_id) selector
- [ ] dedupe by id

AC
- [ ] 같은 이벤트가 중복으로 들어와도 1개만 유지
- [ ] thread_id별로 메시지 렌더 가능

---

### 3) components/ChatBubble.tsx

#### Responsibilities
- 이벤트 타입별 말풍선 렌더
- actor 구분(인간/에이전트/시스템)
- severity 표시(작게)

#### UI rules (P0)
- [ ] actor === 'human' → 오른쪽 정렬
- [ ] actor === 'agent' → 왼쪽 정렬 + agent name badge
- [ ] system → 가울데 작은 시스템 로그 형태
- [ ] payload.text 렌더 (없으면 fallback JSON preview)

AC
- [ ] human.command와 agent.message가 서로 다른 스타일로 보임
- [ ] thread별로 묶여 "대화처럼" 보임

---

### 4) components/ApprovalDrawer.tsx

#### Responsibilities
- pending approvals 표시 (P0는 목록 UI만)
- approve/reject 버튼 UI만 (동작은 더미 가능, 또는 P0에서 endpoint 붙여도 OK)

#### Implement
- [ ] 오른쪽 슬라이드 drawer UI
- [ ] GET /api/approvals?status=pending (P0에서 만들면 좋음, 없으면 mock)
- [ ] list item: action, requested_by, expires_at
- [ ] buttons: Approve / Reject

AC
- [ ] pending 항목이 1개라도 있으면 drawer에서 보임
- [ ] 버튼 클릭 시 최소한 UI상 상태 변화(optimistic) 가능

---

## Stub Agent

### workers/stubAgent.ts

#### Responsibilities
- 이벤트 스트림을 폴링하거나(간단) 또는 내부 pub/sub로 수신
- human.command를 감지하고 agent.message를 생성
- "처리중..." 같은 상태 이벤트도 가능(선택)

#### Implement (P0 simplest)
Option A (simplest): DB polling every 1s
- [ ] 최근 10초 events 조회에서 human.command 확인
- [ ] 아직 처리 안 된 command만 처리(중복 방지 키 필요)
  - simplest: processed_commands in memory set (dev only)
  - better: add metadata.processed_by_stub=true or separate table (P0는 in-memory OK)
- [ ] 1~3초 random delay 후 agent.message 생성:
  - actor: agent
  - actor_id: stub_agent
  - target_id: original actor_id
  - payload.text: "✅ Received: ... (stub response)"

Option B (better): WS/Redis pubsub subscribe (P1에 가깝)
- P0는 A로 시작 추천

AC
- [ ] human.command 1개당 agent.message 1개가 따라온다
- [ ] 새로고침/WS 재연결해도 이벤트 흐름 유지

---

## Minimal API Add-ons (Strongly Recommended for P0)

### GET /api/events (already in spec)
- [ ] supports: limit, types, actors, after_id, after_ts, thread_id

### GET /api/approvals?status=pending (P0 UI용)
- [ ] returns: pending approval_requests list

---

## Test Checklist (Manual)

- [ ] Backend 실행 → migrate 성공
- [ ] Frontend 실행 → WS connect 성공
- [ ] /api/commands 호출 → 말풍선 즉시 표시
- [ ] 1~3초 후 stub agent 말풍선 표시
- [ ] 브라우저 새로고침 → last_event_id로 누락 없이 이어짐
- [ ] WS 끊었다가 재연결 → after_id로 누락 없이 복구

---

## P0 Done Definition

> "Dashboard에서 명령을 보내면, 실시간 말풍선 2개(명령/응답)가 보이고, 새로고침/재연결에도 끊기지 않는다."

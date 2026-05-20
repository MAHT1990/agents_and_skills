# ipc-monitor-web

skill_ipc_control 런타임(채널·메시지·watcher)을 실시간 가시화하는 읽기 전용 웹 모니터.

## Quick Start

```cmd
npm install
monitor_start.cmd
```

브라우저: <http://127.0.0.1:3030>

중단: `monitor_stop.cmd`

## 기획서

`../../docs/plans/monitoring_ui.md`

## MVP 범위
- FR-001 채널 목록
- FR-004 라이브 스트림
- FR-009 SSE 푸시
- FR-010 tail 워커
- FR-018 config

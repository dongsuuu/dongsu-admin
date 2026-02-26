

---

## 8. Critical Patches (Post-Review Updates)

### 8.1 Event Payload Validation Rules

| Event Type | Required Payload Fields |
|------------|------------------------|
| human.command | text: string |
| agent.message | text: string |
| agent.debate | text: string, topic: string |
| task.* | task_id: string |
| trade.* | symbol: string, mode: 'paper' or 'live' |

### 8.2 Task MD-DB Sync Policy

MVP Policy (Simplest):
- Server reads MD on every GET /api/tasks/:id
- Parses and caches (TTL: 60s)
- Updates DB index if mismatch detected

Scale Policy (Future):
- Git commit hook triggers indexer
- Or: File watcher (dev) / Cron job (prod)

### 8.3 Trading Mode Safety

```typescript
// All trade events MUST include mode
interface TradePayload {
  mode: 'paper' | 'live';      // Required
  symbol: string;               // Required
}

// Approval gate logic
if (payload.mode === 'live') {
  requireApproval();            // Always for live
} else {
  autoApprove();                // Optional for paper
}
```

### 8.4 Approval Request Flow

1. Agent creates approval_request (DB)
2. Event: approval.requested (WS broadcast)
3. Human sees in UI → approve/reject
4. DB updated → Event: approval.approved/rejected
5. Original action proceeds

---

## Summary: Ready to Implement

This spec is now production-ready with:
- Clear actor/actor_id separation
- Dedicated approval_requests table
- Cursor-based reconnection
- Payload validation rules
- Paper/live trading safety
- MD-DB sync policy

Next: Start P0 implementation.

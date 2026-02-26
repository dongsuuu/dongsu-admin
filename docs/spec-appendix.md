

---

## 8. Critical Patches (Post-Review Updates)

### 8.1 Approval Requests Table (Recommended)

Separate table for pending approvals:

```sql
CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(100) UNIQUE NOT NULL,
    action VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    requested_by VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(100)
);
```

Events are for history only: approval.requested, approval.approved, approval.rejected, approval.expired

### 8.2 Subscribe Filter Priority Rules

Server priority (1 line rule):
1. last_event_id exists → events after that ID
2. else after_ts exists → events after that timestamp  
3. else filters.since exists → events since that time
4. else none → latest N + live stream

### 8.3 Event Payload Minimum Requirements

| Event Type | Required Payload Fields |
|------------|------------------------|
| human.command | text (string) |
| agent.message | text (string) |
| agent.debate | text (string) |
| agent.review | text (string) |
| trade.* | symbol (string), mode ('paper' \| 'live') |
| task.* | task_id (string) |
| approval.* | request_id (string) |

### 8.4 Trading Mode Safety

All trade events MUST include mode:

```typescript
interface TradePayload {
  mode: 'paper' | 'live';  // Required
  symbol: string;          // Required
  // ... other fields
}
```

API query: GET /api/trading/events?mode=live|paper|all

### 8.5 MD Task Sync Policy (1 sentence)

"MD is SoT. POST/PATCH /api/tasks/* modifies MD first, DB index reflects the result. GET /api/tasks/:id reads MD and self-heals DB index if needed."

---

## Summary: Production Ready

This spec is now operation-ready with:
- Approval requests table for pending queries
- Clear subscribe filter priority
- Payload validation rules per type
- Trading mode safety (paper/live)
- MD-DB sync policy

Next: Create tasks.md for P0 implementation.

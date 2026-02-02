# Bulk & Inline Update Specification for Amazon Entities

This document defines the standard patterns for implementing bulk and inline updates across Amazon entities (Campaigns, Ad Groups, Keywords, Targets, etc.). **Use Campaign as the reference implementation**—all other entities should follow the same structure.

---

## 1. Payload Structure

### Request Payload (Grouped Format)

**Format:** `payload[profile_id][campaign_type][entity_id]`

```json
{
  "payload": {
    "profile_id_1": {
      "SP": ["entity_id1", "entity_id2", "entity_id3"],
      "SB": ["entity_id4", "entity_id5"],
      "SD": ["entity_id6", "entity_id7"]
    },
    "profile_id_2": {
      "SP": ["entity_id8"],
      "SB": ["entity_id9"]
    }
  },
  "action": "status" | "budget" | "...",
  "status": "enable" | "pause",
  "budgetAction": "increase" | "decrease" | "set",
  "unit": "percent" | "amount",
  "value": 10,
  "upperLimit": 100,
  "lowerLimit": 5
}
```

### Build Grouped Payload (Frontend) — Generic Utility

**Use `buildGroupedPayload` from `src/utils/groupedPayload.ts`** — one generic utility for all entities.

```typescript
import { buildGroupedPayload } from "../utils/groupedPayload";

// For any entity (campaigns, ad groups, keywords, targets)
const payload = buildGroupedPayload(
  entities.map((e) => ({
    entityId: e.campaignId,  // or adgroupId, keywordId, targetId
    profile_id: e.profile_id,
    type: e.type ?? "SP",
  }))
);
```

For campaigns, `buildGroupedCampaignPayload` in `campaignBulkPayload.ts` wraps this:

```typescript
import { buildGroupedCampaignPayload } from "../utils/campaignBulkPayload";

const payload = buildGroupedCampaignPayload(campaigns);
// Internally: buildGroupedPayload(campaigns.map(c => ({ entityId: c.campaignId, profile_id: c.profile_id, type: c.type })))
```

### Single Row (Inline Edit)

Same utility, one entity:

```typescript
const payload = buildGroupedPayload([{
  entityId: inlineEditEntity.campaignId,
  profile_id: inlineEditEntity.profile_id,
  type: inlineEditEntity.type ?? "SP",
}]);
```

---

## 2. Backend Structure (100% Same as Campaign)

Backend bulk update **must** follow the campaign implementation exactly. Reference: `accounts/views_campaign_update.py` and `accounts/views_adgroups.py`.

### Update Handlers (Extract Value Calculations)

Value calculations must live in handler modules—views only pass `action` and `context`. Same pattern for campaigns and ad groups.

**Campaign handlers** (`accounts/campaign_update_handlers/`):
- `state.py` — status: `validate_request`, `build_campaign_update`, `get_db_update_and_log_info`
- `budget.py` — budget: `validate_request`, `build_campaign_update`, `get_db_update_and_log_info`

**Ad group handlers** (`accounts/adgroup_update_handlers/`):
- `state.py` — action `status`: `validate_request`, `build_adgroup_update`, `get_db_update_and_log_info`
- `default_bid.py` — action `default_bid`: `validate_request`, `build_adgroup_update`, `get_db_update_and_log_info` (supports `bids` array or single `value`)
- `name.py` — action `name`: `validate_request`, `build_adgroup_update`, `get_db_update_and_log_info`

**Handler signatures:**
```python
# validate_request: returns context dict or Response(400)
def validate_request(request) -> dict | Response:
    ...

# build_*_update: returns (update_dict, error_dict_or_None)
def build_campaign_update(campaign, campaign_type, context) -> tuple[dict, dict|None]:
    ...

# get_db_update_and_log_info: returns {db_update, log_info}
def get_db_update_and_log_info(action, entity, context, entity_update) -> dict:
    ...
```

### _update_entity_group Pattern

Each entity has `_update_campaign_group` or `_update_adgroup_group` (same structure):

```python
def _update_entity_group(profile_id, campaign_type, entity_ids, action, account, profile,
                        entity_lookup, context, request, account_id):
    # Phase 1: Build batch via handler's build_*_update (skip invalid, archived)
    # Phase 2: Single batch API request to Amazon
    # Phase 3: Parse batch response (_parse_*_batch_response)
    # Phase 4: For each succeeded: DB update, Log via handler's get_db_update_and_log_info, append to successes
    return successes, errors
```

Views call handlers for validation only; handlers encapsulate all value logic.

### Bulk Update Request

**Campaigns** (`action`: status | budget):
```python
{
    "payload": { "profile_id_1": { "SP": ["id1"], "SB": ["id2"], "SD": ["id3"] }, ... },
    "action": "status" | "budget",
    "status": "enable" | "pause",  # for action=status
    "budgetAction": "increase" | "decrease" | "set",
    "unit": "percent" | "amount", "value": 10, "upperLimit": 100, "lowerLimit": 5  # for action=budget
}
```

**Ad groups** (`action`: status | default_bid | name):
```python
{
    "payload": { "profile_id_1": { "SP": ["id1"], "SB": ["id2"], "SD": ["id3"] }, ... },
    "action": "status" | "default_bid" | "name",
    "status": "ENABLED" | "PAUSED",  # for action=status
    "bids": [{"adgroupId": "x", "bid": 1.5}],  # or "value": 1.5 for action=default_bid
    "name": "Ad Group Name"  # for action=name
}
```

**Keywords** (`action`: status | bid | archive):
```python
{
    "payload": { "profile_id_1": { "SP": ["id1"], "SB": ["id2"], "SD": ["id3"] }, ... },
    "action": "status" | "bid" | "archive",
    "status": "enable" | "pause",  # for action=status
    "bid": 1.5,  # or "bids": [{"keywordId": "x", "bid": 1.5}] for action=bid
    # archive: SB only, uses DELETE
}
```

**Targets** (`action`: status | bid | archive):
```python
{
    "payload": { "profile_id_1": { "SP": ["id1"], "SB": ["id2"], "SD": ["id3"] }, ... },
    "action": "status" | "bid" | "archive",
    "status": "enable" | "pause" | "archive",  # for action=status
    "bid": 1.5,  # or "bids": [{"targetId": "x", "bid": 1.5}] for action=bid
    # archive: SB only, uses DELETE
}
```

### Bulk Update Response Shape

```json
{
  "updated": 13,
  "failed": 2,
  "successes": [
    {
      "campaignId": "228961571258457",
      "profileId": "2473477508796361",
      "response": { /* raw Amazon API response */ },
      "field": "State",
      "oldValue": "Enabled",
      "newValue": "Paused",
      "campaignName": "USV CK SD Subcategory"
    }
  ],
  "errors": [
    {
      "campaignId": "123456",
      "error": "Ended campaign cannot be updated without end date extension."
    }
  ]
}
```

### Success Item Shape (Backend) — Required Fields

Each item in `successes` **must** include (use entity-specific ID and name keys):
- Campaigns: `campaignId`, `campaignName`
- Ad groups: `adgroupId`, `adgroupName`
- Keywords: `keywordId`, `keywordName`
- Targets: `targetId`, `targetName`

| Field | Type | Description |
|-------|------|-------------|
| `*Id` | string | Entity ID (campaignId, keywordId, adgroupId, targetId) |
| `profileId` | string | Profile ID |
| `response` | object/array | Raw Amazon API response |
| `field` | string | "State", "Budget", "Bid", etc. |
| `oldValue` | string | Previous value |
| `newValue` | string | New value |
| `campaignName` | string | Display name (campaign name, keyword text, etc.) |

### Error Item Shape

```python
{"campaignId": "123456", "error": "Error message string"}
```

### Backend Code Structure (Python)

```python
# 1. Parse and validate payload
payload_grouped = request.data.get('payload', {})
if not isinstance(payload_grouped, dict) or not payload_grouped:
    return Response({'error': 'payload must be a non-empty object {...}'}, status=400)

# 2. Collect all entity IDs from payload
all_ids = []
for by_type in payload_grouped.values():
    if isinstance(by_type, dict):
        for ids in by_type.values():
            if isinstance(ids, list):
                all_ids.extend(ids)
all_ids = list(set(str(x) for x in all_ids))

# 3. Validate action (status, budget, etc.)
# 4. Fetch entities by IDs (repo.get_entities_by_ids)
# 5. Build entity_lookup: { str(id): entity }
# 6. Loop: for profile_id, by_type in payload_grouped.items():
#        - Validate profile/channel
#        - for campaign_type, entity_ids_in_group in by_type.items():
#            - Call _update_entity_group(profile_id, campaign_type, entity_ids_in_group, ...)
# 7. Return Response({'updated': len(successes), 'failed': len(errors), 'successes': successes, 'errors': errors})
```

### _update_entity_group Pattern

```python
def _update_entity_group(profile_id, campaign_type, entity_ids, action, ...):
    # Phase 1: Build batch (skip invalid, archived, etc.)
    batch_items = []  # [(entityId, entity, entity_update), ...]

    # Phase 2: Single batch API request to Amazon
    response = amazon_client.update_...(profile_id, batch_data, campaign_type)

    # Phase 3: Parse batch response (succeeded_ids, errors_by_index)
    # Phase 4: For each succeeded: update DB, create Log, append to successes with:
    successes.append({
        'campaignId': entityId,  # or keywordId, adgroupId
        'profileId': profile_id,
        'response': response,
        'field': 'State' | 'Budget' | 'Bid',
        'oldValue': str(old_value),
        'newValue': str(new_value),
        'campaignName': entity.get('name') or entity.get('campaign_name') or f'Entity {entityId}',
    })
    # For each failed: errors.append({'campaignId': id, 'error': msg})

    return successes, errors
```

### By-IDs Endpoint

**Request:**
```
POST /accounts/{account_id}/campaigns/by-ids/
POST /accounts/{account_id}/channels/{channel_id}/campaigns/by-ids/
Body: { "campaignIds": ["id1", "id2", ...] }
```

**Response:**
```json
{
  "campaigns": [
    {
      "campaignId": "228961571258457",
      "campaign_name": "USV CK SD Subcategory",
      "profile_id": "2473477508796361",
      "type": "SD",
      "status": "Paused",
      "daily_budget": 10.5,
      "profile_currency_code": "USD"
    }
  ]
}
```

For other entities: `{ "entityIds": [...] }` → `{ "entities": [...] }`

---

## 3. Confirmation Modal (Pre-Update)

### When to Show

- User selects bulk action (e.g. Status, Budget) from dropdown.
- User clicks Apply/Confirm on bulk action panel.
- **Before** making the API call.

### Contents

1. **Title:** "Confirm Status Changes" or "Confirm Budget Changes" (or entity-specific).
2. **Summary row:** "X campaigns will be updated: Status change" (or Budget change).
3. **Preview table:**
   - Columns: **Entity Name** | **Old Value** | **New Value**
   - Rows: Up to 10 selected entities with computed old/new values.
   - Footer: "Showing 10 of 50 selected campaigns" if more than 10.
4. **Action details:** For budget: Action, Unit, Value, Limits.
5. **Buttons:** Cancel | Confirm (disabled while loading).

### Loading State

When selection spans multiple pages:

1. Show **"Loading selected campaigns..."** while fetching.
2. Call `getEntityByIds(accountId, selectedIds)` when modal opens.
3. Store result in `selectedEntitiesFetched`.
4. Use `getSelectedEntitiesData()`:
   - Return `selectedEntitiesFetched` if available (cross-page).
   - Otherwise filter current page data by `selectedIds`.

### Disable Confirm

- While `selectedEntitiesFetching` is true.
- While `bulkLoading` (API in progress).

---

## 4. Edit Summary Modal (Post-Update)

### Hook

```typescript
const { showEditSummary, EditSummaryModal } = useEditSummaryModal();
```

### Inline Edit Summary

```typescript
showEditSummary({
  entityType: "campaign",  // or "adGroup", "keyword", "target"
  action: "updated",
  mode: "inline",
  succeededCount: 1,
  entityName: entity.campaign_name || entity.name || "Campaign",  // Actual name, not generic
  field: "Status",
  oldValue: "Enabled",
  newValue: "Paused",
});
```

### Bulk Update Summary

```typescript
showEditSummary({
  entityType: "campaign",
  action: "updated",
  mode: "bulk",
  succeededCount: response.updated,
  failedCount: response.failed,
  succeededItems: [
    {
      label: "Campaign Name XYZ",
      field: "State",
      oldValue: "Enabled",
      newValue: "Paused",
    },
  ],
  details: response.errors?.slice(0, 5).map((e) => ({
    label: `${campaignName} (${e.campaignId})`,
    value: e.error,
  })),
});
```

### Summary Table Columns

| Entity name | Field | Old value | New value |
|-------------|-------|-----------|-----------|
| USV CK SD Subcategory | State | Enabled | Paused |
| ... | ... | ... | ... |
| Succeeded | — | — | 13 |
| Failed | — | — | 2 |
| Campaign XYZ (id) | Error | — | Error message |

### Variants

- **Success:** Green icon, "Update complete"
- **Partial:** Amber icon, "Partial success"
- **Error:** Red icon, "Update failed" (all failed)

### Entity Name

- **Inline:** Pass `entityName` with the actual entity name (e.g. campaign name).
- **Bulk:** Use `succeededItems[].label` from backend `campaignName` (or equivalent).

---

## 5. Post-Success Behavior

1. **Clear selection:** `setSelectedEntities(new Set())` after successful bulk update.
2. **Close confirmation modal:** `setShowConfirmationModal(false)`.
3. **Invalidate cache:** `queryClient.invalidateQueries({ queryKey: [...] })`.

---

## 6. Status Labels

Use `normalizeStatusDisplay()` from `utils/statusHelpers.ts`:

- **Display:** Always "Enabled", "Paused", "Archived"
- **API values:** "enable", "pause", "ENABLED", "PAUSED", etc.

---

## 7. Currency Formatting

```typescript
const formatCurrency = (value: number, currency?: string) => {
  const code = currency?.trim() ? currency.trim().toUpperCase() : "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};
```

Use for budget, bid, and any monetary values in confirmation and summary modals.

---

## 8. Entity Types in editSummary.ts

Ensure your entity is in `ENTITY_LABELS` and `ENTITY_LABELS_PLURAL`:

```typescript
const ENTITY_LABELS: Record<EntityType, string> = {
  campaign: "Campaign",
  adGroup: "Ad group",
  keyword: "Keyword",
  target: "Target",
  // ...
};
```

---

## 9. Checklist for New Entities

- [ ] Use `buildGroupedPayload` from `utils/groupedPayload.ts` (map entity to `{ entityId, profile_id, type }`).
- [ ] Use grouped payload for both inline and bulk.
- [ ] Backend bulk update returns `successes` with `field`, `oldValue`, `newValue`, `entityName`.
- [ ] Backend bulk update returns `errors` with `entityId`, `error`.
- [ ] Add `getEntityByIds` endpoint and service method.
- [ ] Fetch selected entities when confirmation modal opens (cross-page selection).
- [ ] Show "Loading selected..." while fetching.
- [ ] Confirmation modal: Entity Name | Old Value | New Value preview table.
- [ ] Edit summary: Use `showEditSummary` with `entityName` for inline, `succeededItems` for bulk.
- [ ] Clear selection after success.
- [ ] Use `normalizeStatusDisplay` for status values.
- [ ] Use `formatCurrency` for money fields.

---

## 10. Reference Files

| Area | File |
|------|------|
| **Generic payload builder** | `src/utils/groupedPayload.ts` |
| Campaign payload (wrapper) | `src/utils/campaignBulkPayload.ts` |
| Edit summary | `src/utils/editSummary.ts` |
| Summary modal | `src/components/ui/EditSummaryModal.tsx` |
| useEditSummaryModal | `src/hooks/useEditSummaryModal.tsx` |
| Status labels | `src/utils/statusHelpers.ts` |
| Campaigns page | `src/pages/Campaigns.tsx` |
| Ad Groups page | `src/pages/AdGroups.tsx` |
| Backend bulk update (campaigns) | `accounts/views_campaign_update.py` |
| Backend bulk update (ad groups) | `accounts/views_adgroups.py` → `bulk_update_adgroups` |
| Campaign handlers | `accounts/campaign_update_handlers/` (state.py, budget.py) |
| Ad group handlers | `accounts/adgroup_update_handlers/` (state.py, default_bid.py, name.py) |
| Keyword handlers | `accounts/keyword_update_handlers/` (state.py, bid.py) |
| Target handlers | `accounts/target_update_handlers/` (state.py, bid.py) |
| _update_campaign_group | `accounts/views_campaign_update.py` |
| _update_adgroup_group | `accounts/views_adgroups.py` |
| _update_keyword_group | `accounts/views_keywords.py` |
| _update_target_group | `accounts/views_targets.py` |
| Backend by-ids (campaigns) | `accounts/views.py` → `get_campaigns_by_ids` |
| Backend by-ids (ad groups) | `accounts/views_adgroups.py` → `get_adgroups_by_ids` |
| Backend by-ids (keywords) | `accounts/views_keywords.py` → `get_keywords_by_ids` |
| Backend by-ids (targets) | `accounts/views_targets.py` → `get_targets_by_ids` |
| Keywords page | `src/pages/Keywords.tsx` |
| Targets page | `src/pages/Targets.tsx` |
| Backend bulk update (keywords) | `accounts/views_keywords.py` → `bulk_update_keywords` |
| Backend bulk update (targets) | `accounts/views_targets.py` → `bulk_update_targets` |

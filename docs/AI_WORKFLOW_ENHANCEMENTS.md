# AI Workflow Enhancements with n8n

This document outlines a proposal to enhance the XYZ Salon Digital Assistant by offloading complex business logic and integrations to **n8n** (an AI-native workflow automation platform).

## Why n8n?

Currently, business logic (sending SMS, Slack notifications, booking flows) is hardcoded in TypeScript within `src/realtime/toolRegistry.ts`. Integrating n8n offers key advantages:

1.  **Agility**: Marketing/Ops teams can change notification workflows (e.g., "Add Dave to the email list") without a code deployment.
2.  **Integrations**: n8n has 1000+ native nodes (HubSpot, Google Sheets, Airtable, Slack) that would otherwise require custom API code.
3.  **Visibility**: Visualizing workflows makes it easier to debug complex multi-step processes.

---

## Architecture Evolution

### Current Architecture
```mermaid
graph LR
    User((User)) -- Voice --> Twilio
    Twilio -- Stream --> Server[XYZ Salon Assistant Server]
    Server -- Tool Call --> Registry[Tool Registry (TS)]
    Registry -- API --> Stripe
    Registry -- API --> SMS/Slack
    Registry -- Query --> Database
```

### Proposed Architecture
```mermaid
graph LR
    User((User)) -- Voice --> Twilio
    Twilio -- Stream --> Server[XYZ Salon Assistant Server]
    Server -- Tool Call --> Registry[Tool Registry (TS)]
    Registry -- Webhook --> N8N[n8n Workflow Engine]

    subgraph "n8n Workflows"
        N8N --> CRM[HubSpot/Airtable]
        N8N --> Slack
        N8N --> Email
        N8N --> Analytics
    end
```

---

## Proposed Workflows

### 1. Smart Partnership Inquiry Handling

**Problem**: Currently, `capturePartnershipInquiry` just logs to DB and sends a generic Slack/SMS.
**Enhancement**: Create a rich lead-nurturing pipeline.

**n8n Workflow**:
1.  **Webhook Trigger**: Receives `contactName`, `phone`, `tier`, `notes`.
2.  **CRM Create**: Create a "Deal" in HubSpot/Airtable.
3.  **Enrichment**: (Optional) Use Clearbit/Apollo to find company info based on email/phone.
4.  **Logical Branching**:
    *   *If High Value (>$1000)*: SMS the Salon Manager immediately + Create High Priority Task.
    *   *If Standard*: Send welcome email + Add to marketing sequence.
5.  **Slack Notification**: Post formatted card to `#partnerships`.

### 2. Auto-Updating Knowledge Base

**Problem**: The Knowledge Base (`kb/` folder) is static. Content becomes stale if the website changes.
**Enhancement**: Keep the AI synchronized with reality automatically.

**n8n Workflow**:
1.  **Schedule Trigger**: Run every 24 hours.
2.  **Scrape**: Fetch content from `xyzsalon.com/faq`, `/services`, `/appointments`.
3.  **LLM Extract**: Use an LLM node to extract Q&A pairs and format them as Markdown.
4.  **API Call**: Call the XYZ Salon Assistant's Admin API (or write to DB directly) to update the Knowledge Base documents.
5.  **Re-Index**: Trigger `npm run kb:index` (or equivalent API endpoint) to refresh vectors.

### 3. Post-Call Intelligence & Sentiment Analysis

**Problem**: Call logs are just raw text. We miss "Angry callers" or "Confused users" unless we read every transcript.
**Enhancement**: Analyze calls after they hang up.

**n8n Workflow**:
1.  **Twilio Trigger**: 'Call Status' Webhook (completed).
2.  **Fetch Transcript**: Retrieve full transcript from Database/Twilio.
3.  **LLM Analysis**: Pass transcript to GPT-4o with prompt:
    > "Analyze the sentiment (1-10), summarize the user's primary intent, and identify any unresolved issues."
4.  **Action**:
    *   *If Sentiment < 4*: Create Support Ticket (Zendesk/Jira) + Alert Manager.
    *   *If "Booking Appointment" failed*: Send retargeting SMS with a discount code.
5.  **Data Warehouse**: Store structured analysis in Google Sheets/BigQuery for dashboarding.

---

## Implementation Guide

To enable these workflows, we need to modify the TypeScript application to "emit" events to n8n rather than handling them entirely locally.

### Step 1: Add N8N Config
Add to `.env`:
```bash
N8N_WEBHOOK_BASE="https://n8n.yourdomain.com/webhook"
N8N_API_KEY="your-secret-key"
```

### Step 2: Create a Generic Webhook Handler
Create `src/services/n8n.ts`:

```typescript
import axios from 'axios';

export async function triggerWorkflow(workflowId: string, payload: any) {
  try {
    await axios.post(`${process.env.N8N_WEBHOOK_BASE}/${workflowId}`, payload, {
      headers: { 'X-API-Key': process.env.N8N_API_KEY }
    });
    return { ok: true };
  } catch (err) {
    console.error(`N8N Workflow ${workflowId} failed`, err);
    // Fallback: log to DB or try local handler
    return { ok: false };
  }
}
```

### Step 3: Update `toolRegistry.ts`

example modification for `capturePartnershipInquiry`:

```typescript
// OLD
// notifyPartnershipInquiry(...);

// NEW
import { triggerWorkflow } from '../services/n8n';

// ... inside capturePartnershipInquiry ...
// Fire and forget (don't block the voice response)
triggerWorkflow('partnership-inquiry', {
  contactName: args.contactName,
  phone: args.phone,
  tier: args.interestedLevel
});

return {
  ok: true,
  message: "I've passed your info to our management team..."
};
```

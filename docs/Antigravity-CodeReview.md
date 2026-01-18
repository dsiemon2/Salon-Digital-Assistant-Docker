# Antigravity Code Review: XYZ Salon Digital Assistant

**Date:** December 5, 2025
**Reviewer:** Antigravity Agent

## 1. Executive Summary
The XYZ Salon Digital Assistant is a robust MVP leveraging modern AI capabilities (OpenAI Realtime API) and standard integrations (Twilio, Stripe). It allows for natural voice conversations, appointment booking, and general Q&A.

However, the current implementation carries significant **security risks regarding PCI compliance** and **architectural rigidity** in its notification/workflow system.

---

## 2. Current Functionality
*   **Voice Interface**: Uses Twilio Media Streams to bridge audio to OpenAI. Supports 24 languages with auto-detection.
*   **Payments**: `src/services/payments.ts` allows credit card entry over the phone.
    *   *Mechanism*: The server receives raw PAN (Primary Account Number) and CVC via the `purchaseTickets` tool call.
    *   *Storage*: Uses Prisma to store transaction metadata (not card details) and `stripe-node` for processing.
*   **Knowledge Base**: Vector search using `text-embedding-3-small` on local Markdown files.
*   **Notifications**: Hardcoded methods in `src/services/notifications.ts` that post directly to Slack webhooks.
*   **Admin UI**: Simple Express/EJS dashboard for viewing logs and managing config.

---

## 3. Critical Findings & Immediate Improvements (Antigravity Actions)

### 🚨 Critical: PCI Compliance Risk
**Observation**: logic in `src/realtime/toolRegistry.ts` (and `payments.ts`) accepts `cardNumber` and `cvc` as strings arguments to the `purchaseTickets` tool.
**Risk**: This means raw credit card data flows through:
1.  OpenAI's servers (as text arguments in the tool call).
2.  Your Node.js application memory.
3.  Potentially your application logs (if request logging is enabled).
**Recommendation**:
*   **Immediate Fix**: Ensure `pino` and any other loggers explicitly redact `cardNumber` and `cvc`.
*   **Architecture Change**: Move to **Twilio `<Pay>`** verb. Instead of the AI collecting numbers, the AI should hand off to a TwiML flow that uses the secure `<Pay>` connector. This keeps raw digits out of your app code and OpenAI's context.

### 🛠️ Architecture: Rigid Notification Logic
**Observation**: `src/services/notifications.ts` is tightly coupled to Slack.
```typescript
// Current
export async function notifySponsorInquiry(...) {
  await sendSlackNotification(...);
}
```
**Impact**: Adding an email confirmation or a CRM entry requires editing source code and redeploying.
**Recommendation**: Adapt the **n8n Workflow** proposal (see `docs/AI_WORKFLOW_ENHANCEMENTS.md`). Emitting a generic event allows workflows to Change dynamiclly.

### 🐛 Error Handling: "Fire and Forget"
**Observation**: Notification functions catch errors and log them, but do not retry.
```typescript
// Current
.catch(err => console.error('Slack notification failed:', err));
```
**Impact**: If Slack is down or the webhook fails, the notification is lost forever.
**Recommendation**: Use **BullMQ** (already present in `package.json`) to queue these notifications. If a job fails, BullMQ handles exponential backoff retries automatically.

---

## 4. Future Enhancements

### Observability
*   **Current**: `pino` logs to stdout.
*   **Future**: Implement **OpenTelemetry**. Trace a request from the incoming Twilio ID -> OpenAI Request ID -> Stripe Transaction ID. This is vital for debugging "phantom" failures in voice calls.

### Testing
*   **Current**: `localTest` routes exist.
*   **Future**: **Synthetic Voice Testing**. Automate a process that calls your Twilio number, plays a pre-recorded audio file ("I want to buy a ticket"), and asserts that the database state changes correctly.

### Voice Latency
*   **Current**: Validated against OpenAI Realtime.
*   **Future**: Implement **Edge Caching** for the Knowledge Base. Instead of database lookups for every question, cache the top 100 FAQ embeddings in Redis for <10ms retrieval.

---

## 5. Summary of Recommended Next Steps

1.  **[High Priority]** Implement redaction for all logs to prevent PCI leakage.
2.  **[High Priority]** Refactor `notifications.ts` to use a BullMQ job queue.
3.  **[Medium]** Adopt the n8n integration for Sponsor/Ticket workflows.
4.  **[Low]** Build the "Synthetic Voice Test" suite.

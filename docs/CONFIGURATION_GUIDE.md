# Configuration Guide

This guide explains how to use the Configuration features in the XYZ Salon Voice Assistant Admin Panel.

**Access**: `http://localhost:8006/admin?token=local-dev-token`

---

## Table of Contents

1. [Webhooks](#webhooks)
2. [SMS Settings](#sms-settings)
3. [Call Transfer](#call-transfer)
4. [DTMF Menu](#dtmf-menu)
5. [AI Tools](#ai-tools)
6. [AI Agents](#ai-agents)
7. [Logic Rules](#logic-rules)

---

## Webhooks

**URL**: `/admin/webhooks`

Webhooks allow you to send real-time notifications to external services when specific events occur in the voice assistant.

### Creating a Webhook

1. Enter a **Name** (unique identifier, no spaces): e.g., `slack_notifications`, `crm_sync`
2. Enter the **URL** where webhook payloads will be sent
3. Optionally add a **Secret** for HMAC signature verification
4. Check **Enabled** to activate the webhook
5. Click **Save Webhook**

### Webhook Payload

When triggered, webhooks receive a JSON payload:

```json
{
  "event": "appointment_booked",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "callSid": "CA123...",
    "customerName": "John Doe",
    "serviceType": "Premium Haircut",
    "appointmentDate": "2025-01-20",
    "totalPrice": 100.00
  }
}
```

### Available Events

| Event | Description |
|-------|-------------|
| `call_started` | New call received |
| `call_ended` | Call completed |
| `appointment_booked` | Appointment booking completed |
| `partnership_inquiry` | Partnership interest captured |
| `transfer_requested` | Caller requested human transfer |
| `voicemail_left` | Voicemail recorded |

### Security

If you set a **Secret**, the webhook includes an `X-Signature` header containing an HMAC-SHA256 signature of the payload. Verify this on your server to ensure the request is authentic.

---

## SMS Settings

**URL**: `/admin/sms`

Configure automated SMS notifications sent to callers and staff.

### Configuration Options

| Setting | Description |
|---------|-------------|
| **From Number** | Twilio phone number to send SMS from (leave blank for default) |
| **Admin Alert Number** | Phone number to receive admin notifications |
| **Enable SMS** | Master toggle for all SMS features |

### Auto-Send Triggers

Enable automatic SMS for these events:

- **Appointment Confirmation** - Send confirmation with appointment details
- **Partnership Follow-up** - Thank partners for their interest
- **Appointment Reminders** - 24-hour reminder before appointments
- **Voicemail Notifications** - Alert admin when voicemail is left

### SMS Templates

Customize message content using placeholders:

```
Hi {{customerName}}!

Your appointment is confirmed:
- Service: {{serviceName}}
- Date: {{appointmentDate}}
- Time: {{appointmentTime}}
- Stylist: {{stylistName}}
- Confirmation: {{confirmationCode}}

See you soon!
```

**Available Placeholders:**
- `{{customerName}}` - Caller's name
- `{{serviceName}}` - Service name
- `{{appointmentDate}}` - Appointment date
- `{{appointmentTime}}` - Appointment time
- `{{stylistName}}` - Stylist name
- `{{salonLocation}}` - Salon location
- `{{salonAddress}}` - Full address
- `{{totalPrice}}` - Amount paid
- `{{confirmationCode}}` - Unique confirmation ID

---

## Call Transfer

**URL**: `/admin/transfer`

Configure how calls are transferred to human agents.

### Transfer Configuration

| Setting | Description |
|---------|-------------|
| **Enable Call Transfer** | Allow AI to transfer calls |
| **Default Transfer Number** | Primary phone number for transfers |
| **Max Wait Time** | Seconds to wait before voicemail (5-120) |
| **Transfer Message** | Message played while transferring |

### Voicemail Settings

| Setting | Description |
|---------|-------------|
| **Enable Voicemail Fallback** | Go to voicemail if no answer |
| **Voicemail Number** | Dedicated voicemail line (optional) |
| **Voicemail Greeting** | Message before recording |

### Transfer Routes

Create multiple transfer destinations for different purposes:

**Example Routes:**

| Route Name | Phone Number | Description |
|------------|--------------|-------------|
| `bookings` | +15551234567 | Booking team line |
| `support` | +15551234568 | Customer support |
| `management` | +15551234569 | Management inquiries |
| `emergency` | +15551234570 | Urgent issues |

**Schedule (JSON format):**
```json
{"Mon-Fri": "9am-5pm", "Sat": "10am-2pm"}
```

### How Transfers Work

1. Caller requests to speak with a human
2. AI plays the transfer message
3. System checks if route is within schedule
4. Call is transferred to the appropriate number
5. If no answer within max wait time, goes to voicemail (if enabled)

---

## DTMF Menu

**URL**: `/admin/dtmf`

Configure the keypad menu for callers who press digits (fallback for voice recognition issues).

### Menu Configuration

| Setting | Description |
|---------|-------------|
| **Enable DTMF Menu** | Activate press-digit fallback |
| **Menu Greeting** | Message listing options |
| **Timeout** | Seconds to wait for input (3-30) |

### Menu Options

Configure what happens when callers press each digit:

| Digit | Label | Action | Value |
|-------|-------|--------|-------|
| 1 | Service Info | `say` | "Our services include..." |
| 2 | Book Appointment | `ai_intent` | bookAppointment |
| 3 | Pricing | `ai_intent` | getPricingInfo |
| 0 | Speak to Human | `transfer` | +15551234567 |
| * | Repeat Menu | `repeat` | - |

### Available Actions

| Action | Description | Value Example |
|--------|-------------|---------------|
| `say` | Play a message | "Our hours are 9-5" |
| `transfer` | Transfer to phone | +15551234567 |
| `voicemail` | Go to voicemail | - |
| `ai_intent` | Trigger AI function | bookAppointment |
| `repeat` | Replay menu | - |

### Example Menu Greeting

```
Welcome to XYZ Salon.
Press 1 for service information.
Press 2 to book an appointment.
Press 3 for pricing information.
Press 0 to speak with a representative.
Press star to hear these options again.
```

---

## AI Tools

**URL**: `/admin/tools`

Enable or disable AI functions (tools) the assistant can use during calls.

### Tool Categories

**Information Tools:**
- `getServiceInfo` - Retrieve service details
- `getServicePricing` - Get service prices
- `getStylistInfo` - Stylist information
- `getHoursInfo` - Business hours
- `getLocationInfo` - Salon location info
- `getAboutInfo` - Salon information
- `answerQuestion` - Knowledge base queries

**Payment Tools:**
- `processPayment` - Process service payments

**Booking Tools:**
- `bookAppointment` - Schedule callbacks

**General Tools:**
- `transferToHuman` - Transfer to human agent
- `capturePartnershipInquiry` - Record partnership interest
- `takeMessage` - Record voicemail
- `sendTextMessage` - Send SMS to caller

### Enabling/Disabling Tools

Click the toggle switch on any tool card to enable or disable it. Disabled tools will not be available to the AI during calls.

**Warning:** Disabling critical tools like `transferToHuman` may prevent callers from getting help when needed.

### Seeding Default Tools

If no tools are configured, click **Seed Default Tools** to populate the database with the standard tool set.

---

## AI Agents

**URL**: `/admin/agents`

Create different AI personalities with unique voices, languages, and behaviors.

### Creating an Agent

| Field | Description | Example |
|-------|-------------|---------|
| **Agent ID** | Unique identifier (no spaces) | `spanish`, `sales` |
| **Display Name** | Friendly name | "Spanish Assistant" |
| **Voice** | OpenAI voice selection | alloy, coral, sage |
| **Language** | Primary language | en, es, de, fr, zh, vi |
| **System Prompt** | Personality instructions | See below |
| **Custom Greeting** | Opening message (optional) | "Hola! Bienvenido..." |
| **Enabled** | Agent is active | checked |
| **Set as Default** | Use for all new calls | checked |

### Available Voices

| Voice | Description |
|-------|-------------|
| `alloy` | Warm, friendly |
| `ash` | Confident, professional |
| `ballad` | Smooth, calm |
| `coral` | Friendly, approachable |
| `echo` | Crisp, clear |
| `sage` | Calm, reassuring |
| `shimmer` | Bright, energetic |
| `verse` | Professional, neutral |

### Example System Prompts

**Main English Agent:**
```
You are a helpful assistant for XYZ Salon.
You help callers with:
- Service information and pricing
- Appointment booking
- Stylist information
- General questions

Be friendly, concise, and helpful. If you can't help, offer to transfer to a human.
```

**Spanish Agent:**
```
Eres un asistente útil para XYZ Salon.
Habla siempre en español. Ayuda a los llamantes con:
- Información de servicios
- Reserva de citas
- Información de estilistas

Sé amable y conciso. Si no puedes ayudar, ofrece transferir a un humano.
```

**Sales-Focused Agent:**
```
You are a sales-focused assistant for XYZ Salon.
Your primary goal is to help callers book appointments.
Highlight the benefits: professional stylists, premium services, relaxing experience.
Mention premium service upgrades when appropriate.
Be enthusiastic but not pushy.
```

### Agent Transfer Flow

1. Call comes in → Default agent handles it
2. Logic rules check conditions (language, time, etc.)
3. If condition matches → Transfer to specialized agent
4. New agent takes over with its own personality/voice

---

## Logic Rules

**URL**: `/admin/logic`

Create rules to automatically route calls, switch agents, or trigger actions based on conditions.

### Creating a Rule

| Field | Description |
|-------|-------------|
| **Rule Name** | Unique identifier (no spaces) |
| **Description** | What the rule does |
| **Priority** | Higher numbers run first (0-100) |
| **Condition** | JavaScript-like expression |
| **Action** | What to do when condition is true |
| **Action Value** | Parameter for the action |
| **Enabled** | Rule is active |

### Condition Types

**Language Detection:**
```javascript
language == 'es'
language == 'spanish'
language != 'en'
```

**Time of Day:**
```javascript
time.hour < 9                    // Before 9 AM
time.hour >= 17                  // 5 PM or later
time.hour >= 9 && time.hour < 17 // Business hours
```

**Day of Week:**
```javascript
time.day == 0      // Sunday
time.day == 6      // Saturday
time.day >= 1 && time.day <= 5  // Weekdays
```

**Caller ID:**
```javascript
caller_id.startsWith('+1555')    // Specific area code
caller_id == '+15551234567'      // Specific number
```

**Intent Detection:**
```javascript
intent == 'book_appointment'
intent == 'partnership_inquiry'
intent == 'complaint'
```

**Custom Variables:**
```javascript
custom.vip == true
custom.repeat_caller == true
```

### Available Actions

| Action | Description | Value Example |
|--------|-------------|---------------|
| `transfer_agent` | Switch to different AI agent | `spanish` |
| `transfer_call` | Transfer to phone number | `+15551234567` |
| `send_sms` | Send SMS message | `welcome_template` |
| `webhook` | Trigger webhook | `vip_notification` |
| `set_variable` | Set a variable | `vip=true` |
| `play_message` | Play audio message | "Please hold..." |
| `end_call` | End the call | "Goodbye!" |

### Example Rules

**1. Spanish Language Routing (Priority: 10)**
```
Condition: language == 'es' OR language == 'spanish'
Action: transfer_agent
Value: spanish
```

**2. After Hours Message (Priority: 20)**
```
Condition: time.hour < 9 OR time.hour >= 17
Action: play_message
Value: Our office is currently closed. Please call back between 9 AM and 5 PM, or leave a voicemail.
```

**3. VIP Caller Detection (Priority: 30)**
```
Condition: caller_id.startsWith('+1555')
Action: transfer_call
Value: +15559999999
```

**4. Weekend Handling (Priority: 15)**
```
Condition: time.day == 0 OR time.day == 6
Action: play_message
Value: Thank you for calling. We are closed on weekends. Please call back Monday through Friday.
```

**5. Appointment Intent Notification (Priority: 5)**
```
Condition: intent == 'book_appointment'
Action: webhook
Value: appointment_interest
```

### Rule Execution Order

1. Rules are sorted by **priority** (highest first)
2. Each rule's condition is evaluated
3. **First matching rule** executes its action
4. Subsequent rules are not evaluated (first-match wins)

### Available Variables

| Variable | Type | Description |
|----------|------|-------------|
| `language` | string | Detected language code (en, es, etc.) |
| `caller_id` | string | Caller's phone number |
| `intent` | string | Detected caller intent |
| `time.hour` | number | Current hour (0-23) |
| `time.day` | number | Day of week (0=Sun, 6=Sat) |
| `call_duration` | number | Duration in seconds |
| `repeat_caller` | boolean | Called before? |
| `custom.*` | any | Custom extracted variables |

---

## Best Practices

### 1. Start with Basics
- Configure a default agent first
- Enable essential tools only
- Set up one transfer route

### 2. Test Incrementally
- Add one rule at a time
- Test each configuration change
- Monitor call logs for issues

### 3. Use Priorities Wisely
- Emergency rules: 90-100
- VIP routing: 70-89
- Language routing: 50-69
- Time-based rules: 30-49
- Intent detection: 10-29
- Default behavior: 0-9

### 4. Monitor and Adjust
- Review Analytics regularly
- Check call logs for failed transfers
- Adjust rules based on caller feedback

---

## Troubleshooting

### SMS Not Sending
- Verify Twilio credentials in `.env`
- Check **From Number** is a verified Twilio number
- Ensure **Enable SMS** is checked

### Transfers Failing
- Verify phone number format (+1XXXXXXXXXX)
- Check transfer route is enabled
- Confirm max wait time is reasonable

### Rules Not Triggering
- Check rule is **Enabled**
- Verify **Priority** is correct
- Test condition syntax in console
- Ensure condition variables are available

### Agent Not Switching
- Verify agent is **Enabled**
- Check Logic Rule is active
- Confirm agent ID matches rule's action value

---

## Quick Reference

### Phone Number Format
Always use E.164 format: `+15551234567`

### Time Zones
Server time is used for time-based rules. Adjust conditions for your local time zone.

### Supported Languages
- English (en)
- Spanish (es)
- German (de)
- French (fr)
- Chinese (zh)
- Vietnamese (vi)
- Other (specify in agent prompt)

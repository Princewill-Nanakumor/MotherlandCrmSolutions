export interface TaboolaGuideInput {
  webhookUrl: string;
  authHeader: string;
  method?: string;
  contentType?: string;
  statusesUrl?: string;
  productName?: string;
}

export function buildTaboolaIntegrationGuide({
  webhookUrl,
  authHeader,
  method = "POST",
  contentType = "application/json",
  statusesUrl,
  productName = "CRM",
}: TaboolaGuideInput): string {
  const statusEndpointUrl =
    statusesUrl ?? webhookUrl.replace(/\/leads$/, "/statuses");
  const leadListUrl = webhookUrl;
  const healthCheckUrl = `${webhookUrl}?health=1`;

  return `${productName} — Taboola Integration Guide

OVERVIEW
Configure Taboola to send live leads to ${productName} and read lead statuses back from the CRM.

BASE URL
${webhookUrl.replace(/\/api\/integrations\/taboola\/leads$/, "")}

AUTHENTICATION (Option 1 — required)
Every request must include this header:

Header: ${authHeader}
Value: [WEBHOOK_SECRET]

Example:
${authHeader}: [WEBHOOK_SECRET]

Requests without a valid secret receive 401 Unauthorized.
(Share the actual secret with your Taboola manager separately — it is configured on the CRM server as TABOOLA_WEBHOOK_SECRET.)

INBOUND POSTBACK — SEND LEADS TO CRM
URL: ${webhookUrl}
Method: ${method}
Content-Type: ${contentType}

Example request:
POST ${webhookUrl}
Content-Type: ${contentType}
${authHeader}: [WEBHOOK_SECRET]

{
  "FirstName": "John",
  "LastName": "Doe",
  "Email": "john.doe@example.com",
  "PhoneNumber": "+1234567890",
  "Country": "US",
  "Language": "en",
  "IP": "203.0.113.45",
  "ClickID": "abc123xyz",
  "Page": "landing-page-v1"
}

cURL test:
curl -X POST "${webhookUrl}" \\
  -H "Content-Type: ${contentType}" \\
  -H "${authHeader}: [WEBHOOK_SECRET]" \\
  -d '{
    "FirstName": "John",
    "LastName": "Doe",
    "Email": "john.doe@example.com",
    "PhoneNumber": "+1234567890",
    "Country": "US",
    "Language": "en",
    "IP": "203.0.113.45",
    "ClickID": "abc123xyz",
    "Page": "landing-page-v1"
  }'

FIELD MAPPING (Taboola → CRM)
Taboola field    | JSON key (preferred) | Required              | CRM usage
-----------------|----------------------|-----------------------|---------------------------
FirstName        | FirstName            | Recommended           | Lead first name
LastName         | LastName             | Recommended           | Lead last name
Email            | Email                | YES                   | Lead email (required)
PhoneNumber      | PhoneNumber          | Recommended           | Lead phone
Country          | Country              | Recommended           | Country filter + All Leads
Language         | Language             | Optional              | Stored in lead notes
IP               | IP                   | Optional              | Stored in lead notes
ClickID          | ClickID              | Strongly recommended  | Deduplication + status sync
Page             | Page                 | Optional              | Lead source + notes

Alternate key names (also accepted, case-insensitive):
FirstName, first_name, fname | LastName, last_name, lname | Email, e-mail
PhoneNumber, phone, phone_number, mobile | Country, country, countrycode
ClickID, click_id, click-id | Page, funnel, landingpage, url
CampaignID, campaign_id, campaign

INBOUND RESPONSES
Success — new lead (200):
{ "success": true, "duplicate": false, "message": "Lead created successfully", "lead": { ... } }

Success — duplicate (200):
{ "success": true, "duplicate": true, "message": "Lead already received" }

Errors: 401 invalid auth | 400 missing email | 500 server error (safe to retry)

STATUS ENDPOINT — LIST STATUS VALUES
GET ${statusEndpointUrl}
${authHeader}: [WEBHOOK_SECRET]

Response:
{
  "provider": "taboola",
  "statusField": "status",
  "values": [
    { "id": "NEW", "name": "New" },
    { "id": "...", "name": "Contacted" }
  ]
}

FULL LEAD LIST
GET ${leadListUrl}?page=1&limit=50
${authHeader}: [WEBHOOK_SECRET]

Incremental sync (new leads + status changes):
&updatedAfter=2026-06-17T14:00:00.000Z

Returns Taboola leads whose status changed after that time, or new leads
imported after that time if their status has not changed yet.
Sort order: most recently updated status first.

GET SINGLE LEAD
GET ${leadListUrl}/[LEAD_ID]
${authHeader}: [WEBHOOK_SECRET]

Lookup by CRM id, leadId, or ClickID.

Lead response fields:
id, leadId, clickId, firstName, lastName, email, phone, country, source
status.id, status.name, createdAt, updatedAt, statusChangedAt

STATUS FIELD VALUES
Field name: status
Built-in values: NEW, CONTACTED, IN_PROGRESS, QUALIFIED, LOST, WON
Custom statuses may also exist — use the statuses endpoint for the live list.
Use status.id when syncing programmatically; status.name is the display label.

HEALTH CHECK
GET ${healthCheckUrl}
${authHeader}: [WEBHOOK_SECRET]

Expected response:
{ "ok": true, "provider": "taboola", "message": "Taboola lead webhook is ready" }

IMPLEMENTATION NOTES
1. Always send ClickID on every lead.
2. Use the production URL only: ${webhookUrl}
3. POST each lead in real time as it is captured.
4. Retries are safe on 5xx; duplicates with the same ClickID are handled.
5. Email is required — leads without Email are rejected (400).
`;
}

export interface TaboolaGuideInput {
  webhookUrl: string;
  authHeader: string;
  method?: string;
  contentType?: string;
}

export function buildTaboolaIntegrationGuide({
  webhookUrl,
  authHeader,
  method = "POST",
  contentType = "application/json",
}: TaboolaGuideInput): string {
  const healthCheckUrl = `${webhookUrl}?secret=[WEBHOOK_SECRET]`;

  return `Motherland CRM — Taboola Lead Webhook Integration Guide

OVERVIEW
Configure Taboola to send live leads to Motherland CRM via a POST webhook. Each lead is created in All Leads in the CRM.

ENDPOINT
URL: ${webhookUrl}
Method: ${method}
Content-Type: ${contentType} (preferred)

Also supported: application/x-www-form-urlencoded, multipart/form-data.

AUTHENTICATION
Every request must include the shared webhook secret using ONE of these options:

Option 1 (Taboola default — in JSON body)
Field: ApiKey
Value: [WEBHOOK_SECRET]

Option 2 (recommended for manual tests)
Header: ${authHeader}: [WEBHOOK_SECRET]

Option 3
Header: Authorization: Bearer [WEBHOOK_SECRET]

Option 4 (health check only)
Query: ?secret=[WEBHOOK_SECRET]

Requests without a valid secret receive 401 Unauthorized.
(Share the actual secret with your Taboola manager separately — it is configured on the CRM server as TABOOLA_WEBHOOK_SECRET.)

FIELD MAPPING (Taboola → CRM)
Map Taboola form/export fields to these JSON keys:

Taboola field    | JSON key (preferred) | Required              | CRM usage
-----------------|----------------------|-----------------------|---------------------------
FirstName        | FirstName            | Recommended           | Lead first name
LastName         | LastName             | Recommended           | Lead last name
Email            | Email                | YES                   | Lead email (required)
PhoneNumber      | PhoneNumber          | Recommended           | Lead phone
Country          | Country              | Recommended           | Country filter + All Leads (US/usa/United States → United States)
Language         | Language             | Optional              | Stored in lead notes
IP               | IP                   | Optional              | Stored in lead notes
ClickID          | ClickID              | Strongly recommended  | Deduplication on retries
Page             | Page                 | Optional              | Lead source + notes

Alternate key names (also accepted, case-insensitive):
- First name: FirstName, first_name, fname
- Last name: LastName, last_name, lname
- Email: Email, e-mail
- Phone: PhoneNumber, phone, phone_number, mobile
- Country: Country, country, countrycode, country_code
- Language: Language, lang
- IP: IP, ipaddress, ip_address
- Click ID: ClickID, click_id, click-id
- Page: Page, funnel, funnelpage, landingpage, url
- Campaign: CampaignID, campaign_id, campaign, campaigntoken

EXAMPLE REQUEST
POST ${webhookUrl}
Content-Type: ${contentType}
${authHeader}: [WEBHOOK_SECRET]

{
  "ApiKey": "[WEBHOOK_SECRET]",
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

cURL TEST
curl -X POST "${webhookUrl}" \\
  -H "Content-Type: ${contentType}" \\
  -H "${authHeader}: [WEBHOOK_SECRET]" \\
  -d '{
    "FirstName": "John",
    "LastName": "Doe",
    "Email": "john.doe@example.com",
    "PhoneNumber": "+1234567890",
    "Language": "en",
    "IP": "203.0.113.45",
    "ClickID": "abc123xyz",
    "Page": "landing-page-v1"
  }'

RESPONSES

Success — new lead (200):
{
  "success": true,
  "duplicate": false,
  "message": "Lead created successfully",
  "lead": { "_id": "...", "firstName": "John", "lastName": "Doe", "email": "john.doe@example.com" }
}

Success — duplicate (200):
If the same ClickID is sent again, the CRM returns success without creating a duplicate:
{
  "success": true,
  "duplicate": true,
  "message": "Lead already received"
}

Error responses:
- 401: Missing or invalid webhook secret
- 400: Missing email or invalid payload
- 500: Server error (safe to retry)

HEALTH CHECK (optional)
GET ${healthCheckUrl}

Expected response:
{
  "ok": true,
  "provider": "taboola",
  "message": "Taboola lead webhook is ready"
}

IMPLEMENTATION NOTES
1. Email is required — leads without Email are rejected (400).
2. Send ClickID on every lead — used to dedupe Taboola retries.
3. Use the production URL only: ${webhookUrl}
4. POST each lead in real time as it is captured.
5. Retries are safe on 5xx; duplicates with the same ClickID are handled.
6. If FirstName is empty, CRM stores "Unknown".
7. If Country is omitted, CRM may infer country from PhoneNumber (e.g. +1 → United States).
8. Country names are normalized: US, usa, and United States all store and filter as United States.

CRM DISPLAY AFTER IMPORT
- FirstName + LastName → All Leads → Name
- Email → All Leads → Email
- PhoneNumber → All Leads → Phone
- Page → All Leads → Source (Taboola - [Page] or Taboola)
- Country → All Leads → Country + country filter
- Language, IP, ClickID, Page → Lead details / comments
`;
}

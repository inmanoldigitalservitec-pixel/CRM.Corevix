# upsert-canonical-lead

Creates or updates a canonical CRM lead in `public.leads` for a given `companyId` and `channel`.

## Request

- Method: `POST`
- Body (JSON):

```json
{
  "companyId": "uuid",
  "channel": "whatsapp | website | instagram | messenger",
  "sourcePlatform": "meta | corevix_website | etc",
  "sourceDetail": "bot_conversation | contact_form | dm | landing_page",
  "name": "optional",
  "firstName": "optional",
  "lastName": "optional",
  "email": "optional",
  "phone": "optional",
  "whatsapp": "optional",
  "businessName": "optional",
  "selectedService": "optional",
  "externalId": "optional",
  "utmSource": "optional",
  "utmMedium": "optional",
  "utmCampaign": "optional",
  "utmContent": "optional",
  "utmTerm": "optional",
  "metadata": {}
}
```

## Response

```json
{
  "ok": true,
  "success": true,
  "leadId": "uuid",
  "created": true,
  "matchedBy": "external_id | phone | email | none"
}
```

## Notes

- Uses `SUPABASE_SERVICE_ROLE_KEY` and bypasses RLS.
- `selectedService` is stored in `metadata.selected_service` (no dedicated column in `public.leads`).
- TODO: Add authentication/authorization before exposing publicly (website/bot).

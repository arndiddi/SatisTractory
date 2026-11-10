<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- External data (Census geocoder, CDC PLACES) and AI calls live in `src/lib/health.server.ts`, exposed via `src/lib/health.functions.ts`; cache tables are service-role only (no client access) so the browser never talks to third parties or the DB directly.
- The AI summary is built server-side from re-fetched tract numbers, not client input, so prompts can't be injected.
- CMS hospital ratings come from the service-role-only `hospital_ratings` table (a seeded snapshot of the CMS Provider Data API), not a live API call — data.cms.gov's Akamai edge blocks serverless/undici fetches with 403, so per-request calls fail. Refresh the table by re-downloading the dataset with curl and upserting.
- Google Places calls go through the connector gateway in `nearby.server.ts` (never the browser key); Maps JS loads via `src/lib/google-maps.ts` with `loading=async` + callback, and the managed browser key only renders on `*.lovable.app`/`*.lovableproject.com` origins — not on sandbox localhost.

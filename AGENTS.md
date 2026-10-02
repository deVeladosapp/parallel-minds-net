<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Record cafecito confirmations in `public.propinas` with the authenticated user ID and database-generated date, so a visitor cannot claim another user's support.
- Serve the payment QR from `/qr-pago-movil.png`, matching the requested fixed public image address.

- Coins, VIP frames and founder rooms are credited only by server functions in src/lib/pagos.functions.ts after admin approval; clients can only read their own balances — so screenshots or client edits cannot grant value.

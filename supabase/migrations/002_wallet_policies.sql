-- Patch si 001 déjà exécuté sans les policies wallet update

drop policy if exists "wallets update own" on public.wallets;
create policy "wallets update own" on public.wallets for update using (auth.uid() = user_id);

drop policy if exists "wallet_tx insert own" on public.wallet_transactions;
create policy "wallet_tx insert own" on public.wallet_transactions for insert with check (auth.uid() = user_id);
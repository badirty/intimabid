-- Chat post-enchère acheteur/vendeur avec messages prédéfinis uniquement

create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message_code text not null check (
    message_code in (
      'BUYER_WHEN_SHIP',
      'BUYER_TRACKING',
      'BUYER_RECEIVED',
      'BUYER_ISSUE',
      'SELLER_THANKS',
      'SELLER_PREPARING',
      'SELLER_SHIPPED',
      'SELLER_ASK_RECEIVED'
    )
  ),
  created_at timestamptz default now() not null
);

create index if not exists idx_order_messages_order
  on public.order_messages(order_id, created_at asc);

alter table public.order_messages enable row level security;

-- Seuls l'acheteur et le vendeur de la commande peuvent voir les messages
create policy "order_messages read party"
  on public.order_messages for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_messages.order_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

-- Seuls l'acheteur et le vendeur peuvent envoyer des messages
create policy "order_messages insert party"
  on public.order_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_messages.order_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

-- Activation realtime pour le chat instantané
alter publication supabase_realtime add table public.order_messages;

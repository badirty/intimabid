
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(secret);


  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { id: string; metadata?: Record<string, string> };
    const userId = session.metadata?.user_id;
    const amountCents = parseInt(session.metadata?.amount_cents ?? '0', 10);

    if (userId && amountCents > 0) {
      try {
        await creditStripeTopup(userId, amountCents, session.id);

    }
  }

  return NextResponse.json({ received: true });
}

import BadirtyApp from '@/components/app/BadirtyApp';

export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BadirtyApp initialSellerId={id} />;
}
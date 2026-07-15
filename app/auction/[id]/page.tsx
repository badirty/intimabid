import BadirtyApp from '@/components/app/BadirtyApp';

export default async function AuctionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BadirtyApp initialAuctionId={id} />;
}
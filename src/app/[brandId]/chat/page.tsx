import { PublicChatView } from "./_components/public-chat-view";

export const metadata = {
  title: "Brand Support AI Agent",
  description: "Public AI Customer Support Chat powered by Pinecone Vector Search",
};

export default async function BrandChatPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;

  return <PublicChatView brandId={brandId} />;
}

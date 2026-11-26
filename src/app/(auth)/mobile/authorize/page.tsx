import { redirect } from "next/navigation";

import { MobileAuthorize } from "@/components/mobile/mobile-authorize/MobileAuthorize";
import { auth } from "@/lib/auth";
import { getPairingSummary } from "@/lib/mobile/pairingService";
import { pairingIdSchema } from "@/lib/shared/schemas";
import type { MobilePairingSummary } from "@/types/MobileAuth";

export const dynamic = "force-dynamic";

const UNAVAILABLE: MobilePairingSummary = {
  status: "unavailable",
  deviceName: null,
  expiresAt: null,
};

export default async function MobileAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{ pairing?: string }>;
}) {
  const { pairing } = await searchParams;
  const session = await auth();
  const target = `/mobile/authorize?pairing=${encodeURIComponent(pairing ?? "")}`;
  if (!session?.userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(target)}`);
  }

  const parsed = pairingIdSchema.safeParse(pairing ?? "");
  if (!parsed.success) {
    return <MobileAuthorize pairingId={null} summary={UNAVAILABLE} />;
  }

  const summary = await getPairingSummary(parsed.data, session.userId);
  return <MobileAuthorize pairingId={parsed.data} summary={summary} />;
}

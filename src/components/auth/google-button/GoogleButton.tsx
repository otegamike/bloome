"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { GoogleG } from "@/components/icons/GoogleG";
import { Button } from "@/components/ui/button/Button";
import { isMockMode, setMockSignedIn } from "@/client/mockMode";

export function GoogleButton({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    if (isMockMode()) {
      setMockSignedIn(true);
      router.replace(callbackUrl);
      return;
    }
    setLoading(true);
    signIn("google", { callbackUrl });
  };

  return (
    <Button variant="secondary" loading={loading} iconLeft={<GoogleG size={20} />} onClick={handleClick}>
      Continue with Google
    </Button>
  );
}

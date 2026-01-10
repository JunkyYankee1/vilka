"use client";

import { useCallback } from "react";
import { useCart } from "@/modules/cart/cartContext";
import type { CartLineInput } from "./cartRepository";

export function useCartSync() {
  const { quantities } = useCart();

  const syncWithServer = useCallback(
    async (options?: {
      deliverySlot?: string | null;
      notes?: Record<string, { comment?: string; allowReplacement?: boolean; isFavorite?: boolean }>;
    }) => {
      const items: CartLineInput[] = Object.entries(quantities).map(
        ([offerId, quantity]) => {
          const note = options?.notes?.[offerId];
          return {
            offerId: Number(offerId),
            quantity,
            comment: note?.comment,
            allowReplacement: note?.allowReplacement,
            isFavorite: note?.isFavorite,
          };
        }
      );

      // Deprecated: prefer WS-based cart sync (CartProvider).
      // This helper remains for legacy call sites; it falls back to validate.
      const res = await fetch("/api/cart/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliverySlot: options?.deliverySlot ?? null,
          items,
        }),
      });

      if (!res.ok) {
        console.error("Cart sync failed", res.status);
        return null;
      }
      return res.json();
    },
    [quantities]
  );

  return { syncWithServer };
}


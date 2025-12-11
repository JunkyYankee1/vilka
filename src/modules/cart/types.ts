import type { Money, Offer } from "../catalog/types";

export type OfferId = Offer["id"];

export type CartState = Record<OfferId, number>;

export type CartEntry = {
  offer: Offer;
  quantity: number;
  lineTotal: Money;
  lineOldPrice?: Money;
};

export type CartTotals = {
  totalCount: number;
  totalPrice: Money;
};


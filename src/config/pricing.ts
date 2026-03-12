// Stripe pricing configuration - REAL Stripe price IDs

interface PricingTierConfig {
  name: string;
  price: number;
  credits: number;
  priceId: string;
  productId: string;
  description: string;
  features: string[];
  popular?: boolean;
  oneTime?: boolean;
}

export const PRICING_TIERS: Record<string, PricingTierConfig> = {
  start: {
    name: "Start",
    price: 399,
    credits: 100,
    priceId: "price_1SbV8AR5EFc7nWvhDcyFNiMe",
    productId: "prod_TYcMOi23KMqOh6",
    description: "100 credits per månad för bildigenerering",
    oneTime: false,
    features: [
      "100 bildgenereringar/månad",
      "Alla bakgrunder",
      "Brand Kit",
      "Hög upplösning"
    ]
  },
  pro: {
    name: "Pro",
    price: 699,
    credits: 300,
    priceId: "price_1SbV94R5EFc7nWvhHlWgPKsp",
    productId: "prod_TYcNnx01K8TR0F",
    description: "300 credits per månad för bildigenerering",
    popular: true,
    oneTime: false,
    features: [
      "300 bildgenereringar/månad",
      "Alla bakgrunder",
      "Brand Kit",
      "Hög upplösning",
      "Prioriterad support"
    ]
  },
  business: {
    name: "Business",
    price: 1499,
    credits: 600,
    priceId: "price_1TAGStR5EFc7nWvhW1YYQZQe",
    productId: "prod_U8XXaqL2BD1ieM",
    description: "600 credits per månad för bildigenerering",
    oneTime: false,
    features: [
      "600 bildgenereringar/månad",
      "Alla bakgrunder",
      "Brand Kit",
      "Hög upplösning",
      "Prioriterad support",
      "API-åtkomst (kommer snart)"
    ]
  },
  scale: {
    name: "Scale",
    price: 1999,
    credits: 800,
    priceId: "price_1TAGTYR5EFc7nWvhppU1NUin",
    productId: "prod_U8XYydmVeSHax8",
    description: "800 credits per månad för bildigenerering",
    oneTime: false,
    features: [
      "800 bildgenereringar/månad",
      "Alla bakgrunder",
      "Brand Kit",
      "Hög upplösning",
      "Prioriterad support",
      "API-åtkomst (kommer snart)"
    ]
  },
  creditPack30: {
    name: "Credit Pack 30",
    price: 129,
    credits: 30,
    priceId: "price_1TAGUMR5EFc7nWvh3TjjWNlH",
    productId: "prod_U8XYUvF2J6hOoM",
    description: "30 credits engångsköp",
    oneTime: true,
    features: [
      "30 bildgenereringar",
      "Ingen prenumeration",
      "Alla bakgrunder",
      "Brand Kit"
    ]
  },
  creditPack100: {
    name: "Credit Pack 100",
    price: 399,
    credits: 100,
    priceId: "price_1TAGUyR5EFc7nWvhqvjU2wrV",
    productId: "prod_U8XZgWHtPFaYh8",
    description: "100 credits engångsköp",
    oneTime: true,
    features: [
      "100 bildgenereringar",
      "Ingen prenumeration",
      "Alla bakgrunder",
      "Brand Kit"
    ]
  },
  creditPack300: {
    name: "Credit Pack 300",
    price: 899,
    credits: 300,
    priceId: "price_1TAGWRR5EFc7nWvhkemhzZsB",
    productId: "prod_U8Xa3v2gKKVlNz",
    description: "300 credits engångsköp",
    oneTime: true,
    features: [
      "300 bildgenereringar",
      "Ingen prenumeration",
      "Alla bakgrunder",
      "Brand Kit"
    ]
  }
};

export type PricingTier = keyof typeof PRICING_TIERS;

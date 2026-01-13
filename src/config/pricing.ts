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
    price: 1299,
    credits: 600,
    priceId: "price_1SbV9KR5EFc7nWvhAvP0jDbX",
    productId: "prod_TYcO3bE3Ec2Amv",
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
  creditPack: {
    name: "Credit Pack",
    price: 69,
    credits: 30,
    priceId: "price_1SbV9dR5EFc7nWvhOwgnPGX0",
    productId: "prod_TYcOcv9ORqRLYH",
    description: "30 credits engångsköp",
    oneTime: true,
    features: [
      "30 bildgenereringar",
      "Ingen prenumeration",
      "Alla bakgrunder",
      "Brand Kit"
    ]
  }
};

export type PricingTier = keyof typeof PRICING_TIERS;

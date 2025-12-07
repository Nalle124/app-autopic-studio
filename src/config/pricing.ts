// Stripe pricing configuration
export const PRICING_TIERS = {
  starter: {
    name: "Starter",
    price: 399,
    credits: 100,
    priceId: "price_1SbVe8JQldzCYD0ZCCX8RK4n",
    productId: "prod_TYctfRKGdxjyIo",
    description: "100 credits per månad för bildigenerering",
    features: [
      "100 bildgenereringar/månad",
      "Alla bakgrunder",
      "Brand Kit",
      "Hög upplösning"
    ]
  },
  professional: {
    name: "Professional",
    price: 699,
    credits: 300,
    priceId: "price_1SbVePJQldzCYD0ZL3pOnmK9",
    productId: "prod_TYcu2RNAGGthF9",
    description: "300 credits per månad för bildigenerering",
    popular: true,
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
    priceId: "price_1SbVeaJQldzCYD0ZG5wXtwAk",
    productId: "prod_TYcuc2xBrRbgIR",
    description: "600 credits per månad för bildigenerering",
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
    priceId: "price_1SbVf4JQldzCYD0Z11oZm3qb",
    productId: "prod_TYcuBp46lGYZDL",
    description: "30 credits engångsköp",
    oneTime: true,
    features: [
      "30 bildgenereringar",
      "Ingen prenumeration",
      "Alla bakgrunder",
      "Brand Kit"
    ]
  }
} as const;

export type PricingTier = keyof typeof PRICING_TIERS;

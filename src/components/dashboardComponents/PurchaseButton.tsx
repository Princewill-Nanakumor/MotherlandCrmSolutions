// src/components/dashboardComponents/PurchaseButton.tsx
// components/PurchaseButton.tsx
import React from "react";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface PurchaseButtonProps {
  product: Product;
}

// Mock function that actually uses the product parameter
async function processPurchase(product: Product): Promise<void> {
  // Simulate API call with product data
  console.log("Processing purchase for:", product);

  // Your actual purchase logic would use the product data
  const response = await fetch("/api/purchases", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      productId: product.id,
      productName: product.name,
      price: product.price,
      category: product.category,
    }),
  });

  if (!response.ok) {
    throw new Error("Purchase failed");
  }

  return response.json();
}

export default function PurchaseButton({
  product,
}: PurchaseButtonProps): React.JSX.Element {
  const handlePurchase = async (): Promise<void> => {
    try {
      // Process the purchase using the product data
      await processPurchase(product);

      console.log(
        `Successfully purchased ${product.name} for $${product.price}`
      );
    } catch (error) {
      console.error("Purchase failed:", error);
    }
  };

  return (
    <button
      onClick={handlePurchase}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      type="button"
    >
      Buy Now - {product.name} ${product.price.toFixed(2)}
    </button>
  );
}

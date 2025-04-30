import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to format BigInt amounts (like token balances) for display
export function formatBigIntAmount(amount: bigint | undefined | null, decimals: number, displayDecimals: number = 4): string {
  if (amount === undefined || amount === null) return "0.00";
  if (typeof amount !== 'bigint') {
    console.error("Invalid amount type passed to formatBigIntAmount:", amount);
    return "Error"; // Or handle appropriately
  }

  const amountStr = amount.toString();
  const integerPart = amountStr.length > decimals ? amountStr.slice(0, amountStr.length - decimals) : "0";
  const fractionalPart = amountStr.padStart(decimals, '0').slice(-decimals);

  if (displayDecimals === 0) {
      return integerPart;
  }

  const displayedFractional = fractionalPart.slice(0, displayDecimals);
  return `${integerPart}.${displayedFractional}`;
}

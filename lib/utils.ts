import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { logger } from '@/lib/logger';

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

// Helper function to format balances (needs decimals)
export function formatBalance(value: bigint | string | undefined, decimals: number): string {
  if (value === undefined || value === null) return '0';
  try {
    const valueBigInt = BigInt(value);
    const divisor = BigInt(10) ** BigInt(decimals);
    const integerPart = valueBigInt / divisor;
    const fractionalPart = valueBigInt % divisor;
    
    if (fractionalPart === BigInt(0)) {
      // Return just the integer part if there's no fractional component
      return integerPart.toLocaleString('en-US'); 
    }
    
    const fractionalString = fractionalPart.toString().padStart(decimals, '0');
    // Remove trailing zeros efficiently
    let endIndex = fractionalString.length - 1;
    while (endIndex >= 0 && fractionalString[endIndex] === '0') {
      endIndex--;
    }
    // If all were zeros, the trimmed is empty, should show at least one zero if decimals > 0
    const trimmedFractional = endIndex < 0 && decimals > 0 ? '0' : fractionalString.substring(0, endIndex + 1);

    return `${integerPart.toLocaleString('en-US')}.${trimmedFractional}`;
  } catch (e) {
    logger.error("Error formatting balance:", e, { value, decimals });
    return '0'; // Return '0' on error
  }
}

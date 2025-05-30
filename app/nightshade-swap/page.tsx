import type { Metadata } from 'next'
import { useLanguage } from "@/components/language-provider"; // Import useLanguage

// Add metadata for the Nightshade Swap page
export const metadata: Metadata = {
  title: 'Nightshade Finance Swap - ACYUM', // Updated title
  description: 'Swap ALPH and ACYUM tokens directly on Nightshade Finance.', // Updated description
  keywords: ['Alephium', 'ACYUM', 'Swap', 'Exchange', 'Token', 'ALPH', 'DeFi', 'Crypto', 'Nightshade Finance'],
};

// Client Component Page (to use useLanguage hook)
export default function NightshadeSwapPage() {
  const { t } = useLanguage(); // Get translation function

  return (
    // Removed ClientLayoutWrapper to make it a standalone page
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-white text-center">{t("goToNightshadeSwapButton")}</h1> {/* Optional: Add a title */}
      <a href="https://nightshade.finance/swap?token=ACYUM&action=buy" target="_blank" rel="noopener noreferrer">
        <button className="w-64 h-64 text-xl font-semibold text-white bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transition-transform transform hover:scale-105">
          {t("goToNightshadeSwapButton")}
        </button>
      </a>
    </div>
  );
}

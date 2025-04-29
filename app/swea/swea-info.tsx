"use client" // Keep as client component for potential future interactivity

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Sparkles } from "lucide-react"

export function SweaInfo() {
  const features = [
    { 
      title: "Equal Distribution", 
      description: "Everyone who joins the sWEA community receives an equal allocation of tokens, ensuring fair initial access." 
    },
    { 
      title: "Prevention of Wealth Concentration", 
      description: "To maintain fairness, no single wallet address is permitted to hold more than 1% of the total sWEA token supply." 
    },
    { 
      title: "Collective Ownership & Community Treasury", 
      description: "A significant portion, 30% of the total sWEA tokens, is held securely in a community-controlled treasury." 
    },
    { 
      title: "Wealth Redistribution Mechanism", 
      description: "Funds held within the community treasury can be redistributed equally amongst all token holders, based on community decisions." 
    },
    { 
      title: "Community Governance Potential", 
      description: "The underlying smart contract can be extended to include voting mechanisms, empowering the community to make collective decisions about the token's future and treasury usage." 
    },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center text-[#FF6B35]">
        sWEA (Sacagawea Coin) Mechanics
      </h1>
      <p className="text-lg text-center text-gray-300 mb-8">
        sWEA is designed with unique principles focused on fairness, community ownership, and equitable distribution on the Alephium blockchain.
      </p>

      <Card className="bg-gray-850 border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl text-[#FF6B35]">
            Core Principles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            {features.map((feature, index) => (
              <div key={index}>
                <dt className="font-semibold text-gray-100 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#FF6B35]/80" />
                  {feature.title}
                </dt>
                <dd className="ml-7 text-gray-400">
                  {feature.description}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Note: The specific implementation details (e.g., joining process, treasury management, governance activation) depend on the deployed smart contract.</p>
      </div>
    </div>
  )
} 
"use client" // Keep as client component for potential future interactivity

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Sparkles } from "lucide-react"
import { useLanguage } from "@/components/language-provider" // Import useLanguage

export function SweaInfo() {
  const { t } = useLanguage() // Get translation function

  // Map feature keys to translation keys
  const features = [
    { key: "EqualDistribution", title: t("sweaFeatureEqualDistribution"), description: t("sweaDescEqualDistribution") },
    { key: "Redistribution", title: t("sweaFeatureRedistribution"), description: t("sweaDescRedistribution") },
    { key: "Governance", title: t("sweaFeatureGovernance"), description: t("sweaDescGovernance") },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center text-[#FF6B35]">
        {t("sweaMechanicsTitle")} {/* Use translation */}
      </h1>
      <p className="text-lg text-center text-gray-300 mb-8">
        {t("sweaTagline")} {/* Use translation */}
      </p>

      <Card className="bg-gray-850 border-gray-700"> 
        <CardHeader>
          <CardTitle className="text-xl text-[#FF6B35]">
            {t("sweaCorePrinciples")} {/* Use translation */}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            {features.map((feature) => (
              <div key={feature.key}> {/* Use key from mapping */}
                <dt className="font-semibold text-gray-100 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#FF6B35]/80" />
                  {feature.title} {/* Already translated */}
                </dt>
                <dd className="ml-7 text-gray-400">
                  {feature.description} {/* Already translated */}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-gray-500 text-sm">
          <p>{t("sweaNote")}</p> {/* Use translation */}
      </div>
    </div>
  )
} 
"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/components/language-provider"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"

export default function NightshadeSwapClient() {
  const { t } = useLanguage()

  const handleGoToNightshade = () => {
    window.open("https://nightshade.finance/token/YUM", "_blank");
  };

  return (
    <ClientLayoutWrapper>
      <div className="flex flex-col items-center justify-center space-y-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("yumTokenExchange")}</CardTitle>
            <CardDescription>{t("buyAndSell")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                {t("goToNightshadeSwapButtonDescription")}
              </p>
              <Button onClick={handleGoToNightshade} className="w-full">
                {t("goToNightshadeSwapButton")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayoutWrapper>
  )
} 
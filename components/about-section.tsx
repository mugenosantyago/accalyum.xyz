"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/components/language-provider"

export function AboutSection() {
  const { language } = useLanguage()

  // Define the content directly in the component to avoid translation issues
  const content = {
    en: {
      aboutAcyum: "About YUM",
      aboutDescription:
        "YUM (Youth Uprising Movement) is a socialist token built on the Alephium blockchain, dedicated to funding socialist movements, community centers, and mutual aid networks. This token serves as both a digital currency and a symbol of resistance.",
      fundingSocialist: "Funding Socialist Infrastructure",
      fundingDescription:
        "The main YUM banks are dedicated to using accumulated funds to create infrastructure separate from capitalist systems. These resources directly support socialist and liberation movements across the globe, funding community centers, cooperative businesses, educational initiatives.",
      acquisitionAndDistribution: "Acquisition and Distribution",
      acquisitionDescription:
        "YUM is purchased with Alephium (ALPH), connecting it to an environmentally conscious blockchain that consumes significantly less energy than traditional proof-of-work systems. This alignment with ecological values reflects YUM's commitment to building a sustainable future.",
      aboutMission: "Our Mission",
      aboutVision:
        "We envision a future where financial systems are accessible to all, where communities can self-organize to address social challenges, and where technology serves as a force for good in the world. Our mission is to create a decentralized community that empowers individuals through blockchain technology. We believe in transparency, inclusivity, and the power of collective action to drive positive change.",
    },
    ja: {
      aboutAcyum: "ACYUMについて",
      aboutDescription:
        "ACYUM（アメリカ共産主義青年蜂起運動）は、Alephiumブロックチェーン上に構築された社会主義トークンで、社会主義運動、コミュニティセンター、相互扶助ネットワークへの資金提供に専念しています。このトークンはデジタル通貨としての役割と抵抗のシンボルとしての両方の役割を果たします。",
      fundingSocialist: "社会主義インフラへの資金提供",
      fundingDescription:
        "主要なACYUMバンクは、資本主義システムとは別のインフラを作成するために蓄積された資金を使用することに専念しています。これらのリソースは、世界中の社会主義解放運動を直接支援し、コミュニティセンター、協同組合ビジネス、教育イニシアチブに資金を提供します。",
      acquisitionAndDistribution: "取得と配布",
      acquisitionDescription:
        "ACYUMはAlephium（ALPH）で購入され、従来の作業証明システムよりも大幅に少ないエネルギーを消費する環境に配慮したブロックチェーンに接続されています。この生態学的価値との整合性は、持続可能な未来を構築するというACYUMのコミットメントを反映しています。",
      aboutMission: "私たちの使命",
      aboutVision:
        "私たちは、金融システムがすべての人にアクセス可能で、コミュニティが社会的課題に対処するために自己組織化でき、テクノロジーが世界の善の力として機能する未来を想像しています。私たちの使命は、ブロックチェーン技術を通じて個人に力を与える分散型コミュニティを作ることです。私たちは透明性、包括性、そして前向きな変化を促進するための集団行動の力を信じています。",
    },
  }

  // Select the appropriate content based on the current language
  const currentContent = language === "ja" ? content.ja : content.en

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="py-16 px-4"
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center gradient-text">{currentContent.aboutAcyum}</h2>

        <div className="space-y-8">
          <div className="bg-gray-900/60 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
            <p className="text-gray-300 leading-relaxed">{currentContent.aboutDescription}</p>
          </div>

          <div className="bg-gray-900/60 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
            <h3 className="text-xl font-bold mb-4 text-[#FF6B35]">{currentContent.fundingSocialist}</h3>
            <p className="text-gray-300 leading-relaxed">{currentContent.fundingDescription}</p>
          </div>

          <div className="bg-gray-900/60 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
            <h3 className="text-xl font-bold mb-4 text-[#FF6B35]">{currentContent.acquisitionAndDistribution}</h3>
            <p className="text-gray-300 leading-relaxed">{currentContent.acquisitionDescription}</p>
          </div>

          <div className="bg-gray-900/60 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
            <h3 className="text-xl font-bold mb-4 text-[#FF6B35]">{currentContent.aboutMission}</h3>
            <p className="text-gray-300 leading-relaxed">{currentContent.aboutVision}</p>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

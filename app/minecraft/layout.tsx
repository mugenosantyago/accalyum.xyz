import { Metadata } from "next"

export const metadata: Metadata = {
  title: "YumBlock Minecraft Server - AccalYUM",
  description: "Join our Minecraft server! YumBlock is minecraft with a couple extra mods such as Biome Expansion, gunblades, QoL and our signature burgers and fries!",
  keywords: ["minecraft", "server", "yumblock", "alephium", "community", "gaming"],
  openGraph: {
    title: "YumBlock Minecraft Server",
    description: "Join our Minecraft server! YumBlock is minecraft with a couple extra mods such as Biome Expansion, gunblades, QoL and our signature burgers and fries!",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "YumBlock Minecraft Server",
      },
    ],
  },
}

export default function MinecraftLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 
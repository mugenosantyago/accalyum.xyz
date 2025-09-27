"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, Globe, Trophy, Pickaxe, Zap, Heart, Download } from "lucide-react"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"

export default function MinecraftPage() {
  const serverIP = "play.accalyum.xyz"
  const discordLink = "https://discord.gg/VHPe2GyQ"
  const voteLink = "https://minecraft-mp.com/server-s345983"

  const copyServerIP = () => {
    navigator.clipboard.writeText(serverIP)
  }

  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-yellow-600">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white">
              YumBlock
            </h1>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={copyServerIP}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 hover:scale-105"
                size="lg"
              >
                <Pickaxe className="mr-2 h-6 w-6" />
                {serverIP}
              </Button>
              <p className="text-yellow-300 text-sm">Click to copy server IP</p>
            </div>
          </div>
        </div>
      </div>

      {/* Server Info Cards */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="bg-black/20 border-purple-500/30 text-white">
            <CardHeader className="text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-purple-400" />
              <CardTitle>Community</CardTitle>
              <CardDescription className="text-yellow-300">
                Join our growing community of builders and adventurers
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                asChild
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                size="lg"
              >
                <a href={discordLink} target="_blank" rel="noopener noreferrer">
                  <Heart className="mr-2 h-5 w-5" />
                  Join Discord
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-black/20 border-purple-500/30 text-white">
            <CardHeader className="text-center">
              <Globe className="h-12 w-12 mx-auto mb-4 text-purple-400" />
              <CardTitle>Server Type</CardTitle>
              <CardDescription className="text-yellow-300">
                Adventure, Survival, Vanilla with mods
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="secondary" className="bg-purple-600 text-white">Adventure</Badge>
                <Badge variant="secondary" className="bg-purple-600 text-white">Survival</Badge>
                <Badge variant="secondary" className="bg-purple-600 text-white">Vanilla</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 border-purple-500/30 text-white">
            <CardHeader className="text-center">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
              <CardTitle>Vote & Support</CardTitle>
              <CardDescription className="text-yellow-300">
                Help us grow by voting for our server
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                asChild
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                size="lg"
              >
                <a href={voteLink} target="_blank" rel="noopener noreferrer">
                  <Trophy className="mr-2 h-5 w-5" />
                  Vote Now
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-8 text-white">Server Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-black/20 border-purple-500/30 text-white">
              <CardContent className="p-6 text-center">
                <Zap className="h-8 w-8 mx-auto mb-4 text-purple-400" />
                <h3 className="font-semibold mb-2">Biome Expansion</h3>
                <p className="text-sm text-yellow-300">Explore new and exciting biomes</p>
              </CardContent>
            </Card>
            <Card className="bg-black/20 border-purple-500/30 text-white">
              <CardContent className="p-6 text-center">
                <Pickaxe className="h-8 w-8 mx-auto mb-4 text-yellow-400" />
                <h3 className="font-semibold mb-2">Added Weapons</h3>
              </CardContent>
            </Card>
            <Card className="bg-black/20 border-purple-500/30 text-white">
              <CardContent className="p-6 text-center">
                <Heart className="h-8 w-8 mx-auto mb-4 text-purple-400" />
                <h3 className="font-semibold mb-2">Quality of Life</h3>
                <p className="text-sm text-yellow-300">Improved gameplay experience</p>
              </CardContent>
            </Card>
            <Card className="bg-black/20 border-purple-500/30 text-white">
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-4 text-yellow-400" />
                <h3 className="font-semibold mb-2">Added Foods</h3>
              </CardContent>
            </Card>
            <Card className="bg-black/20 border-purple-500/30 text-white">
              <CardContent className="p-6 text-center">
                <Globe className="h-8 w-8 mx-auto mb-4 text-purple-400" />
                <h3 className="font-semibold mb-2">Warp Stones</h3>
                <p className="text-sm text-yellow-300">Fast travel across the world</p>
              </CardContent>
            </Card>
            <Card className="bg-black/20 border-purple-500/30 text-white">
              <CardContent className="p-6 text-center">
                <Trophy className="h-8 w-8 mx-auto mb-4 text-yellow-400" />
                <h3 className="font-semibold mb-2">Portal Blocks</h3>
                <p className="text-sm text-yellow-300">Create custom portals and gateways</p>
              </CardContent>
            </Card>
            <Card className="bg-black/20 border-purple-500/30 text-white">
              <CardContent className="p-6 text-center">
                <Zap className="h-8 w-8 mx-auto mb-4 text-purple-400" />
                <h3 className="font-semibold mb-2">Dragon Drops Elytra</h3>
                <p className="text-sm text-yellow-300">Enhanced dragon loot system</p>
              </CardContent>
            </Card>
            <Card className="bg-black/20 border-purple-500/30 text-white">
              <CardContent className="p-6 text-center">
                <Heart className="h-8 w-8 mx-auto mb-4 text-yellow-400" />
                <h3 className="font-semibold mb-2">Special Material</h3>
                <p className="text-sm text-yellow-300">Unique crafting materials and resources</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Connection Instructions */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-black/20 border-purple-500/30 text-white">
            <CardHeader>
              <CardTitle className="text-2xl text-center">How to Connect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-2 text-purple-400">Java Edition</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-300">
                    <li>Install NeoForge for your Minecraft version</li>
                    <li>Download our mod package:
                      <div className="flex flex-col sm:flex-row gap-2 mt-2">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="border-yellow-500 text-yellow-400 hover:bg-yellow-600 hover:text-white"
                        >
                          <a 
                            href="https://discord.com/channels/1247377755960770694/1392182433054589119/1393650907031273553"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Discord Download
                          </a>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white"
                        >
                          <a 
                            href="https://github.com/mugenosantyago/acyoom/releases/latest"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            GitHub Releases
                          </a>
                        </Button>
                      </div>
                      <p className="text-xs text-yellow-400 mt-1">Modpack: yumplugs14_v3-9.8.25.zip (~300MB)</p>
                    </li>
                    <li>Drag the plugins into your NeoForge Mods folder</li>
                    <li>Open Minecraft Java Edition</li>
                    <li>Click "Multiplayer"</li>
                    <li>Click "Add Server"</li>
                    <li>Enter server address: <code className="bg-purple-800/50 px-2 py-1 rounded text-yellow-300">{serverIP}</code></li>
                    <li>Click "Done" and connect!</li>
                  </ol>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-purple-400">Community Guidelines</h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-yellow-300">
                    <li>Be respectful to all players</li>
                    <li>No griefing or stealing</li>
                    <li>Follow server rules</li>
                    <li>Have fun and build together!</li>
                  </ul>
                </div>
              </div>
              <div className="text-center pt-4">
                <p className="text-yellow-300 mb-4">
                  Join our community and help us build something amazing together!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    onClick={copyServerIP}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    size="lg"
                  >
                    <Pickaxe className="mr-2 h-5 w-5" />
                    Copy Server IP
                  </Button>
                  <Button 
                    asChild
                    variant="outline"
                    className="border-yellow-500 text-yellow-400 hover:bg-yellow-600 hover:text-white"
                    size="lg"
                  >
                    <a href={discordLink} target="_blank" rel="noopener noreferrer">
                      Join Discord
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </ClientLayoutWrapper>
  )
} 
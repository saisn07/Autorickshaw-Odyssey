"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface Building {
  x: number
  width: number
  height: number
  color: string
  windows: { x: number; y: number }[]
  isSkyscraper: boolean
}

interface Dog {
  x: number
  y: number
  frame: number
  speed: number
  direction: 1 | -1
  color: string
  legPhase: number
}

interface Raindrop {
  x: number
  y: number
  speed: number
  length: number
}

interface Obstacle {
  x: number
  y: number
  type: "pothole" | "cow" | "traffic"
}

interface Vendor {
  x: number
  y: number
  type: "chaiwallah" | "fruitseller" | "newspaper" | "samosa" | "flowers"
  frame: number
  actionPhase: number
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<"start" | "playing" | "gameover">("start")
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)

  const gameRef = useRef({
    autoX: 150,
    autoY: 0,
    autoVelocityY: 0,
    isJumping: false,
    buildings: [] as Building[],
    farBuildings: [] as Building[],
    dogs: [] as Dog[],
    raindrops: [] as Raindrop[],
    obstacles: [] as Obstacle[],
    vendors: [] as Vendor[],
    groundOffset: 0,
    speed: 5,
    score: 0,
    isRaining: false,
    rainTimer: 0,
    rainDuration: 0,
    nextRainTime: 180,
    autoFrame: 0,
    wheelRotation: 0,
  })

  const jump = useCallback(() => {
    const game = gameRef.current
    if (!game.isJumping && gameState === "playing") {
      game.isJumping = true
      game.autoVelocityY = -15
    }
  }, [gameState])

  const startGame = useCallback(() => {
    const game = gameRef.current
    game.autoY = 0
    game.autoVelocityY = 0
    game.isJumping = false
    game.buildings = []
    game.farBuildings = []
    game.dogs = []
    game.raindrops = []
    game.obstacles = []
    game.vendors = []
    game.groundOffset = 0
    game.speed = 5
    game.score = 0
    game.isRaining = false
    game.rainTimer = 0
    game.nextRainTime = Math.random() * 300 + 200
    setScore(0)
    setGameState("playing")
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault()
        if (gameState === "start" || gameState === "gameover") {
          startGame()
        } else {
          jump()
        }
      }
    }

    const handleTouchStart = () => {
      if (gameState === "start" || gameState === "gameover") {
        startGame()
      } else {
        jump()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("touchstart", handleTouchStart)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("touchstart", handleTouchStart)
    }
  }, [gameState, jump, startGame])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const game = gameRef.current
    const GROUND_Y = canvas.height - 80
    const FOOTPATH_HEIGHT = 40

    // Initialize buildings
    const initBuildings = () => {
      // Far buildings (skyscrapers in background)
      for (let i = 0; i < 8; i++) {
        const height = Math.random() * 200 + 150
        game.farBuildings.push({
          x: i * 120,
          width: Math.random() * 60 + 80,
          height,
          color: `hsl(220, ${Math.random() * 10 + 5}%, ${Math.random() * 15 + 20}%)`,
          windows: generateWindows(80, height),
          isSkyscraper: true,
        })
      }

      // Near buildings
      for (let i = 0; i < 6; i++) {
        const height = Math.random() * 120 + 80
        game.buildings.push({
          x: i * 150,
          width: Math.random() * 80 + 60,
          height,
          color: `hsl(${Math.random() * 40 + 20}, ${Math.random() * 30 + 20}%, ${Math.random() * 20 + 30}%)`,
          windows: generateWindows(70, height),
          isSkyscraper: false,
        })
      }
    }

    const generateWindows = (buildingWidth: number, buildingHeight: number) => {
      const windows: { x: number; y: number }[] = []
      const cols = Math.floor(buildingWidth / 20)
      const rows = Math.floor(buildingHeight / 25)
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (Math.random() > 0.3) {
            windows.push({ x: col * 18 + 8, y: row * 22 + 15 })
          }
        }
      }
      return windows
    }

    // Initialize dogs
    const spawnDog = () => {
      const colors = ["#8B4513", "#D2691E", "#F4A460", "#2F1810", "#FFDAB9"]
      game.dogs.push({
        x: canvas.width + Math.random() * 100,
        y: GROUND_Y - FOOTPATH_HEIGHT + 5 + Math.random() * 15,
        frame: 0,
        speed: Math.random() * 2 + 1.5,
        direction: Math.random() > 0.3 ? -1 : 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        legPhase: Math.random() * Math.PI * 2,
      })
    }

    // Initialize vendors on footpath
    const spawnVendor = (initialX?: number) => {
      const types: Vendor["type"][] = ["chaiwallah", "fruitseller", "newspaper", "samosa", "flowers"]
      game.vendors.push({
        x: initialX ?? canvas.width + Math.random() * 200,
        y: GROUND_Y - FOOTPATH_HEIGHT + 5,
        type: types[Math.floor(Math.random() * types.length)],
        frame: 0,
        actionPhase: Math.random() * Math.PI * 2,
      })
    }

    if (game.buildings.length === 0) {
      initBuildings()
      for (let i = 0; i < 3; i++) {
        spawnDog()
      }
      // Spawn initial vendors at intervals
      for (let i = 0; i < 4; i++) {
        spawnVendor(200 + i * 250)
      }
    }

    // Spawn obstacle
    const spawnObstacle = () => {
      const types: ("pothole" | "cow" | "traffic")[] = ["pothole", "cow", "traffic"]
      game.obstacles.push({
        x: canvas.width + 50,
        y: GROUND_Y,
        type: types[Math.floor(Math.random() * types.length)],
      })
    }

    // Draw autorickshaw
    const drawAutorickshaw = (x: number, y: number) => {
      const baseY = GROUND_Y - 45 + y
      game.wheelRotation += game.speed * 0.1
      game.autoFrame++

      // Bounce effect
      const bounce = Math.sin(game.autoFrame * 0.3) * 2

      ctx.save()
      ctx.translate(x, baseY + bounce)

      // Exhaust smoke
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = `rgba(150, 150, 150, ${0.3 - i * 0.1})`
        ctx.beginPath()
        ctx.arc(-35 - i * 15 - Math.sin(game.autoFrame * 0.1 + i) * 5, 10 + i * 5, 5 + i * 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // Back wheel
      ctx.fillStyle = "#1a1a1a"
      ctx.beginPath()
      ctx.arc(-20, 35, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "#333"
      ctx.lineWidth = 3
      ctx.stroke()

      // Front wheel
      ctx.beginPath()
      ctx.arc(35, 35, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Wheel spokes
      ctx.strokeStyle = "#666"
      ctx.lineWidth = 1
      for (let i = 0; i < 6; i++) {
        const angle = game.wheelRotation + (i * Math.PI) / 3
        ctx.beginPath()
        ctx.moveTo(-20, 35)
        ctx.lineTo(-20 + Math.cos(angle) * 8, 35 + Math.sin(angle) * 8)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(35, 35)
        ctx.lineTo(35 + Math.cos(angle) * 8, 35 + Math.sin(angle) * 8)
        ctx.stroke()
      }

      // Body - iconic yellow/green
      ctx.fillStyle = "#FFD700"
      ctx.beginPath()
      ctx.moveTo(-30, 30)
      ctx.lineTo(-30, -10)
      ctx.quadraticCurveTo(-25, -25, -10, -30)
      ctx.lineTo(30, -30)
      ctx.quadraticCurveTo(45, -25, 50, -10)
      ctx.lineTo(50, 30)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = "#B8860B"
      ctx.lineWidth = 2
      ctx.stroke()

      // Roof
      ctx.fillStyle = "#228B22"
      ctx.beginPath()
      ctx.moveTo(-25, -30)
      ctx.quadraticCurveTo(10, -50, 45, -30)
      ctx.lineTo(40, -30)
      ctx.quadraticCurveTo(10, -45, -20, -30)
      ctx.closePath()
      ctx.fill()

      // Windshield
      ctx.fillStyle = "rgba(135, 206, 250, 0.7)"
      ctx.fillRect(30, -25, 18, 25)
      ctx.strokeStyle = "#333"
      ctx.strokeRect(30, -25, 18, 25)

      // Headlight
      ctx.fillStyle = "#FFFF99"
      ctx.beginPath()
      ctx.arc(48, 10, 5, 0, Math.PI * 2)
      ctx.fill()

      // Light beam effect
      ctx.fillStyle = "rgba(255, 255, 150, 0.1)"
      ctx.beginPath()
      ctx.moveTo(53, 10)
      ctx.lineTo(100, -10)
      ctx.lineTo(100, 30)
      ctx.closePath()
      ctx.fill()

      // Driver silhouette
      ctx.fillStyle = "#333"
      ctx.beginPath()
      ctx.arc(10, -10, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(5, -2, 10, 15)

      ctx.restore()
    }

    // Draw dog
    const drawDog = (dog: Dog) => {
      ctx.save()
      ctx.translate(dog.x, dog.y)
      if (dog.direction === 1) {
        ctx.scale(-1, 1)
      }

      const legOffset = Math.sin(dog.legPhase) * 8

      // Body
      ctx.fillStyle = dog.color
      ctx.beginPath()
      ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI * 2)
      ctx.fill()

      // Head
      ctx.beginPath()
      ctx.ellipse(18, -5, 10, 8, 0, 0, Math.PI * 2)
      ctx.fill()

      // Snout
      ctx.fillStyle = dog.color
      ctx.beginPath()
      ctx.ellipse(26, -3, 6, 4, 0, 0, Math.PI * 2)
      ctx.fill()

      // Ears
      ctx.beginPath()
      ctx.ellipse(14, -12, 4, 6, -0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(20, -11, 4, 6, 0.3, 0, Math.PI * 2)
      ctx.fill()

      // Eye
      ctx.fillStyle = "#000"
      ctx.beginPath()
      ctx.arc(22, -6, 2, 0, Math.PI * 2)
      ctx.fill()

      // Nose
      ctx.beginPath()
      ctx.arc(30, -3, 2, 0, Math.PI * 2)
      ctx.fill()

      // Legs
      ctx.fillStyle = dog.color
      ctx.fillRect(-12, 8, 5, 12 + legOffset)
      ctx.fillRect(-2, 8, 5, 12 - legOffset)
      ctx.fillRect(8, 8, 5, 12 + legOffset)
      ctx.fillRect(15, 8, 5, 12 - legOffset)

      // Tail
      ctx.beginPath()
      ctx.moveTo(-18, -2)
      ctx.quadraticCurveTo(-28, -15 + Math.sin(dog.legPhase * 2) * 5, -25, -10)
      ctx.lineWidth = 3
      ctx.strokeStyle = dog.color
      ctx.stroke()

      ctx.restore()
    }

    // Draw vendor
    const drawVendor = (vendor: Vendor) => {
      ctx.save()
      ctx.translate(vendor.x, vendor.y)
      vendor.frame++
      vendor.actionPhase += 0.05

      const bobble = Math.sin(vendor.actionPhase) * 2

      switch (vendor.type) {
        case "chaiwallah":
          // Cart/stall
          ctx.fillStyle = "#8B4513"
          ctx.fillRect(-25, 0, 50, 25)
          ctx.fillStyle = "#654321"
          ctx.fillRect(-25, 25, 50, 5)
          
          // Wheels
          ctx.fillStyle = "#333"
          ctx.beginPath()
          ctx.arc(-18, 32, 6, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(18, 32, 6, 0, Math.PI * 2)
          ctx.fill()
          
          // Kettle/pot
          ctx.fillStyle = "#C0C0C0"
          ctx.beginPath()
          ctx.arc(-5, -5, 12, 0, Math.PI * 2)
          ctx.fill()
          
          // Steam animation
          for (let i = 0; i < 3; i++) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.5 - i * 0.15})`
            ctx.beginPath()
            ctx.arc(-5 + Math.sin(vendor.actionPhase + i) * 3, -20 - i * 8 + bobble, 4 - i, 0, Math.PI * 2)
            ctx.fill()
          }
          
          // Cups
          ctx.fillStyle = "#D2691E"
          ctx.fillRect(10, -2, 8, 10)
          ctx.fillRect(20, -2, 8, 10)
          
          // Vendor person
          ctx.fillStyle = "#F5DEB3"
          ctx.beginPath()
          ctx.arc(-35, -15 + bobble, 8, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = "#8B0000"
          ctx.fillRect(-42, -7 + bobble, 14, 25)
          // Arm pouring
          ctx.fillStyle = "#F5DEB3"
          ctx.fillRect(-28, -5 + bobble, 15, 5)
          break

        case "fruitseller":
          // Cart
          ctx.fillStyle = "#228B22"
          ctx.fillRect(-30, 5, 60, 20)
          
          // Wheels
          ctx.fillStyle = "#333"
          ctx.beginPath()
          ctx.arc(-20, 30, 6, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(20, 30, 6, 0, Math.PI * 2)
          ctx.fill()
          
          // Umbrella
          ctx.fillStyle = "#FF6347"
          ctx.beginPath()
          ctx.arc(0, -35, 35, Math.PI, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = "#8B4513"
          ctx.fillRect(-2, -35, 4, 40)
          
          // Fruits - oranges
          ctx.fillStyle = "#FFA500"
          for (let i = 0; i < 4; i++) {
            ctx.beginPath()
            ctx.arc(-15 + i * 10, 0, 6, 0, Math.PI * 2)
            ctx.fill()
          }
          // Apples
          ctx.fillStyle = "#FF0000"
          for (let i = 0; i < 3; i++) {
            ctx.beginPath()
            ctx.arc(-10 + i * 10, -10, 5, 0, Math.PI * 2)
            ctx.fill()
          }
          // Bananas
          ctx.fillStyle = "#FFE135"
          ctx.beginPath()
          ctx.ellipse(20, -5, 8, 4, 0.3, 0, Math.PI * 2)
          ctx.fill()
          
          // Vendor
          ctx.fillStyle = "#F5DEB3"
          ctx.beginPath()
          ctx.arc(40, -10 + bobble, 8, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = "#4169E1"
          ctx.fillRect(33, -2 + bobble, 14, 25)
          break

        case "newspaper":
          // Stand
          ctx.fillStyle = "#A0522D"
          ctx.fillRect(-20, 0, 40, 30)
          
          // Papers stacked
          ctx.fillStyle = "#F5F5DC"
          for (let i = 0; i < 5; i++) {
            ctx.fillRect(-15 + i * 2, -5 - i * 3, 25, 3)
          }
          
          // Magazine rack
          ctx.fillStyle = "#8B4513"
          ctx.fillRect(-18, -20, 36, 15)
          
          // Colorful magazines
          const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"]
          for (let i = 0; i < 5; i++) {
            ctx.fillStyle = colors[i]
            ctx.fillRect(-15 + i * 7, -18, 6, 12)
          }
          
          // Vendor sitting
          ctx.fillStyle = "#F5DEB3"
          ctx.beginPath()
          ctx.arc(35, 5 + bobble, 8, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = "#696969"
          ctx.fillRect(28, 13 + bobble, 14, 20)
          // Reading paper
          ctx.fillStyle = "#F5F5DC"
          ctx.fillRect(20, 8 + bobble, 12, 15)
          break

        case "samosa":
          // Cart with glass case
          ctx.fillStyle = "#CD853F"
          ctx.fillRect(-25, 5, 50, 20)
          
          // Glass case
          ctx.fillStyle = "rgba(200, 230, 255, 0.5)"
          ctx.fillRect(-22, -20, 44, 25)
          ctx.strokeStyle = "#888"
          ctx.strokeRect(-22, -20, 44, 25)
          
          // Samosas inside
          ctx.fillStyle = "#DAA520"
          for (let i = 0; i < 3; i++) {
            ctx.beginPath()
            ctx.moveTo(-12 + i * 12, -5)
            ctx.lineTo(-6 + i * 12, -15)
            ctx.lineTo(0 + i * 12, -5)
            ctx.closePath()
            ctx.fill()
          }
          
          // Frying pan with steam
          ctx.fillStyle = "#2F2F2F"
          ctx.beginPath()
          ctx.ellipse(35, 0, 15, 8, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = "#DAA520"
          ctx.beginPath()
          ctx.moveTo(30, -3)
          ctx.lineTo(35, -10)
          ctx.lineTo(40, -3)
          ctx.closePath()
          ctx.fill()
          
          // Sizzle/steam
          for (let i = 0; i < 2; i++) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.4 - i * 0.15})`
            ctx.beginPath()
            ctx.arc(35 + Math.sin(vendor.actionPhase * 2 + i) * 4, -15 - i * 6, 3, 0, Math.PI * 2)
            ctx.fill()
          }
          
          // Wheels
          ctx.fillStyle = "#333"
          ctx.beginPath()
          ctx.arc(-18, 30, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(18, 30, 5, 0, Math.PI * 2)
          ctx.fill()
          
          // Vendor
          ctx.fillStyle = "#F5DEB3"
          ctx.beginPath()
          ctx.arc(-40, -5 + bobble, 8, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = "#FFF"
          ctx.fillRect(-47, 3 + bobble, 14, 22)
          // Chef hat
          ctx.fillStyle = "#FFF"
          ctx.fillRect(-45, -18 + bobble, 10, 10)
          break

        case "flowers":
          // Flower basket/cart
          ctx.fillStyle = "#8B4513"
          ctx.beginPath()
          ctx.moveTo(-25, 25)
          ctx.lineTo(-20, 0)
          ctx.lineTo(20, 0)
          ctx.lineTo(25, 25)
          ctx.closePath()
          ctx.fill()
          
          // Colorful flowers
          const flowerColors = ["#FF69B4", "#FF6347", "#FFD700", "#FF4500", "#DA70D6", "#FFA07A"]
          for (let i = 0; i < 12; i++) {
            const fx = -15 + (i % 4) * 10
            const fy = -5 - Math.floor(i / 4) * 10
            ctx.fillStyle = flowerColors[i % flowerColors.length]
            ctx.beginPath()
            ctx.arc(fx, fy + Math.sin(vendor.actionPhase + i) * 1.5, 6, 0, Math.PI * 2)
            ctx.fill()
            // Flower center
            ctx.fillStyle = "#FFD700"
            ctx.beginPath()
            ctx.arc(fx, fy + Math.sin(vendor.actionPhase + i) * 1.5, 2, 0, Math.PI * 2)
            ctx.fill()
          }
          
          // Garland strings
          ctx.strokeStyle = "#FF69B4"
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(-20, -25)
          ctx.quadraticCurveTo(0, -15 + bobble, 20, -25)
          ctx.stroke()
          
          ctx.strokeStyle = "#FFA500"
          ctx.beginPath()
          ctx.moveTo(-18, -30)
          ctx.quadraticCurveTo(0, -22 + bobble, 18, -30)
          ctx.stroke()
          
          // Vendor (woman with flowers)
          ctx.fillStyle = "#F5DEB3"
          ctx.beginPath()
          ctx.arc(40, -5 + bobble, 8, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = "#FF1493"
          ctx.fillRect(33, 3 + bobble, 14, 22)
          // Flower in hair
          ctx.fillStyle = "#FF6347"
          ctx.beginPath()
          ctx.arc(45, -12 + bobble, 4, 0, Math.PI * 2)
          ctx.fill()
          break
      }

      ctx.restore()
    }

    // Draw raindrop
    const drawRaindrop = (drop: Raindrop) => {
      ctx.strokeStyle = "rgba(174, 194, 224, 0.6)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(drop.x, drop.y)
      ctx.lineTo(drop.x - 2, drop.y + drop.length)
      ctx.stroke()
    }

    // Draw building
    const drawBuilding = (building: Building, isFar: boolean) => {
      const groundBase = GROUND_Y - FOOTPATH_HEIGHT
      const alpha = isFar ? 0.6 : 1

      ctx.globalAlpha = alpha

      // Building body
      ctx.fillStyle = building.color
      ctx.fillRect(building.x, groundBase - building.height, building.width, building.height)

      // Windows
      ctx.fillStyle = game.isRaining ? "rgba(255, 255, 150, 0.8)" : "rgba(255, 255, 200, 0.5)"
      building.windows.forEach((win) => {
        if (building.x + win.x > 0 && building.x + win.x < canvas.width) {
          ctx.fillRect(building.x + win.x, groundBase - building.height + win.y, 12, 15)
        }
      })

      // Building top details for skyscrapers
      if (building.isSkyscraper) {
        ctx.fillStyle = "#444"
        ctx.fillRect(building.x + building.width / 2 - 5, groundBase - building.height - 20, 10, 20)
        ctx.fillStyle = "#f00"
        ctx.beginPath()
        ctx.arc(building.x + building.width / 2, groundBase - building.height - 20, 3, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
    }

    // Draw obstacle
    const drawObstacle = (obstacle: Obstacle) => {
      ctx.save()
      ctx.translate(obstacle.x, obstacle.y)

      switch (obstacle.type) {
        case "pothole":
          ctx.fillStyle = "#333"
          ctx.beginPath()
          ctx.ellipse(0, 0, 25, 10, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = "#1a1a1a"
          ctx.beginPath()
          ctx.ellipse(0, 0, 18, 7, 0, 0, Math.PI * 2)
          ctx.fill()
          break

        case "cow":
          // Body
          ctx.fillStyle = "#f5f5dc"
          ctx.beginPath()
          ctx.ellipse(0, -20, 35, 20, 0, 0, Math.PI * 2)
          ctx.fill()
          // Head
          ctx.beginPath()
          ctx.ellipse(30, -25, 15, 12, 0, 0, Math.PI * 2)
          ctx.fill()
          // Spots
          ctx.fillStyle = "#8B4513"
          ctx.beginPath()
          ctx.ellipse(-10, -25, 10, 8, 0.3, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.ellipse(10, -15, 8, 6, -0.2, 0, Math.PI * 2)
          ctx.fill()
          // Legs
          ctx.fillStyle = "#f5f5dc"
          ctx.fillRect(-25, -5, 8, 20)
          ctx.fillRect(-10, -5, 8, 20)
          ctx.fillRect(10, -5, 8, 20)
          ctx.fillRect(25, -5, 8, 20)
          // Eyes
          ctx.fillStyle = "#000"
          ctx.beginPath()
          ctx.arc(35, -28, 3, 0, Math.PI * 2)
          ctx.fill()
          // Horns
          ctx.strokeStyle = "#8B7355"
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(25, -35)
          ctx.quadraticCurveTo(20, -45, 25, -42)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(35, -35)
          ctx.quadraticCurveTo(40, -45, 35, -42)
          ctx.stroke()
          break

        case "traffic":
          // Traffic cone
          ctx.fillStyle = "#FF6600"
          ctx.beginPath()
          ctx.moveTo(-12, 0)
          ctx.lineTo(-5, -35)
          ctx.lineTo(5, -35)
          ctx.lineTo(12, 0)
          ctx.closePath()
          ctx.fill()
          // White stripes
          ctx.fillStyle = "#FFF"
          ctx.fillRect(-9, -12, 18, 5)
          ctx.fillRect(-7, -25, 14, 5)
          break
      }

      ctx.restore()
    }

    // Game loop
    let animationId: number
    let obstacleTimer = 0

    const gameLoop = () => {
      if (gameState !== "playing") {
        animationId = requestAnimationFrame(gameLoop)
        return
      }

      // Clear canvas
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      if (game.isRaining) {
        gradient.addColorStop(0, "#2c3e50")
        gradient.addColorStop(0.5, "#4a6572")
        gradient.addColorStop(1, "#5d7a8c")
      } else {
        gradient.addColorStop(0, "#87CEEB")
        gradient.addColorStop(0.5, "#B0E0E6")
        gradient.addColorStop(1, "#E0F6FF")
      }
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Rain logic
      game.rainTimer++
      if (!game.isRaining && game.rainTimer >= game.nextRainTime) {
        game.isRaining = true
        game.rainDuration = Math.random() * 300 + 200
        game.rainTimer = 0
      } else if (game.isRaining && game.rainTimer >= game.rainDuration) {
        game.isRaining = false
        game.rainTimer = 0
        game.nextRainTime = Math.random() * 400 + 300
        game.raindrops = []
      }

      // Spawn raindrops
      if (game.isRaining) {
        for (let i = 0; i < 5; i++) {
          game.raindrops.push({
            x: Math.random() * canvas.width,
            y: -10,
            speed: Math.random() * 8 + 12,
            length: Math.random() * 15 + 10,
          })
        }
      }

      // Update and draw far buildings (skyscrapers)
      game.farBuildings.forEach((building) => {
        building.x -= game.speed * 0.3
        if (building.x + building.width < 0) {
          building.x = canvas.width + Math.random() * 100
          building.height = Math.random() * 200 + 150
          building.windows = generateWindows(building.width, building.height)
        }
        drawBuilding(building, true)
      })

      // Update and draw near buildings
      game.buildings.forEach((building) => {
        building.x -= game.speed * 0.6
        if (building.x + building.width < 0) {
          building.x = canvas.width + Math.random() * 50
          building.height = Math.random() * 120 + 80
          building.windows = generateWindows(building.width, building.height)
        }
        drawBuilding(building, false)
      })

      // Draw footpath
      ctx.fillStyle = "#8B7355"
      ctx.fillRect(0, GROUND_Y - FOOTPATH_HEIGHT, canvas.width, FOOTPATH_HEIGHT)

      // Footpath pattern
      ctx.strokeStyle = "#6B5344"
      ctx.lineWidth = 1
      for (let i = 0; i < canvas.width; i += 40) {
        const offset = (game.groundOffset * 0.6) % 40
        ctx.beginPath()
        ctx.moveTo(i - offset, GROUND_Y - FOOTPATH_HEIGHT)
        ctx.lineTo(i - offset, GROUND_Y)
        ctx.stroke()
      }

      // Draw road
      ctx.fillStyle = "#333"
      ctx.fillRect(0, GROUND_Y, canvas.width, 80)

      // Road markings
      ctx.strokeStyle = "#FFF"
      ctx.lineWidth = 3
      ctx.setLineDash([30, 20])
      ctx.beginPath()
      ctx.moveTo(0, GROUND_Y + 40)
      ctx.lineTo(canvas.width, GROUND_Y + 40)
      ctx.stroke()
      ctx.setLineDash([])

      // Moving road lines
      game.groundOffset += game.speed
      ctx.strokeStyle = "#555"
      ctx.lineWidth = 2
      for (let i = 0; i < canvas.width + 100; i += 100) {
        const x = i - (game.groundOffset % 100)
        ctx.beginPath()
        ctx.moveTo(x, GROUND_Y)
        ctx.lineTo(x, GROUND_Y + 80)
        ctx.stroke()
      }

      // Update and draw dogs
      game.dogs.forEach((dog) => {
        dog.x -= game.speed * 0.4 * dog.direction
        dog.legPhase += 0.3

        // Respawn dogs
        if (dog.x < -50 || dog.x > canvas.width + 100) {
          if (dog.direction === -1) {
            dog.x = canvas.width + 50
          } else {
            dog.x = -50
          }
          dog.direction = Math.random() > 0.3 ? -1 : 1
        }

        drawDog(dog)
      })

      // Spawn new dogs occasionally
      if (Math.random() < 0.005 && game.dogs.length < 5) {
        spawnDog()
      }

      // Update and draw vendors
      game.vendors = game.vendors.filter((vendor) => {
        vendor.x -= game.speed * 0.6
        if (vendor.x < -80) return false
        drawVendor(vendor)
        return true
      })

      // Spawn new vendors at intervals
      if (game.vendors.length < 4) {
        const lastVendor = game.vendors[game.vendors.length - 1]
        const minDistance = 300
        if (!lastVendor || lastVendor.x < canvas.width - minDistance) {
          spawnVendor()
        }
      }

      // Update and draw raindrops
      game.raindrops = game.raindrops.filter((drop) => {
        drop.y += drop.speed
        drop.x -= game.speed * 0.5
        if (drop.y > canvas.height) return false
        drawRaindrop(drop)
        return true
      })

      // Spawn obstacles
      obstacleTimer++
      if (obstacleTimer > 120 / (game.speed / 5)) {
        spawnObstacle()
        obstacleTimer = 0
      }

      // Update and draw obstacles
      game.obstacles = game.obstacles.filter((obstacle) => {
        obstacle.x -= game.speed
        if (obstacle.x < -50) return false
        drawObstacle(obstacle)
        return true
      })

      // Auto physics
      if (game.isJumping) {
        game.autoVelocityY += 0.8
        game.autoY += game.autoVelocityY
        if (game.autoY >= 0) {
          game.autoY = 0
          game.autoVelocityY = 0
          game.isJumping = false
        }
      }

      // Draw autorickshaw
      drawAutorickshaw(game.autoX, game.autoY)

      // Collision detection
      const autoHitbox = {
        x: game.autoX - 25,
        y: GROUND_Y - 45 + game.autoY,
        width: 70,
        height: 40,
      }

      for (const obstacle of game.obstacles) {
        let obstacleHitbox = { x: 0, y: 0, width: 0, height: 0 }

        switch (obstacle.type) {
          case "pothole":
            obstacleHitbox = { x: obstacle.x - 20, y: obstacle.y - 5, width: 40, height: 10 }
            break
          case "cow":
            obstacleHitbox = { x: obstacle.x - 30, y: obstacle.y - 40, width: 60, height: 40 }
            break
          case "traffic":
            obstacleHitbox = { x: obstacle.x - 10, y: obstacle.y - 35, width: 20, height: 35 }
            break
        }

        if (
          autoHitbox.x < obstacleHitbox.x + obstacleHitbox.width &&
          autoHitbox.x + autoHitbox.width > obstacleHitbox.x &&
          autoHitbox.y < obstacleHitbox.y + obstacleHitbox.height &&
          autoHitbox.y + autoHitbox.height > obstacleHitbox.y
        ) {
          setGameState("gameover")
          if (game.score > highScore) {
            setHighScore(game.score)
          }
        }
      }

      // Update score
      game.score++
      setScore(game.score)

      // Increase difficulty
      game.speed = 5 + Math.floor(game.score / 500) * 0.5

      // Weather indicator
      if (game.isRaining) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
        ctx.fillRect(10, 10, 100, 30)
        ctx.fillStyle = "#FFF"
        ctx.font = "14px Arial"
        ctx.fillText("🌧️ Drizzling", 20, 30)
      }

      animationId = requestAnimationFrame(gameLoop)
    }

    animationId = requestAnimationFrame(gameLoop)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [gameState, highScore])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-amber-100 to-orange-200 p-4">
      <h1 className="text-3xl md:text-4xl font-bold text-amber-800 mb-4 text-center">
        🛺 Autorickshaw Odyssey
      </h1>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="border-4 border-amber-600 rounded-lg shadow-2xl max-w-full"
          onClick={() => {
            if (gameState === "start" || gameState === "gameover") {
              startGame()
            } else {
              jump()
            }
          }}
        />

        {/* Score display */}
        <div className="absolute top-4 right-4 bg-black/50 text-white px-4 py-2 rounded-lg">
          <div className="text-lg font-bold">Score: {score}</div>
          <div className="text-sm">Best: {highScore}</div>
        </div>

        {/* Start screen */}
        {gameState === "start" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg">
            <div className="text-white text-center">
              <h2 className="text-3xl font-bold mb-4">🛺 Ready to Roll!</h2>
              <p className="text-lg mb-2">Navigate through the busy streets</p>
              <p className="text-sm mb-4 text-amber-300">Watch out for potholes, cows, and traffic cones!</p>
              <p className="text-xl animate-pulse">Tap or Press Space to Start</p>
            </div>
          </div>
        )}

        {/* Game over screen */}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg">
            <div className="text-white text-center">
              <h2 className="text-3xl font-bold mb-4 text-red-400">Game Over!</h2>
              <p className="text-2xl mb-2">Score: {score}</p>
              {score >= highScore && score > 0 && (
                <p className="text-yellow-400 text-lg mb-2">🏆 New High Score!</p>
              )}
              <p className="text-xl animate-pulse mt-4">Tap or Press Space to Restart</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-amber-700 text-center">
        <p className="text-sm">Press Space / Tap to Jump</p>
        <p className="text-xs mt-1 text-amber-600">Watch for the drizzle! 🌧️ Dogs roam the footpaths 🐕</p>
      </div>
    </div>
  )
}

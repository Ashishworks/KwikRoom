import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"
import { generateRoomCode } from "@/lib/generateRoomCode"

export async function POST() {
  try {
    let code = ""
    let exists = true

    while (exists) {
      code = generateRoomCode()

      const redisRoom =
        await redis.get(`room:${code}`)

      const dbRoom =
        await prisma.room.findUnique({
          where: { code }
        })

      exists = !!redisRoom || !!dbRoom
    }

    await redis.set(
      `room:${code}`,
      {
        code,
        users: 0,
        isPersistent: false
      },
      {
        ex: 60 * 30
      }
    )

    return NextResponse.json({
      success: true,
      code
    })

  } catch (error) {
    console.log(error)

    return NextResponse.json(
      {
        success: false
      },
      { status: 500 }
    )
  }
}

export function generateRoomCode() {

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

  let code = ""

  for (let i = 0; i < 5; i++) {

    code += chars[
      Math.floor(
        Math.random() *
        chars.length
      )
    ]

  }

  return code

}
export const serializeMessage = (
  message: any
) => ({

  id:
    typeof message.id === "bigint"
      ? message.id.toString()
      : message.id,

  username:
    message.senderName ||
    message.username,

  text:
    message.content ||
    message.text,

  createdAt:
    message.createdAt

})
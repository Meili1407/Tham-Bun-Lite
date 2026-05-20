import { messagingApi } from "@line/bot-sdk";

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const client = channelAccessToken
  ? new messagingApi.MessagingApiClient({
      channelAccessToken
    })
  : null;

export async function replyText(replyToken: string, text: string): Promise<void> {
  if (!client) {
    console.log("LINE reply placeholder", { replyToken, text });
    return;
  }

  await client.replyMessage({
    replyToken,
    messages: [{ type: "text", text }]
  });
}

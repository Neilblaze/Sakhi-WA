import { Client } from "whatsapp-web.js";
import { default as qrcode } from "qrcode-terminal";
import { ChatGPTAPI } from "chatgpt";
import { config } from "dotenv";
import { handleMessage } from "./chatGPT.js";

config();

if (!process.env.CHATGPT_API_KEY) {
  console.error("CHATGPT_API_KEY env variable is not set.");
  process.exit(1);
}

export const api = new ChatGPTAPI({
  apiKey: process.env.CHATGPT_API_KEY,
});

const client = new Client({});

client.on("qr", (qr) => {
  // Generate QR and scan this code with your device (phone)
  // QR তৈরি করুন এবং আপনার ডিভাইস (ফোন) দিয়ে এই কোডটি স্ক্যান করুন
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready!");
});

client.on("message_create", async (msg) => {
  try {
    await handleMessage(msg);
  } catch (e: any) {
    msg.reply(e.message);
  }
});

client.initialize();

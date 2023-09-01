import { api } from "./index.js";
import { default as WAWebJS } from "whatsapp-web.js";

// // https://stackoverflow.com/questions/75453346/error-connecting-chatgpt-api-to-discord-server
type Room = {
  parentMessageId: string;
};

let baseMsgID: string | undefined = undefined;
const rooms: Map<string, Room> = new Map();

// Rate limiting
const MAX_REQUESTS_PER_MINUTE = 10;
const REQUEST_INTERVAL = 60 * 1000; // 1 minute
const requestCounts: Map<string, number> = new Map();
const lastRequestTime: Map<string, number> = new Map();

export async function handleMessage(message: WAWebJS.Message) {
  const { command, args } = await getCommand(message.body);

  switch (command) {
    case "/sakhi":
      await cmdSakhi(message, args);
      return;
  }

  if (message.fromMe) return;

  const chat = await message.getChat();
  const room = rooms.get(chat.id.user);
  if (!room) {
    return;
  }

  chat.sendStateTyping();

  if (await canMakeRequest(chat.id.user)) {
    const reply = await api.sendMessage(message.body, {
      parentMessageId: room.parentMessageId,
    });
    message.reply("👩: " + reply.text);
    rooms.set(chat.id.user, {
      parentMessageId: reply.id,
    });
  } else {
    message.reply("Rate limit exceeded. Please try again later.");
  }
}

async function cmdSakhi(message: WAWebJS.Message, args: string[]) {
  const chat = await message.getChat();
  if (message.fromMe) {
    chat.sendStateTyping();

    const prompt = args.join(" ") + " (make it human readable, and return all content in বাংলা)";

    if (await canMakeRequest(chat.id.user)) {
      const reply = await api.sendMessage(prompt, {
        parentMessageId: baseMsgID,
      });

      baseMsgID = reply.id;
      message.reply("👩: " + reply.text);
    } else {
      message.reply("Rate limit exceeded. Please try again later.");
    }
    return;
  }

  if (args[0] === "on") {
    chat.sendStateTyping();
    if (await canMakeRequest(chat.id.user)) {
      const reply = await api.sendMessage(
        "hello, my name is " + chat.name,
      );

      rooms.set(chat.id.user, {
        parentMessageId: reply.id,
      });

      message.reply(
        "👩: Sakhi এখন থেকে আপনার বার্তার জবাব দেবে...\n👩: " +
          reply.text,
      );
    } else {
      message.reply("Rate limit exceeded. Please try again later.");
    }
  } else if (args[0] === "off") {
    chat.sendStateTyping();
    message.reply("👩: See you later..");
    rooms.delete(chat.id.user);
  }
}

async function getCommand(message: string) {
  const splt = message.split(" ");
  return { command: splt[0], args: splt.slice(1) };
}

async function canMakeRequest(userId: string): Promise<boolean> {
  const currentTime = Date.now();
  if (!lastRequestTime.has(userId) || currentTime - lastRequestTime.get(userId)! >= REQUEST_INTERVAL) {
    // Reset request count
    requestCounts.set(userId, 0);
    lastRequestTime.set(userId, currentTime);
  }
  const requestCount = requestCounts.get(userId) || 0;
  if (requestCount < MAX_REQUESTS_PER_MINUTE) {
    requestCounts.set(userId, requestCount + 1);
    return true;
  }
  return false;
}

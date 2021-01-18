/**
 * Grab some Telegram bot history so we get a channel id
 */

const { TelegramClient } = require('messaging-api-telegram');

// Load .env file https://www.npmjs.com/package/dotenv
require('dotenv').config();

// get accessToken from telegram [@BotFather](https://telegram.me/BotFather)
const client = new TelegramClient({
  accessToken: process.env.TELEGRAM_ACCESS_TOKEN,
});


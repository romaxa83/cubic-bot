const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');

// создаем бота
const bot = new TelegramBot(config.TELEGRAM_TOKEN, {
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10
        },
    }
});

module.exports.bot = bot;
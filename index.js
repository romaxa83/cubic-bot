const config = require('./config');
const csrf = require('csurf');
const express = require('express');
const app = express();
const exphbs = require('express-handlebars');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');
const flash = require('connect-flash');

const PORT = process.env.PORT || 3000;
const version = process.version;

const TelegramBot = require('node-telegram-bot-api');

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

// Middleware
const varMiddleware = require('./middleware/variables');

//----------------------------------------------------------------------
// настройка сессии для пользователя
const session = require('express-session');
const MongoStore = require('connect-mongodb-session')(session);

const store = new MongoStore({
    collection: 'sessions',	    // название таблицы для сохранение сессии
    uri: config.MONGODB_URI		// url для подключение к mongo
});

//настраиваем сессию
app.use(session({
    secret: config.SESSION_SECRET,	//строка на основе которой сессия будет шифроваться
    resave: false,
    saveUninitialized: false,
    store: store					// store для автоматичесого хранения сессии
}));

//---------------------------------------------------------------------
// flash сообщения
app.use(flash());
//----------------------------------------------------------------------
// для генерации csrf-ключей
// app.use(csrf());
//----------------------------------------------------------------------
// настраиваем handlebars
const hbs = exphbs.create({
    defaultLayout: 'main',
    extname: 'hbs',
    helpers: require('./utils/hbs-helpers')	// подключение собственных хелперов
});

app.engine('hbs', hbs.engine);	    // регистрируем handlebars
app.set('view engine', 'hbs');      // используем handlebars в express
app.set('views', 'views');	        // указываем где храняться шаблоны

//----------------------------------------------------------------------
app.use(express.urlencoded({extended: true})); // декодируем post-данные
//----------------------------------------------------------------------
// подключаем мидлевары
app.use(varMiddleware);
//----------------------------------------------------------------------
// подключаем и используем Route

const homeRoutes = require('./routes/home');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

app.use('/', homeRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
//----------------------------------------------------------------------

async function start()
{
    try {
        // подключаемся к базе данных
        await mongoose.connect(config.MONGODB_URI, {
            useNewUrlParser: true,
            useFindAndModify: false
        });

        // запускаем приложение
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`You use node - ${version}`);
            console.log(`MongoDB connection`);
            createAdmin('admin@admin.com', 'password', 'admin');
    });

    } catch (err) {
        console.log(err);
    }
}
start();

async function createAdmin(email,password,name)
{
    if(await User.findOne({email})){
        console.log(`Admin exists.`);
        return
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const user = new User({
        email, name, password: hashPassword});

    await user.save();

    console.log(`Admin created.`)
}
//=====================================================
// TELEGRAM_BOT

const request = require('request-promise');
const cheerio = require('cheerio');
const baseURL = 'https://multiplex.ua';
const Title = require('./models/cinema/title');
const moment = require('moment');

// проверка работы бота
bot.onText(/ping/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'pong');
});

bot.onText(/\/cinema/, (msg, [source, match]) => {
    const chatId = msg.chat.id;

    checkTitle();

    Title.findOne({'date': getDate()}).exec()
        .then((res) => {
                return inlineKeyboard(res.titles.items);
        })
        .then((res)=>{
            bot.sendMessage(chatId, 'cinema', {
                reply_markup: {inline_keyboard:res}
            });
        })
        .catch((err) => {
            bot.sendMessage(chatId, 'error');
        });

});

bot.on('callback_query',async query => {
     const {chat, message_id, text} = query.message;

     const titles = await Title.findOne({'date': getDate()});

    let title = '';

    titles.titles.items.forEach(function(item, key){
        if(query.data === item.url){
            title = item;
        }
    });

    if(title.poster === undefined){
        request.get(`${baseURL}${query.data}`)
            .then(function (response) {
                return uploadInfo(response, query.data)
            })
            .then(function (response) {
                const keyboard = inlineKeyboardSeans(response.timePrice);
                bot.sendPhoto(chat.id, `${baseURL}${response.poster}`,{
                    reply_markup: {inline_keyboard:keyboard}
                    });
                })
            .catch(function (err) {
                console.log(err);
            });
    } else {
        const keyboard = inlineKeyboardSeans(title.timePrice);
            bot.sendPhoto(chat.id, `${baseURL}${title.poster}`,{
                reply_markup: {inline_keyboard:keyboard}
            });
    }
});

// создаем документ с title , если его нету
async function checkTitle(){
    Title.findOne({'date': getDate()})
        .then(res => {
            if(res === null){
                const titleModel = new Title({date: getDate()});
                titleModel.save();

                console.log(`создан документ с title - ${getDate()}`);

                return titleModel;
            }

            return res;
        })
        .then(res => {
            if(res.titles.items.length === 0){
                uploadTitleToDocument();
            }
        })
}

// получаем html - страницу
async function uploadTitleToDocument() {

   request.get(`${baseURL}/cinema/kherson/fabrika`)
         .then((res) => {
             saveData(res)
         })
         .catch((err) => {
             throw err
         });
 }

// парсим со страницы title и сохраняем их
async function saveData(html){
    const $ = await cheerio.load(html);
    let title = [];

    $('.info > .title').each((index, el) => {
        // получаем названия фильмов
        title.push($(el).attr('title').toString());
    });

    // отсеиваем повторяющие значения
    title = title.filter((v, i, a) => a.indexOf(v) === i);
    if(title.length > 0){
        console.log('upload title to document');
        for(let i = 0; i < title.length; i++){
            let urlMoreInfo = $('a[title="' + title[i] + '"]').attr('href');
            saveTitle(title[i], urlMoreInfo);
        }
    } else {
        console.error('title is empty');
    }
}

// сохраняем title
async function saveTitle(title, url)
{
     const titleModel = await Title.findOne({'date': getDate()});
     titleModel.titles.items.push({title:title,url:url});
     await titleModel.save();
}

// кнопки с title для вывода
function inlineKeyboard(data){
    if(data){

        let keyboard = [];

        for(let i = 0; i < data.length; i++){
            keyboard.push([{
                text: data[i].title,
                callback_data: data[i].url
            }])
        }

        return keyboard;
    }

    return false;
}

// кнопки по сеансу по title
function inlineKeyboardSeans(data) {
    if(data){
        let keyboard = [];

        for(let i = 0; i < data.length; i++){
            keyboard.push([{
                text: `${data[i].time} (${data[i].priceLow} - ${data[i].priceHigh} гр.)`,
                callback_data: data[i].time
            }])
        };

        return keyboard;
    }

    return false;
}

// загружаем дополнительные данные по title
async function uploadInfo(data, title){

    const $ = await cheerio.load(data);
    const poster = $('.poster').attr('src');
    let timePrice = [];
    const seansDate = title.split('#').pop();
    $('[data-anchor = "'+ seansDate +'"]').filter('.ns').each(function(index,el){
        timePrice.push({
            priceLow: $(el).attr('data-low').substring(0, $(el).attr('data-low').length - 2),
            priceHigh: $(el).attr('data-high').substring(0, $(el).attr('data-high').length - 2),
            time: $(el).text().trim()
        });
    });


    const titles = await Title.findOne({'date': getDate()});
    let keyTitle = '';

    titles.titles.items.forEach(function(item, key){
        if(title === item.url){
            item.poster = poster;
            item.timePrice = timePrice;

            keyTitle = key;
        }
    });

    await titles.save();
    console.log(`save by ${title}`);
    return titles.titles.items[keyTitle];
}

// получаем текущую дату
function getDate() {
    return moment().format( 'MM-DD-YYYY');
}
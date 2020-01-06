const config = require('./config');
const express = require('express');
const app = express();
const exphbs = require('express-handlebars');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');

const PORT = process.env.PORT || 3000;
const version = process.version;

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
// подключаем и используем Route

const authRoutes = require('./routes/auth');

app.use('/', authRoutes);
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
            console.log(`Admin created`);
    });

    } catch (err) {
        console.log(err);
    }
}
start();

async function createAdmin(email,password,name)
{
    const hashPassword = await bcrypt.hash(password, 10);
    const user = new User({
        email, name, password: hashPassword});

    await user.save();
}
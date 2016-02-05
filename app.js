const session         = require('koa-session');
const koa             = require('koa');
const koaBody         = require('koa-body');
const mysql           = require('mysql-co');
const handlebars      = require('koa-handlebars');
const serve           = require('koa-static');
const config          = require('./config/web.json');

var app = koa();

// Изначально здесь была система с маршрутизацией, собранная через koa-compose, но, как выяснилось в самом конце,
// koa-sessions не работает в middleware. https://github.com/koajs/session/issues/33
// а времени на красивую реализацию уже не оставалось

app.keys = ['nGSlfmsdblo'];
app.use(session(app));

app.use(koaBody());

app.use(handlebars({
    extension:   ['html', 'handlebars'],
    viewsDir:    './'
}));

/**
 * Тут ловятся исключения во всех далее идущих генераторах
 */
app.use(function* handleErrors(next) {
    try {
        yield next;
    } catch (e) {
        this.status = e.status || 500;
        const context = { e: e };
        yield this.render('public/error', context);
        this.app.emit('error', e, this); // github.com/koajs/examples/blob/master/errors/app.js
    }
});

/**
 * / - это корень приложения, именно то место, куда у нас осуществляется доступ, поэтому все, кроме него, мы отправляем дальше
 */
app.use(function* home(next) {
    if (this.request.path !== '/') {
        return yield next;
    }
    if (this.session.hasAuth) {
        yield this.render('public/main', {login: this.session.login});
    } else this.redirect('/login'); // сработает только если пользователь не авторизован
});

/**
 * предоставляет доступ к БД. В тех случаях, когда она нужна.
 */
app.use(function* db(next) {
    if (this.request.path !== '/' || (this.session.hasAuth)) {
        this.connectionPool = mysql.createPool(config.db);
        this.db = yield this.connectionPool.getConnection();
        yield this.db.query(`SET SESSION sql_mode = 'TRADITIONAL'`);
        yield next;
        this.db.release();
    } else yield next;
});

/**
 * В случае успеха login перенаправляем пользователя в главную ветку.
 */

app.use(function* login(next) {
    if (this.request.path !== '/login') {
        return yield next;
    }
    if (this.request.method === 'GET') {
        yield this.render('public/index');
    }
    if (this.request.method !== 'POST') return;

    const inLogin = this.request.body.login;
    const inPassword = this.request.body.password;
    const result = yield this.db.query('select login, password from users where login = ?', inLogin);
    const users = result[0];
    if (users.count == 0)
        return this.status = 500;   // если не нашлось юзера с таким логином в базе
    var password = users[0].password;
    if (inPassword == password) {   // если пароли не совпадают
        this.session.hasAuth = true;
        this.session.login = inLogin;
        this.redirect('/');
    } else {
        return this.status = 500;
    }
});

/**
 * В случае отсутствия записей с таким login в базе проводим insert и редиректим к форме логина
 */

app.use(function* register(next) {
    if (this.request.path !== '/register') {
        return yield next;
    } else {
        const inLogin = this.request.body.login;
        const inPassword = this.request.body.password;
        const result = yield this.db.query('select count(*) as count from users where login = ?', inLogin);
        const users = result[0];
        if (users[0].count != 0) {
            this.status = 500;
        } else {
            yield this.db.query('INSERT INTO users set ?', {"login": inLogin, "password": inPassword});
            this.redirect('/');
        }
    }
});

/**
 * Всех разлогинивающихся редиректим на /login
 */

app.use(function* logout(next) {
    if (this.request.path !== '/logout') { // если это не logout, то следующие две строчки исполнены не будут
        return yield next;
    }
    this.session.hasAuth = false;
    this.redirect('/login');
});

/**
 * Предоставляем доступ к статическим файлам в public
 */
app.use(serve('public', { maxage: 1000*60*60 }));

/**
 * Ультимативно подсовываем 404, если не обработано ранее
 */
app.use(function* notFound(next) {
    yield next; // исключительно для подобия единообразия
    this.status = 404;
    yield this.render('public/404');
});

app.listen(3000);
console.log('listening on port 3000');

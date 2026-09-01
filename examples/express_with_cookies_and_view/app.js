import express from 'express';
import i18n from 'hmpo-i18n';
import cookieParser from 'cookie-parser';
import nunjucks from 'nunjucks';
import en from './locales/en/default.json' with { type: 'json' };
import cy from './locales/cy/default.json' with { type: 'json' };

const app = express();

app.use(cookieParser());

nunjucks.configure('views', {
    autoescape: true,
    express: app,
});
app.set('view engine', 'html');

i18n.middleware(app, {
    detect: true,
    resources: { en, cy },
    cookie: {
        name: 'lang',
        options: {
            maxAge: 86400000,
            httpOnly: true,
        },
    },
    fallbackLang: ['cy'],
});

app.get('/', (req, res) => {
    const title = req.translate('welcome.title');
    const welcomeMessage = req.translate('welcome.message');
    const notFoundMessage = req.translate('errors.notFound');
    const serverErrorMessage = req.translate('errors.serverError');

    res.render('index', {
        title,
        welcomeMessage,
        notFoundMessage,
        serverErrorMessage,
    });
});

app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});

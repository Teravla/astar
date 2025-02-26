const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const serve = require('koa-static');
const path = require('path');

const app = new Koa();
const router = new Router();
// Middleware pour servir les fichiers statiques dans /public
app.use(serve(path.join(__dirname, 'public')));

app.use(bodyParser());


app
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(5478, () => {
    console.log(`Server running on http://localhost:5478`);
});

var express = require('express.io')
  , swig = require('swig')
  , http = require('http')
  , path = require('path')
  , util = require('util')
  , Cookies = require( "cookies" );

var settings = require('./settings')
  , log = require('./lib/logger');

var env = process.env.NODE_ENV || 'development';
var app = module.exports = express();

// setup SWIG
var VIEWS_DIR = path.join(__dirname, 'views');

app.engine('html', swig.renderFile);
require('./lib/filters')(swig);

if(env == 'development'){
  swig.setDefaults({root: VIEWS_DIR, allowErrors: true, cache: false});
  app.use(require('morgan')("dev", { immediate: true }));
} else {
  swig.setDefaults({root: VIEWS_DIR, allowErrors: false, cache: "memory"});
};

app.set('view cache', false); // let swig handle the template cacheing
app.set('view options', { layout: false });
app.set('view engine', 'html');

app.set('port', process.env.PORT || settings.port);
app.set('views', VIEWS_DIR);

app.use(require('serve-favicon')(path.join(__dirname, 'public/img/favicon.ico')));
app.use(express.bodyParser());
app.use(require('method-override')());
app.use(Cookies.express(settings.session.key));
app.use(require('serve-static')(path.join(__dirname, 'public')));
app.use('/components', require('serve-static')(path.join(__dirname, 'bower_components')));

if(env = 'development'){
  app.use(require('errorhandler')({ dumpExceptions: true, showStack: true }));
} else {
  app.use(require('errorhandler')());
};

//var BackgroundTasks = new require('./middleware/background');
//BackgroundTasks.setOpts({app: app, key: 'availableFunds'});

// Routes
app.get('/ping', function(req,res) {return res.send(200);} );

app.use(require('./middleware/globals'));
app.use(require('./middleware/routes'));
// Must be last (catchall)
app.use(require('./middleware/errors'));

//BackgroundTasks.updateAvailableFunds(function(err, availableFunds) {
  http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
  });
//})

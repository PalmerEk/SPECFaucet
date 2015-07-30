var path = require('path')
	, express = require('express')
	, util = require("util")
	, url = require('url');

var app = module.exports = express();
var settings = require('../settings')

var _ = require('underscore');
_.s = require('underscore.string');
_.mixin(_.s.exports());

app.set('views', path.resolve(__dirname, '../views'));

app.all('*', setGlobals, setDefaults);

var day = (24*60*60*1000);
var cookieLife = {maxAge: (day*360), expires: new Date(Date.now() + (day*360))};

var coinRPC = require('node-dogecoin')()
		.set('host', settings.rpc.host)
		.set('port', settings.rpc.port)
		.auth(settings.rpc.user, settings.rpc.pass);

function setGlobals(req, res, next){
	res.locals.settings = settings;
	res.locals.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	res.locals.now = new Date();

	res.locals.payoutRange = {min: settings.payout.bracket[0].amt, max: settings.payout.bracket[settings.payout.bracket.length-1].amt};  	
	res.locals.address = _.isUndefined(req.cookies.get('lastAddress')) ? '' : req.cookies.get('lastAddress')

	coinRPC.getBalance(function(err, balance) {
		console.log(balance);
		res.locals.faucetBalance = balance;
		next();
	});
};

function setDefaults(req, res, next){
	res.locals.meta = {
		title: settings.site.name
		, description: settings.site.subtitle
	};

  next();
};


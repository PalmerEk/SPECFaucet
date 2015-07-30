var path = require('path')
	, express = require('express')
	, util = require("util")
	, url = require('url')
	, fs = require('fs')
	, crypto = require('crypto')
  , ini = require('ini');

var settings = require('../settings')
var coinConfig = ini.parse(fs.readFileSync( path.resolve(process.env['HOME'], '.bunnycoin/bunnycoin.conf'), 'utf-8'));
var coinRPC = require('node-dogecoin')({port: settings.rpc.port, user: coinConfig.rpcuser, pass: coinConfig.rpcpassword})

var app = module.exports = express();

var _ = require('underscore');
_.s = require('underscore.string');
_.mixin(_.s.exports());

var CryptoMath = require('../lib/CryptoMath');

app.set('views', path.resolve(__dirname, '../views'));

app.get('/', captureReferrer, showWelcome);

var day = (24*60*60*1000);
var cookieLife = {maxAge: (day*360), expires: new Date(Date.now() + (day*360))};

function captureReferrer(req, res, next) {
  // If we were referred and we don't already have a referrer, set it. 
  if(req.query.r && (settings.payout.referralPct > 0 || settings.payoutSingleCoin.referralPct > 0)  && _.isUndefined(req.cookies.get('referrer'))) {
  	var referrer = res.locals.referrer =_.s.trim(req.query.r);
		req.cookies.set('referrer', referrer, cookieLife);
		next();
  } else {
  	res.locals.referrer = req.cookies.get('referrer');
  	next();
  }
}

function showWelcome(req, res, next) {
	res.render("index");
}

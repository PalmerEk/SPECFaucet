var path = require('path')
	, express = require('express')
	, util = require("util")
	, url = require('url')
	, fs = require('fs')
	, crypto = require('crypto')
  , ini = require('ini');

var NoCaptcha = require('no-captcha');

var app = module.exports = express();

var _ = require('underscore');
_.s = require('underscore.string');
_.mixin(_.s.exports());
var moment = require('moment');

var CryptoMath = require('../lib/CryptoMath');

app.set('views', path.resolve(__dirname, '../views'));

app.get('/', captureReferrer, validateFrequency, showFaucet);
app.post('/', validateCaptcha, validateAddress, validateFrequency, dispense, showFaucet);


var day = (24*60*60*1000);
var cookieLife = {maxAge: (day*360), expires: new Date(Date.now() + (day*360))};

function captureReferrer(req, res, next) {
  // If we were referred and we don't already have a referrer, set it. 
  if(req.query.r && (settings.payout.referralPct > 0)  && _.isUndefined(req.cookies.referrer)) {
  	var referrer = _.s.trim(req.query.r);

  	coinRPC.validateaddress(referrer, function(err, info) {
		if(info && info.isvalid) {
			res.cookie('referrer', referrer, cookieLife);
			res.locals.referrer = referrer;
		}
		next();
	})
  } else {
  	res.locals.referrer = req.cookies.referrer;
  	next();
  }
}

function showFaucet(req, res, next) {
	var nocaptcha = new NoCaptcha(settings.recaptcha.key, settings.recaptcha.secret);

	res.render("index", {
		recaptcha_form: nocaptcha.toHTML()
	});
}

function validateCaptcha(req, res, next) {
	var data = {
        remoteip:  res.locals.ip,
        response: req.body['g-recaptcha-response'],
    };

    var nocaptcha = new NoCaptcha(settings.recaptcha.key, settings.recaptcha.secret, data);

    nocaptcha.verify(data, function(err, success) {
    	res.captchaPassed = success;
    	if(!success) res.locals.error = "Captcha Invalid.  Please Try Again!"
    	next();
    });
}

function validateAddress(req, res, next) {
	res.locals.address = _.s.trim(req.body.address);
	coinRPC.validateaddress(res.locals.address, function(err, info) {
		var isValid = info && info.isvalid;
		res.addressValid = isValid;

		res.locals.referralURL = util.format('%s?r=%s', req.headers.host, res.locals.address);
		if(isValid) {
			res.cookie('lastAddress', res.locals.address, cookieLife);
		} else {
			res.locals.error = "Invalid Wallet Address";
		}
		next();
	})
}

function validateFrequency(req, res, next) {
	// TODO:
	db.getTimeUntilNextDispense(res.locals.address, res.locals.ip, function(err, lastDispense) {
		var nextDispense = moment(lastDispense || 0).add(settings.payout.frequency, 'minutes');
		if(moment().isBefore(nextDispense)) {
			res.locals.nextDispense = nextDispense;
			res.locals.error = "Too Soon!  Come back in " + moment(res.locals.nextDispense).fromNow();
		}

		next();
	});
}

function dispense(req, res, next) {
	if(res.locals.error) return next();

	var bracketOdds = 0;
	res.locals.dispenseAmt = settings.payout.bracket[0].amt;
	res.locals.luckyNumber = Math.random() * 100;
	var payoutModifier = 1;

	if(settings.payout.adblockPenalty && settings.payout.adblockPenalty > 0) {
		if(req.body.adblockdetection === "0") payoutModifier = ((100-settings.payout.adblockPenalty)/100);
	}

	for(x = 0; x < settings.payout.bracket.length; x++) {
		bracketOdds += settings.payout.bracket[x].odds
		if(res.locals.luckyNumber < bracketOdds) {
			res.locals.dispenseAmt = (settings.payout.bracket[x].amt * payoutModifier);
			break;
		}
	}

	res.locals.referalDispenseAmt = _.isUndefined(req.cookies.referrer) ? 0 : res.locals.dispenseAmt * (settings.payout.referralPct/100) ;
	
	// Pay the man
	sendPayment(res.locals.address, res.locals.dispenseAmt, '', '', function(err, txid) {
		if(err) {
			res.locals.error = "Error dispenseing, please try again."
			return next();
		}

		res.locals.success = true;
		res.locals.txid = txid;
		res.locals.nextDispense = moment().add(settings.payout.frequency, 'minutes');

		// and the man's man if need be (in the background)
		sendPayment(req.cookies.referrer, res.locals.referalDispenseAmt, 'referal payment', res.locals.address, function(err, refTxid) {
			db.recordDispense(res.locals.address, res.locals.ip, res.locals.dispenseAmt, txid, req.cookies.referrer, refTxid, function(err, Txn) {
				next();
			})
		});
	});
}

function sendPayment(addr, amt, comment, commentTo, callback) {
	callback = callback || function () {};

	if(amt <= 0) return callback(null, null);

	coinRPC.sendtoaddress(addr, amt, comment, commentTo, callback);
}

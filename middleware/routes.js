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

var CryptoMath = require('../lib/CryptoMath');

app.set('views', path.resolve(__dirname, '../views'));

app.get('/', captureReferrer, validateFrequency, showFaucet);
app.post('/', validateCaptcha, validateAddress, validateFrequency, dispense, showFaucet);


var day = (24*60*60*1000);
var cookieLife = {maxAge: (day*360), expires: new Date(Date.now() + (day*360))};

function captureReferrer(req, res, next) {
  // If we were referred and we don't already have a referrer, set it. 
  if(req.query.r && (settings.payout.referralPct > 0 || settings.payoutSingleCoin.referralPct > 0)  && _.isUndefined(req.cookies.referrer)) {
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
	console.log('validating captcha')
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

		res.locals.referralURL = util.format('%s?r=%s', settings.site.url, res.locals.address);
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
	db.getTimeUntilNextDispence(res.locals.address, res.locals.ip, function(err, secondsLeft) {

	});
	next();
	/*
	db.getTimeUntilNextDispence(res.locals.address, res.locals.ip, function(err, row, fields) {
		if(row) {
			res.locals.error = "Too Soon!  Come back in " + row.remainingTime;
			res.locals.nextDispense = row.nextDispense;
		}
		next();
	});
	*/
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
	next();
/*
	db.dispense(res.locals.address, res.locals.ip, res.locals.dispenseAmt, res.locals.referrer, function(err, success) {
		res.locals.success = success;

		if(success) {
			db.getUserBalance(res.locals.address, function(err, balance) {
				res.locals.userBalance = balance;
				next();
			});
		} else {
			res.locals.error = "Error dispenseing, please try again."
			next()
		}
	});
*/
/*
	db.users.find({$or: [{key:req.ip},{key:req.body.address}] },function(err,users){
			if (err) {
				//Error!
				console.log('Database error',err);
				_failure(req,res,'Database error');
				return;
			} else if (users && _limitExceeded(users)) {
				//User exists by IP or coin address and one or the other has exceeded the max # of entries
				console.log('User exceeded limit',req.ip,req.body.address);
				_failure(req,res,'You have exceeded your limit');
				return;
			}
			// Now see if the address is valid
			client.validateAddress(req.body.address,function(err,response){
					console.log('validateAddress',req.body.address,response);
					if (err) {
						//Error
						console.log(err);
						_failure(req,res,'Unable to validate address');
					} else if (!iz.required(response.isvalid) || response.isvalid === false) {
						//Invalid
						_failure(req,res,'Please enter a valid address');
					} else {
						//Address is valid. Queue this entry.
						processor.queue(req.ip,req.body.address,function(err,result){
							if (err) {
								//Error
								console.log('Database error',err);
								_failure(req,res,'Failed to create record');
							} else {
								// Yay! User is now entered in the queue.
								_success(req,res,'You are now entered!');
							}
						});
					}
				});

			
		});
*/
}



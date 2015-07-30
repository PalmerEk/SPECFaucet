var settings = require('../settings')
	, util = require('util')
	,	path = require('path')
	, CryptoMath = require('../lib/CryptoMath');

var _ = require('underscore');
_.s = require('underscore.string');
_.mixin(_.s.exports());

var moment = require('moment');

module.exports = function(swig) {
	swig.setFilter('stringify', stringify);
	swig.setFilter('truncatechars', truncatechars);
	swig.setFilter('humanizeDuration', humanizeDuration);
	swig.setFilter('humanizeCrypto', humanizeCrypto);
	swig.setFilter('cryptoRound', cryptoRound);
}

function stringify (obj) {
	return JSON.stringify(obj);
};

function truncatechars(string, chars) {
	return _.s.truncate(string, chars, "...");
};

function humanizeDuration(length, interval) {
	return moment.duration(length, interval).humanize();
}

function humanizeCrypto(value) {
	return _.s.numberFormat(value, 8, '.', ",");
}

function cryptoRound(value) {
	return CryptoMath.round(value).toFixed(8);
}
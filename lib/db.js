var Datastore = require('nedb');

module.exports =  {
	transactions: new Datastore({filename:"faucet.db",autoload:true}), 

    // last dispense for address/ip - dispense interval
    getTimeUntilNextDispence: function(address, ip, callback) {
        callback = callback || function () {};

        this.transactions.find({$or: [{address:address},{ip:ip}]}).sort({ts: -1}).exec(function (err,transactions){
            if (err) {
                console.log('Database error',err);
                _failure(req,res,'Database error');
                return;
            } else if (transactions) {
                console.log(transactions)
                return callback(err, transactions);
            } else {
                console.log("Not Found");
                return 0;
            }
        });
    },

    recordDispense: function(address, ip, dispenseAmt, transactionID, referrer, referralTransactionID, callback) {
        callback = callback || function () {};

        var txn = {
            address: address,
            ts: new Date(),
            ip: ip,
            amount: dispenseAmt,
            referrer: referrer,
            txid: transactionID,
            referral_txid: referralTransactionID
        }

        this.transactions.insert(txn, function(err, newTxn) {
            if(err) {
                console.error('Failed to record transaction: ', txn);
            }

            console.log(newTxn);
            return callback(err, newTxn);
        })
    }
}

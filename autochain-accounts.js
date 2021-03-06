/**

@module esinee:accounts
*/



/**
The accounts collection, with some autochain additions.

@class AtcAccounts
@constructor
*/
var collection = new Mongo.Collection('ethereum_accounts', {connection: null});
AtcAccounts = _.clone(collection);
AtcAccounts._collection = collection;


if(typeof PersistentMinimongo !== 'undefined')
    new PersistentMinimongo(AtcAccounts._collection);



/**
Updates the accounts balances, by watching for new blocks and checking the balance.

@method _watchBalance
*/
AtcAccounts._watchBalance = function(){
    var _this = this;

    if(this.blockSubscription) {
        this.blockSubscription.stopWatching();
    }

    // UPDATE SIMPLE ACCOUNTS balance on each new block
    this.blockSubscription = web3.eth.filter('latest');
    this.blockSubscription.watch(function(e, res){
        if(!e) {
            _this._updateBalance();
        }
    });
};

/**
Updates the accounts balances.

@method _updateBalance
*/
AtcAccounts._updateBalance = function(){
    var _this = this;

    _.each(AtcAccounts.find({}).fetch(), function(account){
        web3.eth.getBalance(account.address, function(err, res){
            if(!err) {
                if(res.toFixed) {
                    res = res.toFixed();
                }

                AtcAccounts.update(account._id, {
                    $set: {
                        balance: res
                    }
                });
            }
        });
    });
}

/**
Updates the accounts list,
if its finds a difference between the accounts in the collection and the accounts in the accounts array.

@method _addAccounts
*/
AtcAccounts._addAccounts = function(){
    var _this = this;

    // UPDATE normal accounts on start
    web3.eth.getAccounts(function(e, accounts){
        if(!e) {
            var visibleAccounts = _.pluck(AtcAccounts.find().fetch(), 'address');

            if(!_.isEmpty(accounts) &&
                _.difference(accounts, visibleAccounts).length === 0 &&
                _.difference(visibleAccounts, accounts).length === 0)
                return;


            var localAccounts = AtcAccounts.findAll().fetch();

            // if the accounts are different, update the local ones
            _.each(localAccounts, function(account){

                // needs to have the balance
                if(!account.balance)
                    return;

                // set status deactivated, if it seem to be gone
                if(!_.contains(accounts, account.address)) {
                    AtcAccounts.updateAll(account._id, {
                        $set: {
                            deactivated: true
                        }
                    });
                } else {
                    AtcAccounts.updateAll(account._id, {
                        $unset: {
                            deactivated: ''
                        }
                    });
                }

                accounts = _.without(accounts, account.address);
            });

            // ADD missing accounts
            var accountsCount = visibleAccounts.length + 1;
            _.each(accounts, function(address){

                web3.eth.getBalance(address, function(e, balance){
                    if(!e) {
                        if(balance.toFixed) {
                            balance = balance.toFixed();
                        }

                        web3.eth.getCoinbase(function(e, coinbase){
                            var doc = AtcAccounts.findAll({
                                address: address,
                            }).fetch()[0];

                            var insert = {
                                type: 'account',
                                address: address,
                                balance: balance,
                                name: (address === coinbase) ? 'Main account (Atcbase)' : 'Account '+ accountsCount
                            };

                            if(doc) {
                                AtcAccounts.updateAll(doc._id, {
                                    $set: insert
                                });
                            } else {
                                AtcAccounts.insert(insert);
                            }

                            if(address !== coinbase)
                                accountsCount++;
                        });
                    }
                });

            });
        }
    });
};



/**
Builds the query with the addition of "{deactivated: {$exists: false}}"

@method _addToQuery
@param {Mixed} arg
@param {Object} options
@param {Object} options.includeDeactivated If set then de-activated accounts are also included.
@return {Object} The query
*/
AtcAccounts._addToQuery = function(args, options){
    var _this = this;

    options = _.extend({
        includeDeactivated: false
    }, options);

    var args = Array.prototype.slice.call(args);

    if(_.isString(args[0])) {
        args[0] = {
            _id: args[0], 
        };
    }
    else if (!_.isObject(args[0])) {
        args[0] = {};
    }

    if (!options.includeDeactivated) {
        args[0] = _.extend(args[0], {
            deactivated: {$exists: false}
        });
    }

    return args;
};


/**
Find all accounts, besides the deactivated ones

@method find
@return {Object} cursor
*/
AtcAccounts.find = function(){    
    return this._collection.find.apply(this, this._addToQuery(arguments));
};

/**
Find all accounts, including the deactivated ones

@method findAll
@return {Object} cursor
*/
AtcAccounts.findAll = function() {
    return this._collection.find.apply(this, this._addToQuery(arguments, {
        includeDeactivated: true
    }));
}

/**
Find one accounts, besides the deactivated ones

@method findOne
@return {Object} cursor
*/
AtcAccounts.findOne = function(){
    return this._collection.findOne.apply(this, this._addToQuery(arguments));
};

/**
Update accounts, besides the deactivated ones

@method update
@return {Object} cursor
*/
AtcAccounts.update = function(){
    return this._collection.update.apply(this, this._addToQuery(arguments));
};

/**
Update accounts, including the deactivated ones

@method updateAll
@return {Object} cursor
*/
AtcAccounts.updateAll = function() {
    return this._collection.update.apply(this, this._addToQuery(arguments, {
        includeDeactivated: true
    }));
}

/**
Update accounts, including the deactivated ones

@method upsert
@return {Object} cursor
*/
AtcAccounts.upsert = function() {
    return this._collection.upsert.apply(this, this._addToQuery(arguments, {
        includeDeactivated: true
    }));
}


/**
Starts fetching and watching the accounts

@method init
*/
AtcAccounts.init = function() {
    var _this = this;

    if(typeof web3 === 'undefined') {
        console.warn('AtcAccounts couldn\'t find web3, please make sure to instantiate a web3 object before calling AtcAccounts.init()');
        return;
    }

    Tracker.nonreactive(function(){

        _this._addAccounts();

        _this._updateBalance();
        _this._watchBalance();

        // check for new accounts every 2s
        Meteor.clearInterval(_this._intervalId);
        _this._intervalId = Meteor.setInterval(function(){
            _this._addAccounts();
        }, 2000);

    });
};

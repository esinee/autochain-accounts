Package.describe({
  name: 'esinee:autochain-accounts',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: 'autochain-accounts tools',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/esinee/autochain-accounts',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.3.2.4');
  api.use('ecmascript');
  api.use('meteor');
  api.use('underscore@1.0.1');
  api.use('mongo@1.0.8');
  api.use('frozeman:persistent-minimongo@0.1.8');
  api.use('ethereum:web3@0.15.1');
  api.mainModule('autochain-accounts.js');
  if(api.export)
      api.export('AtcAccounts');
});

//Package.onTest(function(api) {
//  api.use('ecmascript');
//  api.use('tinytest');
//  api.use('autochain-accounts');
//  api.mainModule('autochain-accounts-tests.js');
//});

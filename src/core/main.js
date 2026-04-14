// #####################################################################
// MAIN.js
// #####################################################################

const surf = require('path');
const include = require('./include.js');
const browserapp = surf.join(__dirname, 'app.js');

const files = [
    surf.join('build.js'),
    surf.join('browser',  'constants.js'),
    surf.join('browser',  'variables.js'),
    surf.join('browser',  'arguments.js'),
    surf.join('browser',  'configs.js'),
    surf.join('browser',  'switches.js'),
    surf.join('browser',  'arrays.js'),
    surf.join('browser',  'objects.js'),
    surf.join('browser',  'surfvalues.js'),
    surf.join('browser',  'ipc.js'),
    surf.join('browser',  'functions.js'),
    surf.join('browser',  'functions', 'tor.js'),
    surf.join('browser',  'functions', 'bookmarks.js'),
    surf.join('browser',  'functions', 'crypto.js'),
    surf.join('browser',  'functions', 'privacy.js'),
    surf.join('browser',  'functions', 'websecurity.js'),
    surf.join('browser',  'functions', 'webscan.js'),
    // Spoofing
    surf.join('security', 'strict.js'),
    surf.join('privacy',  'profiles.js'),
    surf.join('privacy',  'spoof.js'),
    surf.join('browser',  'special.js'),
    // Security, privacy
    surf.join('security', 'webscanner.js'),
    // Main logic
    surf.join('browser',  'webpreferences.js'),
    surf.join('browser',  'browserview.js'),
    surf.join('browser',  'on.js'),
    // Animation
    surf.join('animate',  'ease.js'),
    surf.join('animate',  'animateBrowserView.js'),   
];

include.js(files, browserapp, { watch: true, debug: false, backup: false });

require('./app.js');

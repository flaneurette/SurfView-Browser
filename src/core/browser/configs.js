// #####################################################################
// CONFIGS
// #####################################################################

// configs that cannot be anywhere else.
// must be set after all other includes.

// add to arguments.
torChromeArgs.push('--proxy-server='+torAddress +':'+torPort);

// add to arguments.
torArgs.push('--SocksPort', torPort);
torArgs.push('--DataDirectory', torDataDir);
torArgs.push('--GeoIPFile', geoipPath);
torArgs.push('--GeoIPv6File', geoip6Path);


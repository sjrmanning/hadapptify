var config = {};
module.exports = config;

config.port = 3000;
config.spotify_user = 'SPOTIFY_USER_NAME_OR_FACEBOOK_EMAIL';
config.spotify_password = 'PASSWORD';
config.spotify_options = {
    settingsFolder: 'settings',
    cacheFolder: 'cache',
    traceFile: 'trace.txt',
    appkeyFile: 'spotify_appkey.key'
};

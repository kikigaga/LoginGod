var express = require('express');
var passport = require('passport');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var OpenIDConnectStrategy = require('passport-idaas-openidconnect').IDaaSOIDCStrategy;
var app = express();
app.use(cookieParser());
app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
   done(null, user);
});

passport.deserializeUser(function(obj, done) {
   done(null, obj);
});
var services = JSON.parse(process.env.VCAP_SERVICES || "{}");
var ssoConfig = services.SingleSignOn[0];
var client_id = ssoConfig.credentials.clientId;
var client_secret = ssoConfig.credentials.secret;
var authorization_url = ssoConfig.credentials.authorizationEndpointUrl;
var token_url = ssoConfig.credentials.tokenEndpointUrl;
var issuer_id = ssoConfig.credentials.issuerIdentifier;
var callback_url = 'http://logingod.mybluemix.net/auth/sso/callback';

var OpenIDConnectStrategy = require('passport-idaas-openidconnect').IDaaSOIDCStrategy;
var Strategy = new OpenIDConnectStrategy({
        authorizationURL : authorization_url,
        tokenURL : token_url,
        clientID : client_id,
        scope: 'openid',
        response_type: 'code',
        clientSecret : client_secret,
        callbackURL : callback_url,
        skipUserProfile: true,
        issuer: issuer_id
    }, function(accessToken, refreshToken, profile, done) {
        process.nextTick(function() {
        profile.accessToken = accessToken;
        profile.refreshToken = refreshToken;
        done(null, profile);
    });
});

passport.use(Strategy);
app.get('/login', passport.authenticate('openidconnect', {}));

function ensureAuthenticated(req, res, next) {
    if(!req.isAuthenticated()) {
        req.session.originalUrl = req.originalUrl;
        res.redirect('/login');
    } else {
        return next();
    }
}
app.get('/hello', ensureAuthenticated, function(request, response) {
    request.send('Hello, '+ request.user['id'] + '!\n' + '<a href="/logout">Log Out</a>');
});
app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});
app.get('/failure', function(req, res) {
    res.send('Login failed');
});
app.get('/', function (req, res) {
    res.send('<h1>Bluemix Service: Single Sign On</h1>' + '<p>Sign In with a Social Identity Source (SIS): Cloud directory, Facebook, Google+ or LinkedIn.</p>' + '<a href="/auth/sso/callback">Sign In with a SIS</a>');
});

var appport = process.env.VCAP_APP_PORT || 8888;
var host = (process.env.VCAP_APP_HOST || 'localhost');
var server = app.listen(appport, function () {
    var host = server.address().address
    var port = server.address().port
    console.log('Example app listening at http://%s:%s', host, port);
});

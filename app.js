/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var config = require('./config.js');
var multer = require('multer');
var storage = multer.memoryStorage();
var upload = multer({ storage: storage }).single('itunesXmlFile');
var bodyParser = require('body-parser');

var XMLParser = require('./models/XMLParser');
var parser;

var client_id = config.client_id;
var client_secret = config.client_secret;
var redirect_uri = config.redirect_uri;

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public')).use(cookieParser());
app.use(bodyParser.json());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token;
        var refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});


app.post('/upload', function(req, res) {
  upload(req, res, function(err) {
    if(err) {
      console.log('Error reading uploaded file');
      res.sendStatus(400);
    }

    parser = new XMLParser();
    parser.parseBuffer(req.file.buffer, function(err) {
      if(err) {
        throw err;
      }
      parser.getPlaylists();
      parser.getTracks();
      res.json(parser._playlists);
    });
  });
});


app.get('/:playlist/tracks', function(req, res) {
  var playlist = parser.getPlaylistByName(req.params.playlist);
  var tracks = [];

  if(playlist === undefined) {
    return res.sendStatus(404);
  }

  playlist._trackIds.forEach(function(id) {
    tracks.push(parser.getTrackById(id));
  });

  res.json(tracks);
});


app.post('/:playlist/export', function(req, res) {
  var playlist = parser.getPlaylistByName(req.params.playlist);
  var user = req.body.user;
  var accessToken = req.body.access_token;
  var searchEndpoint = 'https://api.spotify.com/v1/search?q=';
  var result = [];
  var tracksToAdd = [];

  if(playlist === undefined) {
    return res.sendStatus(404);
  }

  // create playlist
  var authOptions = {
    url: 'https://api.spotify.com/v1/users/' + user + '/playlists',
    headers: { 'Authorization': 'Bearer ' + accessToken },
    body: JSON.stringify({name: playlist._name, public: false}),
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!body.error) {
      // playlist created OK, now add the tracks
      var playlistId = body.id;

      // use promises so we can wait until all track search requests are complete
      // => allows us to access the calling object i.e. no need for var self = this;
      // we need to use .map because .forEach doesn't return anything and cannot support chaining
      var addTrackRequests = playlist._trackIds.map((item) => {
        return new Promise((resolve) => {
          var track = parser.getTrackById(item);
          // console.log(track);
          result.push(track);
          var url = searchEndpoint + track.toString() + '&type=track';

          console.log(url);

          request.get(url, function(error, response, body) {
            if(!body.error) {
              // console.log(body);
              var jsonResponse = JSON.parse(body);

              if(jsonResponse.tracks.items.length > 0) {
                track._spotifyUri = jsonResponse.tracks.items[0].uri;
                tracksToAdd.push(track._spotifyUri);
              }
            }

            resolve();
          });
        });
      });

      // when all track promises have completed add to the playlist
      Promise.all(addTrackRequests).then(function() {
        var playlistOptions = {
          url: 'https://api.spotify.com/v1/users/' + user + '/playlists/' + playlistId + '/tracks',
          headers: { 'Authorization': 'Bearer ' + accessToken },
          body: JSON.stringify({ uris: tracksToAdd.slice(0, 99) }),
          json: true
        };

        var i = 0;

        request.post(playlistOptions, function(error, response, body) {
          console.log(++i, body);
          
          if(!body.error) {
            res.status(201).send(result);
          }
        });
      });
    }

    // res.sendStatus(400);
  });
});


console.log('Listening on 8888');
app.listen(8888);

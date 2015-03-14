var express = require('express');
var router = express.Router();
var client = require('../lib/client');
var api = require('./api');
var tracks = require('./tracks');
var chat = require('../lib/chat');

// Home view
router.get('/', function(req, res) {
    // Ensure user is logged in first.
    if (req.session && !req.session.user) {
        return res.redirect('/login');
    }

    client.queue._elements.sort(function (a, b) {
        if (a.votes === b.votes) {
            if (a.votes === 0) {
                return a.added_at - b.added_at;
            }
            else {
                return a.last_voted_at - b.last_voted_at;
            }
        }
        else {
            return b.votes - a.votes;
        }
    });

    var params = {
        queue: client.queue,
        now_playing: client.now_playing,
        username: req.session.user,
        active_users: client.active_users,
        chatlog: chat.chatlog
    };

    if (req.query.search) {
        client.search(req.query.search, function (result) {
            params.tracks = result.tracks;
            res.render('index', params);
        });
    }
    else {
        res.render('index', params);
    }
});

// Login
router.get('/login', function (req, res) {
    if (req.query.user) {
        // Login here and redirect.
        var user = req.query.user;
        req.session.user = user;
        client.active_users.push(user);
        return res.redirect('/');
    }

    res.render('login');
});

// API methods
router.route('/api/add_track/:track_id').get(api.add_track);
router.route('/api/upvote_track/:track_id').get(api.upvote_track);
router.route('/api/search/:search_string').get(api.search);
router.route('/api/queue').get(api.queue);
router.route('/api/skip_track').get(api.skip_track);
router.route('/api/pause').get(api.pause);

// Tracks methods
router.route('/tracks/add/:track_id').get(tracks.add_track);
router.route('/tracks/upvote/:track_id').get(tracks.upvote_track);

module.exports = router;

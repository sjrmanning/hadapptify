var express = require('express');
var router = express.Router();
var client = require('../lib/client');
var api = require('./api');
var tracks = require('./tracks');

// Home view
router.get('/', function(req, res) {
    // Ensure user is logged in first.
    if (req.session && !req.session.user) {
        return res.redirect('/login');
    }

    client.queue._elements.sort(function (a, b) {
        if (a.votes === 0 && b.votes === 0) {
            return b.added_at - a.added_at;
        }
        if (a.votes === b.votes) {
            return a.last_voted_at - b.last_voted_at;
        }
        return b.votes - a.votes;
    });

    var params = {
        queue: client.queue,
        now_playing: client.now_playing,
        username: req.session.user,
        active_users: client.active_users
    };

    if (req.param('search')) {
        client.search(req.param('search'), function (result) {
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
    if (req.param('user')) {
        // Login here and redirect.
        var user = req.param('user');
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

// Tracks methods
router.route('/tracks/add/:track_id').get(tracks.add_track);
router.route('/tracks/upvote/:track_id').get(tracks.upvote_track);

module.exports = router;

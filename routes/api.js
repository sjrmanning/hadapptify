var client = require('../lib/client');

module.exports.add_track = function (req, res, next) {
    client.addTrack(req.params.track_id, req.session.user, function (result) {
        res.json(result);
    });
};

module.exports.upvote_track = function (req, res, next) {
    client.upvoteTrack(req.params.track_id, req.session.user, function (result) {
        res.json(result);
    });
};

module.exports.search = function (req, res, next) {
    client.search(req.params.search_string, function (result) {
        result.tracks.forEach(function (track) {
            client.queue.enq({votes: 2, track: track});
        });
        res.json(result);
    });
};

module.exports.queue = function (req, res, next) {
    res.json(client.queue);
};

module.exports.skip_track = function (req, res, next) {
    client.skipTrack(req.session.user, function (result) {
        res.json(result);
    });
};

module.exports.pause = function (req, res, next) {
    client.pausePlay(function (result) {
        res.json(result);
    });
};

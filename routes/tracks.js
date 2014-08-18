var client = require('../lib/client');

module.exports.add_track = function (req, res, next) {
    client.addTrack(req.params.track_id, req.session.user, function (result) {
        res.redirect('/');
    });
};

module.exports.upvote_track = function (req, res, next) {
    client.upvoteTrack(req.params.track_id, req.session.user, function (result) {
        res.redirect('/');
    });
};

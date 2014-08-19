var config = require('../config');
var spotify = require('node-spotify')(config.spotify_options);
var PriorityQueue = require('priorityqueuejs');
var _ = require('underscore');
var levelup = require('level');
var db = levelup('./db/hadapptify_db', {
    valueEncoding: 'json'
});

active_users = module.exports.active_users = [];

queue = module.exports.queue = new PriorityQueue(function (a, b) {
    if (a.votes === b.votes) {
        return b.added_at - a.added_at;
    }

    return a.votes - b.votes;
});

now_playing = module.exports.now_playing = null;

var cachedTracks = {};
var playingElement = null;

init = module.exports.init = function (callback) {
    var ready = function () {
        console.log('node-spotify ready.');
        callback();

        // Load any existing queue.
        db.get('queue', function (err, value) {
            if (err || !value) {
                return console.log('No existing queue found.');
            }

            console.log('Loading existing queue.');
            for (var i = 0; i < value.length; i++) {
                element = value[i];
                addExistingQueueTrack(element);
            }
        });
    };

    spotify.on({
        ready: ready
    });

    spotify.player.on({
        endOfTrack: nextTrack
    });

    spotify.login(config.spotify_user,
            config.spotify_password, true, false);
};

search = module.exports.search = function (query, callback) {
    var offset = 0;
    var limit = 20;
    var search = new spotify.Search(query, offset, limit);
    search.execute(function (err, result) {
        result.tracks.forEach(function (item) {
            cachedTracks[item.link] = item;
        });
        callback(result);
    });
};

addTrack = module.exports.addTrack = function (track_id, user, callback) {
    if (queueContainsTrack(track_id)) {
        console.log('Requested track already exists in queue. Skipping.');
        callback({success: false, message: 'Track already queued.'});
        return;
    }

    var track = cachedTracks[track_id];
    if (track !== undefined) {
        addTrackToQueue(track, user);
        console.log('Added track to queue: ' + track.name);
        callback({success: true});
    }
    else {
        track = spotify.createFromLink(track_id);
        spotify.waitForLoaded([track], function (track) {
            cachedTracks[track.link] = track;
            addTrackToQueue(track, user);
            console.log('Added track to queue: ' + track.name);
            callback({success: true});
        });
    }
};

upvoteTrack = module.exports.upvoteTrack = function (track_id, user, callback) {
    if (!queueContainsTrack(track_id)) {
        console.log('Upvote on track not in queue. Fail.');
        callback({success: false, message: 'Track not in queue.'});
        return;
    }

    callback(upvote(track_id, user));
};

function saveQueue() {
    db.put('queue', queue._elements, function (err) {
        if (err) {
            console.log('Error saving queue', err);
        }
    });
}

function nextTrack() {
    saveQueue();

    if (playingElement) {
        // Requeue current playing element to end with no votes.
        playingElement.added_at = timeNow();
        playingElement.votes = 0;
        playingElement.voters = [];
        queue.enq(playingElement);
    }

    if (queue.isEmpty()) {
        now_playing = module.exports.now_playing = null;
        return;
    }

    var nextElement = queue.deq();
    var track = nextElement.track;
    spotify.player.play(track);
    now_playing = module.exports.now_playing = track;
    console.log('Now playing: ' + now_playing.name);
    playingElement = nextElement;
}

function addExistingQueueTrack(element) {
    var track = spotify.createFromLink(element.track.link);
    spotify.waitForLoaded([track], function (track) {
        cachedTracks[track.link] = track;
        queue.enq({
            votes: 0,
            track: track,
            voters: [],
            added_by: element.added_by,
            added_at: element.added_at
        });
        console.log('Added existing track to queue: ' + track.name);

        if (!now_playing) {
            nextTrack();
        }
    });
}

function addTrackToQueue(track, user) {
    queue.enq({
        votes: 1,
        track: track,
        voters: [user],
        added_by: user,
        added_at: timeNow()
    });

    if (!now_playing) {
        nextTrack();
    }
}

function upvote(track, user) {
    var trackInQueue = null;
    queue.forEach(function (item, index) {
        if (item.track.link === track) {
            trackInQueue = item;
        }
    });

    if (!trackInQueue) {
        return {success: false, message: 'Track not found.'};
    }

    if (_.contains(trackInQueue.voters, user)) {
        return {success: false, message: 'User already voted on track.'};
    }

    // Finally we can upvote this track.
    // Bit hacky as we have to create a new queue.
    trackInQueue.votes += 1;
    trackInQueue.voters.push(user);
    var newQueue = new PriorityQueue(function (a, b) {
        if (a.votes === b.votes) {
            return b.added_at - a.added_at;
        }
        return a.votes - b.votes;
    });

    queue.forEach(function (item, index) {
        if (item !== trackInQueue) {
            newQueue.enq(item);
        }
    });
    newQueue.enq(trackInQueue);
    queue = module.exports.queue = newQueue;
    return {success: true};
}

function queueContainsTrack(track) {
    var trackFound = false;
    queue.forEach(function (item, index) {
        console.log('track id: ' + item.track.link);
        if (item.track.link === track) {
            trackFound = true;
        }
    });
    return trackFound;
}

function timeNow() {
    return Math.round(new Date().getTime() / 1000);
}

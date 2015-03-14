var app = require('../app');
var config = require('../config');
var spotify = require('node-spotify')(config.spotify_options);
var PriorityQueue = require('priorityqueuejs');
var _ = require('underscore');
var jade = require('jade');
var levelup = require('level');
var db = levelup('./db/hadapptify_db', {
    valueEncoding: 'json'
});

active_users = module.exports.active_users = [];

sortFunction = module.exports.sortFunction = function (a, b) {
    if (a.votes === b.votes) {
        if (a.votes === 0) {
            return b.added_at - a.added_at;
        }
        else {
            return b.last_voted_at - a.last_voted_at;
        }
    }
    else {
        return a.votes - b.votes;
    }
};

queue = module.exports.queue = new PriorityQueue(sortFunction);

now_playing = module.exports.now_playing = null;
paused = module.exports.paused = false;
track_adding = [];

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
    if (track) {
        addTrackToQueue(track, user);
        console.log('Added track to queue: ' + track.name);
        callback({success: true});
    }
    else {
        track = spotify.createFromLink(track_id);
        spotify.waitForLoaded([track], function (someTrack) {
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

skipTrack = module.exports.skipTrack = function (user, callback) {
    if (now_playing) {
        spotify.player.stop();
        nextTrack();
        callback({success: true});
    }
    else {
        callback({success: false, message: 'Nothing currently playing.'});
    }
};

pausePlay = module.exports.pausePlay = function (callback) {
    if (!paused) {
        paused = true;
        spotify.player.pause();
        callback({success: true});
    }
    else {
        paused = false;
        spotify.player.resume();
        callback({success: true});
    }
};

function saveQueue() {
    db.put('queue', queue._elements, function (err) {
        if (err) {
            console.log('Error saving queue', err);
        }
    });
}

save = module.exports.save = saveQueue;

function nextTrack() {
    if (playingElement) {
        // Requeue current playing element to end with no votes.
        playingElement.added_at = timeNow();
        playingElement.votes = 0;
        playingElement.voters = [];
        queue.enq(playingElement);
    }

    saveQueue();

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

    // Announce new track via sockets.
    app.io.emit('new_track', now_playing);

    // Announce new queue.
    sendNewQueue();
}

function addExistingQueueTrack(element) {
    var track = spotify.createFromLink(element.track.link);
    spotify.waitForLoaded([track], function (track) {
        cachedTracks[track.link] = track;
        queue.enq({
            votes: element.votes,
            track: track,
            voters: element.voters,
            added_by: element.added_by,
            added_at: element.added_at,
            last_voted_at: timeNow()
        });
        console.log('Added existing track to queue: ' + track.name);

        if (!now_playing) {
            nextTrack();
        }
        else {
            sendNewQueue();
        }
    });
}

function addTrackToQueue(track, user) {
    queue.enq({
        votes: 1,
        track: track,
        voters: [user],
        added_by: user,
        added_at: timeNow(),
        last_voted_at: timeNow()
    });

    if (!now_playing) {
        nextTrack();
    }
    else {
        sendNewQueue();
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
    trackInQueue.last_voted_at = timeNow();
    var newQueue = new PriorityQueue(sortFunction);

    queue.forEach(function (item, index) {
        if (item !== trackInQueue) {
            newQueue.enq(item);
        }
    });
    newQueue.enq(trackInQueue);
    queue = module.exports.queue = newQueue;
    sendNewQueue();
    return {success: true};
}

function queueContainsTrack(track) {
    var trackFound = false;
    queue.forEach(function (item, index) {
        if (item.track.link === track) {
            trackFound = true;
        }
    });
    return trackFound;
}

function timeNow() {
    return Math.round(new Date().getTime() / 1000);
}

function sendNewQueue() {
    queue._elements.sort(function (a, b) {
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

    var queueHtml = jade.renderFile('views/queue.jade', {queue: queue});
    app.io.emit('new_queue', {html: queueHtml});
}

setupSocket = module.exports.setupSocket = function (socket) {
    var user = socket.request.session.user;
    if (!_.contains(active_users, user)) {
        active_users.push(user);
        var html = jade.renderFile('views/users.jade', active_users);
        app.io.emit('update_users', {html: html});
    }

    socket.on('upvote', function (track) {
        upvote(track, socket.request.session.user);
    });

    socket.on('search', function (query) {
        search(query, function(result) {
            var html = jade.renderFile('views/search_results.jade', result);
            socket.emit('search_result', {html: html});
        });
    });

    socket.on('add_track', function (track) {
        var user = socket.request.session.user;
        if (track_adding[track]) {
            return;
        }
        track_adding[track] = true;
        addTrack(track, user, function (result) {
            delete track_adding[track];
        });
    });

    socket.on('disconnect', function() {
        active_users = _.without(active_users, user);
        var html = jade.renderFile('views/users.jade', active_users);
        app.io.emit('update_users', {html: html});
    });
};

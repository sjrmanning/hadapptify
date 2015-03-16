var socket = io();

socket.on('new_track', function(track) {
                               var artists = '';
    var artist_count = 0;
    for (var i = 0; i < track.artists.length; i++) {
        var artist = track.artists[i];
        if (i > 0) {
            artists += ", ";
        }
        artists += artist.name;
    }
    $('div.now-playing div.track').text(artists + " - " + track.name);
});

socket.on('new_queue', function (data) {
    $('div.queue').html(data.html);
});

socket.on('append_chat', function (msg) {
    $('#messages').prepend($('<p>').text(msg));
});

socket.on('search_result', function (data) {
    $('div.search_results').html(data.html);
    $('div.search_results').show("slow");
});

socket.on('update_users', function (data) {
    $('div.active-users').html(data.html);
});

$(document).ready(function() {
    $('#chatform').submit(function(){
        socket.emit('chat_msg', $('#chat_input').val());
        $('#chat_input').val('');
        return false;
    });

    $('#searchform').submit(function(){
        socket.emit('search', $('#search_input').val());
        return false;
    });

    $('div.search_results').hide();
});

function upvote(track) {
    socket.emit('upvote', track);
    return false;
}

function add(track) {
    socket.emit('add_track', track);
    return false;
}

function hideSearch() {
    $('div.search_results').hide("slow");
    return false;
}

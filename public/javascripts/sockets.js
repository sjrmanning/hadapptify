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
    $('div.track').text(artists + " - " + track.name);
});

socket.on('new_queue', function (data) {
    $('div.queue').html(data.html);
});

var app = require('../app');

chatlog = module.exports.chatlog = [];

setupSocket = module.exports.setupSocket = function(socket) {
    socket.on('chat_msg', function (msg) {
        var user = socket.request.session.user;
        var formedMsg = '<' + user + '>' + ' ' + msg;
        chatlog.push(formedMsg);
        app.io.emit('append_chat', formedMsg);
    });
};

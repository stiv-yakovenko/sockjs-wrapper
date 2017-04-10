var express = require('express');
var path = require('path');
var http = require('http');
var fs = require('fs');
var sockjs = require('./sockjs.wrap.server');
var app = express();
var httpServer = http.createServer(app);
app.use('/static', express.static(path.join(__dirname, './static')));
httpServer.listen(8080, "127.0.0.1");
var io = sockjs(httpServer);

var sockets = [];
io.sockets.on('auth', function (data, socket, cb) {
    console.log("auth", data);
    if (data.user == 'admin' && data.pass == 'admin') {
        cb(true);
        socket.emit("onconnected",{ip:socket.conn.remoteAddress});
    } else {
        cb(false);
    }
});
io.sockets.logger(function (msg) {
    console.log(msg);
});
io.sockets.on('connection', function (socket) {
    console.log("on connection", socket.userId);
    sockets.push(socket);
    socket.on('disconnect', function () {
    });
    socket.on('click', function (data,ok) {
        console.log("click");
        ok(true)
    });
});

var sockjs = require('sockjs');
module.exports = function (httpServer, options) {
    var srv = sockjs.createServer({
        sockjs_url: 'javascripts/lib/sockjs.min.js', websocket: false, protocol: ['websocket', 'xhr-polling']
    });
    srv.installHandlers(httpServer, {prefix: '/socket'});
    var counter = 0;
    var authCB = null;
    var logger = function () {
    };
    return {
        sockets: {
            logger: function (loggerCB) {
                logger = loggerCB;
            }, on: function (msg, connectCB) {
                if (msg == 'auth') {
                    authCB = connectCB;
                }
                if (msg == 'connection') {
                    srv.on('connection', function (socket) {
                        var disconnectCB = null;
                        var msgCB = {};
                        var notifyCBs = {};
                        var emit = function (msg, obj, notify) {
                            var id;
                            if (notify) {
                                id = counter;
                                notifyCBs[counter] = notify;
                                counter++;
                            }
                            var str = JSON.stringify({msg: msg, obj: obj, id: id});
                            if (msg != 'message')
                                logger("EMIT " + str);
                            socket.write(str);
                        };
                        socket.on('close', function () {
                            if (disconnectCB) disconnectCB();
                        });
                        socket.on('data', function (str) {
                            var wrapper;
                            try {
                                wrapper = JSON.parse(str);
                            } catch (e) {
                                console.error("bad message", e);
                                return;
                            }
                            if (wrapper.msg == 'auth') {
                                if (authCB) {
                                    var socketWrapper = {
                                        on: function (msg, cb) {
                                            if (msg == 'disconnect') {
                                                disconnectCB = cb;
                                                return;
                                            }
                                            msgCB[msg] = function (data, cb2) {
                                                if (msg != 'message')
                                                    logger("ON " + msg + " FROM " + JSON.stringify(socketWrapper.authObj) + " DATA " + JSON.stringify(data));
                                                cb(data, cb2);
                                            }
                                        },
                                        emit: function (msg, obj, notify) {
                                            emit(msg, obj, notify);
                                        },
                                        handshake: {headers: socket.headers},
                                        conn: {remoteAddress: socket.remoteAddress},
                                        authObj: wrapper.obj
                                    };
                                    authCB(wrapper.obj, socketWrapper, function (ret) {
                                        if (!ret) {
                                            emit('auth-fail');
                                            return;
                                        }
                                        emit('auth');
                                        connectCB(socketWrapper);
                                    });
                                } else {
                                    emit('auth');
                                }
                                return;
                            }
                            if (wrapper.msg == 'notify') {
                                var notify = notifyCBs[wrapper.id];
                                if (!notify) return;
                                notify(wrapper.obj);
                                delete notifyCBs[wrapper.id];
                                return;
                            }
                            if (wrapper.msg) {
                                var cb = msgCB[wrapper.msg];
                                if (cb) {
                                    cb(wrapper.obj, function (backObj) {
                                        socket.write(JSON.stringify({msg: 'notify', obj: backObj, id: wrapper.id}));
                                    });
                                }
                            }
                        });
                    });
                }
            }
        }
    }
};
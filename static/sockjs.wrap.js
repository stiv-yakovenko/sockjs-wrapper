if (typeof window == 'undefined') {
    var SockJS = require('sockjs-client');
}

var SockJSWrap = function (url, authObj) {
    var connected = false;
    var sock = null;
    var me = this;
    var connectCB = null;
    var closeCB = null;
    var messageCBs = {};
    var authFailCB = null;
    var notifyCBs = {};
    var manualDisconnect = false;
    var retry = function () {
        if (connected || manualDisconnect) return;
        sock = new SockJS(url,null,{transports:['xhr-polling']});
        var counter = 0;
        sock.onopen = function () {
            console.log("connected, sending auth");
            connected = true;
            me.emit("auth", authObj);
        };
        sock.onclose = function () {
            connected = false;
            if (closeCB) closeCB();
            retry();
        };
        sock.onmessage = function (e) {
            var wrapper;
            // console.info("ON MESSAGE: "+e.data);
            try {
                wrapper = JSON.parse(e.data);
            } catch (err) {
                console.error("bad message");
                return;
            }
            if (wrapper.msg == 'auth') {
                if (connectCB) connectCB({});
                return;
            }
            if (wrapper.msg == 'auth-fail') {
                manualDisconnect = true;
                sock.close();
                if (authFailCB) authFailCB();
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
                var cb = messageCBs[wrapper.msg];
                if (cb) {
                    cb(wrapper.obj, function (ret) {
                        sock.send(JSON.stringify({msg: 'notify', obj: ret, id: wrapper.id}));
                    });
                }
            }
        };
        me.sock = sock;
        me.emit = function (msg, obj, notify) {
            var id;
            if (notify) {
                id = counter;
                notifyCBs[counter] = notify;
                counter++;
            }
            var str = JSON.stringify({msg: msg, obj: obj, id: id});
            // console.log("EMIT " + str + " TO " + JSON.stringify(authObj));
            sock.send(str);
        };
        me.on = function (evt, cb) {
            if (evt == 'auth-fail') {
                authFailCB = cb;
            } else if (evt == 'connect') {
                connectCB = cb;
            } else if (evt=='close'){
                closeCB = cb;
            } else {
                messageCBs[evt] = cb;
            }
        };
        me.off = function (msg) {
            delete messageCBs[msg];
        };
        me.disconnect = function () {
            sock.close();
            manualDisconnect = true;
        };
        me.close = me.disconnect;
    };
    retry();
};

if (typeof window == 'undefined') {
    module.exports = SockJSWrap;
}
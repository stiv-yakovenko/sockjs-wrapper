# sockjs-wrapper
Wrapper for sockjs which allows subscribing for events and launching callbacks
https://github.com/sockjs is alternative for socketio, which works better
under highload and has server implementation for different languages.
  
Sockjs is a low level library, so it can only send/receive messages,
if you want to authorise and subscribe for events and send responces, you
can use this library.

# USAGE

Init your server:
```javascript
var sockjs = require('./sockjs.wrap.server');
var app = express();
var httpServer = http.createServer(app);
app.use('/static', express.static(path.join(__dirname, './static')));
httpServer.listen(8080, "127.0.0.1");
var io = sockjs(httpServer);
```

Connect sockjs.wrap to your html
```html
    <script src="./sockjs.min.js"></script>
    <script src="./sockjs.wrap.js"></script>
```
and create connection

```javascript
    var socketio = new SockJSWrap('/socket', auth);
```
and user credentials on server side:
```javascript
io.sockets.on('auth', function (data, socket, cb) {
    console.log("auth", data);
    if (data.user == 'admin' && data.pass == 'admin') {
        cb(true);
        socket.emit("onconnected",{ip:socket.conn.remoteAddress});
    } else {
        cb(false);
    }
});
```
Welcome connected users on client side:

```javascript
    socketio.on("onconnected", function (data) {
       console.log("onconnected", data);
    });
```
Send server a message:

```javascript
    var cnt=0;
    $('#click').click(function () {
        socketio.emit("click", {}, function () {
             // handle responce from server
             cnt++;
        });
    });
```
and handle it on server side:

```javascript
    socket.on('click', function (data,ok) {
        console.log("Got click from server");
        // send response back to client
        ok(true); 
    });
```
# LAUNCHING

There is a working nodejs demo in the repository, launch it this way:
>node ./app.js

and open http://127.0.0.1:8080 in browser to see it in action 

# LICENSE
Licensed under Apache License.



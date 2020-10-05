const http = require('http');
const express = require('express');
const socketio = require('socket.io');

//const CodenamesGame = require('./codenames-game');

const app = express();
const PORT = 8000;

const clientPath = `${__dirname}/../client`
console.log(`Serving static file from ${clientPath}`);
// Serve static file to client with express
app.use(express.static(clientPath));
// Create http server with express app
const server = http.createServer(app);
// socketio
const io = socketio(server);

var players = [];

function Player(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
}

io.on('connection', onConnect);

function onConnect(socket) {
    console.log("New Client Connected: " + socket.id);

    socket.on('newPlayer', function (data) {
        console.log(socket.id + ' ' + data.x + ' ' + data.y);
        var player = new Player(socket.id, data.x, data.y,);
        players.push(player);
    });

    socket.on('update', function(data) {
        // console.log(socket.id + " " + data.x + " " + data.y);
        var player;
        for (var i = 0; i < players.length; i++) {
          if (socket.id == players[i].id) {
            player = players[i];
          }
        }
        player.x = data.x;
        player.y = data.y;
      });

    socket.on('disconnect', function() {
        console.log(socket.id +' has disconnected.')
    });


} // --> onConnect



server.on('error', (err) => {
    console.error('Server Error:', err);
});

server.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
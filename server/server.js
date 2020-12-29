// NPM
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
// Local Files
const WordBank = require('./wordbank');

const app = express();
const PORT = 8000;

const clientPath = `${__dirname}/../client`;
console.log(`Serving static file from ${clientPath}`);
// Serve static file to client with express
app.use(express.static(clientPath));
// Create http server with express app
const server = http.createServer(app);
// socketio
const io = socketio(server);

server.on('error', (err) => {
    console.error('Server Error:', err);
});

server.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});

var players = {};

const wordlist = new WordBank(); 
const gameWords = wordlist.generateGameWords();
//console.log(gameWords);

// TODO: on a 'new game' request (not a new socket), send the wordlist

io.on('connection', onConnect);

function onConnect(socket) {
    console.log("New Client Connected: " + socket.id);

    players[socket.id] = {
        rotation: 0,
        x: 400,
        y: 150,
        playerId: socket.id,
        team: (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue'
    };

     // send the players object to the new player
     socket.emit('currentPlayers', players);
     // update all other players of the new player
     socket.broadcast.emit('newPlayer', players[socket.id]);
 
     // when a player disconnects, remove them from our players object
     socket.on('disconnect', function () {
         console.log('user disconnected');
         // remove this player from our players object
         delete players[socket.id];
         // emit a message to all players to remove this player
         io.emit('userQuit', socket.id);
     });
 
     // when a player moves, update the player data
     socket.on('playerMovement', function (movementData) {
         players[socket.id].x = movementData.x;
         players[socket.id].y = movementData.y;
         players[socket.id].rotation = movementData.rotation;
         players[socket.id].direction = movementData.direction;
         // emit a message to all players about the player that moved
         socket.broadcast.emit('playerMoved', players[socket.id]);
     });

     // chat message
     socket.on('message', function(data){
        io.emit('message', data);
     });

} // --> onConnect




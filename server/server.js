// Node Modules
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
// Local Files
const WordBank = require('./wordbank');
// Server Setup
const app = express();
const PORT = 8000;
const DEBUG = true;

// Only allow index.html on / or /settings
const indexPath = `${__dirname}/../client`;
console.log(`Serving static file from ${indexPath}`);
app.use('/', express.static(indexPath));
app.use('/settings', express.static(__dirname + '/../client/settings.html'));
// Create http server with express app
const server = http.createServer(app);
// socketio init
const io = socketio(server);

server.on('error', (err) => {
    console.error('Server Error:', err);
});

server.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});

// Game Logic
// TODO: on a 'new game' request (not a new socket), send the wordlist
var players = {}; // player object list

const wordBank = new WordBank(); 
//console.log(wordBank.wordList.length);


// Socket Logic
io.on('connection', onConnect);

function onConnect(socket) {
    console.log("New Client Connected: " + socket.id);

    players[socket.id] = {
        name: ("Player" + socket.id).slice(0,10),
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
     io.emit('eventMessage', 'Player Connected.' + ' Current Players: ' + Object.size(players));
     // when a player disconnects, remove them from our players object
     socket.on('disconnect', function () {
         console.log('user disconnected');
         // remove this player from our players object
         
         // emit a message to all players to remove this player
         io.emit('userQuit', socket.id);
         delete players[socket.id];
         io.emit('eventMessage', 'Player Left.' + ' Current Players: ' + Object.size(players));
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
     socket.on('chatMessage', function(data){
        io.emit('chatMessage', data);
     });
     // event message
     socket.on('eventMessage', function(data, color){
        io.emit('eventMessage', data, color);
     });
     // server debug
     socket.on('evalServer', function(data){
        if (!DEBUG) return; // kill if not debug mode
        try{
        var res = eval(data);
        socket.emit('evalAnswer', res);
        }
        catch(e){
        socket.emit('evalAnswer', 'Does not exist. Try something else.');
        }
     });
      // word submission
      socket.on('submitWord', function(data) {
            if (players[socket.id].team == 'red') console.log('Word: ' + data + ' Player is on red team.');
            else if (players[socket.id].team == 'blue') console.log('Word ' + data + ' Player is on blue team.')
     });

} // --> onConnect

// find the size of an object
Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

// Count all players on blue or red team
// This will be important when it's time to
// Determine if everyone made their submission or not
/*
Object.keys(players).forEach(function() {
    if (players[socket.id].team == 'blue') {
      console.log('blue');
    }
  });
*/
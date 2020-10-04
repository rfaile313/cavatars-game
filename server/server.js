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

let players = []; // server-side player array
server.lastPlayerID = 0;


// socket.io work
io.on('connection', (sock) => {
    
    

    sock.on('message', (text) => {
        //io.emit == all clients currently connected
        io.emit('message', text);
    });

    sock.on('newPlayerReady', () => {
        sock.player = {
            id: server.lastPlayerID++,
            x: 100,
            y: 100
        };
       
        players.push(sock.id);  // pass socket object onto the players array
        sock.emit('message', 'Hi player #' + (sock.player.id) + '! Your id is: ' + sock.id);
        io.emit('message', `Player number ${sock.player.id}: ${sock.id} connected. Current players: ${players.length}.`);
        console.log('player #' + sock.player.id + sock.id + ' connected.');
        io.emit('newplayer', sock.player.id);
    });

    // emit movement to all players
    sock.on('playerMove', (move) => {
        if (move === 'left'){
            io.emit('direction', 'left', sock.player);
        }
        else if (move == 'right'){
            io.emit('direction', 'right', sock.player);
        }
        else{ //still
            io.emit('direction', 'still', sock.player);
        }
    });

    //when a client disconnects
    sock.on('disconnect', () => {
        console.log('player #' + sock.id + ' disconnected.');
        var removeIndex = players.map(function(item) { return sock.id; }).indexOf(sock.id);
        // remove object by id from players array
        players.splice(removeIndex, 1);
        io.emit('message', `Player ${sock.player.id}: ${sock.id} disconnected. Current players: ${players.length}.`);
        io.emit('removeplayer', sock.player.id);
        server.lastPlayerID--;
    });

});


server.on('error', (err) => {
    console.error('Server Error:', err);
});

server.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
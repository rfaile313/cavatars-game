const http = require('http');
const express = require('express');
const socketio = require('socket.io');

//const CodenamesGame = require('./codenames-game');

const app = express();

const clientPath = `${__dirname}/../client`
console.log(`Serving static file from ${clientPath}`);
// Serve static file to client with express
app.use(express.static(clientPath));
// Create http server with express app
const server = http.createServer(app);
// socketio
const io = socketio(server);


let players = [];

function add_player(sock){
    // pass socket object onto the players array
    players.push(sock);
    io.emit('message', `Player ${sock.id} connected. Current players: ${players.length}.`);
}
function remove_player(sock){
    var removeIndex = players.map(function(item) { return sock.id; }).indexOf(sock.id);
    // remove object by id from players array
    players.splice(removeIndex, 1);
    io.emit('message', `Player ${sock.id} disconnected. Current players: ${players.length}.`);
}


// socket.io work
io.on('connection', (sock) => {

    sock.emit('message', 'Hi player! Your id is: ' + sock.id);

    add_player(sock);
    
    //console.log(players);
    
    sock.on('message', (text) => {
        //io.emit == all clients currently connected
        io.emit('message', text);
    });

    //when a client disconnects
    sock.on('disconnect', () => {
        console.log(sock.id + ' disconnected.');
        remove_player(sock);
    });

});


    



const PORT = 8000; 

server.on('error', (err) => {
    console.error('Server Error:', err);
});

server.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
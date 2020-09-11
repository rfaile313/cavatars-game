const http = require('http');
const express = require('express');
const socketio = require('socket.io');

const CodenamesGame = require('./codenames-game');

const app = express();

const clientPath = `${__dirname}/../client`
console.log(`Serving static file from ${clientPath}`);
// Serve static file to client with express
app.use(express.static(clientPath));
// Create http server with express app
const server = http.createServer(app);
// socketio
const io = socketio(server);
// set waitingPlayer to null to signify single player
let waitingPlayer = null;

// socket.io work
io.on('connection', (sock) => {

    sock.emit('message', 'Hi player! Your id is: ' + sock.id);

    if (waitingPlayer){
        //start a game

        new CodenamesGame(waitingPlayer, sock);

        waitingPlayer = null;
    } else {
        waitingPlayer = sock;
        waitingPlayer.emit('message', 'Waiting for more players...')
    }

    sock.on('message', (text) => {
        //io.emit == all clients currently connected
        io.emit('message', text);
    });


});



const PORT = 8000; 

server.on('error', (err) => {
    console.error('Server Error:', err);
});

server.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
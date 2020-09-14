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
server.lastPlayerID = 0;


function add_player(sock){
    // add player property of sock and initialize server side values
    sock.player = {
        id: server.lastPlayerID++,
        x: 100,
        y: 100
    };
    // pass socket object onto the players array
    players.push(sock.id);
    sock.emit('message', 'Hi player #' + (sock.player.id + 1) + '! Your id is: ' + sock.id);
    io.emit('message', `Player number ${sock.player.id + 1}: ${sock.id} connected. Current players: ${players.length}.`);
    console.log('player #' + sock.player.id + sock.id + ' connected.');
    sock.emit('newplayer', sock.id);
}
function remove_player(sock){
    var removeIndex = players.map(function(item) { return sock.id; }).indexOf(sock.id);
    // remove object by id from players array
    players.splice(removeIndex, 1);
    io.emit('message', `Player ${sock.player.id + 1}: ${sock.id} disconnected. Current players: ${players.length}.`);
    server.lastPlayerID--;
    io.emit('removeplayer', sock.id);
}


// socket.io work
io.on('connection', (sock) => {
    
    add_player(sock);

    

   
    
    sock.on('message', (text) => {
        //io.emit == all clients currently connected
        io.emit('message', text);
    });

    


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
        console.log('player #' + sock.player.id + sock.id + ' disconnected.');
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
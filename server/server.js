// Node Modules
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
// Local Files
const WordBank = require("./wordbank");
// Server Setup
const app = express();
const PORT = 8000;
const DEBUG = true;

// Only allow index.html on / or /settings
const indexPath = `${__dirname}/../client`;
console.log(`Serving static file from ${indexPath}`);
app.use("/", express.static(indexPath));
app.use("/settings", express.static(__dirname + "/../client/settings.html"));
// Create http server with express app
const server = http.createServer(app);
// socketio init
const io = socketio(server);

server.on("error", (err) => {
  console.error("Server Error:", err);
});

server.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});

// Game Logic / server global variables
var players = {}; // player object list

const wordBank = new WordBank();

const wordList = Object.values(wordBank.wordList);

const maxScore = 8;

let currentTeamTurn = Math.floor(Math.random() * Math.floor(2)) ? 'red' : 'blue';

let redTeamScore = 0;
let blueTeamScore = 0;
let redTeamSubmissionCount = 0;
let blueTeamSubmissionCount = 0;

// Socket Logic
io.on("connection", onConnect);

function onConnect(socket) {
  console.log("New Client Connected: " + socket.id);

  players[socket.id] = {
    name: ("Player" + socket.id).slice(0, 10),
    rotation: 0,
    x: 400,
    y: 150,
    playerId: socket.id,
    team: "none",
    spymaster: "no"
  };

  // send the players object to the new player
  socket.emit("currentPlayers", players);
  // update all other players of the new player
  socket.broadcast.emit("newPlayer", players[socket.id]);
  io.emit(
    "eventMessage",
    "Player Connected." + " Current Players: " + Object.size(players)
  );
  io.emit("updateTeams", players);
  io.emit("setScore");

  // Send Vanilla Wordlist
  socket.emit("wordList", wordList);

  // when a player disconnects, remove them from our players object
  socket.on("disconnect", function () {
    console.log("user disconnected");
    // remove this player from our players object

    // emit a message to all players to remove this player
    io.emit("userQuit", socket.id);
    delete players[socket.id];
    io.emit(
      "eventMessage",
      "Player Left." + " Current Players: " + Object.size(players)
    );
    io.emit("updateTeams", players);
  });

  // when a player moves, update the player data
  socket.on("playerMovement", function (movementData) {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].rotation = movementData.rotation;
    players[socket.id].direction = movementData.direction;
    // emit a message to all players about the player that moved
    socket.broadcast.emit("playerMoved", players[socket.id]);
  });

  // player joins a team
  socket.on("joinTeam", function (data) {
    players[socket.id].team = data;
    io.emit("updateTeams", players);
  });

  // chat message
  socket.on("chatMessage", function (data) {
    io.emit("chatMessage", data, players[socket.id].name);
  });
  // event message
  socket.on("eventMessage", function (data, color) {
    io.emit("eventMessage", data, color);
  });
  // Set Player name
  socket.on("setPlayerName", function (data) {
    players[socket.id].name = data;
    socket.emit("updatePlayerName", players[socket.id].name);
    io.emit("otherPlayerNameChanged", players);
    io.emit("updateTeams", players);
  });
  // server debug
  socket.on("evalServer", function (data) {
    if (!DEBUG){
    try {
      var res = eval(data);
      socket.emit("evalAnswer", res);
    } catch (e) {
      socket.emit("evalAnswer", "Does not exist. Try something else.");
    }
  }
  else{
    Object.keys(players).forEach(function(player) {
      // TODO: Might need to make this specific to team 🤔
      if (players[player].name === data) {
        players[player].spymaster = "yes";
        console.log(players[player].name);
        io.to(players[player].playerId).emit("showSpymasterBoard", wordBank);
      }
    });
  }
  });
  // Start new game
  socket.on("startNewGame", function () {
      // assumes that all players that are going to play are assigned to teams
      var currentPlayers = Object.size(players);
      if (currentPlayers < 4 && DEBUG == false){
      io.emit("eventMessage", `Need at least four Players *on teams* to start a game. <br> Current players: ${currentPlayers}<br>`);
      }
      else{
      io.emit("eventMessage", `<br>${players[socket.id].name} is starting a new game!<br>`);
      io.emit("eventMessage", `<br>${currentTeamTurn} goes first!<br>`)
      }
    });

  // word submission
  socket.on("submitWord", function (data, team) {

    if (team === 'red'){
        var currentSizeOfRedTeam = sizeOfTeam(socket, 'red');
    
        redTeamSubmissionCount++;
          // we now have red team size
          if (redTeamSubmissionCount === currentSizeOfRedTeam){
            console.log('All submissions for the red team are in.');
            redTeamSubmissionCount = 0;
            checkSubmission(data, 'red');
            io.emit("setScore", redTeamScore, blueTeamScore);
    
        }
          else{
              // dont do shit - happens on client
          }
    }
    else{
        var currentSizeOfBlueTeam = sizeOfTeam(socket, 'blue');
    
        blueTeamSubmissionCount++;
          // we now have red team size
          if (blueTeamSubmissionCount === currentSizeOfBlueTeam){
            console.log('All submissions for the blue team are in.');
            blueTeamSubmissionCount = 0;
            checkSubmission(data, 'blue');
            io.emit("setScore", redTeamScore, blueTeamScore);
    
        }
          else{
              // dont do shit - happens on client
          }
    }

  }); // --> submitWord

} // --> onConnect

// find the size of an object
Object.size = function (obj) {
  var size = 0,
    key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++;
  }
  return size;
};

function checkSubmission(data, team){
if (team ==='red'){
  if('redTeamWord' === checkWordAgainstLists(data)){ 
      redTeamScore++
   } // get point / more words?
  else if('blueTeamWord' === checkWordAgainstLists(data)){
      blueTeamScore++;
      // also end turn
  } 
  else if('neutralWord' === checkWordAgainstLists(data)){
    // no score ends turn
  }  
  else if('assassinWord' === checkWordAgainstLists(data)){
       // ends game
    }
} //if 
else{
    if('redTeamWord' === checkWordAgainstLists(data)){ 
        redTeamScore++
        //also ends turn
     } 
    else if('blueTeamWord' === checkWordAgainstLists(data)){
        blueTeamScore++;
        // get point / more words?
    } 
    else if('neutralWord' === checkWordAgainstLists(data)){
      // no score ends turn
    }  
    else if('assassinWord' === checkWordAgainstLists(data)){
         // ends game
      }
}

} //--> checkSubmission

function checkWordAgainstLists(word) {
  if (wordBank.redTeamWords.includes(word)) {
    return "redTeamWord";
  } else if (wordBank.blueTeamWords.includes(word)) {
    return "blueTeamWord";
  } else if (wordBank.neutralWords.includes(word)) {
    return "neutralWord";
  } else if (wordBank.assasinWord.includes(word)) {
    return "assassinWord";
  }
}

function sizeOfTeam(socket, team){
    var size = 0;
    Object.keys(players).forEach(function() {
        if (players[socket.id].team === team) {
            size++;
        }
      });
      return size;
}
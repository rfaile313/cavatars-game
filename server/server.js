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

var currentTeamTurn = Math.floor(Math.random() * Math.floor(2))
  ? "red"
  : "blue";

let redTeamScore = 0;
let blueTeamScore = 0;
let redTeamSubmissionCount = 0;
let blueTeamSubmissionCount = 0;

var redTeamRoundGuesses = 0;
var blueTeamRoundGuesses = 0;

var currentGuesses = 0;

let numOfSpymasters = 0;

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
    spymaster: "no",
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
    //   if (!DEBUG){
    //   try {
    //     var res = eval(data);
    //     socket.emit("evalAnswer", res);
    //   } catch (e) {
    //     socket.emit("evalAnswer", "Does not exist. Try something else.");
    //   }
    // }
    // else{
    Object.keys(players).forEach(function (player) {
      // TODO: Might need to make this specific to team 🤔
      if (players[player].name === data) {
        players[player].spymaster = "yes";
        numOfSpymasters++;
        //console.log(players[player].name);
        io.to(players[player].playerId).emit("showSpymasterBoard", wordBank);
      }
    });
    // }
  });
  // Start new game
  socket.on("startNewGame", function () {
    // assumes that all players that are going to play are assigned to teams
    var currentPlayers = Object.size(players);
    var blueTeamSpymaster;
    var redTeamSpymaster;
    if (currentPlayers < 4 && DEBUG == false) {
      io.emit(
        "eventMessage",
        `Need at least four Players *on teams* to start a game. <br> Current players: ${currentPlayers}<br>`
      );
    } else if (numOfSpymasters < 2 && DEBUG == false) {
      io.emit(
        "eventMessage",
        `Both teams need a Spymaster in order to start the game!`
      );
    } else {
      io.emit(
        "eventMessage",
        `<br>${players[socket.id].name} is starting a new game!<br>`
      );
      io.emit("eventMessage", `<br>${currentTeamTurn} goes first!<br>`);
      Object.keys(players).forEach(function (player) {
        if (players[player].spymaster === "yes") {
          if (players[player].team === "red")
            redTeamSpymaster = players[player].name;
          else if (players[player].team === "blue")
            blueTeamSpymaster = players[player].name;
        }
      });
      io.emit(
        "gameStarted",
        currentTeamTurn,
        redTeamSpymaster,
        blueTeamSpymaster
      );
    }
  });

  // Spymaster submits amount of words to team
  socket.on("SpymasterSubmitsNumber", function (data) {
    // data is a string: 'wordX' where X is a number from 1-8
    var rawString = data.slice(4);
    var number = parseInt(rawString);
    if (players[socket.id].team == "red") {
      redTeamRoundGuesses = number;
    } else if (players[socket.id].team == "blue") {
      blueTeamRoundGuesses = number;
    }
    io.emit(
      "eventMessage",
      `Spymaster ${
        players[socket.id].name
      } has selected ${number} of words for the ${
        players[socket.id].team
      } team to guess.`
    );
    //io.emit('giveConfirmButton', players[socket.id].team);
  });

  // Team word submission
  socket.on("submitWord", function (data, team) {
    console.log(data, team);
    if (team === "red") {
      var currentSizeOfRedTeam = sizeOfTeam("red");
      console.log(currentSizeOfRedTeam);
      redTeamSubmissionCount++;
      if (redTeamSubmissionCount === currentSizeOfRedTeam - 1 ) { // less 1 bc of the spymaster
        console.log("All submissions for the red team are in.");
        redTeamSubmissionCount = 0;
        checkSubmission(data, "red");
        io.emit("setScore", redTeamScore, blueTeamScore);
      } else {
        // dont do shit - happens on client
      }
    } else {
      var currentSizeOfBlueTeam = sizeOfTeam("blue");
      console.log(currentSizeOfBlueTeam);
      blueTeamSubmissionCount++;
      if (blueTeamSubmissionCount === currentSizeOfBlueTeam - 1) { // less 1 bc of the spymaster
        console.log("All submissions for the blue team are in.");
        blueTeamSubmissionCount = 0;
        checkSubmission(data, "blue");
        io.emit("setScore", redTeamScore, blueTeamScore);
      } else {
        // dont do shit - happens on client
      }
    }
  }); // --> submitWord
} // -----------------> onConnect

// find the size of an object
Object.size = function (obj) {
  var size = 0,
    key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++;
  }
  return size;
};

function checkSubmission(data, team) {
  if (team === "red") {
    if ("redTeamWord" === checkWordAgainstLists(data)) {
      io.emit(
        "eventMessage",
        `${data} is indeed a Red team word! Red team gets a point!`
      );
      redTeamScore++;
      if (currentGuesses < redTeamRoundGuesses){
        currentGuesses++;
        io.emit(
          "eventMessage",
          `Red team goes again! Words remaining this round: ${redTeamRoundGuesses - currentGuesses}`
        );
      }
      else {
        io.emit(
          "eventMessage",
          `Red Team has guessed all of the words their Spymaster has assigned the team. Well done! It is now Blue Team's turn.`
        );
        currentGuesses = 0;
        currentTeamTurn = 'blue';
      }
    }
    else if ("blueTeamWord" === checkWordAgainstLists(data)) {
      io.emit(
        "eventMessage",
        `${data} is NOT a Red team word.... and what's worse, it's a Blue Team word... so Blue team gets a point! <br> Also, Red Team's turn is over!`
      );
      blueTeamScore++;
      // also end turn
      currentGuesses = 0;
      currentTeamTurn = 'blue';
    } else if ("neutralWord" === checkWordAgainstLists(data)) {
      io.emit(
        "eventMessage",
        `Unfortunately ${data} was an innocent bystander. You don't lose any points, but your team's turn is over.`
      );
      currentTeamTurn = 'blue';
      // no score ends turn
    } else if ("assassinWord" === checkWordAgainstLists(data)) {
      // ends game
    }
  } // red team
  else {
    if ("redTeamWord" === checkWordAgainstLists(data)) {
      io.emit(
        "eventMessage",
        `${data} is NOT a blue team word.... and what's worse, it's a Red Team word... so Red team gets a point! <br> Also, Blue Team's turn is over!`
      );
      redTeamScore++;
      //also ends turn
      currentTeamTurn = 'red';
      currentGuesses = 0;
    } else if ("blueTeamWord" === checkWordAgainstLists(data)) {
      io.emit(
        "eventMessage",
        `${data} is indeed a Blue team word! Blue team gets a point!`
      );
      blueTeamScore++;
      if (currentGuesses < blueTeamRoundGuesses){
        currentGuesses++;
        io.emit(
          "eventMessage",
          `Blue team goes again! Words remaining this round: ${redTeamRoundGuesses - currentGuesses}`
        );
      }
      // get point / more words?
    } else if ("neutralWord" === checkWordAgainstLists(data)) {
      io.emit(
        "eventMessage",
        `Unfortunately ${data} was an innocent bystander. You don't lose any points, but your team's turn is over.`
      );
      currentTeamTurn = 'red';
      currentGuesses = 0;
      // no score ends turn
    } else if ("assassinWord" === checkWordAgainstLists(data)) {
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

function sizeOfTeam(team) {
  var size = 0;
  Object.keys(players).forEach(function (player) {
    if (players[player].team === team) size++;
  });
  return size;
}

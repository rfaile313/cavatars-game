// Node Modules
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const compression = require("compression");
const helmet = require("helmet");
// Local Files
const WordBank = require("./wordbank");
// Server Setup
const app = express();
const PORT = 9999;
const DEBUG = false;

// Only allow index.html on / or /settings
const indexPath = `${__dirname}/../client`;
console.log(`Serving static file from ${indexPath}`);
app.use("/", express.static(indexPath));
app.use("/settings", express.static(__dirname + "/../client/settings.html"));
app.use(helmet());
app.use(compression());
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

let currentTeamTurn;
let redTeamScore;
let blueTeamScore;
let redTeamSubmissionCount;
let blueTeamSubmissionCount;
let redTeamRoundGuesses;
let blueTeamRoundGuesses;
let currentGuesses;
let numOfSpymasters;

function resetValues(){
  currentTeamTurn = Math.floor(Math.random() * Math.floor(2))
  ? "red"
  : "blue";
  redTeamScore = 0;
  blueTeamScore = 0;
  redTeamSubmissionCount = 0;
  blueTeamSubmissionCount = 0;
  redTeamRoundGuesses = 0;
  blueTeamRoundGuesses = 0;
  currentGuesses = 0;
  numOfSpymasters = 0; 
}

resetValues();

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
  socket.on("makePlayerSpymaster", function (data) {
    // TODO: probably should refactor this too
    Object.keys(players).forEach(function (player) {
      if (players[player].name === data) {
        players[player].spymaster = "yes";
        numOfSpymasters++;
        //console.log(players[player].name);
        io.to(players[player].playerId).emit("showSpymasterBoard", wordBank);
      }
    });
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
    io.emit("showConfirmButton");
  });

  // Team word submission
  socket.on("submitWord", function (data, team, tile_x, tile_y) {
    // TODO: need to figure out something if all players don't pick the same word :/
    //console.log(data, team);
    if (team === "red") {
      var currentSizeOfRedTeam = sizeOfTeam("red");
      //console.log(currentSizeOfRedTeam);
      redTeamSubmissionCount++;
      if (redTeamSubmissionCount === currentSizeOfRedTeam - 1) {
        // less 1 bc of the spymaster
        console.log("All submissions for the red team are in.");
        redTeamSubmissionCount = 0;
        checkSubmission(data, "red", tile_x, tile_y);
        io.emit("setScore", redTeamScore, blueTeamScore);
        io.emit("resetConfirmButton");
      } else {
        // dont do shit - happens on client
      }
    } else {
      var currentSizeOfBlueTeam = sizeOfTeam("blue");
      //console.log(currentSizeOfBlueTeam);
      blueTeamSubmissionCount++;
      if (blueTeamSubmissionCount === currentSizeOfBlueTeam - 1) {
        // less 1 bc of the spymaster
        console.log("All submissions for the blue team are in.");
        blueTeamSubmissionCount = 0;
        checkSubmission(data, "blue", tile_x, tile_y);
        io.emit("setScore", redTeamScore, blueTeamScore);
        io.emit("resetConfirmButton");
      } else {
        // dont do shit - happens on client
      }
    }
  }); // --> submitWord
} // -----------------> onConnect

/*eslint no-prototype-builtins: "off"*/
// find the size of an object
Object.size = function (obj) {
  var size = 0,
    key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++;
  }
  return size;
};

function checkSubmission(data, team, x, y) {
  // TODO: Refactor this - this is terribad.
  if (team === "red") {
    if ("redTeamWord" === checkWordAgainstLists(data)) {
      io.emit(
        "eventMessage",
        `${data} is indeed a Red team word! Red team gets a point!`
      );
      redTeamScore++;
      io.emit("flashImage", 410, 300, "red_team_point", 6);
      io.emit("tintTile", x, y, 0xff4343); //light red
      if (redTeamScore === maxScore) {
        // game over, red team wins
        io.emit("flashImage", 410, 200, "game_over", 12);
        io.emit("flashImage", 410, 300, "red_team_wins", 24);
        return;
      }
      currentGuesses++;
      if (redTeamRoundGuesses - currentGuesses !== 0) {
        io.emit(
          "eventMessage",
          `Red team goes again! Words remaining this round: ${
            redTeamRoundGuesses - currentGuesses
          }`
        );
      } else {
        io.emit(
          "eventMessage",
          `Red Team has guessed all of the words their Spymaster has assigned the team. Well done! It is now Blue Team's turn.`
        );
        currentGuesses = 0;
        currentTeamTurn = "blue";
        io.emit("changeTeamTurn", currentTeamTurn);
      }
    } else if ("blueTeamWord" === checkWordAgainstLists(data)) {
      io.emit(
        "eventMessage",
        `${data} is NOT a Red team word.... and what's worse, it's a Blue Team word... so Blue team gets a point! <br> Also, Red Team's turn is over!`
      );
      blueTeamScore++;
      io.emit("tintTile", x, y, 0x50b9ff); // light blue
      // also end turn
      currentGuesses = 0;
      currentTeamTurn = "blue";
      io.emit("changeTeamTurn", currentTeamTurn);
    } else if ("neutralWord" === checkWordAgainstLists(data)) {
      io.emit(
        "eventMessage",
        `Unfortunately ${data} was an innocent bystander. You don't lose any points, but your team's turn is over.`
      );
      currentTeamTurn = "blue";
      io.emit("changeTeamTurn", currentTeamTurn);
      // no score ends turn
    } else if ("assassinWord" === checkWordAgainstLists(data)) {
      io.emit("flashImage", 410, 500, "assassin_word", 12);
      io.emit("flashImage", 410, 300, "blue_team_wins", 24);
      // ends game
    }
  } // ---> red team
  else {
    // blue team
    if ("redTeamWord" === checkWordAgainstLists(data)) {
      io.emit(
        "eventMessage",
        `${data} is NOT a blue team word.... and what's worse, it's a Red Team word... so Red team gets a point! <br> Also, Blue Team's turn is over!`
      );
      io.emit("tintTile", x, y, 0xff4343); //light red
      redTeamScore++;
      //also ends turn
      currentTeamTurn = "red";
      io.emit("changeTeamTurn", currentTeamTurn);
      currentGuesses = 0;
    } else if ("blueTeamWord" === checkWordAgainstLists(data)) {
      io.emit(
        "eventMessage",
        `${data} is indeed a Blue team word! Blue team gets a point!`
      );
      blueTeamScore++;
      io.emit("flashImage", 410, 300, "blue_team_point", 6);
      io.emit("tintTile", x, y, 0x50b9ff); // light blue
      if (blueTeamScore === maxScore) {
        // game over, blue wins
        io.emit("flashImage", 410, 300, "blue_team_wins", 24);
        io.emit("flashImage", 410, 200, "game_over", 12);
        return;
      }
      currentGuesses++;
      if (blueTeamRoundGuesses - currentGuesses !== 0) {
        io.emit(
          "eventMessage",
          `Blue team goes again! Words remaining this round: ${
            blueTeamRoundGuesses - currentGuesses
          }`
        );
      } else {
        io.emit(
          "eventMessage",
          `Blue Team has guessed all of the words their Spymaster has assigned the team. Well done! It is now Red Team's turn.`
        );
        currentGuesses = 0;
        currentTeamTurn = "red";
        io.emit("changeTeamTurn", currentTeamTurn);
      }
    } else if ("neutralWord" === checkWordAgainstLists(data)) {
      io.emit(
        "eventMessage",
        `Unfortunately ${data} was an innocent bystander. You don't lose any points, but your team's turn is over.`
      );
      currentTeamTurn = "red";
      currentGuesses = 0;
      io.emit("changeTeamTurn", currentTeamTurn);
      // no score ends turn
    } else if ("assassinWord" === checkWordAgainstLists(data)) {
      io.emit("flashImage", 410, 500, "assassin_word", 12);
      io.emit("flashImage", 410, 300, "red_team_wins", 24);
    }
  } // --> blue team
} //--> checkSubmission

function checkWordAgainstLists(word) {
  if (wordBank.redTeamWords.includes(word)) {
    return "redTeamWord";
  } else if (wordBank.blueTeamWords.includes(word)) {
    return "blueTeamWord";
  } else if (wordBank.neutralWords.includes(word)) {
    return "neutralWord";
  } else if (wordBank.assassinWord.includes(word)) {
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

// Debugging

//light red
// 0xff4343
//light blue
// 0x50b9ff

// Graveyard

    // socket.on("evalServer", function (data) {
    // 
    //   if (!DEBUG){
    //   try {
    //     var res = eval(data);
    //     socket.emit("evalAnswer", res);
    //   } catch (e) {
    //     socket.emit("evalAnswer", "Does not exist. Try something else.");
    //   }
    // }
    // else{
    //   }
    // }

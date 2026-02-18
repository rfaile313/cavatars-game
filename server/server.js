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
var players = {};
let wordBank = new WordBank();
let wordList = Object.values(wordBank.wordList);
const maxScore = 8;

let isGameInProgress = false;
let currentTeamTurn;
let redTeamScore;
let blueTeamScore;
let redTeamRoundGuesses;
let blueTeamRoundGuesses;
let currentGuesses;
let numOfSpymasters = 0;

function resetValues() {
  currentTeamTurn = Math.floor(Math.random() * Math.floor(2))
    ? "red"
    : "blue";
  redTeamScore = 0;
  blueTeamScore = 0;
  redTeamRoundGuesses = 0;
  blueTeamRoundGuesses = 0;
  currentGuesses = 0;
}

function endGame(winningTeam, reason) {
  isGameInProgress = false;
  // Clear spymasters so players re-volunteer next game
  Object.keys(players).forEach(function (id) {
    players[id].spymaster = "no";
  });
  numOfSpymasters = 0;
  io.emit("gameOver", winningTeam, reason);
  io.emit("updateTeams", players);
}

function resetGame() {
  currentTeamTurn = Math.floor(Math.random() * Math.floor(2))
    ? "red"
    : "blue";
  redTeamScore = 0;
  blueTeamScore = 0;
  redTeamRoundGuesses = 0;
  blueTeamRoundGuesses = 0;
  currentGuesses = 0;
  wordBank = new WordBank();
  wordList = Object.values(wordBank.wordList);
  isGameInProgress = false;
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

  socket.emit("currentPlayers", players);
  socket.broadcast.emit("newPlayer", players[socket.id]);
  io.emit(
    "eventMessage",
    "Player Connected. Current Players: " + Object.keys(players).length
  );
  io.emit("updateTeams", players);
  io.emit("setScore");
  socket.emit("wordList", wordList);

  socket.on("disconnect", function () {
    console.log("user disconnected");
    if (players[socket.id] && players[socket.id].spymaster === "yes") {
      numOfSpymasters--;
    }
    io.emit("userQuit", socket.id);
    delete players[socket.id];
    io.emit(
      "eventMessage",
      "Player Left. Current Players: " + Object.keys(players).length
    );
    io.emit("updateTeams", players);
  });

  socket.on("playerMovement", function (movementData) {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].rotation = movementData.rotation;
    players[socket.id].direction = movementData.direction;
    socket.broadcast.emit("playerMoved", players[socket.id]);
  });

  socket.on("joinTeam", function (data) {
    if (isGameInProgress) return;
    var player = players[socket.id];
    // Clear spymaster if switching teams
    if (player.spymaster === "yes") {
      player.spymaster = "no";
      numOfSpymasters--;
    }
    player.team = data;
    io.emit("updateTeams", players);
    // Emit Phaser name color updates
    socket.emit("updatePlayerName", player.name);
    io.emit("otherPlayerNameChanged", players);
  });

  socket.on("chatMessage", function (data) {
    io.emit("chatMessage", data, players[socket.id].name);
  });

  socket.on("eventMessage", function (data, color) {
    io.emit("eventMessage", data, color);
  });

  socket.on("setPlayerName", function (data) {
    players[socket.id].name = data;
    socket.emit("updatePlayerName", players[socket.id].name);
    io.emit("otherPlayerNameChanged", players);
    io.emit("updateTeams", players);
  });

  socket.on("becomeSpymaster", function () {
    if (isGameInProgress) return;
    var player = players[socket.id];
    if (player.team === "none") return;
    var teamHasOne = Object.values(players).some(
      (p) => p.team === player.team && p.spymaster === "yes"
    );
    if (teamHasOne) return;
    player.spymaster = "yes";
    numOfSpymasters++;
    io.emit("updateTeams", players);
    io.emit(
      "eventMessage",
      player.name +
        " is now the " +
        player.team +
        " team Spymaster!"
    );
  });

  socket.on("startNewGame", function () {
    var playersOnTeams = Object.values(players).filter(
      (p) => p.team !== "none"
    ).length;
    var redTeamSpymaster;
    var blueTeamSpymaster;
    if (playersOnTeams < 4 && DEBUG == false) {
      io.emit(
        "eventMessage",
        `Need at least four Players on teams to start a game. Current players on teams: ${playersOnTeams}`
      );
    } else if (numOfSpymasters < 2 && DEBUG == false) {
      io.emit(
        "eventMessage",
        `Both teams need a Spymaster in order to start the game!`
      );
    } else {
      // Find spymaster names before reset
      Object.keys(players).forEach(function (id) {
        if (players[id].spymaster === "yes") {
          if (players[id].team === "red")
            redTeamSpymaster = players[id].name;
          else if (players[id].team === "blue")
            blueTeamSpymaster = players[id].name;
        }
      });
      resetGame();
      isGameInProgress = true;
      io.emit("wordList", wordList);
      io.emit(
        "eventMessage",
        `<br>${players[socket.id].name} is starting a new game!<br>`
      );
      io.emit("eventMessage", `<br>${currentTeamTurn} goes first!<br>`);
      // Send spymaster board with new words
      Object.keys(players).forEach(function (id) {
        if (players[id].spymaster === "yes") {
          io.to(players[id].playerId).emit("showSpymasterBoard", wordBank);
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

  socket.on("SpymasterSubmitsNumber", function (data) {
    if (!isGameInProgress) return;
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
  });

  // Single-guesser: one click processes guess immediately
  socket.on("submitWord", function (data, team, tile_x, tile_y) {
    if (!isGameInProgress) return;
    if (players[socket.id].team !== team) return;
    if (players[socket.id].spymaster === "yes") return;
    if (team !== currentTeamTurn) return;
    checkSubmission(data, team, tile_x, tile_y);
    io.emit("setScore", redTeamScore, blueTeamScore);
  });
} // -----------------> onConnect

function checkSubmission(data, team, x, y) {
  var otherTeam = team === "red" ? "blue" : "red";
  var teamColor = team === "red" ? 0xff4343 : 0x50b9ff;
  var otherTeamColor = team === "red" ? 0x50b9ff : 0xff4343;
  var teamRoundGuesses = team === "red" ? redTeamRoundGuesses : blueTeamRoundGuesses;
  var teamScoreVar = team === "red" ? "red" : "blue";

  var result = checkWordAgainstLists(data);

  if (result === teamScoreVar + "TeamWord") {
    // Guessed own team's word
    io.emit(
      "eventMessage",
      `${data} is indeed a ${team.charAt(0).toUpperCase() + team.slice(1)} team word! ${team.charAt(0).toUpperCase() + team.slice(1)} team gets a point!`
    );
    if (team === "red") redTeamScore++;
    else blueTeamScore++;
    io.emit("flashImage", 410, 300, team + "_team_point", 6);
    io.emit("tintTile", x, y, teamColor);
    var currentScore = team === "red" ? redTeamScore : blueTeamScore;
    if (currentScore === maxScore) {
      io.emit("flashImage", 410, 200, "game_over", 12);
      io.emit("flashImage", 410, 300, team + "_team_wins", 24);
      endGame(team, "maxScore");
      return;
    }
    currentGuesses++;
    if (teamRoundGuesses - currentGuesses !== 0) {
      io.emit(
        "eventMessage",
        `${team.charAt(0).toUpperCase() + team.slice(1)} team goes again! Words remaining this round: ${
          teamRoundGuesses - currentGuesses
        }`
      );
    } else {
      io.emit(
        "eventMessage",
        `${team.charAt(0).toUpperCase() + team.slice(1)} Team has guessed all of the words their Spymaster has assigned the team. Well done! It is now ${otherTeam.charAt(0).toUpperCase() + otherTeam.slice(1)} Team's turn.`
      );
      currentGuesses = 0;
      currentTeamTurn = otherTeam;
      io.emit("changeTeamTurn", currentTeamTurn);
    }
  } else if (result === otherTeam + "TeamWord") {
    // Guessed other team's word
    io.emit(
      "eventMessage",
      `${data} is NOT a ${team.charAt(0).toUpperCase() + team.slice(1)} team word.... and what's worse, it's a ${otherTeam.charAt(0).toUpperCase() + otherTeam.slice(1)} Team word... so ${otherTeam.charAt(0).toUpperCase() + otherTeam.slice(1)} team gets a point! <br> Also, ${team.charAt(0).toUpperCase() + team.slice(1)} Team's turn is over!`
    );
    if (otherTeam === "red") redTeamScore++;
    else blueTeamScore++;
    io.emit("tintTile", x, y, otherTeamColor);
    currentGuesses = 0;
    currentTeamTurn = otherTeam;
    io.emit("changeTeamTurn", currentTeamTurn);
  } else if (result === "neutralWord") {
    io.emit(
      "eventMessage",
      `Unfortunately ${data} was an innocent bystander. You don't lose any points, but your team's turn is over.`
    );
    io.emit("tintTile", x, y, 0xcccccc);
    currentGuesses = 0;
    currentTeamTurn = otherTeam;
    io.emit("changeTeamTurn", currentTeamTurn);
  } else if (result === "assassinWord") {
    io.emit("flashImage", 410, 500, "assassin_word", 12);
    io.emit("flashImage", 410, 300, otherTeam + "_team_wins", 24);
    io.emit("tintTile", x, y, 0x333333);
    endGame(otherTeam, "assassin");
    return;
  }
}

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
  return Object.values(players).filter((p) => p.team === team).length;
}

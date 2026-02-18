// Ignore undefs, they exist
/*global Phaser, Phaser*/
/*global io, io*/

const DEBUG = false;
const GAME_WIDTH = 820;
const GAME_HEIGHT = 820;

var config = {
  type: Phaser.AUTO,
  parent: "game",
  pixelArt: false,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

// global game variables here
var last_tile;
var confirm_button;
var unique_tile_id_counter = 0;
var wordList = [];
var isSpyMaster = false;
var isGameStarted = false;
var currentTeamTurn;

const game = new Phaser.Game(config);

function getTeamColor(team) {
  if (team === "red") return "#ff4343";
  if (team === "blue") return "#50b9ff";
  return "#ffffff";
}

function preload() {
  // Loading Screen / Bar
  var progressBar = this.add.graphics();
  var progressBox = this.add.graphics();
  progressBox.fillStyle(0x222222, 0.8);
  progressBox.fillRect(240, 270, 320, 50);

  var width = this.cameras.main.width;
  var height = this.cameras.main.height;
  var loadingText = this.make.text({
    x: width / 2,
    y: height / 2 - 50,
    text: "Loading...",
    style: {
      font: "20px monospace",
      fill: "#ffffff",
    },
  });
  loadingText.setOrigin(0.5, 0.5);

  var percentText = this.make.text({
    x: width / 2,
    y: height / 2 - 5,
    text: "0%",
    style: {
      font: "18px monospace",
      fill: "#ffffff",
    },
  });
  percentText.setOrigin(0.5, 0.5);

  var assetText = this.make.text({
    x: width / 2,
    y: height / 2 + 50,
    text: "",
    style: {
      font: "18px monospace",
      fill: "#ffffff",
    },
  });

  assetText.setOrigin(0.5, 0.5);

  this.load.on("progress", function (value) {
    percentText.setText(parseInt(value * 100) + "%");
    progressBar.clear();
    progressBar.fillStyle(0xffffff, 1);
    progressBar.fillRect(250, 280, 300 * value, 30);
  });

  this.load.on("fileprogress", function (file) {
    assetText.setText("Loading asset: " + file.key);
  });

  this.load.on("complete", function () {
    progressBar.destroy();
    progressBox.destroy();
    loadingText.destroy();
    percentText.destroy();
    assetText.destroy();
  });

  // Load Assets
  this.load.image("tiles", "../assets/576x96-96x96.png");
  this.load.image("confirm", "../assets/button-confirm.png");
  this.load.image("new_game", "../assets/new_game.png");
  this.load.image("game_over", "../assets/game_over.png");
  this.load.image("switch_team_turns", "../assets/switch_team_turns.png");
  this.load.image("red_team_point", "../assets/red_team_point.png");
  this.load.image("blue_team_point", "../assets/blue_team_point.png");
  this.load.image("red_team_wins", "../assets/red_team_wins.png");
  this.load.image("blue_team_wins", "../assets/blue_team_wins.png");
  this.load.image("assassin_word", "../assets/assassin_word.png");

  this.load.spritesheet("char_sheet_1", "../assets/char_sheet_1.png", {
    frameWidth: 26,
    frameHeight: 36,
  });
}

function create() {
  var self = this;
  this.socket = io();
  // Camera setup w/slight zoom
  this.cameras.main.setViewport(0, 0, 820, 820).setZoom(1.2);
  this.cameras.main.setBackgroundColor("#1a1a2e");

  const level = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 2, 2, 2, 2, 2, 0, 1],
    [1, 0, 2, 2, 2, 2, 2, 0, 1],
    [1, 0, 2, 2, 2, 2, 2, 0, 1],
    [1, 0, 2, 2, 2, 2, 2, 0, 1],
    [1, 0, 2, 2, 2, 2, 2, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
  ];

  const map = this.make.tilemap({
    data: level,
    tileWidth: 96,
    tileHeight: 96,
  });
  const tiles = map.addTilesetImage("tiles");
  this.platforms = map.createDynamicLayer(0, tiles, 0, 0);
  this.platforms.labels = [];

  // Store original tile positions for reset
  this.platforms.tilePositions = [];

  for (var i = 0; i < this.platforms.layer.data.length; i++) {
    for (var j = 0; j < this.platforms.layer.data.length; j++) {
      if (this.platforms.layer.data[i][j].index == 2) {
        this.platforms.labels.push(this.platforms.layer.data[i][j]);
        this.platforms.layer.data[i][j].uniqueID = unique_tile_id_counter++;
        this.platforms.tilePositions.push({
          pixelX: this.platforms.layer.data[i][j].pixelX,
          pixelY: this.platforms.layer.data[i][j].pixelY,
        });
      }
    }
  }

  this.otherPlayers = this.physics.add.group();

  this.socket.on("currentPlayers", function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id]);
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });
  this.socket.on("newPlayer", function (playerInfo) {
    addOtherPlayers(self, playerInfo);
  });

  this.socket.on("setScore", function (redScore, blueScore) {
    redScore = redScore || 0;
    blueScore = blueScore || 0;
    if (self.player.score) self.player.score.destroy();
    self.player.score = self.add.text(
      GAME_WIDTH / 2,
      75,
      `RED ${redScore}/8  \u00b7  BLUE ${blueScore}/8`,
      {
        fontFamily: "'Trebuchet MS', 'Lucida Sans', sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        fill: "#e0e0e0",
      }
    );
    self.player.score.setOrigin(0.5, 0);
    self.player.score.setShadow(1, 1, "black");
    self.player.score.setScrollFactor(0);
  });

  this.socket.on("userQuit", function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.overheadName.destroy();
        otherPlayer.destroy();
      }
    });
  });

  this.socket.on("otherPlayerNameChanged", function (players) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (!players[otherPlayer.playerId]) return;
      otherPlayer.overheadName.destroy();
      var hexString = getTeamColor(players[otherPlayer.playerId].team);
      otherPlayer.overheadName = self.add.text(
        otherPlayer.x - 30,
        otherPlayer.y - 40,
        players[otherPlayer.playerId].name,
        {
          fontFamily: "'Trebuchet MS', 'Lucida Sans', sans-serif",
          fontSize: "16px",
          fontStyle: "bold",
          fill: hexString,
        }
      );
      otherPlayer.overheadName.setShadow(1, 1, "black");
    });
  });

  this.socket.on("updatePlayerName", function (name) {
    var hexString = getTeamColor(self.player.team);
    if (self.player.overheadName) self.player.overheadName.destroy();
    self.player.overheadName = self.add.text(390, 370, name, {
      fontFamily: "'Trebuchet MS', 'Lucida Sans', sans-serif",
      fontSize: "16px",
      fontStyle: "bold",
      fill: hexString,
    });

    self.player.overheadName.setShadow(1, 1, "black");
    self.player.overheadName.setScrollFactor(0);
  });

  this.socket.on("playerMoved", function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);

        otherPlayer.overheadName.setPosition(
          playerInfo.x - 30,
          playerInfo.y - 40
        );

        if (playerInfo.direction == "left") {
          otherPlayer.anims.play("left", true);
        } else if (playerInfo.direction == "right") {
          otherPlayer.anims.play("right", true);
        } else if (playerInfo.direction == "up") {
          otherPlayer.anims.play("up", true);
        } else if (playerInfo.direction == "down") {
          otherPlayer.anims.play("down", true);
        } else otherPlayer.anims.play("turn", true);
      }
    });
  });

  this.socket.on("showSpymasterBoard", function (wordBank) {
    isSpyMaster = true;
    const redTeamWords = Object.values(wordBank.redTeamWords);
    const blueTeamWords = Object.values(wordBank.blueTeamWords);
    const assassinWord = Object.values(wordBank.assassinWord);
    var current_tile;
    for (var i = 0; i < self.platforms.labels.length; i++) {
      if (redTeamWords.includes(self.platforms.labels[i].text)) {
        current_tile = self.platforms.getTileAtWorldXY(
          self.platforms.labels[i].x,
          self.platforms.labels[i].y,
          true
        );
        current_tile.tint = 0xff4343;
      } else if (blueTeamWords.includes(self.platforms.labels[i].text)) {
        current_tile = self.platforms.getTileAtWorldXY(
          self.platforms.labels[i].x,
          self.platforms.labels[i].y,
          true
        );
        current_tile.tint = 0x50b9ff;
      } else if (assassinWord.includes(self.platforms.labels[i].text)) {
        current_tile = self.platforms.getTileAtWorldXY(
          self.platforms.labels[i].x,
          self.platforms.labels[i].y,
          true
        );
        current_tile.tint = 0x828282;
      }
    }
  });

  // Word List handler - resets board on new game
  this.socket.on("wordList", function (data) {
    // Destroy old text label objects if they exist
    for (var i = 0; i < self.platforms.labels.length; i++) {
      if (self.platforms.labels[i] && self.platforms.labels[i].destroy) {
        self.platforms.labels[i].destroy();
      }
    }
    // Reset tile tints and alreadySelected for all index-2 tiles
    for (var ti = 0; ti < self.platforms.layer.data.length; ti++) {
      for (var tj = 0; tj < self.platforms.layer.data[ti].length; tj++) {
        if (self.platforms.layer.data[ti][tj].index == 2) {
          self.platforms.layer.data[ti][tj].tint = 0xffffff;
          self.platforms.layer.data[ti][tj].alreadySelected = false;
        }
      }
    }

    wordList = [...data];

    // Re-collect labels with fresh uniqueIDs using stored positions
    self.platforms.labels = [];
    unique_tile_id_counter = 0;
    for (var ri = 0; ri < self.platforms.layer.data.length; ri++) {
      for (var rj = 0; rj < self.platforms.layer.data[ri].length; rj++) {
        if (self.platforms.layer.data[ri][rj].index == 2) {
          self.platforms.layer.data[ri][rj].uniqueID = unique_tile_id_counter++;
        }
      }
    }

    for (var li = 0; li < self.platforms.tilePositions.length; li++) {
      var label = self.add.text(
        self.platforms.tilePositions[li].pixelX + 48,
        self.platforms.tilePositions[li].pixelY + 48,
        wordList[li],
        {
          fontFamily: "'Trebuchet MS', 'Lucida Sans', sans-serif",
          fontStyle: "bold",
          fontSize: "13px",
          fill: "#fff",
        }
      );
      label.setOrigin(0.5, 0.5);
      self.platforms.labels[li] = label;
    }
  });

  this.socket.on("tintTile", function (x, y, color) {
    if (!isSpyMaster) {
      var tile_to_tint = self.platforms.getTileAtWorldXY(x, y, true);
      tile_to_tint.tint = color;
      tile_to_tint.alreadySelected = true;
    }
  });

  // Bind keys
  this.cursors = this.input.keyboard.createCursorKeys();
  const chatBox = document.getElementById("chat");
  chatBox.addEventListener("focus", () => {
    this.input.keyboard.disableGlobalCapture();
  });
  chatBox.addEventListener("blur", () => {
    this.input.keyboard.enableGlobalCapture();
  });

  // Chat client functions
  const chatMessage = (text, name) => {
    const parent = document.querySelector("#events");
    const el = document.createElement("li");
    el.innerHTML = name + ": " + text;
    parent.appendChild(el);
  };
  const eventMessage = (text, color = "white") => {
    const parent = document.querySelector("#events");
    const el = document.createElement("li");
    if (color === "red") el.className = "event-message-red";
    else if (color === "blue") el.className = "event-message-blue";
    else el.className = "event-message";
    el.innerHTML = text;
    parent.appendChild(el);
  };

  const onChatSubmitted = (e) => {
    e.preventDefault();
    const input = document.querySelector("#chat");
    this.socket.emit("chatMessage", input.value);
    input.value = "";
  };

  const onNameSubmitted = (e) => {
    e.preventDefault();
    const input = document.getElementById("playerName");
    const nameForm = document.getElementById("name-form");
    this.socket.emit("setPlayerName", input.value);
    input.value = "";
    nameForm.style = "display:none";
  };

  const updateTeams = (players) => {
    removePlayersFromTable();

    // Sync local team from server data
    if (players[self.socket.id]) {
      self.player.team = players[self.socket.id].team;
    }

    var myTeam = self.player.team;
    var myTeamHasSM = false;

    Object.keys(players).forEach(function (id) {
      if (!players[id]) return;
      var team = players[id].team;
      if (team !== "red" && team !== "blue") return;

      var parent = document.querySelector(
        team === "red" ? "#redTeamTable" : "#blueTeamTable"
      );
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      var nameText = players[id].name;
      if (players[id].spymaster === "yes") {
        nameText += ' <span class="spymaster-badge">SM</span>';
      }
      td.innerHTML = nameText;
      tr.className = team === "red" ? "red-team-member" : "blue-team-member";
      tr.appendChild(td);
      parent.appendChild(tr);

      // Track if my team already has a spymaster
      if (team === myTeam && players[id].spymaster === "yes") {
        myTeamHasSM = true;
      }
    });

    // Show/hide volunteer button
    var spyBtn = document.getElementById("spymasterBtn");
    if (myTeam && myTeam !== "none" && !myTeamHasSM && !isGameStarted) {
      spyBtn.style.display = "block";
    } else {
      spyBtn.style.display = "none";
    }
  };

  const joinRedTeam = () => {
    this.player.team = "red";
    this.socket.emit("joinTeam", "red");
  };
  const joinBlueTeam = () => {
    this.player.team = "blue";
    this.socket.emit("joinTeam", "blue");
  };

  const removePlayersFromTable = () => {
    const removeElements = (elms) => elms.forEach((el) => el.remove());
    removeElements(document.querySelectorAll(".blue-team-member"));
    removeElements(document.querySelectorAll(".red-team-member"));
  };

  const startNewGame = () => {
    this.socket.emit("startNewGame");
  };

  const showSpymastersToPlayers = (redSpy, blueSpy) => {
    for (var i = 0; i < 2; i++) {
      const parent = document.querySelector("#spymasters");
      const el = document.createElement("li");
      if (i == 0) el.innerHTML = `Red Team Spymaster: ${redSpy}`;
      else el.innerHTML = `Blue Team Spymaster: ${blueSpy}`;
      parent.appendChild(el);
    }
  };

  const createSpyMasterButtons = () => {
    const parent = document.querySelector("#spymasters");
    parent.innerHTML = "";
    for (var i = 1; i < 9; i++) {
      const el = document.createElement("button");
      el.className = "btn btn-spymaster";
      if (i == 1) el.innerHTML = `Give team ${i} word`;
      else el.innerHTML = `Give team ${i} words`;
      el.id = `word${i}`;
      parent.appendChild(el);
      document
        .getElementById(`word${i}`)
        .addEventListener("click", spyMasterButtonListeners);
    }
    spyMasterButtonsVisible();
  };

  const spyMasterButtonsVisible = () => {
    const buttons = document.getElementById("spymaster-container");
    if (currentTeamTurn === this.player.team && isSpyMaster)
      buttons.style = "visibility: visible;";
    else buttons.style = "visibility: hidden;";
  };

  const playerConfirmButtonsVisible = () => {
    if (isSpyMaster) confirm_button.visible = false;
    else if (currentTeamTurn === this.player.team)
      confirm_button.visible = true;
    else confirm_button.visible = false;
  };

  const spyMasterButtonListeners = (e) => {
    var targetElement = e.target;
    this.socket.emit("SpymasterSubmitsNumber", targetElement.id);
    const buttons = document.getElementById("spymaster-container");
    buttons.style = "visibility: hidden;";
  };

  const updateTurnIndicator = (team) => {
    const indicator = document.getElementById("turnIndicator");
    if (!team) {
      indicator.innerHTML = "";
      indicator.className = "turn-indicator";
      return;
    }
    var teamName = team.charAt(0).toUpperCase() + team.slice(1);
    indicator.innerHTML = teamName + " Team's Turn";
    indicator.className = "turn-indicator turn-" + team;
  };

  this.socket.on("gameStarted", function (turn, redSpy, blueSpy) {
    isGameStarted = true;
    currentTeamTurn = turn;
    const button = document.getElementById("newGame");
    button.style = "display:none";
    document.getElementById("spymasterBtn").style.display = "none";
    createAndFlashImage(self, 410, 250, "new_game", 12);
    if (isSpyMaster) {
      createSpyMasterButtons();
    } else {
      showSpymastersToPlayers(redSpy, blueSpy);
    }
    playerConfirmButtonsVisible();
    updateTurnIndicator(currentTeamTurn);
    document
      .getElementById("redTeamButton")
      .removeEventListener("click", joinRedTeam);
    document
      .getElementById("blueTeamButton")
      .removeEventListener("click", joinBlueTeam);
  });

  this.socket.on("changeTeamTurn", function (team) {
    currentTeamTurn = team;
    createAndFlashImage(self, 410, 200, "switch_team_turns", 20);
    spyMasterButtonsVisible();
    playerConfirmButtonsVisible();
    updateTurnIndicator(currentTeamTurn);
  });

  this.socket.on("gameOver", function (winningTeam, reason) {
    isGameStarted = false;
    isSpyMaster = false;
    currentTeamTurn = null;
    confirm_button.visible = false;
    // Re-show Start New Game button
    const button = document.getElementById("newGame");
    button.style = "display:inline-block";
    // Re-enable team join buttons
    document
      .getElementById("redTeamButton")
      .addEventListener("click", joinRedTeam);
    document
      .getElementById("blueTeamButton")
      .addEventListener("click", joinBlueTeam);
    // Clear spymasters
    document.querySelector("#spymasters").innerHTML = "";
    // Hide spymaster container
    document.getElementById("spymaster-container").style =
      "visibility: hidden;";
    // Clear turn indicator
    updateTurnIndicator(null);
  });

  this.socket.on("flashImage", function (x, y, image, repeat) {
    createAndFlashImage(self, x, y, image, repeat);
  });

  // Dom event listeners
  document
    .getElementById("chat-form")
    .addEventListener("submit", onChatSubmitted);
  document
    .getElementById("name-form")
    .addEventListener("submit", onNameSubmitted);
  document
    .getElementById("redTeamButton")
    .addEventListener("click", joinRedTeam);
  document
    .getElementById("blueTeamButton")
    .addEventListener("click", joinBlueTeam);
  document.getElementById("newGame").addEventListener("click", startNewGame);
  document.getElementById("spymasterBtn").addEventListener("click", function () {
    self.socket.emit("becomeSpymaster");
  });

  // socket.on dom events
  this.socket.on("chatMessage", chatMessage);
  this.socket.on("eventMessage", eventMessage);
  this.socket.on("updateTeams", updateTeams);
  // Button events
  confirm_button = create_button(self, GAME_WIDTH / 2, 550, "confirm");
  confirm_button.on("pointerdown", function () {
    var this_tile = self.platforms.getTileAtWorldXY(
      self.player.x,
      self.player.y,
      true
    );
    if (this_tile.index == 2 && !this_tile.alreadySelected) {
      self.socket.emit(
        "eventMessage",
        self.player.name +
          " confirmed the word " +
          self.platforms.labels[this_tile.uniqueID].text +
          " !",
        self.player.team
      );

      self.socket.emit(
        "submitWord",
        self.platforms.labels[this_tile.uniqueID].text,
        self.player.team,
        self.player.x,
        self.player.y
      );
      this_tile.alreadySelected = true;
    }
  });
}

function update() {
  if (this.player) {
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-100);
      this.player.anims.play("left", true);
      this.player.direction = "left";
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(100);
      this.player.anims.play("right", true);
      this.player.direction = "right";
    } else if (this.cursors.up.isDown) {
      this.player.setVelocityY(-100);
      this.player.anims.play("up", true);
      this.player.direction = "up";
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(100);
      this.player.anims.play("down", true);
      this.player.direction = "down";
    } else {
      this.player.setVelocity(0);
      this.player.anims.play("turn");
      this.player.direction = "stand";
    }

    this.physics.world.wrap(this.player, 2);

    var x = this.player.x;
    var y = this.player.y;
    var r = this.player.rotation;
    var d = this.player.direction;
    if (
      this.player.oldPosition &&
      (x !== this.player.oldPosition.x ||
        y !== this.player.oldPosition.y ||
        r !== this.player.oldPosition.rotation ||
        d !== this.player.oldPosition.direction)
    ) {
      this.socket.emit("playerMovement", {
        x: this.player.x,
        y: this.player.y,
        rotation: this.player.rotation,
        direction: this.player.direction,
      });
    }

    this.player.oldPosition = {
      x: this.player.x,
      y: this.player.y,
      rotation: this.player.rotation,
      direction: this.player.direction,
    };

    var current_tile = this.platforms.getTileAtWorldXY(
      this.player.x,
      this.player.y,
      true
    );

    try {
      if (
        current_tile.index == 2 &&
        !current_tile.alreadySelected &&
        this.player.team === "red" &&
        !isSpyMaster &&
        isGameStarted
      ) {
        current_tile.tint = 0xff4343;
      } else if (
        current_tile.index == 2 &&
        !current_tile.alreadySelected &&
        this.player.team === "blue" &&
        !isSpyMaster &&
        isGameStarted
      ) {
        current_tile.tint = 0x50b9ff;
      }
      if (
        last_tile &&
        last_tile != current_tile &&
        !isSpyMaster &&
        !last_tile.alreadySelected
      ) {
        last_tile.tint = 0xffffff;
      }

      last_tile = current_tile;
    } catch (e) {
      // Do nothing if no index and world wrap will catch
    }
  }
}

function addPlayer(self, playerInfo) {
  self.player = self.physics.add.sprite(
    playerInfo.x,
    playerInfo.y,
    "char_sheet_1"
  );
  self.player.body.setSize(25, 33, true);
  self.player.name = playerInfo.name;
  self.player.team = playerInfo.team;
  self.player.playerId = playerInfo.playerId;

  self.anims.create({
    key: "left",
    frames: self.anims.generateFrameNumbers("char_sheet_1", {
      start: 12,
      end: 14,
    }),
    frameRate: 10,
    repeat: -1,
  });
  self.anims.create({
    key: "right",
    frames: self.anims.generateFrameNumbers("char_sheet_1", {
      start: 24,
      end: 26,
    }),
    frameRate: 10,
    repeat: -1,
  });
  self.anims.create({
    key: "up",
    frames: self.anims.generateFrameNumbers("char_sheet_1", {
      start: 36,
      end: 38,
    }),
    frameRate: 10,
    repeat: -1,
  });
  self.anims.create({
    key: "down",
    frames: self.anims.generateFrameNumbers("char_sheet_1", {
      start: 0,
      end: 2,
    }),
    frameRate: 10,
    repeat: -1,
  });
  self.anims.create({
    key: "turn",
    frames: [{ key: "char_sheet_1", frame: 1 }],
  });

  self.physics.add.collider(self.player, self.platforms);
  self.cameras.main.startFollow(self.player);
}

function addOtherPlayers(self, playerInfo) {
  var otherPlayer = self.add
    .sprite(playerInfo.x, playerInfo.y, "char_sheet_1")
    .setSize(25, 33, true);

  otherPlayer.playerId = playerInfo.playerId;
  otherPlayer.name = playerInfo.name;
  otherPlayer.team = playerInfo.team;

  if (otherPlayer.overheadName) otherPlayer.overheadName.destroy();

  var hexString = getTeamColor(playerInfo.team);
  otherPlayer.overheadName = self.add.text(
    playerInfo.x - 30,
    playerInfo.y - 40,
    otherPlayer.name,
    {
      fontFamily: "'Trebuchet MS', 'Lucida Sans', sans-serif",
      fontSize: "16px",
      fontStyle: "bold",
      fill: hexString,
    }
  );

  otherPlayer.overheadName.setShadow(1, 1, "black");

  self.otherPlayers.add(otherPlayer);
  self.physics.add.collider(otherPlayer, self.platforms);
}

function create_button(self, x, y, source) {
  var button;
  button = self.add.image(x, y, source).setInteractive();
  button.setScrollFactor(0);
  button.visible = false;
  button.on("pointerover", function () {
    button.setScale(1.1);
  });
  button.on("pointerout", function () {
    button.setScale(1);
  });
  return button;
}

function createAndFlashImage(self, x, y, image, repeat) {
  var this_image = self.add.image(x, y, image);
  this_image.setScrollFactor(0);
  var flashCount = 0;
  self.time.addEvent({
    delay: 300,
    callback: function () {
      flashCount++;
      this_image.visible = !this_image.visible;
      if (flashCount >= repeat) {
        this_image.destroy();
      }
    },
    callbackScope: this,
    repeat: repeat,
  });
}

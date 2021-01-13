// Ignore undefs, they exist
/*global Phaser, Phaser*/
/*global io, io*/

const DEBUG = true;
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
// labeled tile array
var unique_tile_id_counter = 0;
// holds wordList
var wordList = [];
var isSpyMaster = false;
var isGameStarted = false;
var currentTeamTurn;

new Phaser.Game(config); // Note(rudy): doesn't need assignment I guess, can just invoke

function preload() {
  this.load.image("tiles", "../assets/576x96-96x96.png");
  this.load.image("confirm", "../assets/button-confirm.png");
  this.load.spritesheet("char_sheet_1", "../assets/char_sheet_1.png", { frameWidth: 26, frameHeight: 36 });
}

function create() {
  // socket & self setup
  // need to assign scene object function this
  // to self in order to use it in a nested function
  var self = this;
  this.socket = io();

  this.cameras.main.setViewport(0, 0, 820, 820).setZoom(1.2); //.setZoom(1.5)

  const level = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1], //top
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 2, 2, 2, 2, 2, 0, 1],
    [1, 0, 2, 2, 2, 2, 2, 0, 1],
    [1, 0, 2, 2, 2, 2, 2, 0, 1],
    [1, 0, 2, 2, 2, 2, 2, 0, 1],
    [1, 0, 2, 2, 2, 2, 2, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1], // bottom
  ];

  const map = this.make.tilemap({
    data: level,
    tileWidth: 96,
    tileHeight: 96,
  });
  const tiles = map.addTilesetImage("tiles");
  this.platforms = map.createDynamicLayer(0, tiles, 0, 0);
  this.platforms.labels = [];

  // assign the tiles which will be labeled && assign unique id
  for (var i = 0; i < this.platforms.layer.data.length; i++) {
    for (var j = 0; j < this.platforms.layer.data.length; j++) {
      if (this.platforms.layer.data[i][j].index == 2) {
        this.platforms.labels.push(this.platforms.layer.data[i][j]);
        this.platforms.layer.data[i][j].uniqueID = unique_tile_id_counter++;
      }
    }
  }

  // Add physics before we generate players
  this.otherPlayers = this.physics.add.group();
  // Generate Player(s)
  this.socket.on("currentPlayers", function (players) {
    //console.log(players);
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

  this.socket.on("setScore", function (redScore = 0, blueScore = 0) {
    if (self.player.score) self.player.score.destroy();
    self.player.score = self.add.text(
      205,
      75,
      `Red Team:${redScore}/8                    Score                    Blue Team:${blueScore}/8`,
      {
        fontFamily: "Arial",
        fontSize: "16px",
        fontWeight: "bold",
        fill: "white",
      }
    );
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
      otherPlayer.overheadName.destroy();
      var hexString = assignRandomPhaserColor();
      otherPlayer.overheadName = self.add.text(
        otherPlayer.x - 30,
        otherPlayer.y - 40,
        players[otherPlayer.playerId].name,
        {
          fontFamily: "Arial",
          fontSize: "16px",
          fontWeight: "bold",
          fill: hexString,
        }
      );
      otherPlayer.overheadName.setShadow(1, 1, "black");
    });
  });

  this.socket.on("updatePlayerName", function (name) {
    var hexString = assignRandomPhaserColor();
    if (self.player.overheadName) self.player.overheadName.destroy();
    self.player.overheadName = self.add.text(390, 370, name, {
      fontFamily: "Arial",
      fontSize: "16px",
      fontWeight: "bold",
      fill: hexString,
    });

    self.player.overheadName.setShadow(1, 1, "black");
    self.player.overheadName.setScrollFactor(0);
  });

  this.socket.on("playerMoved", function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        //otherPlayer.setRotation(playerInfo.rotation);
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
  }); //playerMoved

  this.socket.on("showSpymasterBoard", function (wordBank) {
    isSpyMaster = true;
    const redTeamWords = Object.values(wordBank.redTeamWords);
    const blueTeamWords = Object.values(wordBank.blueTeamWords);
    //const neutralWords = Object.values(wordBank.neutralWords);
    const assassinWord = Object.values(wordBank.assassinWord);
    //console.log(assassinWord);
    var current_tile;
    for (var i = 0; i < self.platforms.labels.length; i++) {
      // Tint Red Team Words
      if (redTeamWords.includes(self.platforms.labels[i].text)) {
        current_tile = self.platforms.getTileAtWorldXY(
          self.platforms.labels[i].x,
          self.platforms.labels[i].y,
          true
        );
        current_tile.tint = 0xffcfcf;
      }
      // Tint Blue Team Words
      else if (blueTeamWords.includes(self.platforms.labels[i].text)) {
        current_tile = self.platforms.getTileAtWorldXY(
          self.platforms.labels[i].x,
          self.platforms.labels[i].y,
          true
        );
        current_tile.tint = 0x6bfeff;
      }
      // Tint Assassin Word
      else if (assassinWord.includes(self.platforms.labels[i].text)) {
        current_tile = self.platforms.getTileAtWorldXY(
          self.platforms.labels[i].x,
          self.platforms.labels[i].y,
          true
        );
        current_tile.tint = 0xff6bf3;
      } else {
        // Do nothing, neutral tiles
      }
    }
  });

  // TODO: wrap this in a promise in case it takes
  // longer than expected && Ensure it only happens
  // before the client's player is rendered. OR
  // make sure the player is always on top with layering?
  // Get Word List from server
  this.socket.on("wordList", function (data) {
    clone_array(data);
    // text assignment has to go in the socket function
    // so that it's ready at the same time. i think maybe
    // only way to do it without a promise
    for (var i = 0; i < self.platforms.labels.length; i++) {
      self.platforms.labels[i] = self.add.text(
        self.platforms.labels[i].pixelX + 10,
        self.platforms.labels[i].pixelY + 30,

        wordList[i],
        {
          fontFamily: "Verdana",
          fontWeight: "bold",
          fontSize: "14px",
          fill: "#000",
        }
      );
    }
  });

  // Bind keys
  this.cursors = this.input.keyboard.createCursorKeys();

  // Chat client functions
  // TODO: Once players can choose their own names
  // Prepend 'Player: ' to each message.
  const chatMessage = (text, name) => {
    const parent = document.querySelector("#events");
    const el = document.createElement("li");
    el.innerHTML = name + ": " + text;
    parent.appendChild(el);
  };
  const eventMessage = (text, color = "black") => {
    const parent = document.querySelector("#events");
    const el = document.createElement("li");
    if (color === "red") el.className = "event-message-red";
    else if (color === "blue") el.className = "event-message-blue";
    else el.className = "event-message-black";
    el.innerHTML = text;
    parent.appendChild(el);
  };

  const evalAnswer = (text) => {
    console.log(text);
  };

  const onChatSubmitted = (e) => {
    e.preventDefault();
    const input = document.querySelector("#chat");
    if (DEBUG && input.value[0] === "/") {
      this.socket.emit("evalServer", input.value.slice(1));
    } else this.socket.emit("chatMessage", input.value);
    input.value = ""; // Clear text after send
  };

  const onNameSubmitted = (e) => {
    e.preventDefault();
    const input = document.querySelector("#playerName");
    this.socket.emit("setPlayerName", input.value);
    input.value = ""; // Clear text after send
  };

  const updateTeams = (players) => {
    removePlayersFromTable();

    Object.keys(players).forEach(function (id) {
      let parent;
      let td;
      let tr;
      if (players[id].team === "red") {
        parent = document.querySelector("#redTeamTable");
        tr = document.createElement("tr");
        td = document.createElement("td");
        td.innerHTML = players[id].name;
      } else if (players[id].team === "blue") {
        parent = document.querySelector("#blueTeamTable");
        tr = document.createElement("tr");
        td = document.createElement("td");
        td.innerHTML = players[id].name;
      }

      if (players[id].team === "red") {
        tr.className = "red-team-member";
        tr.appendChild(td);
        parent.appendChild(tr);
      } else if (players[id].team === "blue") {
        tr.className = "blue-team-member";
        tr.appendChild(td);
        parent.appendChild(tr);
      }
    });
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
    for (var i = 1; i < 9; i++) {
      const parent = document.querySelector("#spymasters");
      const el = document.createElement("button");
      if (i == 1) el.innerHTML = `Give team ${i} word`;
      else el.innerHTML = `Give team ${i} words`;
      el.id = `word${i}`;
      parent.appendChild(el);
      document
        .getElementById(`word${i}`)
        .addEventListener("click", spyMasterButtonListeners);
    }
  };

  const spyMasterButtonListeners = (e) => {
    var targetElement = e.target;
    // only allow if its the current spymaster's turn
    if (currentTeamTurn == self.player.team)
      this.socket.emit("SpymasterSubmitsNumber", targetElement.id);
  };

  this.socket.on("gameStarted", function (turn, redSpy, blueSpy) {
    isGameStarted = true;
    currentTeamTurn = turn;
    const button = document.getElementById("newGame");
    button.style = "display:none";

    // if this player is spymaster give them a set of buttons to use on their turn
    if (isSpyMaster) {
      // check team, give buttons
      createSpyMasterButtons();
    } else {
      // tell players who spymasters are
      showSpymastersToPlayers(redSpy, blueSpy);
    }
  });

  // Dom event listeners
  document
    .querySelector("#chat-form")
    .addEventListener("submit", onChatSubmitted);
  document
    .querySelector("#name-form")
    .addEventListener("submit", onNameSubmitted);
  document
    .getElementById("redTeamButton")
    .addEventListener("click", joinRedTeam);
  document
    .getElementById("blueTeamButton")
    .addEventListener("click", joinBlueTeam);
  document.getElementById("newGame").addEventListener("click", startNewGame);
  // socket.on dom events
  this.socket.on("chatMessage", chatMessage);
  this.socket.on("evalAnswer", evalAnswer);
  this.socket.on("eventMessage", eventMessage);
  this.socket.on("updateTeams", updateTeams);

  confirm_button = create_button(self, GAME_WIDTH / 2, 725, "confirm");
  confirm_button.on("pointerdown", function () {
    var this_tile = self.platforms.getTileAtWorldXY(
      self.player.x,
      self.player.y,
      true
    );
    //console.log(self.platforms.labels[this_tile.uniqueID].text);
    confirm_button.toggle = "off";
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
      self.player.team
    );
  });
} // --> create()

function update() {
  // Player movement handlers
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

    // emit player movement
    var x = this.player.x;
    var y = this.player.y;
    var r = this.player.rotation;
    var d = this.player.direction;
    // only if the values changed
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

    // save old position data
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
      // wrap in try in case player tries to go off map
      if (
        current_tile.index == 2 &&
        this.player.team === "red" &&
        confirm_button.toggle === "on" &&
        !isSpyMaster &&
        isGameStarted
      ) {
        current_tile.tint = 0xffcfcf; //light red
        confirm_button.visible = true;
      } else if (
        current_tile.index == 2 &&
        this.player.team === "blue" &&
        confirm_button.toggle === "on" &&
        !isSpyMaster &&
        isGameStarted //&&
      ) {
        current_tile.tint = 0x6bfeff; //light blue
        confirm_button.visible = true;
      }
      if (last_tile && last_tile != current_tile && isSpyMaster == false) {
        last_tile.tint = 0xffffff; //clears
      }
      if (current_tile.index != 2 || confirm_button.toggle != "on") {
        confirm_button.visible = false;
      }
      last_tile = current_tile;
    } catch (e) {
      // Do nothing if no index and world wrap will catch
    }
  } // --> player movement + tile + emit
} // --> update()

function addPlayer(self, playerInfo) {
  console.log("adding player");
  self.player = self.physics.add.sprite(
    playerInfo.x,
    playerInfo.y,
    "char_sheet_1"
  );
  self.player.body.setSize(25, 33, true);
  //self.player.body.offset.y = 38;
  //self.player.setBounce(0.2);
  self.player.name = playerInfo.name;
  self.player.team = playerInfo.team;
  self.player.playerId = playerInfo.playerId;

  // player animations
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
    //frameRate: 20
  });

  self.physics.add.collider(self.player, self.platforms);
  // camera follows player
  self.cameras.main.startFollow(self.player);
}

function addOtherPlayers(self, playerInfo) {
  console.log("adding another player");
  var otherPlayer = self.add
    .sprite(playerInfo.x, playerInfo.y, "char_sheet_1")
    .setSize(25, 33, true);

  otherPlayer.playerId = playerInfo.playerId;
  otherPlayer.name = playerInfo.name;
  otherPlayer.team = playerInfo.team;

  // Destroy if exists
  if (otherPlayer.overheadName) otherPlayer.overheadName.destroy();
  // Give team color if exists else give random color

  var hexString = assignRandomPhaserColor();
  otherPlayer.overheadName = self.add.text(
    playerInfo.x - 30,
    playerInfo.y - 40,
    otherPlayer.name,
    {
      fontFamily: "Arial",
      fontSize: "16px",
      fontWeight: "bold",
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
  button.toggle = "on";
  return button;
}

function clone_array(source) {
  for (var i = 0; i < source.length; i++) {
    wordList[i] = source[i];
  }
  //console.log(wordList);
}

// Note(rudy): its ok to disable this because
// object props are hardcoded
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

function assignRandomPhaserColor() {
  var newColor = new Phaser.Display.Color();
  newColor.random(0, 255);
  var convertColor = Phaser.Display.Color.RGBToString(
    newColor.r,
    newColor.g,
    newColor.b,
    newColor.a
  );
  return convertColor;
}

// Debugging

// player object
// game.scene.scenes[0].player
// example:
// game.scene.scenes[0].player.name

// GRAVEYARD

/* bitmap text
    for (var i = 0; i < tileLabels.length; i++) {
    tileLabels[i] = this.add.bitmapText(
        tileLabels[i].pixelX + 10,
        tileLabels[i].pixelY + 30,

        
        // for now just get locally to test
        'myFont',
        code1[i]
        
    );
}
*/

//    var players = ['jake', 'john', 'paul'];

//    for (let i=0; i < players.length; i++) {
//    let parent = document.querySelector('#blueTeamTable');
//    let tr = document.createElement('tr');
//    let td = document.createElement('td');
//    td.innerHTML = players[i];
//    tr.className="blue-team-member";
//    tr.appendChild(td);
//    parent.appendChild(tr);
//   }

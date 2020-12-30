const DEBUG = true;
const GAME_WIDTH = 820;
const GAME_HEIGHT = 820;

var config = {
    type: Phaser.AUTO,
    parent: 'game',
    pixelArt: false,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

//global game variables here
code1 = [
    "Hollywood",
    "Screen",
    "Play",
    "Marble",
    "Dinosaur",
    "Cat",
    "Pitch",
    "Bond",
    "Greece",
    "Deck",
    "Spike",
    "Center",
    "Vacuum",
    "Unicorn",
    "Undertaker",
    "Sock",
    "Loch Ness",
    "Horse",
    "Berlin",
    "Platypus",
    "Port",
    "Chest",
    "Box",
    "Compound",
    "Ship",
    "Watch",
    "Space",
    "Flute",
    "Tower",
    "Death",
];
// ^^ erase after ttesting 
var last_tile;
var confirm_button;
  // labeled tile array
 



const game = new Phaser.Game(config);

function preload() {
    this.load.image('sky', '../assets/sky.png');
    this.load.image('space', '../assets/space.png');
    this.load.image('ground', '../assets/platform.png');
    this.load.image("tiles", "../assets/576x96-96x96.png");
    this.load.image("confirm", "../assets/button-confirm.png");
    this.load.spritesheet('char_sheet_1', '../assets/future1.png', { frameWidth: 26, frameHeight: 36 });
    //this.load.bitmapFont('myFont', '../assets/font_0.png', '../assets/font.fnt');
}

function create() {

    // socket & self setup
    var self = this;
    this.socket = io();

    // Generate world
    //this.add.image(0, 0, 'space');


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


  
    // assign the tiles which will be labeled
    for (var i = 0; i < this.platforms.layer.data.length; i++) {
        for (var j = 0; j < this.platforms.layer.data[i].length; j++) {
            if (this.platforms.layer.data[i][j].index == 2) {
                this.platforms.labels.push(this.platforms.layer.data[i][j]);
            }
        }
    }
    //console.log(tileLabels);

    // assign labels to tiles
    for (var i = 0; i < this.platforms.labels.length; i++) {
        this.platforms.labels[i] = this.add.text(
            this.platforms.labels[i].pixelX + 10,
            this.platforms.labels[i].pixelY + 30,

            // for now just get locally to test
            code1[i],
            {
                fontFamily: "Verdana",
                fontWeight: "bold",
                fontSize: "14px",
                fill: "#000",
            }
        );
    }
    
    // Generate Player(s)
    this.otherPlayers = this.physics.add.group();
    this.socket.on('currentPlayers', function (players) {
        //console.log(players);
        Object.keys(players).forEach(function (id) {
            if (players[id].playerId === self.socket.id) {
                addPlayer(self, players[id]);
            } else {
                addOtherPlayers(self, players[id]);
            }
        });
    });
    this.socket.on('newPlayer', function (playerInfo) {
        addOtherPlayers(self, playerInfo);
    });
    this.socket.on('userQuit', function (playerId) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerId === otherPlayer.playerId) {
                otherPlayer.destroy();
            }
        });
    });

    this.socket.on('playerMoved', function (playerInfo) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.setRotation(playerInfo.rotation);
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                if (playerInfo.direction == 'left') {
                    otherPlayer.anims.play('left', true);
                }
                else if (playerInfo.direction == 'right') {
                    otherPlayer.anims.play('right', true);
                }
                else if (playerInfo.direction == 'up') {
                    otherPlayer.anims.play('up', true);
                }
                else if (playerInfo.direction == 'down') {
                    otherPlayer.anims.play('down', true);
                }
                else
                    otherPlayer.anims.play('turn', true);
            }
        });
    });

    // Bind keys
    this.cursors = this.input.keyboard.createCursorKeys();

    // Chat client functions
    const writeEvent = (text) => {
        /* Writes string to the #events element */
        // <ul> element
        const parent = document.querySelector('#events');
        // <li> element
        const el = document.createElement('li');
        el.innerHTML = text;
        parent.appendChild(el);
    };
    const evalAnswer = (text) => {
        console.log(text);
    };

    const onFormSubmitted = (e) => {
        e.preventDefault();

        const input = document.querySelector('#chat');

        if (DEBUG && input.value[0] === '/') {
            this.socket.emit('evalServer', input.value.slice(1));
        }
        else
            this.socket.emit('message', input.value);

        input.value = ''; // Clear text after send
    };

    // Chat event listener
    document.querySelector('#chat-form').addEventListener('submit', onFormSubmitted);
    // Whenever sock.on 'message' happens, call writeEvent
    this.socket.on('message', writeEvent);
    this.socket.on('evalAnswer', evalAnswer);

    confirm_button = create_button(self, (GAME_WIDTH / 2), 725, 'confirm');
    confirm_button.on("pointerdown", function (pointer) {

            //console.log(self.platforms.labels);
            var this_tile = self.platforms.getTileAtWorldXY(self.player.x, self.player.y, true);
            console.log(this_tile);
            console.log(self.platforms);
            //var a = self.platforms.labels.indexOf(this_tile);
        
        
        //console.log(check_current_tile.layer.tilemapLayer.labels[index_value_x + index_value_y].text);
        //var tile_text = tileLabels[check_current_tile.x];
       
        confirm_button.toggle = 'off';
        //self.socket.emit('message', self.player.name + ' confirmed the word ' + tile_text + ' !');
      });

}

function update() {

    // Player movement handlers
    if (this.player) {
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-100);
            this.player.anims.play('left', true);
            this.player.direction = 'left';
        }
        else if (this.cursors.right.isDown) {
            this.player.setVelocityX(100);
            this.player.anims.play('right', true);
            this.player.direction = 'right';
        }
        else if (this.cursors.up.isDown) {
            this.player.setVelocityY(-100);
            this.player.anims.play('up', true);
            this.player.direction = 'up';
        }
        else if (this.cursors.down.isDown) {
            this.player.setVelocityY(100);
            this.player.anims.play('down', true);
            this.player.direction = 'down';
        } else {
            this.player.setVelocity(0);
            this.player.anims.play('turn');
            this.player.direction = 'stand';
        }

        this.physics.world.wrap(this.player, 2);

        // emit player movement
        var x = this.player.x;
        var y = this.player.y;
        var r = this.player.rotation;
        var d = this.player.direction;
        // only if the values changed
        if (this.player.oldPosition && (x !== this.player.oldPosition.x || y !== this.player.oldPosition.y || r !== this.player.oldPosition.rotation || d !== this.player.oldPosition.direction)) {
            this.socket.emit('playerMovement', { x: this.player.x, y: this.player.y, rotation: this.player.rotation, direction: this.player.direction });
        }

        // save old position data
        this.player.oldPosition = {
            x: this.player.x,
            y: this.player.y,
            rotation: this.player.rotation,
            direction: this.player.direction
        };

        
        var current_tile = this.platforms.getTileAtWorldXY(this.player.x, this.player.y, true);
        
        try{ // wrap in try in case player tries to go off map
        if (current_tile.index == 2 && this.player.team === 'red' && confirm_button.toggle === 'on'){
            current_tile.tint = 0xFFCFCF; //light red
            confirm_button.visible = true;
        }
        else if (current_tile.index == 2 && this.player.team === 'blue' && confirm_button.toggle === 'on'){
            current_tile.tint = 0x85C1E9; //light blue
            confirm_button.visible = true;
        }
        if (last_tile && last_tile != current_tile) {
            last_tile.tint = 0xffffff; //clears 
        }
        if (current_tile.index != 2 || confirm_button.toggle != 'on'){
            confirm_button.visible = false;
        }
        last_tile = current_tile;
    }
    catch(e){
        // Do nothing if no index and world wrap will catch
    }
    } // --> player movement + tile + emit

} // --> update()

function addPlayer(self, playerInfo) {
    console.log('adding player');
    self.player = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'char_sheet_1');
    self.player.body.setSize(25, 33, true);
    //self.player.body.offset.y = 38;
    self.player.setBounce(0.2);
    self.player.name = playerInfo.name;
    self.player.team = playerInfo.team;
    if (playerInfo.team === 'blue') {
        //self.player.setTint(0x0000ff);
    } else {
        //self.player.setTint(0xff0000);
    }
    // player animations
    self.anims.create({
        key: 'left',
        frames: self.anims.generateFrameNumbers('char_sheet_1', { start: 12, end: 14 }),
        frameRate: 10,
        repeat: -1
    });
    self.anims.create({
        key: 'right',
        frames: self.anims.generateFrameNumbers('char_sheet_1', { start: 24, end: 26 }),
        frameRate: 10,
        repeat: -1
    });
    self.anims.create({
        key: 'up',
        frames: self.anims.generateFrameNumbers('char_sheet_1', { start: 36, end: 38 }),
        frameRate: 10,
        repeat: -1
    });
    self.anims.create({
        key: 'down',
        frames: self.anims.generateFrameNumbers('char_sheet_1', { start: 0, end: 2 }),
        frameRate: 10,
        repeat: -1
    });
    self.anims.create({
        key: 'turn',
        frames: [{ key: 'char_sheet_1', frame: 1 }]
        //frameRate: 20
    });

    self.physics.add.collider(self.player, self.platforms);
    // camera follows player
    self.cameras.main.startFollow(self.player);
}

function addOtherPlayers(self, playerInfo) {
    console.log('adding another player');
    var otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'char_sheet_1').setSize(25, 33, true);
    if (playerInfo.team === 'blue') {
        //otherPlayer.setTint(0x0000ff);
    } else {
        //otherPlayer.setTint(0xff0000);
    }
    otherPlayer.playerId = playerInfo.playerId;
    otherPlayer.name = playerInfo.name;
    otherPlayer.team = playerInfo.team;
    self.otherPlayers.add(otherPlayer);

    self.physics.add.collider(otherPlayer, self.platforms);
}

function create_button(self, x, y, source){
    var button;
    button = self.add.image(x, y, source).setInteractive();
    button.setScrollFactor(0);
    button.visible = false;
    button.on("pointerover", function (pointer) {
        button.setScale(1.1);
      });
      button.on("pointerout", function (pointer) {
        button.setScale(1);
      });
      button.toggle = 'on';
    return button;
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
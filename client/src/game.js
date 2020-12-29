
var config = {
    type: Phaser.AUTO,
    parent: 'game',
    pixelArt: true,
    width: 820,
    height: 820,
    physics: {
        default: 'arcade',
        arcade: {
            //gravity: { y: 300 },
            debug: true
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

//global game variables here

var game = new Phaser.Game(config);
//var platforms; // ground
//var cursors; // keys to move

//end global game variables

function preload() {
    this.load.image('sky', '../assets/sky.png');
    this.load.image('space', '../assets/space.png');
    this.load.image('ground', '../assets/platform.png');
    this.load.spritesheet('char_sheet_1', '../assets/future1.png', { frameWidth: 26, frameHeight: 36 });


    this.load.image("tiles", "../assets/576x96-96x96.png");
    this.load.image("tiles_resized", "../assets/resized.png");

}

function create() {

    // socket & self setup
    var self = this;
    this.socket = io();

    // Generate world
   //this.add.image(0, 0, 'space');

    //this.cameras.main.setViewport(0, 0, 800, 600).setZoom(1.2); //.setZoom(1.5)

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



    // bind keys
    this.cursors = this.input.keyboard.createCursorKeys();


    /*
    Client Chat functions
    */

    const writeEvent = (text) => {
        /* Writes string to the #events element */
        // <ul> element
        const parent = document.querySelector('#events');

        // <li> element
        const el = document.createElement('li');
        el.innerHTML = text;

        parent.appendChild(el);

    };

    const onFormSubmitted = (e) => {
        e.preventDefault();

        const input = document.querySelector('#chat');
        const text = input.value;
        input.value = '';

        this.socket.emit('message', text);

    };

    // --- event listeners
    document.querySelector('#chat-form').addEventListener('submit', onFormSubmitted);

    // --> END HTML DOCUMENT JS Functions

    // initialize socket.io


    // Whenever sock.on 'message' happens, call writeEvent
    this.socket.on('message', writeEvent);
}

function update() {
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
        if (this.player.oldPosition && (x !== this.player.oldPosition.x || y !== this.player.oldPosition.y || r !== this.player.oldPosition.rotation)) {
            this.socket.emit('playerMovement', { x: this.player.x, y: this.player.y, rotation: this.player.rotation, direction: this.player.direction });
        }

        // save old position data
        this.player.oldPosition = {
            x: this.player.x,
            y: this.player.y,
            rotation: this.player.rotation
        };
    }
}

function addPlayer(self, playerInfo) {
    console.log('adding player');
    self.player = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'char_sheet_1');
    self.player.body.setSize(25, 33, true);
    //self.player.body.offset.y = 38;
    self.player.setBounce(0.2);
    if (playerInfo.team === 'blue') {
        //self.player.setTint(0x0000ff);
    } else {
        //self.player.setTint(0xff0000);
    }
    //  Our player animations, turning, walking left and walking right.
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
    self.otherPlayers.add(otherPlayer);

    self.physics.add.collider(otherPlayer, self.platforms);
}


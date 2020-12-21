
var config = {
    type: Phaser.AUTO,
    parent: 'game',
    pixelArt: true,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
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
var platforms; // ground
var cursors; // keys to move

//end global game variables

function preload()
{
    this.load.image('sky', '../assets/sky.png');
    this.load.image('ground', '../assets/platform.png');
    this.load.spritesheet('char_sheet_1', '../assets/future1.png', { frameWidth: 26, frameHeight: 36 });
}



function create()
{

    //  A simple background for our game
    this.add.image(400, 300, 'sky');

    //  The platforms group contains the ground and the 2 ledges we can jump on
    this.platforms = this.physics.add.staticGroup();

    //  Here we create the ground.
    //  Scale it to fit the width of the game (the original sprite is 400x32 in size)
    this.platforms.create(400, 568, 'ground').setScale(2).refreshBody();


    var self = this;
    this.socket = io();
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
            if (playerInfo.direction == 'left'){
                otherPlayer.anims.play('left', true);
            }
            else if (playerInfo.direction == 'right') {
                otherPlayer.anims.play('right', true);
            }
            else
            otherPlayer.anims.play('turn', true);
          }
        });
      });



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

function update()
{
    if (this.player)
    {
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-100);
            this.player.anims.play('left', true);
            this.player.direction = 'left';
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(100);
            this.player.anims.play('right', true);
            this.player.direction = 'right';
        } else {
            this.player.setVelocityX(0);
            this.player.anims.play('turn');
            this.player.direction = 'stand';
        }

        this.physics.world.wrap(this.player, 5);

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

function addPlayer(self, playerInfo){
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
            key: 'turn',
            frames: [ { key: 'char_sheet_1', frame: 1 } ],
            frameRate: 20
        });
    
        self.anims.create({
            key: 'right',
            frames: self.anims.generateFrameNumbers('char_sheet_1', { start: 24, end: 26 }),
            frameRate: 10,
            repeat: -1
        });

        self.physics.add.collider(self.player, self.platforms);
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


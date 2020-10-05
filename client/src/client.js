
// HTML DOCUMENT JS Functions

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

    sock.emit('message', text);

};

// --- event listeners
document.querySelector('#chat-form').addEventListener('submit', onFormSubmitted);

// --> END HTML DOCUMENT JS Functions

// initialize socket.io
var sock = io();

// Whenever sock.on 'message' happens, call writeEvent
sock.on('message', writeEvent);


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
var players = []; //array of players
var player; // a single player
var socket; // keep track of socket
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
    platforms = this.physics.add.staticGroup();

    //  Here we create the ground.
    //  Scale it to fit the width of the game (the original sprite is 400x32 in size)
    platforms.create(400, 568, 'ground').setScale(2).refreshBody();

    // Start a socket connection to the server
    socket = io.connect('http://localhost:8000');

    player = this.physics.add.sprite(100,100,'char_sheet_1');

    var data = {
        x: player.x,
        y: player.y
    };
    
    player.body.setSize(25, 33, true);
    player.body.offset.y = 38;
    player.setBounce(0.2);
    this.physics.add.collider(player, platforms);


    //  Our player animations, turning, walking left and walking right.
    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('char_sheet_1', { start: 12, end: 14 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'turn',
        frames: [ { key: 'char_sheet_1', frame: 1 } ],
        frameRate: 20
    });

    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('char_sheet_1', { start: 24, end: 26 }),
        frameRate: 10,
        repeat: -1
    });
  

    cursors = this.input.keyboard.createCursorKeys();

    socket.emit('newPlayer', data);
  
}

function update()
{
    if (cursors.left.isDown)
    {
        player.setVelocityX(-160);

        player.anims.play('left', true);
    }
    else if (cursors.right.isDown)
    {
        player.setVelocityX(160);

        player.anims.play('right', true);
    }
    else
    {
        player.setVelocityX(0);

        player.anims.play('turn');
    }

    if (cursors.up.isDown && player.body.touching.down)
    {
        player.setVelocityY(-330);
    }

    var data = {
        x: player.x,
        y: player.y
    };

    socket.emit('update', data)
}



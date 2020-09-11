
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



//writeEvent("string");

const addButtonListeners = () => {
    ['rock', 'paper', 'scissors'].forEach((id) => {
        const button = document.getElementById(id);
        button.addEventListener('click', () => {
            sock.emit('turn', id);
        });
    });
};

const sock = io();

// Whenever sock.on 'message' happens, call writeEvent
sock.on('message', writeEvent);

// --> END HTML DOCUMENT JS Functions

// -- game logic (for now)


var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
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

//var game = new Phaser.Game(config);


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

    // The player and its settings
    player = this.physics.add.sprite(100, 450, 'char_sheet_1');

    //  Player physics properties. Give the little guy a slight bounce.
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);
    player.setScale(2);

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

    //  Input Events
    cursors = this.input.keyboard.createCursorKeys();

    
    //  Collide the player and the stars with the platforms
    this.physics.add.collider(player, platforms);
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
}


window.addEventListener('load', () => {
  const game = new Game(config)
})


// --- event listeners
document.querySelector('#chat-form').addEventListener('submit', onFormSubmitted)
addButtonListeners();

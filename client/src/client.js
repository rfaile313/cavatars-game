
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

// --> END HTML DOCUMENT JS Functions

// initialize socket.io
const sock = io();

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
var player = []; //array of players

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

    // Create players and add to array
    
    for (var i = 0; i < 8; i++) {
        player.push(i);
        player[i] = this.physics.add.sprite(Math.random(100,200), Math.random(400,500), 'char_sheet_1');
        player[i].setBounce(0.2);
        player[i].setCollideWorldBounds(true);
        player[i].setScale(2);
        this.physics.add.collider(player[i], platforms);
        player[i].visible = false;
        
      }
      

    // player[0].visible = true;

    sock.on('newplayer', (id) => {
        
        console.log("new player: #" + id);
        
        if (id == 0){
            player[0].visible = true;
            // only make player[0] visible
        }
        else{
            
            for (var i=0; i <= id; i++ ) {
                player[i].visible = true;
                console.log("making player: " + i + " visible");
            }
        }

        
    });

    sock.on('removeplayer', (id) => {
       

        console.log("player #" + id + " disconnected.");
    });

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

    // tell server we're ready for a player
    sock.emit('newPlayerReady');
  
}

/*
function create_player(image){

}
*/

function update()
{

    if (cursors.left.isDown)
    {
        sock.emit('playerMove', 'left');

    }
    else if (cursors.right.isDown)
    {
        sock.emit('playerMove', 'right');

    }
    else
    {
        sock.emit('playerMove', 'still');
    }

    sock.on('direction', (direction, data) => {

        if (direction === 'left'){
            player[data.id].setVelocityX(-160);

            player[data.id].anims.play('left', true);
        }
        else if (direction === 'right'){
            player[data.id].setVelocityX(160);

            player[data.id].anims.play('right', true);
        }
        else { //stilll
            player[data.id].setVelocityX(0);

            player[data.id].anims.play('turn');
        }

    });

    /*
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
    */
}


// --- event listeners
document.querySelector('#chat-form').addEventListener('submit', onFormSubmitted)

class WordBank {

  constructor() {
    this.initialWordList = [];
    this.wordList = [];
    this.blueTeamWords = [];
    this.redTeamWords = [];
    this.neutralWords = [];
    this.assasinWord = [];
    const selectList = this.getRandomInt(7); //change this if you add more lists
    
    switch (selectList) {
      case 0:
        this.initialWordList = [
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
        break;
      case 1:
        this.initialWordList = [
          "Well",
          "Fair",
          "Tooth",
          "Staff",
          "Bill",
          "Shot",
          "King",
          "Pan",
          "Square",
          "Buffalo",
          "Scientist",
          "Chick",
          "Atlantis",
          "Spy",
          "Mail",
          "Nut",
          "Log",
          "Pirate",
          "Face",
          "Stick",
          "Disease",
          "Yard",
          "Mount",
          "Slug",
          "Dice",
          "Lead",
          "Hook",
          "Carrot",
          "Poison",
          "Stock",
        ];
        break;
      case 2:
        this.initialWordList = [
          "Foot",
          "Torch",
          "Arm",
          "Figure",
          "Mine",
          "Suit",
          "Crane",
          "Beijing",
          "Mass",
          "Microscope",
          "Engine",
          "China",
          "Straw",
          "Pants",
          "Europe",
          "Boot",
          "Princess",
          "Link",
          "Luck",
          "Olive",
          "Palm",
          "Teacher",
          "Thumb",
          "Octopus",
          "Hood",
          "Tie",
          "Doctor",
          "Wake",
          "Cricket",
          "Millionaire",
        ];
        break;
      case 3:
        this.initialWordList = [
          "New York",
          "State",
          "Bermuda",
          "Park",
          "Turkey",
          "Chocolate",
          "Trip",
          "Racket",
          "Bat",
          "Jet",
          "Shakespeare",
          "Bolt",
          "Switch",
          "Wall",
          "Soul",
          "Ghost",
          "Time",
          "Dance",
          "Amazon",
          "Grace",
          "Moscow",
          "Pumpkin",
          "Antarctica",
          "Whip",
          "Heart",
          "Table",
          "Ball",
          "Fighter",
          "Cold",
          "Day",
        ];
        break;
      case 4:
        this.initialWordList = [
          "Spring",
          "Match",
          "Diamond",
          "Centaur",
          "March",
          "Roulette",
          "Dog",
          "Cross",
          "Wave",
          "Duck",
          "Wind",
          "Spot",
          "Skyscraper",
          "Paper",
          "Apple",
          "Oil",
          "Cook",
          "Fly",
          "Cast",
          "Bear",
          "Pin",
          "Thief",
          "Trunk",
          "America",
          "Novel",
          "Cell",
          "Bow",
          "Model",
          "Knife",
          "Knight",
        ];
        break;
      case 5:
        this.initialWordList = [
          "Court",
          "Iron",
          "Whale",
          "Shadow",
          "Contract",
          "Mercury",
          "Conductor",
          "Seal",
          "Car",
          "Ring",
          "Kid",
          "Piano",
          "Laser",
          "Sound",
          "Pole",
          "Superhero",
          "Revolution",
          "Pit",
          "Gas",
          "Glass",
          "Washington",
          "Bark",
          "Snow",
          "Ivory",
          "Pipe",
          "Cover",
          "Degree",
          "Tokyo",
          "Church",
          "Pie"
        ];
        break;
    } // switch


    for (var i = 0; i < 25; i++) {
      if (i < 8) {
        var temp = this.getRandomWord();
        this.blueTeamWords.push(temp);
        this.wordList.push(temp);
        this.removeWord(temp);
      }
      if (i >= 8 && i < 16) {
        var temp = this.getRandomWord();
        this.redTeamWords.push(temp);
        this.wordList.push(temp);
        this.removeWord(temp);
      }
      if (i >= 16 && i < 24) {
        var temp = this.getRandomWord();
        this.neutralWords.push(temp);
        this.wordList.push(temp);
        this.removeWord(temp);
      }
      if (i >= 24 && i < 25) {
        var temp = this.getRandomWord();
        this.assasinWord.push(temp);
        this.wordList.push(temp);
        this.removeWord(temp);
      }

    }

  }

  getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  } //randint

  getRandomWord() {
    var currentLength = this.initialWordList.length;
    var returnOne = this.initialWordList[Math.floor(Math.random() * currentLength)];
    return returnOne;
  }

  removeWord(word) {
    const index = this.initialWordList.indexOf(word);
    if (index !== -1) {
      this.initialWordList.splice(index, 1);
    }
  }

} //class WordBank

module.exports = WordBank;



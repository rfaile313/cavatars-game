const WORD_SETS = [
  [
    "Hollywood", "Screen", "Play", "Marble", "Dinosaur",
    "Cat", "Pitch", "Bond", "Greece", "Deck",
    "Spike", "Center", "Vacuum", "Unicorn", "Undertaker",
    "Sock", "Loch Ness", "Horse", "Berlin", "Platypus",
    "Port", "Chest", "Box", "Compound", "Ship",
    "Watch", "Space", "Flute", "Tower", "Death",
  ],
  [
    "Well", "Fair", "Tooth", "Staff", "Bill",
    "Shot", "King", "Pan", "Square", "Buffalo",
    "Scientist", "Chick", "Atlantis", "Spy", "Mail",
    "Nut", "Log", "Pirate", "Face", "Stick",
    "Disease", "Yard", "Mount", "Slug", "Dice",
    "Lead", "Hook", "Carrot", "Poison", "Stock",
  ],
  [
    "Foot", "Torch", "Arm", "Figure", "Mine",
    "Suit", "Crane", "Beijing", "Mass", "Microscope",
    "Engine", "China", "Straw", "Pants", "Europe",
    "Boot", "Princess", "Link", "Luck", "Olive",
    "Palm", "Teacher", "Thumb", "Octopus", "Hood",
    "Tie", "Doctor", "Wake", "Cricket", "Millionaire",
  ],
  [
    "New York", "State", "Bermuda", "Park", "Turkey",
    "Chocolate", "Trip", "Racket", "Bat", "Jet",
    "Shakespeare", "Bolt", "Switch", "Wall", "Soul",
    "Ghost", "Time", "Dance", "Amazon", "Grace",
    "Moscow", "Pumpkin", "Antarctica", "Whip", "Heart",
    "Table", "Ball", "Fighter", "Cold", "Day",
  ],
  [
    "Spring", "Match", "Diamond", "Centaur", "March",
    "Roulette", "Dog", "Cross", "Wave", "Duck",
    "Wind", "Spot", "Skyscraper", "Paper", "Apple",
    "Oil", "Cook", "Fly", "Cast", "Bear",
    "Pin", "Thief", "Trunk", "America", "Novel",
    "Cell", "Bow", "Model", "Knife", "Knight",
  ],
  [
    "Court", "Iron", "Whale", "Shadow", "Contract",
    "Mercury", "Conductor", "Seal", "Car", "Ring",
    "Kid", "Piano", "Laser", "Sound", "Pole",
    "Superhero", "Revolution", "Pit", "Gas", "Glass",
    "Washington", "Bark", "Snow", "Ivory", "Pipe",
    "Cover", "Degree", "Tokyo", "Church", "Pie",
  ],
];

class WordBank {
  constructor() {
    this.initialWordList = [];
    this.wordList = [];
    this.blueTeamWords = [];
    this.redTeamWords = [];
    this.neutralWords = [];
    this.assassinWord = [];

    const selectList = Math.floor(Math.random() * WORD_SETS.length);
    this.initialWordList = [...WORD_SETS[selectList]];

    for (var i = 0; i < 25; i++) {
      var randomElement = this.initialWordList[Math.floor(Math.random() * this.initialWordList.length)];
      if (i < 8) {
        this.blueTeamWords.push(randomElement);
        this.wordList.push(randomElement);
      }
      if (i >= 8 && i < 16) {
        this.redTeamWords.push(randomElement);
        this.wordList.push(randomElement);
      }
      if (i >= 16 && i < 24) {
        this.neutralWords.push(randomElement);
        this.wordList.push(randomElement);
      }
      if (i >= 24 && i < 25) {
        this.assassinWord.push(randomElement);
        this.wordList.push(randomElement);
      }
      this.removeWord(randomElement);
    }
    this.shuffle(this.wordList);
  }

  removeWord(word) {
    const index = this.initialWordList.indexOf(word);
    if (index !== -1) {
      this.initialWordList.splice(index, 1);
    }
  }

  shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    return array;
  }
}

module.exports = WordBank;

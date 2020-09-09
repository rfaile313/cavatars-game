
class CodenamesGame {

    constructor(p1,p2) {
        this._players = [p1, p2];
        this._turns = [null, null];

        this._sendToPlayers('Game Starting!!');

        this._players.forEach((player, idx) => {
            player.on('turn', (turn) => {
                this._onTurn(idx, turn);
            });
        });
    }

    _sendToPlayer(playerIndex, msg){
        this._players[playerIndex].emit('message', msg);
    }

    _sendToPlayers(msg) { 
        this._players.forEach((player) => {
            player.emit('message', msg);
        });
    }

    _onTurn(playerIndex, turn) {
        this._turns[playerIndex] = turn;
        this._sendToPlayer(playerIndex, `You selected ${turn}`);

        this._checkGameOver();
    }

    _checkGameOver() { 
        const turns = this._turns;

        if (turns[0] && turns[1]) {
            this._sendToPlayers('Game Over ' + turns.join(' : '));
            this._turns = [null, null];
            this._sendToPlayers('Next Round!');
        }
    }

}

module.exports = CodenamesGame
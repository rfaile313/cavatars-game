

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


document.querySelector('#chat-form').addEventListener('submit', onFormSubmitted)
addButtonListeners();
// Client functions

var sock = io(); // needed globally for all socket events

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


// Whenever sock.on 'message' happens, call writeEvent
sock.on('message', writeEvent);


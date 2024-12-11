const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Store rooms in memory (You can replace this with a database later)
let rooms = [];

app.use(express.static(__dirname));

// Listen for incoming socket connections
io.on('connection', (socket) => {
    console.log('A user connected');

    // Listen for creating room
    socket.on('createRoom', (data) => {
        console.log('Room created:', data);  // Log when a room is created
        const { roomName, roomType, roomPassword } = data;

        // Create a new room object
        const room = { name: roomName, type: roomType, password: roomPassword || null };
        
        // Add the room to the list of rooms
        rooms.push(room);

        // Emit updated room list to all clients
        io.emit('roomList', rooms);
    });

    // Listen for joining a room
    socket.on('joinRoom', (data) => {
        const { roomName } = data;
        const room = rooms.find(r => r.name === roomName);

        if (room) {
            if (room.type === 'private') {
                // Private room requires a password
                socket.emit('requestPassword', roomName);
            } else {
                // Public room, join immediately
                socket.join(roomName);
                io.to(roomName).emit('chatMessage', { message: `A new user has joined the room: ${roomName}` });
            }
        }
    });

    // Listen for password verification for private rooms
    socket.on('verifyPassword', (data) => {
        const { roomName, password } = data;
        const room = rooms.find(r => r.name === roomName);

        if (room && room.password === password) {
            socket.join(roomName);
            io.to(roomName).emit('chatMessage', { message: `A new user has joined the room: ${roomName}` });
            socket.emit('passwordAccepted', roomName);
        } else {
            socket.emit('passwordRejected', roomName);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Start the server
server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});

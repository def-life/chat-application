import { WebSocketServer, WebSocket } from "ws";
import express from "express";

const port = 3004;
const app = express();
const server = app.listen(port, () => {
  console.log("server listening at port", port);
});

const socketServer = new WebSocketServer({ noServer: true });
let typingUsers = [];
let messages = [];

function broadcastMessage(event, msg) {
    const allClients = [...socketServer.clients];
    allClients.forEach((client) => {
        if(client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ event, data: msg}));
        }
        
    })
}

function broadcastTypingUser() {
    const users = typingUsers.map((client) => client._user.username);
    broadcastMessage("typingUsers", users);
}

function getAllUsers() {
    const clients = [...socketServer.clients];
    const users = clients.map((client) => client._user);
    return users;
}

const mapping = {
  oldMessage: (msg, client) => {
    messages.push({msg, username: client._user.username});
    // broadcast the message to all clients
   broadcastMessage("newMessage", messages)

  },
  updateUserStatus: (msg, client) => {
    if(!client._user) return;

    client._user && (client._user.status = msg);

    // broadcaste the message
    broadcastMessage("allUsers", getAllUsers())
  },
  addTyping: (_, client) => {
    typingUsers.push(client);
    broadcastTypingUser()
  },
  removeTyping: (_, client) => {
    typingUsers = typingUsers.filter((ws) => {
      return ws !== client;
    });
    broadcastTypingUser();
  },
  user: (msg, client) => {
    client._user = { username: msg, status: "green" };


    broadcastMessage("allUsers", getAllUsers())
    
  },
};

socketServer.on("connection", (ws) => {

  console.log("a new client connected");
  ws.send("Hello from server");
  ws.on("message", (message) => {
    try {
      console.log(JSON.parse(message));
      const { event, data: { msg } = {} } = JSON.parse(message);

      // console.log(event, msg);
      mapping[event](msg, ws);
    } catch (err) {
      console.log(err);
      // unexpected data type
    }
  });

  ws.on("close", () =>{
    console.log("closed a web socket");
    typingUsers = typingUsers.filter((client) => client !== ws);
  })
});


server.on("upgrade", function upgrade(request, socket, head) {
  console.log("upgraded");
  // authentication function here

  socketServer.handleUpgrade(request, socket, head, function done(ws) {
    socketServer.emit("connection", ws, request);
  });
  // });
});


const http = require("http");
const socketIo = require("socket.io");
const docEvents = require("./docEvents");
const commentEvents = require("./commentEvents");

function setupSocketServer(server) {
  const io = socketIo(server, {
    cors: {
      origin: "*",  // Allow connections from the frontend
      methods: ["GET", "POST"],         // Allowed HTTP methods
      allowedHeaders: ["my-custom-header"],  // You can add any custom headers if needed
      credentials: true, // Allow cookies to be sent with requests
    },
  });
  // Handle socket connections
  io.on("connection", (socket) => {
    console.log("🟢 New Socket.IO Connection");

    // Listen for messages sent by the client
    socket.on("message", (message) => {
      try {
        const data = JSON.parse(message);
        console.log(data);
        
        switch (data.type) {
          case "UPDATE_DOCUMENT":
          case "FETCH_DOCUMENT":
            docEvents.handleDocumentEvents(socket, data);
            break;

          case "ADD_COMMENT":
          case "REPLY_COMMENT":
          case "RESOLVE_COMMENT":
            commentEvents.handleCommentEvents(socket, data);
            break;

          default:
            socket.emit("message", { error: "Unknown event type" });
        }
      } catch (error) {
        socket.emit("message", { error: "Invalid JSON format" });
      }
    });

    // Listen for the 'disconnect' event
    socket.on("disconnect", () => {
      console.log("🔴 Socket.IO Disconnected");
    });
  });

  console.log("🟢 Socket.IO Server Started");
}

module.exports = { setupSocketServer };

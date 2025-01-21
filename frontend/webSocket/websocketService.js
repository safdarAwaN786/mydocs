import { io } from "socket.io-client"; // Import Socket.IO client

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Set();
  }

  connect(url, setWsData) {
    // Connect to Socket.IO server
    if (!this.socket) {
      this.socket = io(url); // Connect using socket.io-client

      this.socket.on("connect", () => {
        console.log("Socket.IO Connected ✅");
      });

      this.socket.on("disconnect", () => {
        console.log("Socket.IO Disconnected ❌");
      });

      this.socket.on("error", (error) => {
        console.error("Socket.IO Error:", error);
      });

      // Listen for messages
      this.socket.on("message", (data) => {
        const objData = JSON.parse(data);
        console.log("Received Socket.IO Data:", objData);
        // Update the atom when data is received
        setWsData(objData.doc);

        // Notify listeners
        this.listeners.forEach((listener) => listener(data));
      });
    }
  }

  sendMessage(event, payload) {
    
    if (this.socket) {
      this.socket.emit('message', JSON.stringify({type : event, ...payload})); // Emit events using socket.io
    } else {
      console.warn("Socket.IO is not connected yet!");
    }
  }

  addListener(callback) {
    this.listeners.add(callback);
  }

  removeListener(callback) {
    this.listeners.delete(callback);
  }

  disconnect() {
    if (this.socket) {
      console.log("Closing Socket.IO connection...");
      this.socket.disconnect();
      this.socket = null;
      console.log("Socket.IO Connection Closed ❌");
    }
  }
}

const websocketService = new WebSocketService();
export default websocketService;

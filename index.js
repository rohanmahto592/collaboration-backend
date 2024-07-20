const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 4000;
let connectedUser = [];
let drawingHistory={};
io.on("connection", (socket) => {
  console.log(`client connected with id ${socket.id}`);
  socket.on("join_room", ({ roomId, userName }) => {
    socket.join(roomId);
    connectedUser.push({
      userName: userName,
      roomId: roomId,
      socketId: socket.id,
    });
    emitActiveUsers(roomId);
  });
  socket.on("drawing", (data) => {
    io.to(data.roomId).emit("drawing", data);
  });
  socket.on("playBack",(data)=>{
    const roomId=data.roomId;
    if(!drawingHistory[roomId])
    {
      drawingHistory[roomId]=[];
      drawingHistory[roomId].push(data);
    }
    else
    {
    drawingHistory[roomId].push(data)
    }
  })
  socket.on("clear_canvas",({roomId})=>{
    io.to(roomId).emit("clear_canvas");
    drawingHistory[roomId]=[];
  })
  socket.on("fetchHistory",(data)=>{
    const roomId=data.roomId;
    socket.emit("fetchHistory",{history:drawingHistory[roomId]})
  })
  socket.on("leave_room", (roomId) => {
    socket.leave(roomId); 
    console.log("room left with room id ",roomId)
    drawingHistory[roomId]=[]
  });
  socket.on("change_BackgroundColor",(data)=>{
    io.to(data.roomId).emit("change_BackgroundColor",data.color)
  })
  socket.on("location",(data)=>{
    const {roomId,location,color,userName}=data;
    io.to(roomId).emit("pointer_location",{location:location,socketId:socket.id,color:color,userName})
  })
  socket.on("disconnect", () => {
    console.log(`Client disconnected with id${socket.id} `);
    const user = connectedUser.find((user) => user.socketId === socket.id);
    if (user) {
      connectedUser = connectedUser.filter(
        (user) => user.socketId != socket.id
      );
      emitActiveUsers(user.roomId);
    }
  });
});
const emitActiveUsers = (roomId) => {
  const activeUsersInRoom = connectedUser.filter(
    (user) => user.roomId === roomId
  );
  io.to(roomId).emit("active_user", activeUsersInRoom);
};
server.prependListener("request", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
});
server.listen(PORT, () => console.log(`listening on port ${PORT}`));

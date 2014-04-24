var express = require('express');
var app = express();
var socket = require('socket.io');
var server = app.listen(8787);
var io = socket.listen(server);

app.get('/', function(request, response){
  response.sendfile(__dirname + "/index.html");

});

app.use(express.static(__dirname));

var clients = {}; // All clients connected. socket ID as an attribute contains if use isMobile and which inRoom is he in.
var rooms = {}; // All rooms. Contains attributs room ID contains how many users are connected at the moment.
var instrumentsList = ['keyboard', 'drums', 'guitar', 'bass'];

function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for( var i=0; i < 5; i++ )
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
};

io.sockets.on('connection', function(socket) {
  console.log("socket id: "+socket.id)
  console.log('client connected but has not loged in yet');

  // User connecter to google
  socket.on('login', function (user) {
    var room = user.sid;
    socket.join(room)
    clients[socket.id] = { 
      isMobile  :  user.isMobile,
      inRoom    :  room,
      uid       :  makeid(),
    }

    var colors =  ['#3f9b16',  '#f06b5e', '#f3c953', '#6eceeb', '#8980aa', '#fd6ca3', '#a67a3a', '#86425f' ]
    var cc = 0;

    // Counting connected users
    if(typeof rooms[room] == 'undefined') {
      rooms[room] = {};
      rooms[room].id = room;
    };
    if(typeof rooms[room].mobileusers == 'undefined') {
        rooms[room].mobileusers = 0;
    };
    if(typeof rooms[room].desktopusers == 'undefined') {
      rooms[room].desktopusers = 0;
    };

    if (user.isMobile) {
      console.log("----------------------------------");
      console.log('User is mobile');
        rooms[room].mobileusers = rooms[room].mobileusers+=1;
    } else if (user.isMobile == false){
      console.log("----------------------------------");
      console.log('User is desktop');
      rooms[room].desktopusers +=1;
    }

    console.log("----------------------------------");
    console.log("user login to room: "+room);
    console.log("mobile users in room: "+rooms[room].mobileusers);
    console.log("desktop users in room: "+rooms[room].desktopusers);
    console.log("----------------------------------");

    // Checking if room is active
    if(user.isMobile) {
      for (var k in clients) {
        console.log("----------------------------------");
        console.log("key:");
        console.log(k);
        console.log("----------------------------------");
        if(clients[k].color == colors[cc]) {
          cc++;
        }
      };
        
      clients[socket.id].color = colors[cc];

      var r = Math.floor((Math.random()*instrumentsList.length)+0);
      clients[socket.id].instrument = instrumentsList[r];

      if(rooms[room].active) {
        socket.emit('s-msg', 'login:OK')
        socket.emit('uid', clients[socket.id])
        io.sockets.in(room).emit('new-player', clients[socket.id])
      } else {
        socket.emit('s-msg', 'login:room not active')
      }
    } else if(user.isMobile == false) { // Room is activate when desktop user logs in
      rooms[room].active = true;
      io.sockets.in(room).emit('cur-players', clients)
    }

    // Send info to clients
    io.sockets.in(room).emit('clientsCount', rooms[room])

  });
  
  // On user disconection, find which room he was in and subtract from count.
  socket.on('disconnect', function(){
    if(typeof clients[socket.id] != 'undefined') {
      if(typeof clients[socket.id].inRoom != 'undefined') {
        var room = clients[socket.id].inRoom;
        socket.leave(room);
        if(clients[socket.id].isMobile) {
          rooms[room].mobileusers = rooms[room].mobileusers -=1;
          io.sockets.in(room).emit('dis-player', clients[socket.id])
        } else if (clients[socket.id].isMobile == false) {
          rooms[room].desktopusers -=1;
        }

        io.sockets.in(room).emit('clientsCount', rooms[room]);
          
        if(clients[socket.id].isMobile == false) {
          io.sockets.in(room).emit('session-end', 'Desktop client is dead');
          rooms[room].active = false;
          clients = {};
        } else {
          delete clients[socket.id];
        }
          
        console.log("----------------------------------")
        console.log("disconnected from room: "+room)
        console.log("----------------------------------")
      }
    }
  });
  
  /*
  ** A hub delivers messages between mobile and desktop 
  ** Called when socket messages being called by the user
  */
  function onUserMessage(type) {
    socket.on(type, function (n) {
      if(typeof clients[socket.id] != 'undefined' && typeof clients[socket.id].inRoom != 'undefined') {
        var room = clients[socket.id].inRoom;
        io.sockets.in(room).emit(type, n);
      };
    });
  };

  onUserMessage('key');
  onUserMessage('name');
  onUserMessage('change');
  onUserMessage('kick');

});
var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	mongoose = require('mongoose'),
	users = {};
	sessions = {};
	
server.listen(3000);

mongoose.connect('mongodb://localhost/chat', function(err){
	if(err){
		console.log(err);
	} else{
		console.log('Connected to mongodb!');
	}
});

var chat2Schema = mongoose.Schema({
	nick: String,
	session : String,
	msg: String,
	created: {type: Date, default: Date.now}
});


var Chat = mongoose.model('Message', chat2Schema);


app.use(express.static(__dirname + '/public'))
app.get('/', function(req, res){
	res.sendfile('index.html');
});

io.sockets.on('connection', function(socket){
	var query = Chat.find({});
	query.sort('-created').limit(20).exec(function(err, docs){
		if(err) throw err;
		socket.emit('load old msgs', docs);
	});
	
	socket.on('new user', function(data, callback){
		if (data in users){
			callback(false);
		} else{
			callback(true);
			socket.nickname = data;
			users[socket.nickname] = socket;
			updateNicknames();
		}
	});
	
	socket.on('new session', function(data, callback){
		if (data in sessions){
			callback(true);
			socket.session = data;
			sessions[socket.session] = socket;
		} else{
			callback(true);
			socket.session = data;
			sessions[socket.session] = socket;
			
		}
	});

	function updateNicknames(){
		io.sockets.emit('usernames', Object.keys(users));
	}

	socket.on('send message', function(data, callback){
		var msg = data.trim();
		console.log('after trimming message is: ' + msg);
		
			var newMsg = new Chat({msg: msg, nick: socket.nickname, session: socket.session});
			newMsg.save(function(err){
				if(err) throw err;
				io.sockets.emit('new message', {msg: msg, nick: socket.nickname});
			});
		
	});
	
	socket.on('disconnect', function(data){
		if(!socket.nickname) return;
		delete users[socket.nickname];
		updateNicknames();
	});
});
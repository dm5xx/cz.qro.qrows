var websocket = null;  // Websocket to Stream Deck

/*
// Dictionary maintaining connections for each key
The structure is the following :

{
	"ws://mysocket1/path" : {
		"websocket": websocket1,
		"positions": ["position1","position2"]
	},
	"ws://mysocket2/path" : {
		"websocket": websocket2,
		"positions": ["position3"]
	},
}

Each socket maintains an array of positions it is configured for so that
when there is no positions left we can disconnect, but as long as there
is at least one position listed, we leave the connection open. The format
of the position string is "<column>-<row>" but the actual value is never used,
it is there just to maintain count of how many keys are using the socket.
*/
var connections = {};

var currentStatusArray = [];
var oldcurrentStatusArray = [];
var allBtns = [];

var timer;

// Adds the given position in the "positions" array for the server
function addPositionForServer(server,position) {
	index=connections[server].positions.indexOf(position)
	if (index == -1) {
		connections[server].positions.push(position)
	}
}

// Removes the given position from the "positions" array for the server
// After calling this, the caller usually checks if there is any positions
// left and if not, disconnects the socket and removes the entry from then
// connections object.
function removePositionForServer(server,position) {
	index=connections[server].positions.indexOf(position)
	if (index != -1) {
		connections[server].positions.splice(index,1)
	}
}

// Converts positions dict as given by Stream Deck SDK to a simple string used
// in the connections object
function positionFromCoordinates(c) {
	return c.column + "-" + c.row
}

/*
Connects to a given server.

This is usually triggered by an willAppear message coming from Stream Deck.

If there is an existing websocket, it will be used instead of creating a new
one, and the position will be added to its "positions" array.

message is used to send an initial message after connection is established.
Used with the initial `willAppear`message coming from the Stream Deck.

backend_only is used to handle server side disconnect, when it happens, we
call this method with backend_only to true, which creates a new socket without
changing any of the positions already registered.
*/
function connect(remoteServer,position,message,backend_only=false) {
	if (!remoteServer || remoteServer.length == 0)
		return

	// Make sure that key is disconnected from other connections
	for (var s in connections) {
		if (s === remoteServer) {
			continue
		}
		disconnect(s,position)
	}

	// The connection to this server already exists
	if (connections.hasOwnProperty(remoteServer) && (backend_only == false)) {
		addPositionForServer(remoteServer,position)
		if (!message)
			return

		// When starting up, all the keys are rapidly sent but the connection is
		// not available when keys after the very first one are added, so we
		// simply wait a bit and retry the send message
		if (connections[remoteServer].websocket.readyState == 0) {
			setTimeout(() => {
				connections[remoteServer].websocket.send("G")
			},1000)
		}
		else {
			connections[remoteServer].websocket.send("G")
		}
		return
	}

	// No socket exists (or it does and backend_only is true), so we create a
	// new one
	c = new WebSocket(remoteServer)
	if (backend_only) {
		// We are reconnecting, so keep existing object and just update
		// websocket
		connections[remoteServer].websocket=c
	}
	else {
		// This is a brand new connection, add the connection object to
		// connections
		connections[remoteServer] = {positions: [position],websocket: c}
	}

	// Connection handlers.

	// When the connection is established, we might have a message to send.
	// This is usually the "willAppear" message that triggered the connection
	c.onopen = function(evt) {
		console.log("Remote socket opened")
		//if (message) {
			connections[remoteServer].websocket.send("G")
		//}
	}

	// Forward any incomming message to Stream Deck
	c.onmessage = function(evt) {
		j=JSON.parse(evt.data)
		console.log("Forwarding message")
		if (websocket && websocket.readyState) {
			console.log(evt);
			let returnValue = j.B0;

			oldcurrentStatusArray = currentStatusArray.slice();
			currentStatusArray = GetOrderedArraybyValue(returnValue);

			clearTimeout(timer);
			displayButtonsHandler("red", "green", true);

			timer = setTimeout(() => { displayButtonsHandler("green", "black", false)}, 600000) // screensaver after 10min.
		}
    };

	// Looks like server disconnected, reconnect with backend_only=true
	c.onclose = function() {
		if (connections.hasOwnProperty(key)) {
			connect(remoteServer,null,null,true)
		}

		for(let a=0; a < 12; a++)
		{				
			var json = {
				"event": "setImage",
				"context": allBtns[a].Context,
				"payload": {
					"image": "images/icon",
					"target": 1
				}
			};
			websocket.send(JSON.stringify(json));		
		}
	}
}

var oneEventConnections = []
function sendOneEvent(remoteServer,message) {
	var c = new WebSocket(remoteServer)
	oneEventConnections.push(c)
	c.onopen = function(evt) {
		console.log("Remote multi-action socket opened")
		c.send(JSON.stringify(message))
		c.close()
		delete oneEventConnections[c]
	}
}

/*
Disconnects a websocket

This method is usually called from a `willDisappear` message.

It does not actually disconnects the server unless there is no
positions listed for it.

We also send the message if the socket is available, usually the
`willDisappear` message.
*/
function disconnect(remoteServer,position,message=null) {
	if (connections.hasOwnProperty(remoteServer)) {
		c=connections[remoteServer].websocket;
		if (c.readyState == 1 && message) {
			c.send(JSON.stringify(message))
		}
		removePositionForServer(remoteServer,position)
		if (connections[remoteServer].positions.length == 0) {
			delete connections[remoteServer]
			c.onclose=null
			c.close()
		}
	}
}

/*
Initial communication with the Stream Deck software.
*/
function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
	pluginUUID = inPluginUUID

	// Open the web socket to streamdeck
	websocket = new WebSocket("ws://127.0.0.1:" + inPort);
	
	function registerPlugin(inPluginUUID)
	{
		var json = {
			"event": inRegisterEvent,
			"uuid": inPluginUUID
		};

		websocket.send(JSON.stringify(json));
	};

	websocket.onopen = function()
	{
		// WebSocket is connected, send message
		registerPlugin(pluginUUID);
	};

	websocket.onmessage = function (evt) { 
		// Received message from Stream Deck
		var jsonObj = JSON.parse(evt.data);
		var event = jsonObj['event'];

		var jsonPayload = jsonObj['payload'];
		var isInMultiAction = null
		
		if (jsonPayload && jsonPayload.hasOwnProperty("isInMultiAction") && jsonPayload['isInMultiAction']) {
			isInMultiAction = jsonPayload['isInMultiAction']
		}

		if(event == "didReceiveSettings")
		{
			var settings = jsonPayload['settings'];
			var coordinates = jsonPayload['coordinates'];

			connect(settings.remoteServer,positionFromCoordinates(coordinates))
		}
		else if(event == "willAppear")
		{
			var settings = jsonPayload['settings'];
			var coordinates = jsonPayload['coordinates'];

			let btn = {};
			btn.ID = settings.id;
			btn.Context = jsonObj.context;
			btn.Device = jsonObj.device;
			btn.btnlabel = settings.btnlabel;

			allBtns.push(btn);

			if (settings.hasOwnProperty("remoteServer")) {
				connect(settings.remoteServer,positionFromCoordinates(coordinates),jsonObj)
			}
		}
		else if(event == "willDisappear")
		{
			var settings = jsonPayload['settings'];
			var coordinates = jsonPayload['coordinates'];
			disconnect(settings.remoteServer,positionFromCoordinates(coordinates),jsonObj)
		}
		/*
		Every other message is simply forwarded to node-red, the condition is
		that the message must have a settings.remoteServer setting, which is the
		case for any key-related events.
		*/
		else if (jsonObj.hasOwnProperty("payload")) {
			if (jsonObj['payload'].hasOwnProperty("settings")) {
				key = jsonObj['payload']['settings']['remoteServer']
					if (connections.hasOwnProperty(key)) {
						c=connections[key].websocket
						if (c && c.readyState == 1) {
							console.log(jsonObj);
							let btnitem = (jsonObj.payload.settings.id).split("_");
							let firecmd = createWSSetCommand(btnitem[1]); 
							c.send(firecmd);
						}
					}
			}
		}		
	};

	websocket.onclose = function()
	{ 
		// Websocket is closed
	};
};

function displayButtonsHandler(onicon, officon, isTitleEnabled)
{
	let ttt = "";
	let ccontext = "";

	for(let b=0; b < allBtns.length; b++)
	{				
		ccontext = allBtns[b].Context;

		let f = allBtns[b].ID.split("_");
		let a = f[1];

		if(currentStatusArray[a]==1)
		{

			var json = {
				"event": "setImage",
				"context": ccontext,
				"payload": {
				 "image": "images/"+onicon,
				 "target": 1
				}
			   };
			websocket.send(JSON.stringify(json));
		}
		else
		{
			var json = {
				"event": "setImage",
				"context": ccontext,
				"payload": {
				 "image": "images/"+officon,
				 "target": 1
				}
			   };
			websocket.send(JSON.stringify(json));
		}

		if(isTitleEnabled)
			ttt = allBtns[b].btnlabel;

		var jtitle = {
			"event": "setTitle",
			"context": ccontext,
			"payload": {
				"title": ttt,
				"target": 0,
				"state": 0
			}
		};
		websocket.send(JSON.stringify(jtitle));
	}		
}

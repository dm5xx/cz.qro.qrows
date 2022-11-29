var websocket = null;
var uuid=null;

function connectElgatoStreamDeckSocket(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) {
    websocket = new WebSocket('ws://127.0.0.1:' + inPort)
    uuid=inPropertyInspectorUUID
    console.log(uuid)
    console.log(inInfo)
    console.log(inActionInfo)
    websocket.onopen = function() {
        // Register property inspector to Stream Deck
        registerPluginOrPI(inRegisterEvent, inPropertyInspectorUUID);

        // Request the global settings of the plugin
        
        getSettings(inPropertyInspectorUUID);
    };
    websocket.onmessage = function (evt)
    {
        console.log(evt)
        console.log("kakaka");
        var jsonObj = JSON.parse(evt.data);
        var event = jsonObj['event'];
        if (event == "didReceiveSettings") {
            var settings = jsonObj['payload']['settings'];
            console.log(settings);
            if (settings.hasOwnProperty("remoteServer")) {
                document.getElementById("remoteServer").value=settings.remoteServer
            };
            if (settings.hasOwnProperty("btnlabel")) {
                document.getElementById("btnlabel").value=settings.btnlabel
            };
            if (settings.hasOwnProperty("id")) {
                document.getElementById("id").value=settings.id
            }
        }
    }
}
function saveConfiguration() {
    s={"remoteServer":document.getElementById("remoteServer").value,
    "btnlabel": document.getElementById("btnlabel").value, 
    "id":document.getElementById("id").value};
    // "remoteCommand":document.getElementById("remoteCommand").value,
    saveSettings(uuid,s)
}

function sendValueToPlugin(value, param) {
 
    console.log("fiiigggi");
    // say the websocket connection is saved in the variable 'websocket'
    if (websocket) {
        // compile our JSON object.

        const json = {
                "action": "cz.qro.streamdeck.qrows",
                "event": "sendToPlugin",
                "context": uuid, // as received from the 'connectElgatoStreamDeckSocket' callback
                "payload": {
                    // here we can use ES6 object-literals to use the  'param' parameter as a JSON key. In our example this resolves to {'myIdentifier': <value>}
                    [param] : value 
                }
         };
         console.log(json)
         console.log(websocket)
         // send the json object to the plugin
         // please remember to 'stringify' the object first, since the websocket
         // just sends plain strings.
         websocket.send(JSON.stringify(json));
    }

}
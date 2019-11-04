
/*
 BackEnd File covers fetching and parsing call graph into a JSON data

*/

const vscode = require('vscode');

var path = require('path');
var fs = require('fs');

//Structure of gprofSample data
var gprofSample = function (time, cSecs, sSecs, calls, sTsCall, tTsCall, name) {
    this.time = time;
    this.cSecs = cSecs;
    this.sSecs = sSecs;
    this.calls = calls;
    this.sTsCall = sTsCall;
    this.tTsCall = tTsCall;
    this.name = name;
}

// This Stack is taken from open source
// Creates a stack
var Stack = function () {
    this.count = 0;
    this.storage = {};
}

// Adds a value onto the end of the stack
Stack.prototype.push = function (value) {
    this.storage[this.count] = value;
    this.count++;
}

// Removes and returns the value at the end of the stack
Stack.prototype.pop = function () {
    // Check to see if the stack is empty
    if (this.count === 0) {
        return undefined;
    }

    this.count--;
    var result = this.storage[this.count];
    delete this.storage[this.count];
    return result;
}

// Returns the length of the stack
Stack.prototype.size = function () {
    return this.count;
}

function parseLineToStruct(line) {
    var re1 = '([+-]?\\d*\\.\\d+)(?![-+0-9\\.])';	// Float 1
    var re2 = '.*?';	// Non-greedy match on filler
    var re3 = '([+-]?\\d*\\.\\d+)(?![-+0-9\\.])';	// Float 2
    var re4 = '.*?';	// Non-greedy match on filler
    var re5 = '([+-]?\\d*\\.\\d+)(?![-+0-9\\.])';	// Float 3
    var re6 = '.*?';	// Non-greedy match on filler
    var re7 = '(\\d+)';	// Integer Number 1
    var re8 = '.*?';	// Non-greedy match on filler
    var re9 = '([+-]?\\d*\\.\\d+)(?![-+0-9\\.])';	// Float 4
    var re10 = '.*?';	// Non-greedy match on filler
    var re11 = '([+-]?\\d*\\.\\d+)(?![-+0-9\\.])';	// Float 5
    var re12 = '.*?';	// Non-greedy match on filler
    var re13 = '((?:[a-z][a-z]+))';	// Word 1

    var p = new RegExp(re1 + re2 + re3 + re4 + re5 + re6
        + re7 + re8 + re9 + re10 + re11 + re12 + re13);
    var m = p.exec(line);
    if (m != null) {
        var float1 = m[1];
        var float2 = m[2];
        var float3 = m[3];
        var int1 = m[4];
        var float4 = m[5];
        var float5 = m[6];
        var word1 = m[7];

        console.log("(" + float1.replace(/</, "&lt;") + ")" +
            "(" + float2.replace(/</, "&lt;") + ")" +
            "(" + float3.replace(/</, "&lt;") + ")" +
            "(" + int1.replace(/</, "&lt;") + ")" +
            "(" + float4.replace(/</, "&lt;") + ")" +
            "(" + float5.replace(/</, "&lt;") + ")" +
            "(" + word1.replace(/</, "&lt;") + ")" + "\n");

        return new gprofSample(float1.replace(/</, "&lt;"),
            float2.replace(/</, "&lt;"),
            float3.replace(/</, "&lt;"),
            int1.replace(/</, "&lt;"),
            float4.replace(/</, "&lt;"),
            float5.replace(/</, "&lt;"),
            word1.replace(/</, "&lt;"));
    }
}

/* This function is used to parse flat graph of gprof 
*  Currently in test phase might change the code later.
*/
function parsegProf(data) {

    var gProfStack = new Stack();
    var str = data.toString(), lines = str.split(/(\r?\n)/g);
    var foundIndex = -1;
    var word = "time   seconds   seconds    calls  Ts/call  Ts/call  name";
    var reg = RegExp('^.*' + word + '.*$');
    for (var i = 0; i < lines.length; i++) {
        // Process the line, it might be incomplete.
        //console.log(lines[i]); //debuging
        var found = reg.exec(lines[i]);
        if (found != null) {
            console.log("line is found lets see what happens next");
            foundIndex = i;
            break;
        }
    }

    if (foundIndex != -1) {
        console.log("line is found lets see what happens next1");

        for (var i = foundIndex; i < lines.length; i++) {
            //	console.log(i + ": " + lines);
            if (lines[i] !== '\n' && lines[i] !== ' ') {

                var gprofSample = parseLineToStruct(lines[i]);
                if (gprofSample != null)
                    gProfStack.push(gprofSample); //parse all the line to Class of Struct

            }
        }
    }

    return gProfStack;
}

//May be reduntant
function sampleToJSON(gProfStack) {

	/*var data = [
		{ "name": "Level 2: A", "parent": "Top Level" },
		{ "name": "Top Level", "parent": "null" },
		{ "name": "Son of A", "parent": "Level 2: A" },
		{ "name": "Daughter of A", "parent": "Level 2: A" },
		{ "name": "Level 2: B", "parent": "Top Level" }
	];
*/
    var gProftoJSON = [];
    var prevCall = "null";
    var gprofSample;
    while (gProfStack.size()) {
        gprofSample = gProfStack.pop();
        gProftoJSON.push({ "name": gprofSample.name, "parent": prevCall });
        prevCall = gprofSample.name;
    }
    return gProftoJSON;
}

function constructPanel(context) {

    const panel = vscode.window.createWebviewPanel(
        'catCoding', // Identifies the type of the webview. Used internally
        'Call Graph', // Title of the panel displayed to the user
        vscode.ViewColumn.One, // Editor column to show the new webview panel in.
        {
            // Enable scripts in the webview
            enableScripts: true
        } // Webview options. More on these later.
    );

    const pathToHtml = vscode.Uri.file(path.join(context.extensionPath, 'src', 'index.html'));
    const pathUri = pathToHtml.with({ scheme: 'vscode-resource' });

    panel.webview.html = fs.readFileSync(pathUri.fsPath, 'utf8');

    return panel;
}

//This is how we export function outside the files.
exports.gprofProc = function gprofProccess(context) {
    var gProfStack;
    var gProftoJSON;

    const spawn = require('child_process').spawn;
    const ls = spawn('gprof', ['-p', '-b', '/mnt/c/Users/jasjivsi/zeus/mysort'],
        { "cwd": "/mnt/c/Users/jasjivsi/zeus/" });

    ls.stdout.on('data', (data) => {
        gProfStack = parsegProf(data); //1.
        gProftoJSON = sampleToJSON(gProfStack); //3.
    });

    ls.stderr.on('data', (data) => { //error state

        console.log(`stderr: ${data}`);
    });

    ls.on('close', (code) => {

        var displayPanel = constructPanel(context);
        pushCommandsToWebView(displayPanel);
        //panel.webview.html = getWebviewContent(JSON.stringify(gProftoJSON), srcHtmlFile); //fs.readFileSync(srcHtmlFile, 'utf8'); //getWebviewContent(JSON.stringify(gProftoJSON));
        
        console.log(`child process exited with code ${code} ${JSON.stringify(gProftoJSON)}`);

    });
}

function pushCommandsToWebView(currentPanel) {
    currentPanel.webview.postMessage({ command: 'refactor' });
}
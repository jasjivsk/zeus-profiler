// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

var gprofSample = function (time, cSecs, sSecs, calls, sTsCall, tTsCall, name) {
	this.time = time;
	this.cSecs = cSecs;
	this.sSecs = sSecs;
	this.calls = calls;
	this.sTsCall = sTsCall;
	this.tTsCall = tTsCall;
	this.name = name;
}


// This Stack is written using the pseudoclassical pattern

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

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed


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
		// Process the line, noting it might be incomplete.
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

function gprofProccess(context) {
	var gProfStack;
	var gProftoJSON;

	const spawn = require('child_process').spawn;
	const ls = spawn('gprof', ['-p', '-b', '/mnt/c/Users/jasjivsi/zeus/mysort'],
		{ "cwd": "/mnt/c/Users/jasjivsi/zeus/" });

	ls.stdout.on('data', (data) => {
		gProfStack = parsegProf(data); //1.
		gProftoJSON = sampleToJSON(gProfStack); //3.
		//return gProftoJSON; //4.
	});

	ls.stderr.on('data', (data) => { //error state

		console.log(`stderr: ${data}`);
	});

	ls.on('close', (code) => {
		const panel = vscode.window.createWebviewPanel(
			'catCoding', // Identifies the type of the webview. Used internally
			'Cat Coding', // Title of the panel displayed to the user
			vscode.ViewColumn.One, // Editor column to show the new webview panel in.
			{
				// Enable scripts in the webview
				enableScripts: true
			} // Webview options. More on these later.
		);

		//const filePath: vscode.Uri = vscode.Uri.file(path.join(context., 'src', 'html', 'file.html'));
		var path = require('path');
		var fs = require('fs');
		const pathToHtml = vscode.Uri.file(path.join(context.extensionPath, 'src', 'index.html'));

		const pathUri = pathToHtml.with({ scheme: 'vscode-resource' });

		panel.webview.html = fs.readFileSync(pathUri.fsPath, 'utf8');
		//panel.webview.postMessage({ command: 'refactor' });
		pushCommandsToWebView(panel);
        
		//anel.webview.html = getWebviewContent(JSON.stringify(gProftoJSON), srcHtmlFile); //fs.readFileSync(srcHtmlFile, 'utf8'); //getWebviewContent(JSON.stringify(gProftoJSON));
		console.log(`child process exited with code ${code} ${JSON.stringify(gProftoJSON)}`);

	});
}

function pushCommandsToWebView(currentPanel) {

	currentPanel.webview.postMessage({ command: 'refactor' });
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "zeus" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.helloWorld', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Zeus Started!');

		gprofProccess(context);
		
	});
	// Our new command

	context.subscriptions.push(disposable);
}

function getWebviewContent1(treeData, srcHTMLFile) {
	return `<iframe id="serviceFrameSend" 
	src="`+ srcHTMLFile + `" width="1000" height="1000"  frameborder="0"> </iframe>`;
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}

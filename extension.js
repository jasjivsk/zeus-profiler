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

function gprofProccess() {
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

		panel.webview.html = getWebviewContent(JSON.stringify(gProftoJSON));
		console.log(`child process exited with code ${code} ${JSON.stringify(gProftoJSON)}`);

	});
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
		vscode.window.showInformationMessage('Hello World!');

		
		gprofProccess();
	});

	context.subscriptions.push(disposable);
}

function getWebviewContent(treeData) {
	return `<!DOCTYPE html>
	<html lang="en">
	  <head>
		<meta charset="utf-8">
	
		<title>Tree Example</title>
	
		<style>
		
		.node {
			cursor: pointer;
		}
	
		.node circle {
		  fill: #fff;
		  stroke: steelblue;
		  stroke-width: 3px;
		}
	
		.node text {
		  font: 12px sans-serif;
		}
	
		.link {
		  fill: none;
		  stroke: #ccc;
		  stroke-width: 2px;
		}
		
		</style>
	
	  </head>
	
	  <body>
	
	<!-- load the d3.js library -->	
	<script src="https://d3js.org/d3.v3.min.js"></script>
		
	<script>
	

	function gprofJSONToWebPage(data) {

		var dataMap = data.reduce(function (map, node) {
			map[node.name] = node;
			return map;
		}, {});
	
		var treeData = [];
		data.forEach(function (node) {
			// add to parent
			var parent = dataMap[node.parent];
			if (parent) {
				// create child array if it doesn't exist
				(parent.children || (parent.children = []))
					// add node to child array
					.push(node);
			} else {
				// parent is null or missing
				treeData.push(node);
			}
		});
		return treeData;
	}

	var treeData = gprofJSONToWebPage(` + treeData + `);
	
	/* var treeData = [
	  {
		"name": "Top Level",
		"parent": "null",
		"children": [
		  {
			"name": "Level 2: A",
			"parent": "Top Level",
			"children": [
			  {
				"name": "Son of A",
				"parent": "Level 2: A"
			  },
			  {
				"name": "Daughter of A",
				"parent": "Level 2: A"
			  }
			]
		  },
		  {
			"name": "Level 2: B",
			"parent": "Top Level"
		  }
		]
	  }
	]; */
	
	
	// ************** Generate the tree diagram	 *****************
	var margin = {top: 20, right: 120, bottom: 20, left: 120},
		width = 960 - margin.right - margin.left,
		height = 500 - margin.top - margin.bottom;
		
	var i = 0,
		duration = 750,
		root;
	
	var tree = d3.layout.tree()
		.size([height, width]);
	
	var diagonal = d3.svg.diagonal()
		.projection(function(d) { return [d.y, d.x]; });
	
	var svg = d3.select("body").append("svg")
		.attr("width", width + margin.right + margin.left)
		.attr("height", height + margin.top + margin.bottom)
	  .append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
	root = treeData[0];
	root.x0 = height / 2;
	root.y0 = 0;
	  
	update(root);
	
	d3.select(self.frameElement).style("height", "500px");
	
	function update(source) {
	
	  // Compute the new tree layout.
	  var nodes = tree.nodes(root).reverse(),
		  links = tree.links(nodes);
	
	  // Normalize for fixed-depth.
	  nodes.forEach(function(d) { d.y = d.depth * 180; });
	
	  // Update the nodes…
	  var node = svg.selectAll("g.node")
		  .data(nodes, function(d) { return d.id || (d.id = ++i); });
	
	  // Enter any new nodes at the parent's previous position.
	  var nodeEnter = node.enter().append("g")
		  .attr("class", "node")
		  .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
		  .on("click", click);
	
	  nodeEnter.append("circle")
		  .attr("r", 1e-6)
		  .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });
	
	  nodeEnter.append("text")
		  .attr("x", function(d) { return d.children || d._children ? -13 : 13; })
		  .attr("dy", ".35em")
		  .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
		  .text(function(d) { return d.name; })
		  .style("fill-opacity", 1e-6);
	
	  // Transition nodes to their new position.
	  var nodeUpdate = node.transition()
		  .duration(duration)
		  .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });
	
	  nodeUpdate.select("circle")
		  .attr("r", 10)
		  .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });
	
	  nodeUpdate.select("text")
		  .style("fill-opacity", 1);
	
	  // Transition exiting nodes to the parent's new position.
	  var nodeExit = node.exit().transition()
		  .duration(duration)
		  .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
		  .remove();
	
	  nodeExit.select("circle")
		  .attr("r", 1e-6);
	
	  nodeExit.select("text")
		  .style("fill-opacity", 1e-6);
	
	  // Update the links…
	  var link = svg.selectAll("path.link")
		  .data(links, function(d) { return d.target.id; });
	
	  // Enter any new links at the parent's previous position.
	  link.enter().insert("path", "g")
		  .attr("class", "link")
		  .attr("d", function(d) {
			var o = {x: source.x0, y: source.y0};
			return diagonal({source: o, target: o});
		  });
	
	  // Transition links to their new position.
	  link.transition()
		  .duration(duration)
		  .attr("d", diagonal);
	
	  // Transition exiting nodes to the parent's new position.
	  link.exit().transition()
		  .duration(duration)
		  .attr("d", function(d) {
			var o = {x: source.x, y: source.y};
			return diagonal({source: o, target: o});
		  })
		  .remove();
	
	  // Stash the old positions for transition.
	  nodes.forEach(function(d) {
		d.x0 = d.x;
		d.y0 = d.y;
	  });
	}
	
	// Toggle children on click.
	function click(d) {
	  if (d.children) {
		d._children = d.children;
		d.children = null;
	  } else {
		d.children = d._children;
		d._children = null;
	  }
	  update(d);
	}
	
	</script>
		
	  </body>
	</html>`;
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}

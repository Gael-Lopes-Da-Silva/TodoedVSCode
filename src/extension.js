// @author: Gael Lopes Da Silva
// @project: Todoed
// @github: https://github.com/Gael-Lopes-Da-Silva/TodoedVSCode

const vscode = require('vscode');

let decorationTypes = {};
let keywords;

let highlight = true;
let bold = true;
let underline = true;

// ----------------------------------------------------

function activate(context) {
	keywords = vscode.workspace.getConfiguration().inspect('todoed.keywords').globalValue || vscode.workspace.getConfiguration().get('todoed.keywords');
	bold = vscode.workspace.getConfiguration().inspect('todoed.bold').globalValue || vscode.workspace.getConfiguration().get('todoed.bold')
	underline = vscode.workspace.getConfiguration().inspect('todoed.underline').globalValue || vscode.workspace.getConfiguration().get('todoed.underline')

	Object.keys(keywords).forEach(keyword => {
		decorationTypes[keyword] = vscode.window.createTextEditorDecorationType({
			color: keywords[keyword],
			fontStyle: bold ? "bold" : "",
			textDecoration: underline ? "underline" : "",
		});
	});

	context.subscriptions.push(
		vscode.commands.registerCommand('todoed.toggleHighlight', toggleHighlight),
		vscode.commands.registerCommand('todoed.listKeywords', listKeywords),
		vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor),
		vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument),
		vscode.workspace.onDidChangeConfiguration(onDidChangeConfiguration)
	);

	if (highlight && vscode.window.activeTextEditor) {
		triggerUpdateDecorations();
	}
}

function deactivate() { }

// ----------------------------------------------------

function toggleHighlight() {
	highlight = !highlight;

	if (!highlight) {
		clearDecorations();
	} else {
		triggerUpdateDecorations();
	}

	const message = `Keywords highlight is now ${highlight ? 'on' : 'off'}.`;
	vscode.window.showInformationMessage(message);
}

function onDidChangeActiveTextEditor() {
	if (vscode.window.activeTextEditor) {
		triggerUpdateDecorations();
	}
}

function onDidChangeTextDocument(event) {
	if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
		triggerUpdateDecorations();
	}
}

function onDidChangeConfiguration(event) {
	if (event.affectsConfiguration('todoed')) {
		clearDecorations();

		keywords = vscode.workspace.getConfiguration().inspect('todoed.keywords').globalValue || vscode.workspace.getConfiguration().get('todoed.keywords');
		bold = vscode.workspace.getConfiguration().inspect('todoed.bold').globalValue || vscode.workspace.getConfiguration().get('todoed.bold')
		underline = vscode.workspace.getConfiguration().inspect('todoed.underline').globalValue || vscode.workspace.getConfiguration().get('todoed.underline')

		Object.keys(keywords).forEach(keyword => {
			decorationTypes[keyword] = vscode.window.createTextEditorDecorationType({
				color: keywords[keyword],
				fontStyle: bold ? "bold" : "",
				textDecoration: underline ? "underline" : "",
			});
		});

		triggerUpdateDecorations();
	}
}

function isKeywordInString(keyword, lineText) {
	const regex = new RegExp(`(['"\`]).*${keyword}.*\\1`);
	return regex.test(lineText);
}

function clearDecorations() {
	const activeEditor = vscode.window.activeTextEditor;
	if (activeEditor) {
		Object.keys(keywords).forEach(keyword => {
			activeEditor.setDecorations(decorationTypes[keyword], []);
		});
	}
}

function triggerUpdateDecorations() {
	if (!highlight) {
		return;
	}

	const activeEditor = vscode.window.activeTextEditor;
	if (!activeEditor) {
		return;
	}

	const text = activeEditor.document.getText();

	Object.keys(keywords).forEach(keyword => {
		const regex = new RegExp(`\\b${keyword}\\b`, 'g');
		const decorations = [];

		let match;
		while ((match = regex.exec(text))) {
			const line = activeEditor.document.positionAt(match.index).line;
			const lineText = activeEditor.document.lineAt(line).text;

			if (!isKeywordInString(keyword, lineText)) {
				const startPos = activeEditor.document.positionAt(match.index);
				const endPos = activeEditor.document.positionAt(match.index + keyword.length);

				const decoration = {
					range: new vscode.Range(startPos, endPos),
					hoverMessage: `${keyword} on line ${line + 1}`,
				};

				decorations.push(decoration);
			}
		}

		activeEditor.setDecorations(decorationTypes[keyword], decorations);
	});
}

function listKeywords() {
	const activeEditor = vscode.window.activeTextEditor;
	if (!activeEditor) {
		return;
	}

	const todos = Object.keys(keywords).flatMap(keyword => {
		return activeEditor.document
			.getText()
			.split('\n')
			.map((lineText, i) => {
				const match = lineText.match(new RegExp(`\\b${keyword}\\b(?:\\(([^)]*)\\))?\\s*:\\s*([^\\r\\n]*)`));
				return {
					keyword,
					line: i + 1,
					match,
					lineText,
				};
			})
			.filter(({ match, lineText }) => match && !isKeywordInString(keyword, lineText))
			.map(({ line, match }) => {
				const contentInParentheses = match[1] || '';
				const textAfterColon = match[2] || '';
				const description = `${contentInParentheses ? `(${contentInParentheses}) ` : ""}${textAfterColon}`;

				return {
					label: keyword,
					description: description,
					line: line,
				};
			});
	});

	if (todos.length === 0) {
		vscode.window.showInformationMessage('No keywords found in the file.');
		return;
	}

	vscode.window.showQuickPick(todos).then(todo => {
		if (todo) {
			const position = new vscode.Position(todo.line - 1, 0);
			const selection = new vscode.Selection(position, position);
			activeEditor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
			activeEditor.selection = selection;
		}
	});
}

module.exports = {
	activate,
	deactivate
};
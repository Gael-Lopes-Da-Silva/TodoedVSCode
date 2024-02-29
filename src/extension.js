// @author: Gael Lopes Da Silva
// @project: Todoed
// @github: https://github.com/Gael-Lopes-Da-Silva/TodoedVSCode

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

let decorationTypes = {};
let highlight = true;

let keywords = {};
let isBold = false;
let isUnderline = true;
let isItalic = false;
let showBackground = false;
let borderRadius = 0;
let showForeground = true;
let keywordColor = "#000000";

// ----------------------------------------------------

function activate(context) {
    loadConfiguration();
    createDecorations();

    context.subscriptions.push(
        vscode.commands.registerCommand('todoed.toggleHighlight', toggleHighlight),
        vscode.commands.registerCommand('todoed.listKeywords', listKeywords),
        vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor),
        vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument),
        vscode.workspace.onDidChangeConfiguration(onDidChangeConfiguration)
    );

    updateDecorations();
}

function deactivate() {
    clearDecorations();
}

// ----------------------------------------------------

function loadConfiguration() {
    const config = vscode.workspace.getConfiguration('todoed');

    keywords = config.inspect('keywords').globalValue || config.get('keywords');
    isBold = config.inspect('isBold').globalValue || config.get('isBold');
    isUnderline = config.inspect('isUnderline').globalValue || config.get('isUnderline');
    isItalic = config.inspect('isItalic').globalValue || config.get('isItalic');
    showBackground = config.inspect('showBackground').globalValue || config.get('showBackground');
    showForeground = config.inspect('showForeground').globalValue || config.get('showForeground');
    keywordColor = config.inspect('keywordColor').globalValue || config.get('keywordColor');
    borderRadius = config.inspect('borderRadius').globalValue || config.get('borderRadius');
}

function createDecorations() {
    Object.keys(keywords).forEach(keyword => {
        decorationTypes[keyword] = vscode.window.createTextEditorDecorationType({
            backgroundColor: showBackground ? keywords[keyword] : "",
            borderRadius: `${borderRadius}px`,
            color: showForeground ? (showBackground ? keywordColor : keywords[keyword]) : "",
            fontStyle: isItalic ? "italic" : "",
            fontWeight: isBold ? "bold" : "",
            textDecoration: isUnderline ? "underline" : "",
        });
    });
}

function toggleHighlight() {
    highlight = !highlight;

    if (highlight) {
        updateDecorations();
    } else {
        clearDecorations();
    }

    vscode.window.showInformationMessage(`Keywords highlight is now ${highlight ? 'on' : 'off'}.`);
}

function listKeywords() {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) return;

    const todos = Object.keys(keywords)
        .map(keyword => {
            return activeTextEditor.document
                .getText()
                .split('\n')
                .map((lineText, i) => {
                    const regex = new RegExp(`\\b${keyword}(?:([@#~$!%?])([^]*))?(?:\\(([^]*)\\))?(?:{([^]*)})?(?:\\[([^]*)\\])?\\s*:\\s*([^\\r\\n]*)`)

                    return {
                        keyword,
                        match: lineText.match(regex),
                        line: i + 1,
                    };
                })
                .filter(({ match }) => match)
                .map(({ line, match }) => {
                    const symbol = match[1] ? match[1].trim() : '';
                    const contentAfterSymbol = match[2] ? ` ${symbol}${match[2].trim()}` : '';
                    const contentInParentheses = match[3] ? ` (${match[3].trim()})` : '';
                    const contentInCurlyBrackets = match[4] ? ` {${match[4].trim()}}` : '';
                    const contentInSquareBrackets = match[5] ? ` [${match[5].trim()}]` : '';
                    const textAfterColon = match[6] ? match[6].trim() : '';

                    let label = `${keyword}${contentAfterSymbol}${contentInParentheses}${contentInCurlyBrackets}${contentInSquareBrackets}`;

                    return {
                        label: label,
                        description: textAfterColon,
                        line: line,
                    };
                });
        })
        .flat()
        .sort((a, b) => a.line - b.line);

    if (todos.length === 0) {
        vscode.window.showInformationMessage('No keywords found in the file.');
        return;
    }

    vscode.window.showQuickPick(todos).then(todo => {
        if (todo) {
            const position = new vscode.Position(todo.line - 1, 0);
            const selection = new vscode.Selection(position, position);
            activeTextEditor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
            activeTextEditor.selection = selection;
        }
    });
}

function onDidChangeActiveTextEditor() {
    updateDecorations();
}

function onDidChangeTextDocument(event) {
    if (!vscode.window.activeTextEditor) return;

    if (event.document === vscode.window.activeTextEditor.document) {
        updateDecorations();
    }
}

function onDidChangeConfiguration(event) {
    if (event.affectsConfiguration('todoed')) {
        clearDecorations();
        loadConfiguration();
        createDecorations();
        updateDecorations();
    }
}

function updateDecorations() {
    if (!highlight) return;

    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) return;

    const text = activeTextEditor.document.getText();

    Object.keys(keywords).forEach(keyword => {
        const decorations = [];
        const regex = new RegExp(`\\b${keyword}\\b`, 'g');

        let match;
        while ((match = regex.exec(text))) {
            const startPos = activeTextEditor.document.positionAt(match.index);
            const endPos = activeTextEditor.document.positionAt(match.index + keyword.length);

            const decoration = {
                range: new vscode.Range(startPos, endPos),
                hoverMessage: "",
            };

            decorations.push(decoration);
        }

        activeTextEditor.setDecorations(decorationTypes[keyword], decorations);
    });
}

function clearDecorations() {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) return;

    Object.keys(keywords).forEach(keyword => {
        activeTextEditor.setDecorations(decorationTypes[keyword], []);
    });
}

module.exports = {
    activate,
    deactivate
};
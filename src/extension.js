// @author: Gael Lopes Da Silva
// @project: Todoed
// @github: https://github.com/Gael-Lopes-Da-Silva/TodoedVSCode

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

let decorationTypes = {};

let keywords = {};
let highlight = true;
let isBold = true;
let isUnderline = false;
let isItalic = false;
let showBackground = false;
let borderRadius = 0;
let showForeground = true;
let keywordColor = "#000000";

// ----------------------------------------------------

class CommentConfig {
    constructor() {
        this.languageToConfigPath = new Map();
        this.commentConfig = new Map();
        this.updateLanguagesDefinitions();
    }

    updateLanguagesDefinitions() {
        this.commentConfig.clear();

        vscode.extensions.all.forEach(extension => {
            const { contributes } = extension.packageJSON;
            if (contributes && contributes.languages) {
                contributes.languages.forEach(language => {
                    if (language.configuration) {
                        const configPath = path.join(extension.extensionPath, language.configuration);
                        this.languageToConfigPath.set(language.id, configPath);
                    }
                });
            }
        });
    }

    getCommentConfig(languageCode) {
        if (!this.commentConfig.has(languageCode) && this.languageToConfigPath.has(languageCode)) {
            const file = this.languageToConfigPath.get(languageCode);
            try {
                const content = fs.readFileSync(file, { encoding: 'utf8' });
                const config = JSON.parse(content);
                this.commentConfig.set(languageCode, config.comments);
                return config.comments;
            } catch (error) {
                this.commentConfig.set(languageCode, undefined);
                return undefined;
            }
        }

        return this.commentConfig.get(languageCode);
    }
}

const commentConfig = new CommentConfig();

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
    highlight = config.inspect('highlight').globalValue || config.get('highlight');
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

function listKeywords() {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) return;

    const languageId = activeTextEditor.document.languageId;
    const config = commentConfig.getCommentConfig(languageId);

    if (!config) {
        vscode.window.showInformationMessage("The language config doesn't possess comments.");
        return;
    }

    const text = activeTextEditor.document.getText();
    const lines = text.split('\n');

    let todos = [];

    function processLineComments() {
        lines.forEach((lineText, lineNumber) => {
            let earliestMatch = null;
            let earliestKeyword = null;

            Object.keys(keywords).forEach(keyword => {
                let expresion = `(?<=${escapeRegex(config.lineComment)}.*?)`;
                expresion += `\\b(${keyword})\\b`;
                expresion += `([\\[\\(\\{][^:]*[\\]\\)\\}])?`;
                expresion += `(?:[@#~$!%?\\-]([^ :]*))?`;
                expresion += ` *[:]? *`;
                expresion += `(.*)?`;

                const regex = new RegExp(expresion);
                const match = regex.exec(lineText);

                if (match && (!earliestMatch || match.index < earliestMatch.index)) {
                    earliestMatch = match;
                    earliestKeyword = match[1];
                }
            });

            if (earliestMatch && earliestKeyword) {
                const contentInEnclosure = earliestMatch[2] ? ` ${earliestMatch[2].trim()}` : "";
                const contentAfterSymbol = earliestMatch[3] ? ` ${earliestMatch[3].trim()}` : "";
                const textAfterColon = earliestMatch[4] ? earliestMatch[4].trim() : "";

                let label = `${earliestKeyword}${contentInEnclosure}${contentAfterSymbol}`;

                todos.push({
                    label: label,
                    description: textAfterColon,
                    line: lineNumber + 1,
                });
            }
        });
    }

    function processBlockComments() {
        let expresion = `${escapeRegex(config.blockComment[0])}[\\s\\S]*?${escapeRegex(config.blockComment[1])}`;

        const blockRegex = new RegExp(expresion, 'g');
        let match;

        while ((match = blockRegex.exec(text))) {
            const blockStartIndex = match.index;
            const blockText = match[0];
            const blockStartLine = activeTextEditor.document.positionAt(blockStartIndex).line;
            const lines = blockText.split('\n');

            lines.forEach((lineText, lineOffset) => {
                let earliestMatch = null;
                let earliestKeyword = null;

                Object.keys(keywords).forEach(keyword => {
                    let expression = `\\b(${keyword})\\b`;
                    expression += `([\\[\\(\\{][^:]*[\\]\\)\\}])?`;
                    expression += `(?:[@#~$!%?\\-]([^ :]*))?`;
                    expression += ` *[:]? *`;
                    expression += `(.*?)`;
                    expression += `(?=${escapeRegex(config.blockComment[1])}|$)`;

                    const regex = new RegExp(expression);
                    const keywordMatch = regex.exec(lineText);

                    if (keywordMatch && (!earliestMatch || keywordMatch.index < earliestMatch.index)) {
                        earliestMatch = keywordMatch;
                        earliestKeyword = keywordMatch[1];
                    }
                });

                if (earliestMatch && earliestKeyword) {
                    const line = blockStartLine + lineOffset + 1;

                    const contentInEnclosure = earliestMatch[2] ? ` ${earliestMatch[2].trim()}` : "";
                    const contentAfterSymbol = earliestMatch[3] ? ` ${earliestMatch[3].trim()}` : "";
                    const textAfterColon = earliestMatch[4] ? earliestMatch[4].trim() : "";

                    let label = `${earliestKeyword}${contentInEnclosure}${contentAfterSymbol}`;

                    todos.push({
                        label: label,
                        description: textAfterColon,
                        line: line,
                    });
                }
            });
        }
    }

    if (config.lineComment) {
        processLineComments();
    }

    if (config.blockComment) {
        processBlockComments();
    }

    if (todos.length === 0) {
        vscode.window.showInformationMessage('No keywords found in the file.');
        return;
    }

    todos.sort((a, b) => a.line - b.line);

    vscode.window.showQuickPick(todos).then(todo => {
        if (todo) {
            const position = new vscode.Position(todo.line - 1, 0);
            const selection = new vscode.Selection(position, position);
            activeTextEditor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
            activeTextEditor.selection = selection;
        }
    });
}

function updateDecorations() {
    if (!highlight) return;

    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) return;

    const text = activeTextEditor.document.getText();
    const languageId = activeTextEditor.document.languageId;

    const config = commentConfig.getCommentConfig(languageId);
    if (!config) return;

    Object.keys(keywords).forEach(keyword => {
        const decorations = [];

        let expresion = "";
        let expresionCount = 0;

        if (config.lineComment) {
            expresion += `(?<=${escapeRegex(config.lineComment)}.*?)`;
            expresion += `(\\b${keyword}\\b)`;
            expresionCount += 1;
        }

        if (config.blockComment) {
            if (expresionCount > 0) expresion += "|";
            expresion += `(?<=${escapeRegex(config.blockComment[0])}[\\s\\S]*?)`;
            expresion += `(\\b${keyword}\\b)`;
            expresion += `(?=[\\s\\S]*?${escapeRegex(config.blockComment[1])})`;
        }

        const regex = new RegExp(expresion, `g`);

        let match;
        while ((match = regex.exec(text))) {
            const keywordMatch = match[1] || match[2];
            if (keywordMatch) {
                const startPos = activeTextEditor.document.positionAt(match.index + match[0].indexOf(keywordMatch));
                const endPos = activeTextEditor.document.positionAt(match.index + match[0].indexOf(keywordMatch) + keywordMatch.length);

                decorations.push({
                    range: new vscode.Range(startPos, endPos),
                    hoverMessage: "",
                });
            }
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

function escapeRegex(string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

module.exports = {
    activate,
    deactivate
};
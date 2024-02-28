// @author: Gael Lopes Da Silva
// @project: Todoed
// @github: https://github.com/Gael-Lopes-Da-Silva/TodoedVSCode

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

let decorationTypes = {};

let keywords = {};
let highlight = true;
let bold = false;
let underline = true;
let italic = false;
let background = false;
let backgroundRadius = 0;
let foreground = true;
let foregroundColor = "#000000";

// ----------------------------------------------------

class CommentConfigHandler {
    constructor() {
        this.languageToConfigPath = new Map();
        this.commentConfig = new Map();
        this.updateLanguagesDefinitions();
    }

    updateLanguagesDefinitions() {
        this.commentConfig.clear();

        for (const extension of vscode.extensions.all) {
            const packageJSON = extension.packageJSON;
            if (packageJSON.contributes && packageJSON.contributes.languages) {
                for (const language of packageJSON.contributes.languages) {
                    if (language.configuration) {
                        const configPath = path.join(extension.extensionPath, language.configuration);
                        this.languageToConfigPath.set(language.id, configPath);
                    }
                }
            }
        }
    }

    getCommentConfig(languageCode) {
        if (this.commentConfig.has(languageCode)) {
            return this.commentConfig.get(languageCode);
        }

        if (!this.languageToConfigPath.has(languageCode)) {
            return undefined;
        }

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
}

const commentConfigHandler = new CommentConfigHandler();

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

    if (highlight && vscode.window.activeTextEditor) {
        triggerUpdateDecorations();
    }
}

function deactivate() {
    clearDecorations();
}

// ----------------------------------------------------

function loadConfiguration() {
    const config = vscode.workspace.getConfiguration('todoed');

    keywords = config.inspect('keywords').globalValue || config.get('keywords');
    bold = config.inspect('bold').globalValue || config.get('bold');
    underline = config.inspect('underline').globalValue || config.get('underline');
    italic = config.inspect('italic').globalValue || config.get('italic');
    background = config.inspect('background').globalValue || config.get('background');
    foreground = config.inspect('foreground').globalValue || config.get('foreground');
    foregroundColor = config.inspect('foregroundColor').globalValue || config.get('foregroundColor');
    backgroundRadius = config.inspect('backgroundRadius').globalValue || config.get('backgroundRadius');
}

function createDecorations() {
    Object.keys(keywords).forEach(keyword => {
        decorationTypes[keyword] = vscode.window.createTextEditorDecorationType({
            color: foreground ? background ? foregroundColor : keywords[keyword] : "",
            backgroundColor: background ? keywords[keyword] : "",
            fontWeight: bold ? "bold" : "",
            fontStyle: italic ? "italic" : "",
            textDecoration: underline ? "underline" : "",
            borderRadius: `${backgroundRadius}px`,
        });
    });
}

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
        loadConfiguration();
        createDecorations();
        triggerUpdateDecorations();
    }
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
    const languageId = activeEditor.document.languageId;

    Object.keys(keywords).forEach(keyword => {
        const decorations = [];
        const regex = new RegExp(`\\b${keyword}\\b`, 'g');

        let match;
        while ((match = regex.exec(text))) {
            const line = activeEditor.document.positionAt(match.index).line;
            const lineText = activeEditor.document.lineAt(line).text;

            const startPos = activeEditor.document.positionAt(match.index);
            const endPos = activeEditor.document.positionAt(match.index + keyword.length);

            const decoration = {
                range: new vscode.Range(startPos, endPos),
            };

            decorations.push(decoration);
        }

        activeEditor.setDecorations(decorationTypes[keyword], decorations);
    });
}

function listKeywords() {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }

    const todos = Object.keys(keywords)
        .map(keyword => {
            return activeEditor.document
                .getText()
                .split('\n')
                .map((lineText, i) => {
                    const match = lineText.match(new RegExp(`\\b${keyword}(?:([@#~$!%?])([^]*))?(?:\\(([^]*)\\))?(?:{([^]*)})?(?:\\[([^]*)\\])?\\s*:\\s*([^\\r\\n]*)`));

                    return {
                        keyword,
                        line: i + 1,
                        match,
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
                    // const commentCfg = commentConfigHandler.getCommentConfig(activeEditor.document.languageId);
                    // const blockCommentEndRegex = commentCfg && commentCfg.blockComment && commentCfg.blockComment[1]
                    //     ? new RegExp(`${escapeRegex(commentCfg.blockComment[1])}\\s*`)
                    //     : null;

                    let label = `${keyword}${contentAfterSymbol}${contentInParentheses}${contentInCurlyBrackets}${contentInSquareBrackets}`;

                    // if (blockCommentEndRegex) {
                    //     const endCommentMatch = textAfterColon.match(blockCommentEndRegex);
                    //     if (endCommentMatch) {
                    //         const endCommentIndex = endCommentMatch.index;
                    //         return {
                    //             label: label,
                    //             description: endCommentIndex === -1 ? textAfterColon : textAfterColon.substring(0, endCommentIndex).trim(),
                    //             line: line,
                    //         };
                    //     }
                    // }

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
            activeEditor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
            activeEditor.selection = selection;
        }
    });
}

module.exports = {
    activate,
    deactivate
};
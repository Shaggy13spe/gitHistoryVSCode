import * as vscode from 'vscode';
import * as htmlGenerator from './htmlGenerator';
import * as gitHistory from '../helpers/gitHistory';
import { LogEntry, Filter } from '../contracts';
import * as path from 'path';

const gitHistorySchema = 'git-history-viewer';
const PAGE_SIZE = 50;
let previewUri = vscode.Uri.parse(gitHistorySchema + '://authority/git-history');
let historyRetrieved: boolean;
let pageIndex = 0;
let pageSize = PAGE_SIZE;
let canGoPrevious = false;
let canGoNext = true;
let logFilter = <Filter>{};

class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private entries: LogEntry[];

    public async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Promise<string> {
        try {
            const entries = await gitHistory.getLogEntries(vscode.workspace.rootPath, pageIndex, pageSize, logFilter);
            canGoPrevious = pageIndex > 0;
            canGoNext = entries.length === pageSize;
            this.entries = entries;
            let html = this.generateHistoryView();
            return html;
        }
        catch (error) {
            return this.generateErrorView(error);
        }
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    public update(uri: vscode.Uri) {
        this._onDidChange.fire(uri);
    }

    private getStyleSheetPath(resourceName: string): string {
        return vscode.Uri.file(path.join(__dirname, '..', '..', '..', 'resources', resourceName)).toString();
    }
    private getScriptFilePath(resourceName: string): string {
        return vscode.Uri.file(path.join(__dirname, '..', '..', 'src', 'browser', resourceName)).toString();
    }
    private getNodeModulesPath(resourceName: string): string {
        return vscode.Uri.file(path.join(__dirname, '..', '..', '..', 'node_modules', resourceName)).toString();
    }

    private generateErrorView(error: string): string {
        return `
            <head>
                <link rel="stylesheet" href="${this.getNodeModulesPath(path.join('normalize.css', 'normalize.css'))}" >
                <link rel="stylesheet" href="${this.getStyleSheetPath(path.join('octicons', 'font', 'octicons.css'))}" >
                <link rel="stylesheet" href="${this.getStyleSheetPath('animate.min.css')}" >
                <link rel="stylesheet" href="${this.getStyleSheetPath('main.css')}" >
            </head>
            <body>
                ${htmlGenerator.generateErrorView(error)}
            </body>
        `;
    }

    private generateHistoryView(): string {
        const innerHtml = htmlGenerator.generateHistoryHtmlView(this.entries, canGoPrevious, canGoNext);
        return `
            <head>
                <link rel="stylesheet" href="${this.getNodeModulesPath(path.join('normalize.css', 'normalize.css'))}" >
                <link rel="stylesheet" href="${this.getNodeModulesPath(path.join('bootstrap', 'dist', 'css', 'bootstrap.min.css'))}" >
                <link rel="stylesheet" href="${this.getStyleSheetPath(path.join('octicons', 'font', 'octicons.css'))}" >
                <link rel="stylesheet" href="${this.getStyleSheetPath('animate.min.css')}" >
                <link rel="stylesheet" href="${this.getStyleSheetPath('hint.min.css')}" >
                <link rel="stylesheet" href="${this.getStyleSheetPath('main.css')}" >
                <script src="${this.getNodeModulesPath(path.join('jquery', 'dist', 'jquery.min.js'))}"></script>
                <script src="${this.getNodeModulesPath(path.join('bootstrap', 'dist', 'js', 'bootstrap.min.js'))}"></script>
                <script src="${this.getNodeModulesPath(path.join('clipboard', 'dist', 'clipboard.min.js'))}"></script>
                <script src="${this.getScriptFilePath('proxy.js')}"></script>
                <script src="${this.getScriptFilePath('svgGenerator.js')}"></script>
                <script src="${this.getScriptFilePath('detailsView.js')}"></script>
                <script src="${this.getScriptFilePath('filterForm.js')}"></script>
            </head>

            <body style="width: 95%; margin-left: 25px;">
                <div style="width: 500px; margin-top: 25px; margin-bottom: 25px; position: fixed; left: 10px; right: 0; z-order: 9999;">
                    <div style="height: 75px; margin-top: 0; margin-bottom: 15px;">
                        <button class="btn btn-secondary" type="button" data-toggle="modal" data-target="#filterForm">Filter Options</button>
                        <a class="btn btn-tertiary" href="${encodeURI('command:git.resetFilter')}" id="refresh">Refresh</a>
                    </div>
                </div>
                <div style="position: relative; top: 50px; z-order: 0;">
                    ${innerHtml}
                </div>

                <div id="filterForm" class="modal fade" style="margin-top: 75px;" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h3 class="modal-title">Graph filter options</h3>
                            </div>
                            <div id="filter-view" class="modal-body">
                                <form class="form-horizontal">
                                    <div class="form-group">
                                        <div class="col-xs-12">
                                        <label for="filterBy">Filter results by</label>
                                            <select id="filterBy" class="form-control">
                                                <option value="">Select a Filter</option>
                                                <option value="amount">Amount</option>
                                                <option value="beforeDate">Before Date</option>
                                                <option value="afterDate">After Date</option>
                                                <option value="betweenDates">Between Dates</option>
                                                <option value="author">Author</option>
                                                <option value="message">Message</option>
                                                <option value="file">File</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="form-group" id="singleArg">
                                        <div class="col-xs-12">
                                            <label for="filterArg">Filter arguments</label>
                                            <input id="filterArg" class="form-control"/>
                                        </div>
                                    </div>
                                    <!--<div class="form-group" id="multipleArgs" class="hidden">
                                        <div class="col-xs-12">
                                            <label for="filterArg1">Before Date</label>
                                            <input id="filterArg1" class="form-control"/>
                                            <label for="filterArg2">After Date</label>
                                            <input id="filterArg2" class="form-control"/>
                                        </div>
                                    </div>-->
                                </form>
                            </div>
                            <div class="modal-footer">
                                <a class="btn btn-secondary" data-dismiss="modal">Cancel</a>
                                <a class="btn btn-primary" id="applyFilter" href="#">Apply Filter</a>
                            </div>
                        </div>
                    </div>
                </div>
            </body>
        `;
    }
}

export function activate(context: vscode.ExtensionContext) {
    let provider = new TextDocumentContentProvider();
    let registration = vscode.workspace.registerTextDocumentContentProvider(gitHistorySchema, provider);

    let disposable = vscode.commands.registerCommand('git.viewHistory', () => {
        // Unique name everytime, so that we always refresh the history log
        // Untill we add a refresh button to the view
        historyRetrieved = false;
        pageIndex = 0;
        canGoPrevious = false;
        canGoNext = true;
        logFilter = <Filter>{};
        previewUri = vscode.Uri.parse(gitHistorySchema + '://authority/git-history?x=' + new Date().getTime().toString());
        return vscode.commands.executeCommand('vscode.previewHtml', previewUri, vscode.ViewColumn.One, 'Git History (git log)').then((success) => {
        }, (reason) => {
            vscode.window.showErrorMessage(reason);
        });
    });
    context.subscriptions.push(disposable, registration);

    disposable = vscode.commands.registerCommand('git.copyText', (sha: string) => {
        vscode.window.showInformationMessage(sha);
    });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('git.logNavigate', (direction: string) => {
        pageIndex = pageIndex + (direction === 'next' ? 1 : -1);
        provider.update(previewUri);
    });

    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('git.applyFilter', (filter: any) => {
        logFilter = filter;
        pageIndex = 0;
        provider.update(previewUri);
    });

    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('git.resetFilter', () => {
        logFilter = <Filter>{};
        pageIndex = 0;
        provider.update(previewUri);
    });

    context.subscriptions.push(disposable);
}
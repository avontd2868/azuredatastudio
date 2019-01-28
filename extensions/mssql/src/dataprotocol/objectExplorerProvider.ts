/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as sqlops from 'sqlops';
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();

import { ProviderBase } from './providerBase';
import { HadoopConnectionProvider, Connection } from './connectionProvider';
import * as utils from '../utils';
import { TreeNode } from '../treeNodes';
import { ConnectionNode, TreeDataContext, ITreeChangeHandler } from '../hdfsProvider';
import { IFileSource } from '../fileSources';
import { AppContext } from '../appContext';
import * as constants from '../constants';

const objectExplorerPrefix: string = 'objectexplorer://';

export class HadoopObjectExplorerProvider extends ProviderBase implements sqlops.ObjectExplorerProvider, ITreeChangeHandler {
    private sessionMap: Map<string, Session>;
    private sessionCreatedEmitter = new vscode.EventEmitter<sqlops.ObjectExplorerSession>();
    private expandCompleteEmitter = new vscode.EventEmitter<sqlops.ObjectExplorerExpandInfo>();

    constructor(private connectionProvider: HadoopConnectionProvider, private appContext: AppContext) {
        super();
        if (!this.connectionProvider) {
            throw new Error(localize('connectionProviderRequired', 'Connection provider is required'));
        }
        this.sessionMap = new Map();
        this.appContext.registerService<HadoopObjectExplorerProvider>(constants.ObjectExplorerService, this);
    }

    createNewSession(connInfo: sqlops.ConnectionInfo): Thenable<sqlops.ObjectExplorerSessionResponse> {
        return new Promise((resolve, reject) => {
            try {
                let connection = new Connection(connInfo);
                connection.saveUriWithPrefix(objectExplorerPrefix);
                let response: sqlops.ObjectExplorerSessionResponse = {
                    sessionId: connection.uri
                };
                setTimeout(() => {
                    // This must run after resolving the session since we want to only send the
                    // session created event after sending that the session request has been accepted.
                    // To make this work, waiting 10ms which should ensure the promise gets resolved in all cases
                    if (!this.sessionMap.has(connection.uri)) {
                        this.doCreateSession(connection).then(session => {
                            this.sendSessionCreated(session);
                        }).catch(error => {
                            let sessionInfo: sqlops.ObjectExplorerSession = {
                                sessionId: connection.uri,
                                success: false,
                                errorMessage: utils.getErrorMessage(error),
                                rootNode: undefined
                            };
                            this.handleSessionFailed(sessionInfo);
                        });
                    }
                }, 10);
                resolve(response);

            } catch (error) {
                reject(error);
            }
        });
    }

    private async doCreateSession(connection: Connection): Promise<sqlops.ObjectExplorerSession> {
        let session = new Session(connection);
        session.root = new RootNode(session, new TreeDataContext(this.appContext.extensionContext, this));
        this.sessionMap.set(connection.uri, session);

        // TODO #578 test connection is working?
        let sessionInfo: sqlops.ObjectExplorerSession = {
            sessionId: session.uri,
            success: true,
            rootNode: session.root.getNodeInfo(),
            errorMessage: undefined
        };
        return Promise.resolve(sessionInfo);
    }

    private handleSessionFailed(sessionInfo: sqlops.ObjectExplorerSession): void {
        this.sessionMap.delete(sessionInfo.sessionId);
        this.sendSessionCreated(sessionInfo);
    }

    private sendSessionCreated(sessionInfo: sqlops.ObjectExplorerSession): void {
        this.sessionCreatedEmitter.fire(sessionInfo);
    }

    expandNode(nodeInfo: sqlops.ExpandNodeInfo, isRefresh: boolean = false): Thenable<boolean> {
        return new Promise((resolve, reject) => {
            if (!nodeInfo) {
                reject('expandNode requires a nodeInfo object to be passed');
            } else {
                resolve(this.doExpandNode(nodeInfo, isRefresh));
            }
        });
    }

    private doExpandNode(nodeInfo: sqlops.ExpandNodeInfo, isRefresh: boolean = false): boolean {
        let session = this.sessionMap.get(nodeInfo.sessionId);
        if (!session) {
            setTimeout(() => {
                this.expandCompleteEmitter.fire({
                    sessionId: nodeInfo.sessionId,
                    nodePath: nodeInfo.nodePath,
                    errorMessage: localize('sessionIdNotFound', 'Cannot expand object explorer node. Couldn\'t find session for uri {0}', nodeInfo.sessionId),
                    nodes: undefined
                });
            }, 10);

            return false;
        } else {
            setTimeout(() => {
                // Running after promise resolution as we need the Ops Studio-side map to have been updated
                // Intentionally not awaiting or catching errors.
                // Any failure in startExpansion should be emitted in the expand complete result
                // We want this to be async and ideally return true before it completes
                this.startExpansion(session, nodeInfo, isRefresh);
            }, 10);
        }
        return true;
    }

    private async startExpansion(session: Session, nodeInfo: sqlops.ExpandNodeInfo, isRefresh: boolean = false): Promise<void> {
        let expandResult: sqlops.ObjectExplorerExpandInfo = {
            sessionId: session.uri,
            nodePath: nodeInfo.nodePath,
            errorMessage: undefined,
            nodes: []
        };
        try {
            let node = await session.root.findNodeByPath(nodeInfo.nodePath, true);
            if (!node) {
                expandResult.errorMessage = localize('nodeNotFound', 'Cannot expand object explorer node. Couldn\t find node for path {0}', nodeInfo.nodePath);
            } else {
                expandResult.errorMessage = node.getNodeInfo().errorMessage;
                let children = await node.getChildren(true);
                if (children) {
                    expandResult.nodes = children.map(c => c.getNodeInfo());
                }
            }
        } catch (error) {
            expandResult.errorMessage = utils.getErrorMessage(error);
        }
        this.expandCompleteEmitter.fire(expandResult);
    }

    refreshNode(nodeInfo: sqlops.ExpandNodeInfo): Thenable<boolean> {
        // TODO #658 implement properly
        return this.expandNode(nodeInfo, true);
    }

    closeSession(closeSessionInfo: sqlops.ObjectExplorerCloseSessionInfo): Thenable<sqlops.ObjectExplorerCloseSessionResponse> {
        // TODO #583 cleanup any resources we've opened
        let deleted = this.sessionMap.delete(closeSessionInfo.sessionId);
        let response: sqlops.ObjectExplorerCloseSessionResponse = {
            success: deleted,
            sessionId: closeSessionInfo.sessionId
        };
        return Promise.resolve(response);
    }

    findNodes(findNodesInfo: sqlops.FindNodesInfo): Thenable<sqlops.ObjectExplorerFindNodesResponse> {
        // TODO #659 implement
        let response: sqlops.ObjectExplorerFindNodesResponse = {
            nodes: []
        };
        return Promise.resolve(response);
    }

    registerOnSessionCreated(handler: (response: sqlops.ObjectExplorerSession) => any): void {
        this.sessionCreatedEmitter.event(handler);
    }

    registerOnExpandCompleted(handler: (response: sqlops.ObjectExplorerExpandInfo) => any): void {
        this.expandCompleteEmitter.event(handler);
    }

    notifyNodeChanged(node: TreeNode): void {
        this.notifyNodeChangesAsync(node);
    }

    private async notifyNodeChangesAsync(node: TreeNode): Promise<void> {
        try {
            let session = this.getSessionForNode(node);
            if (!session) {
                this.appContext.apiWrapper.showErrorMessage(localize('sessionNotFound', 'Session for node {0} does not exist', node.nodePathValue));
            } else {
                let nodeInfo = node.getNodeInfo();
                let expandInfo: sqlops.ExpandNodeInfo = {
                    nodePath: nodeInfo.nodePath,
                    sessionId: session.uri
                };
                await this.refreshNode(expandInfo);
            }
        } catch (err) {
            // TODO #667 log to output channel
            // localize('notifyError', 'Error notifying of node change: {0}', error);
        }
    }

    private getSessionForNode(node: TreeNode): Session {
        let rootNode: RootNode = undefined;
        while (rootNode === undefined && node !== undefined) {
            if (node instanceof RootNode) {
                rootNode = node;
                break;
            } else {
                node = node.parent;
            }
        }
        if (rootNode) {
            return rootNode.session;
        }
        // Not found
        return undefined;
    }

    async findNodeForContext<T extends TreeNode>(explorerContext: sqlops.ObjectExplorerContext): Promise<T> {
        let node: T = undefined;
        let session = this.findSessionForConnection(explorerContext.connectionProfile);
        if (session) {
            if (explorerContext.isConnectionNode) {
                // Note: ideally fix so we verify T matches RootNode and go from there
                node = <T><any>session.root;
            } else {
                // Find the node under the session
                node = <T><any> await session.root.findNodeByPath(explorerContext.nodeInfo.nodePath, true);
            }
        }
        return node;
    }

    private findSessionForConnection(connectionProfile: sqlops.IConnectionProfile): Session {
        for (let session of this.sessionMap.values()) {
            // This is likely wrong but suffices for now.
            if (session.connection && session.connection.isMatch(connectionProfile)) {
                return session;
            }
        }
        return undefined;
    }
}

export class Session {
    private _root: RootNode;
    constructor(private _connection: Connection) {
    }

    public get uri(): string {
        return this._connection.uri;
    }

    public get connection(): Connection {
        return this._connection;
    }

    public set root(node: RootNode) {
        this._root = node;
    }

    public get root(): RootNode {
        return this._root;
    }
}

class RootNode extends TreeNode {
    private children: TreeNode[];
    constructor(private _session: Session, private context: TreeDataContext) {
        super();
    }

    public get session(): Session {
        return this._session;
    }

    public get nodePathValue(): string {
        return this.session.uri;
    }

    public getChildren(refreshChildren: boolean): TreeNode[] | Promise<TreeNode[]> {
        if (refreshChildren || !this.children) {
            this.children = [];
            let hdfsNode = new ConnectionNode(this.context, localize('hdfsFolder', 'HDFS'), this.createHdfsFileSource());
            hdfsNode.parent = this;
            this.children.push(hdfsNode);
        }
        return this.children;
    }

    private createHdfsFileSource(): IFileSource {
        return this.session.connection.createHdfsFileSource();
    }

    getTreeItem(): vscode.TreeItem | Promise<vscode.TreeItem> {
        throw new Error('Not intended for use in a file explorer view.');
    }

    getNodeInfo(): sqlops.NodeInfo {
        let nodeInfo: sqlops.NodeInfo = {
            label: this.session.connection.host,
            isLeaf: false,
            errorMessage: undefined,
            metadata: undefined,
            nodePath: this.generateNodePath(),
            nodeStatus: undefined,
            nodeType: 'hadoop:root',
            nodeSubType: undefined,
            iconType: 'root'
        };
        return nodeInfo;
    }
}

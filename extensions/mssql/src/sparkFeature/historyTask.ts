/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as sqlops from 'sqlops';
import * as vscode from 'vscode';
import { AppContext } from '../appContext';
import { getErrorMessage } from '../utils';
import { SqlClusterConnection } from '../objectExplorerNodeProvider/connection';
import { SqlClusterLookUp } from '../bigDataClusterLookUp';

export class OpenSparkYarnHistoryTask {
    constructor(private appContext: AppContext) {
    }

    async execute(sqlConnProfile: sqlops.IConnectionProfile, isSpark: boolean): Promise<void> {
        try {
            let clusterConnInfo = await SqlClusterLookUp.lookUpSqlClusterInfo(sqlConnProfile);
            if (!clusterConnInfo)
            {
                let name = isSpark? 'Spark' : 'Yarn';
                this.appContext.apiWrapper.showErrorMessage(`Please connect to the Spark cluster before View ${name} History.`);
                return;
            }

            let hadoopConnection = new SqlClusterConnection(clusterConnInfo);
            if (isSpark) {
                vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(this.generateSparkHistoryUrl(hadoopConnection.host, hadoopConnection.port)));
            }
            else {
                vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(this.generateYarnHistoryUrl(hadoopConnection.host, hadoopConnection.port)));
            }
        } catch (error) {
            this.appContext.apiWrapper.showErrorMessage(getErrorMessage(error));
        }
    }

    private generateSparkHistoryUrl(host: string, port: string): string {
        return `https://${host}:${port}/gateway/default/sparkhistory/`;
    }

    private generateYarnHistoryUrl(host: string, port: string): string {
        return `https://${host}:${port}/gateway/default/yarn/cluster/apps`;
    }
}

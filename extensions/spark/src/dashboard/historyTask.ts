/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as sqlops from 'sqlops';
import * as vscode from 'vscode';
import { AppContext } from '../appContext';
import { getErrorMessage } from '../utils';
import * as connectionProvider from '../dataprotocol/connectionProvider';
import { EndPointLookUp } from '../endPointLookUp';

export class OpenSparkYarnHistoryTask {
    constructor(private appContext: AppContext) {
    }

    async execute(profile: sqlops.IConnectionProfile, isSpark: boolean): Promise<void> {
        try {
            let connection = await EndPointLookUp.getEndPointConnection(profile);
            if (!connection)
            {
                let name = isSpark? 'Spark' : 'Yarn';
                this.appContext.apiWrapper.showErrorMessage(`Please connect to the Spark cluster before View ${name} History.`);
                return;
            }

            // let connection: sqlops.connection.Connection;
            // if (profile) {
            //     connection = {
            //         providerName: profile.providerName,
            //         connectionId: profile.id,
            //         options: profile.options
            //     };
            // } else {
            //     connection = await sqlops.connection.getCurrentConnection();
            //     if (!connection) {
            //         let name = isSpark? 'Spark' : 'Yarn';
            //         this.appContext.apiWrapper.showErrorMessage(`Please connect to the Spark cluster before View ${name} History.`);
            //         return;
            //     }
            // }
            let hadoopConnection = new connectionProvider.Connection(connection, undefined, connection.connectionId);
            if (isSpark) {
                vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(this.generateSparkHistoryUrl(hadoopConnection.host, hadoopConnection.knoxport)));
            }
            else {
                vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(this.generateYarnHistoryUrl(hadoopConnection.host, hadoopConnection.knoxport)));
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

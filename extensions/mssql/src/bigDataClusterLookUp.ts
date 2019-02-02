/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as sqlops from 'sqlops';
import * as constants from './constants';
import * as UUID from 'vscode-languageclient/lib/utils/uuid';

export class SqlClusterLookUp {
	public static async lookUpSqlClusterInfo(obj: sqlops.IConnectionProfile | sqlops.connection.Connection): Promise<ConnectionParam> {
		if (!obj) { return undefined; }

		let clusterConnectionParam: ConnectionParam = undefined;
		if (obj.providerName === constants.mssqlClusterProviderName) {
			clusterConnectionParam = 'id' in obj ?
				this.connProfileToConnectionParam(obj) :
				this.connToConnectionParam(obj);
		} else {
			clusterConnectionParam = await this.createSqlClusterConnectionParam(obj);
		}
		return clusterConnectionParam;
	}

	private static async createSqlClusterConnectionParam(obj: sqlops.IConnectionProfile | sqlops.connection.Connection): Promise<ConnectionParam> {
		if (!obj) { return undefined; }

		let connectionId: string = 'id' in obj ? obj.id : obj.connectionId;
		if (!connectionId) { return undefined; }

		let serverInfo = await sqlops.connection.getServerInfo(connectionId);
		if (!serverInfo || !serverInfo.options) { return undefined; }

		let endpoints: IEndpoint[] = serverInfo.options[constants.clusterEndpointsProperty];
		if (!endpoints || endpoints.length === 0) { return undefined; }

		let index = endpoints.findIndex(ep => ep.serviceName === constants.hadoopKnoxEndpointName);
		if (index < 0) { return undefined; }

		let credentials = await sqlops.connection.getCredentials(connectionId);
		if (!credentials) { return undefined; }

		let clusterConnInfo = <ConnectionParam>{
			providerName: constants.mssqlClusterProviderName,
			connectionId: UUID.generateUuid(),
			options: {}
		};

		clusterConnInfo.options[constants.hostPropName] = endpoints[index].ipAddress;
		clusterConnInfo.options[constants.knoxPortPropName] = endpoints[index].port;
		clusterConnInfo.options[constants.userPropName] = 'root'; //should be the same user as sql master
		clusterConnInfo.options[constants.passwordPropName] = credentials.password;
		clusterConnInfo = this.connToConnectionParam(clusterConnInfo);

		return clusterConnInfo;
	}

	private static connProfileToConnectionParam(connectionProfile: sqlops.IConnectionProfile): ConnectionParam {
		let result = Object.assign(connectionProfile, { connectionId: connectionProfile.id });
		return <ConnectionParam>result;
	}

	private static connToConnectionParam(connection: sqlops.connection.Connection): ConnectionParam {
		let connectionId = connection.connectionId;
		let options = connection.options;
		let result = Object.assign(connection,
			{
				serverName: `${options[constants.hostPropName]},${options[constants.knoxPortPropName]}`,
				userName: options[constants.userPropName],
				password: options[constants.passwordPropName],
				id: connectionId,
			}
		);
		return <ConnectionParam>result;
	}
}

interface IEndpoint {
	serviceName: string;
	ipAddress: string;
	port: number;
}

export class ConnectionParam implements sqlops.connection.Connection, sqlops.IConnectionProfile, sqlops.ConnectionInfo
{
	public connectionName: string;
	public serverName: string;
	public databaseName: string;
	public userName: string;
	public password: string;
	public authenticationType: string;
	public savePassword: boolean;
	public groupFullName: string;
	public groupId: string;
	public saveProfile: boolean;
	public id: string;
	public azureTenantId?: string;

	public providerName: string;
	public connectionId: string;

	public options: { [name: string]: any; };
}
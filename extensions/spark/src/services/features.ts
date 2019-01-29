/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { SqlOpsDataClient } from 'dataprotocol-client';
import { ClientCapabilities, StaticFeature } from 'vscode-languageclient';
import { Telemetry } from './telemetry';
import * as serviceUtils from './serviceUtils';
import { TelemetryNotification } from './contracts';

export class TelemetryFeature implements StaticFeature {

    constructor(private _client: SqlOpsDataClient) { }

    fillClientCapabilities(capabilities: ClientCapabilities): void {
        serviceUtils.ensure(capabilities, 'telemetry')!.telemetry = true;
    }

    initialize(): void {
        this._client.onNotification(TelemetryNotification.type, e => {
            Telemetry.sendTelemetryEvent(e.params.eventName, e.params.properties, e.params.measures);
        });
    }
}

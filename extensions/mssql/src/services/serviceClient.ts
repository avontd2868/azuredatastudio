/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { SqlOpsDataClient, ClientOptions } from 'dataprotocol-client';
import { IConfig, ServerProvider, Events } from 'service-downloader';
import { ServerOptions, TransportKind } from 'vscode-languageclient';
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();
import * as path from 'path';
import { EventAndListener } from 'eventemitter2';

import { Telemetry, LanguageClientErrorHandler } from './telemetry';
import { ApiWrapper } from '../apiWrapper';
import * as Constants from '../constants';
import { TelemetryFeature, DataCatalogFeature, DataSourceWizardFeature } from './features';
import * as serviceUtils from './serviceUtils';

const baseConfig = require('./config.json');

export class ServiceClient {
    private statusView: vscode.StatusBarItem;

    constructor(private apiWrapper: ApiWrapper, private outputChannel: vscode.OutputChannel) {
        this.statusView = this.apiWrapper.createStatusBarItem(vscode.StatusBarAlignment.Left);
    }

    public startService(context: vscode.ExtensionContext): Promise<void> {
        let config: IConfig = JSON.parse(JSON.stringify(baseConfig));
        config.installDirectory = path.join(context.extensionPath, config.installDirectory);
        config.proxy = this.apiWrapper.getConfiguration('http').get('proxy');
        config.strictSSL = this.apiWrapper.getConfiguration('http').get('proxyStrictSSL') || true;

        const serverdownloader = new ServerProvider(config);
        serverdownloader.eventEmitter.onAny(this.generateHandleServerProviderEvent());

        let clientOptions: ClientOptions = this.createClientOptions();

        const installationStart = Date.now();
        let client: SqlOpsDataClient;
        return new Promise((resolve, reject) => {
            serverdownloader.getOrDownloadServer().then(e => {
                const installationComplete = Date.now();
                let serverOptions = this.generateServerOptions(e);
                client = new SqlOpsDataClient(Constants.serviceName, serverOptions, clientOptions);
                const processStart = Date.now();
                client.onReady().then(() => {
                    const processEnd = Date.now();
                    this.statusView.text = localize('serviceStarted', 'Service Started');
                    setTimeout(() => {
                        this.statusView.hide();
                    }, 1500);
                    Telemetry.sendTelemetryEvent('startup/LanguageClientStarted', {
                        installationTime: String(installationComplete - installationStart),
                        processStartupTime: String(processEnd - processStart),
                        totalTime: String(processEnd - installationStart),
                        beginningTimestamp: String(installationStart)
                    });
                });
                this.statusView.show();
                this.statusView.text = localize('serviceStarting', 'Starting service');
                let disposable = client.start();
                context.subscriptions.push(disposable);
                resolve();
            }, e => {
                Telemetry.sendTelemetryEvent('ServiceInitializingFailed');
                this.apiWrapper.showErrorMessage(localize('serviceStartFailed', 'Failed to start Scale Out Data service:{0}', e));
                // Just resolve to avoid unhandled promise. We show the error to the user.
                resolve();
            });
        });
    }


    private createClientOptions(): ClientOptions {
        return {
            providerId: Constants.providerId,
            errorHandler: new LanguageClientErrorHandler(),
            synchronize: {
                configurationSection: [Constants.extensionConfigSectionName, Constants.sqlConfigSectionName]
            },
            features: [
                // we only want to add new features
                TelemetryFeature,
                DataCatalogFeature,
                DataSourceWizardFeature
            ],
            outputChannel: new CustomOutputChannel()
        };
    }

    private generateServerOptions(executablePath: string): ServerOptions {
        let launchArgs = [];
        launchArgs.push('--log-dir');
        let logFileLocation = path.join(serviceUtils.getDefaultLogLocation(), 'scaleoutdata');
        launchArgs.push(logFileLocation);
        let config = vscode.workspace.getConfiguration(Constants.extensionConfigSectionName);
        if (config) {
            let logDebugInfo = config[Constants.configLogDebugInfo];
            if (logDebugInfo) {
                launchArgs.push('--enable-logging');
            }
        }

        return { command: executablePath, args: launchArgs, transport: TransportKind.stdio };
    }

    private generateHandleServerProviderEvent(): EventAndListener {
        let dots = 0;
        return (e: string, ...args: any[]) => {
            this.outputChannel.show();
            this.statusView.show();
            switch (e) {
                case Events.INSTALL_START:
                    this.outputChannel.appendLine(localize('installingServiceDetailed', 'Installing {0} service to {1}', Constants.serviceName, args[0]));
                    this.statusView.text = localize('installingService', 'Installing Service');
                    break;
                case Events.INSTALL_END:
                    this.outputChannel.appendLine(localize('serviceInstalled', 'Installed'));
                    break;
                case Events.DOWNLOAD_START:
                    this.outputChannel.appendLine(localize('downloadingService', 'Downloading {0}', args[0]));
                    this.outputChannel.append(`(${Math.ceil(args[1] / 1024)} KB)`);
                    this.statusView.text = localize('downloadingServiceStatus', 'Downloading Service');
                    break;
                case Events.DOWNLOAD_PROGRESS:
                    let newDots = Math.ceil(args[0] / 5);
                    if (newDots > dots) {
                        this.outputChannel.append('.'.repeat(newDots - dots));
                        dots = newDots;
                    }
                    break;
                case Events.DOWNLOAD_END:
                    this.outputChannel.appendLine(localize('downloadingServiceComplete', 'Done!'));
                    break;
                default:
                    break;
            }
        };
    }
}

class CustomOutputChannel implements vscode.OutputChannel {
    name: string;
    append(value: string): void {
        console.log(value);
    }
    appendLine(value: string): void {
        console.log(value);
    }
    // tslint:disable-next-line:no-empty
    clear(): void {
    }
    show(preserveFocus?: boolean): void;
    show(column?: vscode.ViewColumn, preserveFocus?: boolean): void;
    // tslint:disable-next-line:no-empty
    show(column?: any, preserveFocus?: any): void {
    }
    // tslint:disable-next-line:no-empty
    hide(): void {
    }
    // tslint:disable-next-line:no-empty
    dispose(): void {
    }
}


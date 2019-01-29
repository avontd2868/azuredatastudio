'use strict';

// CONFIG VALUES ///////////////////////////////////////////////////////////
export const extensionConfigSectionName = 'dataManagement';
export const sqlConfigSectionName = 'sql';
export const extensionOutputChannel = 'SQL Server 2019 Preview';
export const configLogDebugInfo = 'logDebugInfo';

// DATA PROTOCOL VALUES ///////////////////////////////////////////////////////////
export const hadoopKnoxProviderName = 'HADOOP_KNOX';
export const protocolVersion = '1.0';
export const hostPropName = 'host';
export const userPropName = 'user';
export const knoxPortPropName = 'knoxport';
export const clusterPropName = 'clustername';
export const passwordPropName = 'password';
export const groupIdPropName = 'groupId';
export const defaultKnoxPort = '30443';
export const groupIdName = 'groupId';
export const sqlProviderName = 'MSSQL';

// JUPYTER CONFIG //////////////////////////////////////////////////////////
export const pythonBundleVersion = '0.0.1';
export const pythonVersion = '3.6.6';
export const sparkMagicVersion = '0.12.6.1';
export const python3 = 'python3';
export const pysparkkernel = 'pysparkkernel';
export const sparkkernel = 'sparkkernel';
export const pyspark3kernel = 'pyspark3kernel';
export const python3DisplayName = 'Python 3';
export const defaultSparkKernel = 'pyspark3kernel';
export const pythonPathConfigKey = 'pythonPath';
export const notebookConfigKey = 'notebook';

export const outputChannelName = 'dataManagement';
export const hdfsHost = 'host';
export const hdfsUser = 'user';
export const UNTITLED_SCHEMA = 'untitled';
export const sqlFileExtension = 'sql';

export const winPlatform = 'win32';
export const osxPlatform = 'darwin';

// TODO update with our own crash link
export const serviceCrashLink = 'https://github.com/Microsoft/vscode-mssql/wiki/SqlToolsService-Known-Issues';
export const providerId = 'dataManagement';

export const hadoopConnectionTimeoutSeconds = 15;
export const hdfsRootPath = '/';

// SPARK JOB SUBMISSION //////////////////////////////////////////////////////////
export const livySubmitSparkJobCommand = 'livy.cmd.submitSparkJob';
export const livySubmitSparkJobFromFileCommand = 'livy.cmd.submitFileToSparkJob';
export const livySubmitSparkJobTask = 'livy.task.submitSparkJob';
export const livyOpenSparkHistory = 'livy.task.openSparkHistory';
export const livyOpenYarnHistory = 'livy.task.openYarnHistory';
export const livySubmitPath = '/gateway/default/livy/v1/batches';
export const livyTimeInMSForCheckYarnApp = 1000;
export const livyRetryTimesForCheckYarnApp = 20;
export const sparkJobFileSelectorButtonWidth = '30px';
export const sparkJobFileSelectorButtonHeight = '30px';

// WORKBENCH APIs //////////////////////////////////////////////////////////
export const workbenchCloseActiveEditor = 'workbench.action.closeActiveEditor';

// SERVICE NAMES //////////////////////////////////////////////////////////
export const ObjectExplorerService = 'objectexplorer';
export const ViewType = 'view';

export enum BuiltInCommands {
    SetContext = 'setContext'
}

export enum CommandContext {
    WizardServiceEnabled = 'wizardservice:enabled'
}

export enum HdfsItems {
    Connection = 'hdfs:connection',
    Folder = 'hdfs:folder',
    File = 'hdfs:file',
    Message = 'hdfs:message'
}

export enum HdfsItemsSubType {
    Spark = 'hdfs:spark'
}

export enum AuthenticationType {
    IntegratedAuthentication = 'Integrated',
    UsernamePasswordAuthentication = 'Username Password',
    SqlAuthentication = 'SqlLogin'
}

import { sdk } from './sdk'

export const { createBackup, restoreInit } = sdk.setupBackups(async () =>
  sdk.Backups.ofVolumes('veilid', 'startos').setOptions({
    exclude: ['protected_store/', 'table_store/', 'block_store/', 'ipc/'],
  }),
)

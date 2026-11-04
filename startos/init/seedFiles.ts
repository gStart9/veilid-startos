import { storeJson } from '../fileModels/store.json'
import { veilidServerConf } from '../fileModels/veilidServerConf'
import { sdk } from '../sdk'

export const seedFiles = sdk.setupOnInit(async (effects) => {
  await veilidServerConf.merge(effects, {})
  await storeJson.merge(effects, {})
})

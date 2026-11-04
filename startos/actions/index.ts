import { sdk } from '../sdk'
import { configureNode } from './configureNode'
import { nodeInfo } from './nodeInfo'
import { resetNode } from './resetNode'

export const actions = sdk.Actions.of()
  .addAction(nodeInfo)
  .addAction(configureNode)
  .addAction(resetNode)

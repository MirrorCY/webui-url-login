import { Context } from '@koishijs/client'
import Page from './page.vue'
import 'virtual:uno.css'

export default (ctx: Context) => {
  ctx.slot({
    type: 'global',
    component: Page,
  })
}

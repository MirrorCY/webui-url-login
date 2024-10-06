import { Binding, Context, Schema, trimSlash, User } from 'koishi'
import { resolve } from 'path'
import { } from '@koishijs/plugin-console'
import { } from '@koishijs/plugin-auth'

declare module '@koishijs/console' {
  interface Events {
    'webui-url-login/login'(this: Client, otp: string): Promise<boolean>
    'webui-url-login/getBinding'(this: Client, id: number): Promise<Pick<Binding, 'platform' | 'pid'>>
  }
}

export const name = 'webui-url-login'
export const inject = ['console', 'auth', 'server', 'database']
export interface Config {
  timeout: number,
  isDirectOnly: boolean,
  selfUrl: string,
  jumpUrl: string,
}
export const Config: Schema<Config> = Schema.object({
  timeout: Schema.number().default(5 * 60 * 1000).description('登录链接超时时间'),
  isDirectOnly: Schema.boolean().default(true).description('仅私聊可用'),
  selfUrl: Schema.string().description('公网访问地址，留空用全局 selfUrl'),
  jumpUrl: Schema.string().description('登录成功后默认跳转到控制台的这个页面'),
})
export function apply(ctx: Context, config: Config) {
  let pendingList: Record<string, { user: Pick<User, 'id' | 'name' | 'authority' | 'config'>, timestamp: number }> = {}
  ctx.console.addEntry({
    dev: resolve(__dirname, '../client/index.ts'),
    prod: resolve(__dirname, '../dist'),
  })
  ctx.console.addListener('webui-url-login/login', async function (otp) {
    const userInfo = pendingList[otp]
    if (userInfo) {
      const { user, timestamp } = userInfo
      const isExpired = Date.now() - timestamp > config.timeout
      if (isExpired) {
        delete pendingList[otp]
        return false
      }
      await ctx.auth.createToken(this, 'platform', user)
      delete pendingList[otp]
      return true
    }
    return false
  })

  ctx.console.addListener('webui-url-login/getBinding', async function (id) {
    return (await ctx.database.get('binding', { aid: id }, ['platform', 'pid']))[0]
  })

  ctx.command('webui-url-login <redirectTo:text>', '获取登录链接')
    .userFields(['id', 'name', 'config', 'authority'])
    .action(async ({ session }, path) => {
      path = path || config.jumpUrl
      if (config.isDirectOnly && !session.isDirect) return '请在私聊中使用该命令。'
      const otp = Math.floor(Math.random() * 62 ** 6).toString(36)
      pendingList[otp] = {
        user: session.user,
        timestamp: Date.now()
      }
      const baseUrl = trimSlash(config.selfUrl ?? ctx.server.config.selfUrl ?? ctx.server.selfUrl)
      path = path ? '&redirect=' + encodeURIComponent(path) : ''
      const info = '链接包含了您的账户信息，请勿泄露\n'
      return info + baseUrl + '?otp=' + otp + path
    })
}

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { send, useStorage } from '@koishijs/client'


const route = useRoute()
const otp = route.query?.otp as string
const redirect = route.query?.redirect as string
  ; (async () => {
    if (otp) {
      if (!await send('webui-url-login/login', otp)) return
      const authInfoRef = useStorage<{ id?: number, platform?: string, userId?: string }>('auth', 2)
      const binding = await send('webui-url-login/getBinding', authInfoRef.value.id)
      authInfoRef.value.platform = binding?.platform
      authInfoRef.value.userId = binding?.pid
      if (redirect) window.open(redirect, '_self')
    }
  })()
</script>

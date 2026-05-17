<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useAuthStore } from '@/features/auth/store'
import { useUpdateUser } from '@/features/auth/queries'
import { useToast } from '@/shared/composables/useToast'
import { User } from 'lucide-vue-next'

const { t } = useI18n()
const auth = useAuthStore()
const updateMutation = useUpdateUser()
const toast = useToast()

const form = ref({ first_name: '', last_name: '' })

onMounted(() => {
  if (auth.user) {
    form.value.first_name = auth.user.first_name
    form.value.last_name = auth.user.last_name
  }
})

async function handleSave() {
  try {
    await updateMutation.mutateAsync({
      first_name: form.value.first_name,
      last_name: form.value.last_name,
    })
    await auth.fetchUser()
    toast.success(t('profile.saved'))
  } catch {
    toast.error(t('profile.saveError'))
  }
}
</script>

<template>
  <Topbar :title="t('nav.profile')" />
  <main class="flex-1 p-4 sm:p-6 overflow-y-auto">
    <div class="max-w-lg mx-auto surface-card p-6 sm:p-8 animate-[fade-up_0.4s_ease-out]">
      <form @submit.prevent="handleSave" data-loc="auth.profile.form" class="space-y-5">
        <label class="block">
          <span class="text-xs font-medium text-muted-foreground mb-1.5 block">{{ t('auth.firstName') }}</span>
          <div class="relative">
            <User class="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              v-model="form.first_name"
              type="text"
              data-loc="auth.profile.first-name-input"
              required
              class="w-full h-11 ps-9 pe-3 rounded-lg bg-white/[0.03] border border-border/70 text-sm placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:bg-white/[0.05] transition"
            />
          </div>
        </label>

        <label class="block">
          <span class="text-xs font-medium text-muted-foreground mb-1.5 block">{{ t('auth.lastName') }}</span>
          <div class="relative">
            <User class="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              v-model="form.last_name"
              type="text"
              data-loc="auth.profile.last-name-input"
              required
              class="w-full h-11 ps-9 pe-3 rounded-lg bg-white/[0.03] border border-border/70 text-sm placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:bg-white/[0.05] transition"
            />
          </div>
        </label>

        <button
          type="submit"
          data-loc="auth.profile.save-btn"
          :disabled="updateMutation.isPending.value"
          class="group w-full h-11 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground font-medium text-sm shadow-[var(--shadow-glow)] hover:opacity-95 transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {{ updateMutation.isPending.value ? '...' : t('common.save') }}
        </button>
      </form>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Mail, Lock, User, X } from 'lucide-vue-next'
import { useAuthStore } from '@/features/auth/store'
import { useI18n } from '@/shared/utils/i18n'
import { useGoogleAuth } from '@/shared/composables/useGoogleAuth'
import Logo from '@/layout/Logo.vue'
import LangSwitch from '@/layout/LangSwitch.vue'
import ThemeToggle from '@/shared/components/ThemeToggle.vue'

const router = useRouter()
const auth = useAuthStore()
const { t } = useI18n()
const { triggerGoogleLogin, loading: googleLoading } = useGoogleAuth()

const form = ref({ email: '', password: '', firstName: '', lastName: '' })
const error = ref('')
const loading = ref(false)

const popupOpen = ref(false)
const popupType = ref<'terms' | 'privacy'>('terms')

function openPopup(type: 'terms' | 'privacy') {
  popupType.value = type
  popupOpen.value = true
}

async function handleRegister() {
  error.value = ''
  loading.value = true
  try {
    await auth.register({
      email: form.value.email,
      password: form.value.password,
      first_name: form.value.firstName || undefined,
      last_name: form.value.lastName || undefined,
    })
    router.push('/brands')
  } catch (e: any) {
    const data = e.response?.data
    error.value = data?.email?.[0] || data?.password?.[0] || data?.detail || 'Registration failed'
  } finally {
    loading.value = false
  }
}

async function handleGoogleRegister() {
  error.value = ''
  try {
    const idToken = await triggerGoogleLogin()
    await auth.googleLogin(idToken)
    router.push('/brands')
  } catch (e: any) {
    error.value = e.message || 'Google sign-up failed'
  }
}
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
    <div class="flex flex-col p-6 sm:p-8 lg:p-12">
      <div class="flex items-center justify-between">
        <Logo />
        <div class="flex items-center gap-2">
          <ThemeToggle />
          <LangSwitch />
        </div>
      </div>
      <div class="flex-1 flex items-center justify-center py-10">
        <div class="w-full max-w-sm space-y-6 animate-[fade-up_0.5s_ease-out_both]">
          <div class="space-y-2">
            <h1 class="text-3xl font-semibold tracking-tight">{{ t('auth.regTitle') }}</h1>
            <p class="text-sm text-muted-foreground">{{ t('auth.regSub') }}</p>
          </div>

          <button data-loc="auth.register.google-btn" class="w-full h-11 rounded-lg border border-border/70 bg-overlay-subtle hover:bg-overlay-medium transition flex items-center justify-center gap-3 text-sm font-medium" :disabled="googleLoading" @click="handleGoogleRegister">
            <svg viewBox="0 0 24 24" class="h-4 w-4">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c6.9 0 11.4-4.8 11.4-11.6 0-.8-.1-1.4-.2-1.9H12z"/>
            </svg>
            {{ googleLoading ? '...' : t('auth.signupGoogle') }}
          </button>

          <div class="flex items-center gap-3 text-[11px] text-muted-foreground">
            <div class="h-px flex-1 bg-border/60" /><span>{{ t('auth.or') }}</span><div class="h-px flex-1 bg-border/60" />
          </div>

          <form @submit.prevent="handleRegister" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <label class="block">
                <span class="text-xs font-medium text-muted-foreground mb-1.5 block">{{ t('auth.firstName') }}</span>
                <div class="relative">
                  <User class="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    v-model="form.firstName"
                    data-loc="auth.register.first-name-input"
                    placeholder="Ada"
                    class="w-full h-11 ps-9 pe-3 rounded-lg bg-overlay-subtle border border-border/70 text-sm placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 transition"
                  />
                </div>
              </label>
              <label class="block">
                <span class="text-xs font-medium text-muted-foreground mb-1.5 block">{{ t('auth.lastName') }}</span>
                <div class="relative">
                  <User class="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    v-model="form.lastName"
                    data-loc="auth.register.last-name-input"
                    placeholder="Khan"
                    class="w-full h-11 ps-9 pe-3 rounded-lg bg-overlay-subtle border border-border/70 text-sm placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 transition"
                  />
                </div>
              </label>
            </div>

            <label class="block">
              <span class="text-xs font-medium text-muted-foreground mb-1.5 block">{{ t('auth.email') }}</span>
              <div class="relative">
                <Mail class="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  v-model="form.email"
                  type="email"
                  data-loc="auth.register.email-input"
                  placeholder="you@company.com"
                  required
                  class="w-full h-11 ps-9 pe-3 rounded-lg bg-overlay-subtle border border-border/70 text-sm placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 transition"
                />
              </div>
            </label>

            <label class="block">
              <span class="text-xs font-medium text-muted-foreground mb-1.5 block">{{ t('auth.password') }}</span>
              <div class="relative">
                <Lock class="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  v-model="form.password"
                  type="password"
                  data-loc="auth.register.password-input"
                  :placeholder="t('auth.passHint')"
                  required
                  minlength="8"
                  class="w-full h-11 ps-9 pe-3 rounded-lg bg-overlay-subtle border border-border/70 text-sm placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 transition"
                />
              </div>
            </label>

            <div v-if="error" class="text-sm text-destructive">{{ error }}</div>

            <label class="flex items-start gap-2 text-xs text-muted-foreground">
              <input type="checkbox" data-loc="auth.register.agreement" class="mt-0.5 h-3.5 w-3.5 rounded accent-primary" />
              <span>{{ t('auth.agreePre') }} <button type="button" data-loc="auth.register.terms-link" class="text-primary hover:underline" @click="openPopup('terms')">{{ t('auth.terms') }}</button> {{ t('auth.agreeMid') }} <button type="button" class="text-primary hover:underline" @click="openPopup('privacy')">{{ t('auth.privacy') }}</button>.</span>
            </label>

            <button
              type="submit"
              data-loc="auth.register.create-btn"
              :disabled="loading"
              class="group w-full h-11 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground font-medium text-sm shadow-[var(--shadow-glow)] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {{ loading ? '...' : t('auth.createBtn') }}
              <ArrowRight v-if="!loading" class="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>

          <p class="text-center text-xs text-muted-foreground">
            {{ t('auth.haveAccount') }}
            <router-link to="/login" data-loc="auth.register.signin-link" class="text-foreground font-medium hover:text-primary">{{ t('auth.signInLink') }}</router-link>
          </p>
        </div>
      </div>
    </div>

    <div class="hidden lg:block relative overflow-hidden border-s border-border/60">
      <div class="absolute inset-0 aurora" />
      <div class="absolute inset-0 grid-bg opacity-40" />
      <div class="relative h-full flex items-center justify-center p-12">
        <div class="max-w-md space-y-6">
          <h2 class="text-4xl font-semibold tracking-tight leading-[1.1]">
            {{ t('auth.builtBy1') }} <span class="text-gradient">{{ t('auth.builtBy2') }}</span>
          </h2>
          <ul class="space-y-3 text-sm text-muted-foreground">
            <li v-for="key in (['auth.bullet1', 'auth.bullet2', 'auth.bullet3', 'auth.bullet4'] as const)" :key="key" class="flex items-center gap-2.5">
              <span class="h-1.5 w-1.5 rounded-full bg-[image:var(--gradient-brand)]" /> {{ t(key) }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Terms / Privacy Popup -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="popupOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="popupOpen = false">
          <div class="relative w-full max-w-lg max-h-[85vh] surface-card rounded-2xl border border-border/60 shadow-xl flex flex-col overflow-hidden">
            <div class="flex items-center justify-between p-5 border-b border-border/40">
              <h2 class="text-lg font-semibold">{{ popupType === 'terms' ? t('terms.title') : t('privacy.title') }}</h2>
              <button class="p-1.5 rounded-lg hover:bg-overlay-medium transition" @click="popupOpen = false">
                <X class="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div class="flex-1 overflow-y-auto p-5 text-sm text-muted-foreground leading-relaxed">
              {{ popupType === 'terms' ? t('terms.content') : t('privacy.content') }}
            </div>
            <div class="p-4 border-t border-border/40">
              <button class="w-full h-10 rounded-lg bg-overlay-medium hover:bg-overlay-strong text-sm font-medium transition" @click="popupOpen = false">
                {{ t('popup.close') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowRight, Sparkles, Mail, Lock } from 'lucide-vue-next'
import { useAuthStore } from '@/features/auth/store'
import { useI18n } from '@/shared/utils/i18n'
import { useGoogleAuth } from '@/shared/composables/useGoogleAuth'
import Logo from '@/layout/Logo.vue'
import LangSwitch from '@/layout/LangSwitch.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { t } = useI18n()
const { triggerGoogleLogin, loading: googleLoading } = useGoogleAuth()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    const redirect = (route.query.redirect as string) || '/brands'
    router.push(redirect)
  } catch (e: any) {
    error.value = e.response?.data?.detail || 'Invalid credentials'
  } finally {
    loading.value = false
  }
}

async function handleGoogleLogin() {
  error.value = ''
  try {
    const idToken = await triggerGoogleLogin()
    await auth.googleLogin(idToken)
    const redirect = (route.query.redirect as string) || '/brands'
    router.push(redirect)
  } catch (e: any) {
    error.value = e.message || 'Google login failed'
  }
}
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
    <div class="flex flex-col p-6 sm:p-8 lg:p-12">
      <Logo />
      <div class="flex-1 flex items-center justify-center py-10">
        <div class="w-full max-w-sm space-y-7 animate-[fade-up_0.5s_ease-out_both]">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-overlay-light border border-border/60 text-[11px] text-muted-foreground">
              <Sparkles class="h-3 w-3 text-primary" />
              {{ t('auth.aiChip') }}
            </div>
            <h1 class="text-3xl font-semibold tracking-tight">{{ t('auth.welcome') }}</h1>
            <p class="text-sm text-muted-foreground">{{ t('auth.welcomeSub') }}</p>
          </div>

          <button data-loc="auth.login.google-btn" class="w-full h-11 rounded-lg border border-border/70 bg-overlay-subtle hover:bg-overlay-medium transition flex items-center justify-center gap-3 text-sm font-medium" :disabled="googleLoading" @click="handleGoogleLogin">
            <svg viewBox="0 0 24 24" class="h-4 w-4">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c6.9 0 11.4-4.8 11.4-11.6 0-.8-.1-1.4-.2-1.9H12z"/>
            </svg>
            {{ googleLoading ? '...' : t('auth.continueGoogle') }}
          </button>

          <div class="flex items-center gap-3 text-[11px] text-muted-foreground">
            <div class="h-px flex-1 bg-border/60" />
            <span>{{ t('auth.orEmail') }}</span>
            <div class="h-px flex-1 bg-border/60" />
          </div>

          <form @submit.prevent="handleLogin" class="space-y-4">
            <label class="block">
              <span class="text-xs font-medium text-muted-foreground mb-1.5 block">{{ t('auth.email') }}</span>
              <div class="relative">
                <Mail class="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  v-model="email"
                  type="email"
                  data-loc="auth.login.email-input"
                  placeholder="you@company.com"
                  required
                  class="w-full h-11 ps-9 pe-3 rounded-lg bg-overlay-subtle border border-border/70 text-sm placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:bg-overlay-light transition"
                />
              </div>
            </label>

            <label class="block">
              <span class="text-xs font-medium text-muted-foreground mb-1.5 block">{{ t('auth.password') }}</span>
              <div class="relative">
                <Lock class="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  v-model="password"
                  type="password"
                  data-loc="auth.login.password-input"
                  placeholder="••••••••"
                  required
                  class="w-full h-11 ps-9 pe-3 rounded-lg bg-overlay-subtle border border-border/70 text-sm placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:bg-overlay-light transition"
                />
              </div>
            </label>

            <div v-if="error" class="text-sm text-destructive">{{ error }}</div>

            <label class="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" data-loc="auth.login.remember-me" class="h-3.5 w-3.5 rounded border-border bg-transparent accent-[oklch(0.68_0.24_295)]" />
              {{ t('auth.rememberMe') }}
            </label>

            <button
              type="submit"
              data-loc="auth.login.signin-btn"
              :disabled="loading"
              class="group w-full h-11 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground font-medium text-sm shadow-[var(--shadow-glow)] hover:opacity-95 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {{ loading ? '...' : t('auth.signIn') }}
              <ArrowRight v-if="!loading" class="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>

          <p class="text-center text-xs text-muted-foreground">
            {{ t('auth.noAccount') }}
            <router-link to="/register" data-loc="auth.login.register-link" class="text-foreground font-medium hover:text-primary">{{ t('auth.createOne') }}</router-link>
          </p>
        </div>
      </div>

      <div class="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{{ t('auth.copyright') }}</span>
        <LangSwitch />
      </div>
    </div>

    <div class="hidden lg:block relative overflow-hidden border-s border-border/60">
      <div class="absolute inset-0 aurora animate-[aurora_18s_ease_infinite]" />
      <div class="absolute inset-0 grid-bg opacity-50" />

      <div class="relative h-full flex flex-col justify-between p-12">
        <div />
        <div class="space-y-8">
          <div class="space-y-3 max-w-md">
            <div class="text-xs uppercase tracking-[0.2em] text-primary/80">{{ t('auth.platformChip') }}</div>
            <h2 class="text-4xl font-semibold tracking-tight leading-[1.1]">
              {{ t('auth.heroPart1') }} <span class="text-gradient">{{ t('auth.heroPart2') }}</span> {{ t('auth.heroPart3') }}
            </h2>
            <p class="text-sm text-muted-foreground leading-relaxed">{{ t('auth.heroDesc') }}</p>
          </div>

          <div class="relative max-w-md">
            <div class="absolute -inset-px rounded-2xl bg-[image:var(--gradient-brand)] opacity-40 blur-xl" />
            <div class="relative surface-card p-5 space-y-3 animate-[float_6s_ease-in-out_infinite]">
              <div class="flex items-center gap-2">
                <div class="h-8 w-8 rounded-lg bg-[image:var(--gradient-brand)] grid place-items-center">
                  <Sparkles class="h-4 w-4 text-primary-foreground" />
                </div>
                <div class="text-xs">
                  <div class="font-semibold">{{ t('auth.byHDM') }}</div>
                  <div class="text-muted-foreground text-[11px]">{{ t('auth.frame') }}</div>
                </div>
                <span class="ms-auto text-[11px] px-1.5 py-0.5 rounded bg-success/15 text-success">{{ t('auth.score') }}</span>
              </div>
              <div class="text-sm font-medium leading-snug">{{ t('auth.adCopy') }}</div>
              <div class="flex gap-1.5">
                <span class="text-[11px] px-2 py-0.5 rounded-full bg-overlay-light border border-border/60">TOFU</span>
                <span class="text-[11px] px-2 py-0.5 rounded-full bg-overlay-light border border-border/60">Persona 2</span>
                <span class="text-[11px] px-2 py-0.5 rounded-full bg-overlay-light border border-border/60">PAS</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-6 text-xs text-muted-foreground">
          <div>
            <div class="text-base font-semibold text-foreground">2,140</div>
            <div>{{ t('auth.activeBrands') }}</div>
          </div>
          <div>
            <div class="text-base font-semibold text-foreground">1.2M</div>
            <div>{{ t('auth.adsGen') }}</div>
          </div>
          <div>
            <div class="text-base font-semibold text-foreground">91</div>
            <div>{{ t('auth.avgScore') }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

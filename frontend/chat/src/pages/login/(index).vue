<template>
  <q-layout view="hHh lpR fFf" class="discord-bg">
    <q-page-container>
      <q-page class="discord-auth-bg">
        <div class="discord-card q-pa-lg login-card">
          <!-- Logo & Header -->
          <div class="column items-center q-mb-lg text-center">
            <div class="auth-icon-wrapper q-mb-sm">
              <q-icon name="chat" size="30px" color="primary" />
            </div>
            <div class="text-h5 text-weight-bold text-white q-mt-xs">Vitaj späť!</div>
            <div class="text-caption text-grey-5 q-mt-xs">Máme radosť, že ťa znova vidíme!</div>
          </div>

          <q-form @submit="onSubmit">
            <!-- Username / Email Field -->
            <div class="q-mb-md">
              <label class="discord-field-label block">
                Používateľské meno alebo email
                <span class="discord-field-required">*</span>
              </label>
              <q-input
                v-model="username"
                type="text"
                outlined
                dense
                autofocus
                autocomplete="username"
                class="discord-input"
                placeholder="Zadaj meno alebo email"
                :rules="[(v) => !!v || 'Používateľské meno alebo email je povinné']"
                lazy-rules
              >
                <template #prepend>
                  <q-icon name="person" size="20px" color="grey-5" />
                </template>
              </q-input>
            </div>

            <!-- Password Field -->
            <div class="q-mb-md">
              <div class="row justify-between items-center q-mb-none">
                <label class="discord-field-label block">
                  Heslo
                  <span class="discord-field-required">*</span>
                </label>
              </div>
              <q-input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                outlined
                dense
                autocomplete="current-password"
                class="discord-input"
                placeholder="Zadaj heslo"
                :rules="[(v) => !!v || 'Heslo je povinné']"
                lazy-rules
              >
                <template #prepend>
                  <q-icon name="lock" size="20px" color="grey-5" />
                </template>
                <template #append>
                  <q-btn
                    flat
                    round
                    dense
                    size="sm"
                    :icon="showPassword ? 'visibility_off' : 'visibility'"
                    color="grey-5"
                    @click="showPassword = !showPassword"
                    :title="showPassword ? 'Skryť heslo' : 'Zobraziť heslo'"
                  />
                </template>
              </q-input>
            </div>

            <!-- Error Banner -->
            <transition name="fade">
              <div v-if="error" class="discord-error-banner q-mb-md row items-center no-wrap">
                <q-icon
                  name="error_outline"
                  size="20px"
                  color="negative"
                  class="q-mr-sm col-auto"
                />
                <div class="text-caption text-weight-medium col">{{ error }}</div>
              </div>
            </transition>

            <!-- Submit Button -->
            <q-btn
              type="submit"
              label="Prihlásiť sa"
              class="full-width discord-btn-primary q-mt-sm"
              :loading="loading"
              no-caps
              unelevated
            />

            <!-- Switch to Register -->
            <div class="text-caption text-grey-5 q-mt-md">
              Potrebuješ účet?
              <router-link to="/register" class="discord-link q-ml-xs">
                Zaregistruj sa
              </router-link>
            </div>
          </q-form>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { useAuthStore } from '@/stores/store';

export default defineComponent({
  name: 'LoginPage',

  data() {
    return {
      username: '',
      password: '',
      showPassword: false,
      loading: false,
      error: '',
    };
  },

  computed: {
    ...mapStores(useAuthStore),
  },

  methods: {
    async onSubmit() {
      this.loading = true;
      this.error = '';

      const ok = await this.authStore.login(this.username, this.password);

      this.loading = false;

      if (ok) {
        await this.$router.push('/');
      } else {
        this.error = 'Nesprávne používateľské meno alebo heslo.';
      }
    },
  },
});
</script>

<style scoped>
.login-card {
  width: 100%;
  max-width: 440px;
}

.auth-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: rgba(88, 101, 242, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.discord-error-banner {
  background-color: rgba(242, 63, 67, 0.12);
  border: 1px solid rgba(242, 63, 67, 0.35);
  color: #fa777c;
  padding: 10px 14px;
  border-radius: 8px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

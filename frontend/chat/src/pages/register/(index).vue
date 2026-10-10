<template>
  <q-layout view="hHh lpR fFf" class="discord-bg">
    <q-page-container>
      <q-page class="discord-auth-bg">
        <div class="discord-card q-pa-lg register-card">
          <!-- Logo & Header -->
          <div class="column items-center q-mb-lg text-center">
            <div class="auth-icon-wrapper q-mb-sm">
              <q-icon name="person_add" size="30px" color="primary" />
            </div>
            <div class="text-h5 text-weight-bold text-white q-mt-xs">Vytvorenie účtu</div>
            <div class="text-caption text-grey-5 q-mt-xs">
              Pripoj sa k svojim priateľom a komunitám
            </div>
          </div>

          <q-form @submit="onSubmit">
            <!-- Name & Surname row -->
            <div class="row q-col-gutter-sm q-mb-sm">
              <div class="col-12 col-sm-6">
                <label class="discord-field-label block">
                  Meno
                  <span class="discord-field-required">*</span>
                </label>
                <q-input
                  v-model="name"
                  type="text"
                  outlined
                  dense
                  autofocus
                  autocomplete="given-name"
                  class="discord-input"
                  placeholder="Meno"
                  :rules="[(v) => !!v || 'Meno je povinné']"
                  lazy-rules
                >
                  <template #prepend>
                    <q-icon name="person" size="20px" color="grey-5" />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-sm-6">
                <label class="discord-field-label block">
                  Priezvisko
                  <span class="discord-field-required">*</span>
                </label>
                <q-input
                  v-model="surname"
                  type="text"
                  outlined
                  dense
                  autocomplete="family-name"
                  class="discord-input"
                  placeholder="Priezvisko"
                  :rules="[(v) => !!v || 'Priezvisko je povinné']"
                  lazy-rules
                >
                  <template #prepend>
                    <q-icon name="badge" size="20px" color="grey-5" />
                  </template>
                </q-input>
              </div>
            </div>

            <!-- Nickname -->
            <div class="q-mb-sm">
              <label class="discord-field-label block">
                Prezývka
                <span class="discord-field-required">*</span>
              </label>
              <q-input
                v-model="nickname"
                type="text"
                outlined
                dense
                autocomplete="username"
                class="discord-input"
                placeholder="napr. herny_kral"
                :rules="[(v) => !!v || 'Prezývka je povinná']"
                lazy-rules
              >
                <template #prepend>
                  <q-icon name="alternate_email" size="20px" color="grey-5" />
                </template>
              </q-input>
            </div>

            <!-- Email -->
            <div class="q-mb-sm">
              <label class="discord-field-label block">
                Email
                <span class="discord-field-required">*</span>
              </label>
              <q-input
                v-model="email"
                type="email"
                outlined
                dense
                autocomplete="email"
                class="discord-input"
                placeholder="meno@domena.sk"
                :rules="[
                  (v) => !!v || 'Email je povinný',
                  (v) => /.+@.+\..+/.test(v) || 'Neplatný formát emailu',
                ]"
                lazy-rules
              >
                <template #prepend>
                  <q-icon name="mail" size="20px" color="grey-5" />
                </template>
              </q-input>
            </div>

            <!-- Password & Confirm Password row -->
            <div class="row q-col-gutter-sm q-mb-sm">
              <div class="col-12 col-sm-6">
                <label class="discord-field-label block">
                  Heslo
                  <span class="discord-field-required">*</span>
                </label>
                <q-input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  outlined
                  dense
                  autocomplete="new-password"
                  class="discord-input"
                  placeholder="8–32 znakov"
                  :rules="[
                    (v) => !!v || 'Heslo je povinné',
                    (v) => (v.length >= 8 && v.length <= 32) || 'Heslo musí mať 8–32 znakov',
                  ]"
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

              <div class="col-12 col-sm-6">
                <label class="discord-field-label block">
                  Potvrdiť heslo
                  <span class="discord-field-required">*</span>
                </label>
                <q-input
                  v-model="passwordConfirmation"
                  :type="showPassword ? 'text' : 'password'"
                  outlined
                  dense
                  autocomplete="new-password"
                  class="discord-input"
                  placeholder="Zopakuj heslo"
                  :rules="[(v) => v === password || 'Heslá sa nezhodujú']"
                  lazy-rules
                >
                  <template #prepend>
                    <q-icon name="lock_clock" size="20px" color="grey-5" />
                  </template>
                </q-input>
              </div>
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
              label="Zaregistrovať sa"
              class="full-width discord-btn-primary q-mt-sm"
              :loading="loading"
              no-caps
              unelevated
            />

            <!-- Switch to Login -->
            <div class="text-caption text-grey-5 q-mt-md text-center">
              Už máš účet?
              <router-link to="/login" class="discord-link q-ml-xs"> Prihlás sa </router-link>
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
  name: 'RegisterPage',

  data() {
    return {
      name: '',
      surname: '',
      nickname: '',
      email: '',
      password: '',
      passwordConfirmation: '',
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

      const error = await this.authStore.register({
        username: this.nickname.trim(),
        password: this.password,
        name: this.name.trim(),
        surname: this.surname.trim(),
        email: this.email.trim(),
      });

      this.loading = false;

      if (error) {
        this.error = error;
      } else {
        await this.$router.push('/');
      }
    },
  },
});
</script>

<style scoped>
.register-card {
  width: 100%;
  max-width: 520px;
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

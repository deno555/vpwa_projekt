<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center bg-grey-2">
        <q-card class="login-card q-pa-md" flat bordered>
          <q-card-section class="text-center">
            <div class="text-h5">Chat v1</div>
            <div class="text-subtitle2 text-grey-7">Sign in to your account</div>
          </q-card-section>

          <q-form @submit="onSubmit">
            <q-card-section class="q-gutter-md">
              <q-input
                v-model="username"
                type="text"
                label="Username"
                outlined
                autofocus
                autocomplete="username"
                :rules="[(v) => !!v || 'Username is required']"
                lazy-rules
              >
                <template #prepend>
                  <q-icon name="person" />
                </template>
              </q-input>

              <q-input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                label="Password"
                outlined
                autocomplete="current-password"
                :rules="[(v) => !!v || 'Password is required']"
                lazy-rules
              >
                <template #prepend>
                  <q-icon name="lock" />
                </template>
                <template #append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>

              <q-banner v-if="error" class="bg-red-1 text-negative" rounded dense>
                {{ error }}
              </q-banner>
            </q-card-section>

            <q-card-actions class="column q-px-md">
              <q-btn
                type="submit"
                color="primary"
                label="Log in"
                class="full-width"
                :loading="loading"
                no-caps
                unelevated
              />
              <div class="q-mt-md text-grey-7">
                Don't have an account?
                <router-link to="/register">Register</router-link>
              </div>
            </q-card-actions>
          </q-form>
        </q-card>
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
        this.error = 'Nesprávne meno alebo heslo';
      }
    },
  },
});
</script>

<style scoped>
.login-card {
  width: 100%;
  max-width: 400px;
}
</style>

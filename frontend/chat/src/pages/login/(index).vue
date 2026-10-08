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

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');

async function onSubmit() {
  loading.value = true;
  error.value = '';

  // Hardcoded accounts simulation
  await new Promise(resolve => setTimeout(resolve, 500)); // simulate network delay
  
  loading.value = false;
  
  if (
    (username.value === 'denis' && password.value === 'admin') ||
    (username.value === 'jakub' && password.value === 'admin')
  ) {
    localStorage.setItem('currentUser', username.value);
    await router.push('/');
  } else {
    error.value = 'Nesprávne meno alebo heslo';
  }
}
</script>

<style scoped>
.login-card {
  width: 100%;
  max-width: 400px;
}
</style>

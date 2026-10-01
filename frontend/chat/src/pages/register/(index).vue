<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center bg-grey-2">
        <q-card class="register-card q-pa-md" flat bordered>
          <q-card-section class="text-center">
            <div class="text-h5">Chat v1</div>
            <div class="text-subtitle2 text-grey-7">Create a new account</div>
          </q-card-section>

          <q-form @submit="onSubmit">
            <q-card-section class="q-gutter-md">
              <q-input
                v-model="name"
                label="Name"
                outlined
                autofocus
                autocomplete="given-name"
                :rules="[(v) => !!v || 'Name is required']"
                lazy-rules
              >
                <template #prepend>
                  <q-icon name="person" />
                </template>
              </q-input>

              <q-input
                v-model="surname"
                label="Surname"
                outlined
                autocomplete="family-name"
                :rules="[(v) => !!v || 'Surname is required']"
                lazy-rules
              >
                <template #prepend>
                  <q-icon name="person" />
                </template>
              </q-input>

              <q-input
                v-model="email"
                type="email"
                label="Email"
                outlined
                autocomplete="email"
                :rules="[(v) => !!v || 'Email is required', (v) => /.+@.+\..+/.test(v) || 'Invalid email']"
                lazy-rules
              >
                <template #prepend>
                  <q-icon name="mail" />
                </template>
              </q-input>

              <q-input
                v-model="nickname"
                label="Nickname"
                outlined
                autocomplete="username"
                :rules="[(v) => !!v || 'Nickname is required']"
                lazy-rules
              >
                <template #prepend>
                  <q-icon name="alternate_email" />
                </template>
              </q-input>

              <q-input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                label="Password"
                outlined
                autocomplete="new-password"
                :rules="[
                  (v) => !!v || 'Password is required',
                  (v) => (v.length >= 8 && v.length <= 32) || 'Password must be 8–32 characters',
                ]"
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

              <q-input
                v-model="passwordConfirmation"
                :type="showPassword ? 'text' : 'password'"
                label="Confirm password"
                outlined
                autocomplete="new-password"
                :rules="[(v) => v === password || 'Passwords do not match']"
                lazy-rules
              >
                <template #prepend>
                  <q-icon name="lock" />
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
                label="Register"
                class="full-width"
                :loading="loading"
                no-caps
                unelevated
              />
              <div class="q-mt-md text-grey-7">
                Already have an account?
                <router-link to="/login">Log in</router-link>
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

const name = ref('');
const surname = ref('');
const nickname = ref('');
const email = ref('');
const password = ref('');
const passwordConfirmation = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');

async function onSubmit() {
  error.value = '';
  // TODO: send to POST /api/v1/auth/signup

  await router.push('/');
}
</script>

<style scoped>
.register-card {
  width: 100%;
  max-width: 400px;
}
</style>

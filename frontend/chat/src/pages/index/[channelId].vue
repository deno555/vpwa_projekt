<template>
  <q-page class="column no-wrap" style="height: 100vh">
    <!-- Channel Header -->
    <q-toolbar class="bg-grey-10 text-white" style="border-bottom: 1px solid #1e1f22;">
      <q-icon name="tag" size="sm" color="grey-5" class="q-mr-sm" />
      <q-toolbar-title class="text-weight-bold" style="font-size: 1rem;">
        {{ channelName }}
      </q-toolbar-title>
      
      <q-space />
      
      <q-btn flat round dense icon="notifications" color="grey-5" class="q-mr-sm" />
      <q-btn flat round dense icon="push_pin" color="grey-5" class="q-mr-sm" />
      <q-btn flat round dense icon="people_alt" color="grey-5" />
    </q-toolbar>

    <!-- Chat Messages Area -->
    <q-scroll-area class="col q-pa-md bg-discord-main">
      <div class="column justify-end" style="min-height: 100%;">
        <div class="text-center q-my-xl">
          <q-avatar size="72px" color="grey-8" text-color="white" icon="tag" class="q-mb-md" />
          <div class="text-h4 text-weight-bold text-white q-mb-sm">Vitaj v #{{ channelName }}!</div>
          <div class="text-grey-5">Toto je začiatok histórie tohto kanála.</div>
        </div>

        <!-- Mock Messages -->
        <div v-for="i in 3" :key="i" class="q-mb-md flex q-py-xs msg-hover">
          <q-avatar size="40px" color="primary" text-color="white" class="q-mr-md">
            {{ ['A', 'B', 'C'][i-1] }}
          </q-avatar>
          <div>
            <div class="flex items-baseline q-mb-xs">
              <span class="text-white text-weight-bold q-mr-sm">Používateľ {{ i }}</span>
              <span class="text-grey-5 text-caption">Dnes o 12:0{{ i }}</span>
            </div>
            <div class="text-grey-3">
              Toto je ukážková správa pre kanál {{ channelName }}.
            </div>
          </div>
        </div>
      </div>
    </q-scroll-area>

    <!-- Message Input Area -->
    <div class="bg-discord-main q-pa-md">
      <q-input
        v-model="newMessage"
        dense
        standout="bg-grey-9"
        bg-color="grey-9"
        dark
        rounded
        placeholder="Napíš správu sem..."
        class="full-width"
        @keyup.enter="sendMessage"
      >
        <template #prepend>
          <q-btn flat round dense icon="add_circle" color="grey-5" />
        </template>
        <template #append>
          <q-btn flat round dense icon="card_giftcard" color="grey-5" />
          <q-btn flat round dense icon="gif" color="grey-5" />
          <q-btn flat round dense icon="emoji_emotions" color="grey-5" />
        </template>
      </q-input>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

// For mockup purposes, we just derive a name from the ID or generic
const channelName = computed(() => {
  const params = route.params as Record<string, string>;
  return typeof params.channelId === 'string' ? params.channelId : 'neznámy-kanál';
});

const newMessage = ref('');

function sendMessage() {
  if (newMessage.value.trim() !== '') {
    // Here we would normally send it to the backend
    console.log('Odosielam správu:', newMessage.value);
    newMessage.value = '';
  }
}
</script>

<style scoped>
.bg-discord-main {
  background-color: #313338;
}

.msg-hover {
  border-radius: 4px;
  transition: background-color 0.1s;
}

.msg-hover:hover {
  background-color: #2b2d31;
}

/* Quasar input overrides for discord style */
:deep(.q-field__control) {
  border-radius: 8px !important;
}
</style>

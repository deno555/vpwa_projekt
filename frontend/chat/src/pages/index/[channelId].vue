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

        <!-- Messages -->
        <div v-for="msg in currentMessages" :key="msg.id" class="q-mb-md flex q-py-xs msg-hover">
          <q-avatar size="40px" color="primary" text-color="white" class="q-mr-md">
            {{ msg.author.charAt(0).toUpperCase() }}
          </q-avatar>
          <div>
            <div class="flex items-baseline q-mb-xs">
              <span class="text-white text-weight-bold q-mr-sm">{{ msg.author }}</span>
              <span class="text-grey-5 text-caption">Dnes o {{ msg.time }}</span>
            </div>
            <div class="text-grey-3" style="word-break: break-word;">
              {{ msg.text }}
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
        :placeholder="'Napíš správu do #' + channelName"
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

// Jednoduchý "store" pre správy, ktorý teraz číta z LocalStorage
interface Message {
  id: number;
  author: string;
  text: string;
  time: string;
}

const savedHistory = localStorage.getItem('chatHistory');
const messageStore = ref<Record<string, Message[]>>(
  savedHistory ? JSON.parse(savedHistory) : {}
);

const route = useRoute();

const channelName = computed(() => {
  const params = route.params as Record<string, string>;
  return typeof params.channelId === 'string' ? params.channelId : 'neznámy-kanál';
});

const currentMessages = computed(() => {
  const ch = channelName.value;
  // Len vraciame správy, nemeníme (nemutujeme) messageStore vo vnútri computed funkcie.
  return messageStore.value[ch] || [
    { 
      id: 1, 
      author: 'Systém', 
      text: `Toto je prvá uvítacia správa v kanáli ${ch}.`, 
      time: new Date().toLocaleTimeString('sk-SK', {hour: '2-digit', minute:'2-digit'}) 
    }
  ];
});

const newMessage = ref('');

function sendMessage() {
  const text = newMessage.value.trim();
  if (text !== '') {
    const ch = channelName.value;
    const author = localStorage.getItem('currentUser') || 'Neznámy';
    const time = new Date().toLocaleTimeString('sk-SK', {hour: '2-digit', minute:'2-digit'});
    
    // Ak pre tento kanál ešte nemáme pole správ, vytvoríme ho (spolu so systémovou správou)
    if (!messageStore.value[ch]) {
      messageStore.value[ch] = [
        { 
          id: 1, 
          author: 'Systém', 
          text: `Toto je prvá uvítacia správa v kanáli ${ch}.`, 
          time: new Date().toLocaleTimeString('sk-SK', {hour: '2-digit', minute:'2-digit'}) 
        }
      ];
    }
    
    // Tu pridávame samotnú správu
    messageStore.value[ch].push({
      id: Date.now(),
      author,
      text,
      time
    });
    
    // Uložíme zmenenú históriu do LocalStorage
    localStorage.setItem('chatHistory', JSON.stringify(messageStore.value));
    
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

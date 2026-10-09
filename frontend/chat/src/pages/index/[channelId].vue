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
    <q-scroll-area ref="chatScroll" class="col q-pa-md bg-discord-main">
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
    <div class="bg-discord-main q-px-md q-pt-xs q-pb-sm">
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
        @update:model-value="onInputUpdate"
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

      <!-- Typing indicator -->
      <div class="typing-bar row items-center q-px-xs">
        <transition name="typing-fade">
          <div v-if="typingText" class="row items-center text-caption text-grey-4">
            <span class="typing-dots q-mr-xs">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </span>
            <span class="text-weight-bold text-white q-mr-xs">{{ typingUserText }}</span>
            <span>{{ typingSuffix }}</span>
          </div>
        </transition>
      </div>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { useChatStore, useAuthStore } from '@/stores/store';
import type { QScrollArea } from 'quasar';

export default defineComponent({
  name: 'ChannelPage',

  data() {
    return {
      newMessage: '',
      typingTimer: null as ReturnType<typeof setTimeout> | null,
      cleanupInterval: null as ReturnType<typeof setInterval> | null,
      ticker: 0,
    };
  },

  computed: {
    ...mapStores(useChatStore, useAuthStore),

    channelName(): string {
      const params = this.$route.params as Record<string, string>;
      return typeof params.channelId === 'string' ? params.channelId : 'neznámy-kanál';
    },

    currentMessages() {
      return this.chatStore.messagesFor(this.channelName);
    },

    activeTypingUsers(): string[] {
      // Ticker zabezpečuje pravidelné prehodnotenie expirácie
      void this.ticker;
      return this.chatStore.typingUsersFor(this.channelName);
    },

    typingText(): string {
      const users = this.activeTypingUsers;
      if (users.length === 0) return '';
      if (users.length === 1) {
        return `${users[0]} is typing...`;
      }
      if (users.length === 2) {
        return `${users[0]} and ${users[1]} are typing...`;
      }
      return `${users.slice(0, 2).join(', ')} and others are typing...`;
    },

    typingUserText(): string {
      const users = this.activeTypingUsers;
      if (users.length === 0) return '';
      if (users.length === 1) {
        return users[0] ?? '';
      }
      if (users.length === 2) {
        return `${users[0]} and ${users[1]}`;
      }
      return `${users.slice(0, 2).join(', ')} and others`;
    },

    typingSuffix(): string {
      const users = this.activeTypingUsers;
      if (users.length <= 1) {
        return 'is typing...';
      }
      return 'are typing...';
    },
  },

  watch: {
    channelName(newChan: string, oldChan: string) {
      if (oldChan) {
        const currentUser = this.authStore.currentUser || 'Používateľ';
        this.chatStore.setTyping(oldChan, currentUser, false);
      }
      this.stopTyping();
      this.scrollToBottom();
    },
    'currentMessages.length'() {
      void this.$nextTick(() => {
        this.scrollToBottom();
      });
    },
  },

  mounted() {
    this.cleanupInterval = setInterval(() => {
      this.ticker++;
    }, 1000);
    this.scrollToBottom();
  },

  beforeUnmount() {
    this.stopTyping();
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  },

  methods: {
    scrollToBottom() {
      const scrollArea = this.$refs.chatScroll as QScrollArea | undefined;
      if (scrollArea) {
        scrollArea.setScrollPercentage('vertical', 1);
      }
    },

    onInputUpdate(val: string | number | null) {
      const text = String(val ?? '');
      if (text.trim().length > 0) {
        this.handleTyping();
      } else {
        this.stopTyping();
      }
    },

    handleTyping() {
      const currentUser = this.authStore.currentUser || 'Používateľ';
      this.chatStore.setTyping(this.channelName, currentUser, true);

      if (this.typingTimer) {
        clearTimeout(this.typingTimer);
      }
      this.typingTimer = setTimeout(() => {
        this.stopTyping();
      }, 2500);
    },

    stopTyping() {
      if (this.typingTimer) {
        clearTimeout(this.typingTimer);
        this.typingTimer = null;
      }
      const currentUser = this.authStore.currentUser || 'Používateľ';
      this.chatStore.setTyping(this.channelName, currentUser, false);
    },

    sendMessage() {
      this.stopTyping();
      this.chatStore.sendMessage(this.channelName, this.newMessage);
      this.newMessage = '';
    },
  },
});
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

/* Typing bar */
.typing-bar {
  height: 24px;
  min-height: 24px;
  font-size: 12px;
}

.typing-dots {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-right: 6px;
}

.typing-dots .dot {
  width: 4px;
  height: 4px;
  background-color: #dbdee1;
  border-radius: 50%;
  animation: typing-bounce 1.4s infinite ease-in-out both;
}

.typing-dots .dot:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-dots .dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing-bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.typing-fade-enter-active,
.typing-fade-leave-active {
  transition: opacity 0.2s ease;
}

.typing-fade-enter-from,
.typing-fade-leave-to {
  opacity: 0;
}
</style>

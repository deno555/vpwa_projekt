<template>
  <q-page class="column no-wrap" style="height: 100vh">
    <!-- Channel Header -->
    <q-toolbar class="bg-grey-10 text-white" style="border-bottom: 1px solid #1e1f22;">
      <q-icon :name="currentChannel?.type === 'private' ? 'lock' : 'tag'" size="sm" color="grey-5" class="q-mr-sm" />
      <q-toolbar-title class="text-weight-bold row items-center" style="font-size: 1rem;">
        <span>{{ channelName }}</span>
        <q-badge v-if="currentChannel" :color="currentChannel.type === 'private' ? 'deep-purple' : 'primary'" class="q-ml-sm text-caption">
          {{ currentChannel.type === 'private' ? 'Súkromný' : 'Verejný' }}
        </q-badge>
        <span v-if="currentChannel" class="text-caption text-grey-5 q-ml-md gt-xs">
          Správca: <span class="text-grey-3">{{ currentChannel.admin }}</span>
        </span>
      </q-toolbar-title>
      
      <q-space />
      
      <q-btn flat round dense icon="terminal" color="amber-5" class="q-mr-sm" title="Príkazy terminálu (/help)" @click="showHelp" />
      <q-btn flat round dense icon="notifications" color="grey-5" class="q-mr-sm" />
      <q-btn flat round dense icon="push_pin" color="grey-5" class="q-mr-sm" />
      <q-btn flat round dense icon="people_alt" color="grey-5" />
    </q-toolbar>

    <!-- Unauthorized / Access Denied -->
    <div v-if="!hasAccess" class="col flex flex-center bg-discord-main text-white q-pa-xl text-center">
      <div class="column items-center" style="max-width: 480px;">
        <q-avatar size="80px" color="red-10" text-color="red-2" icon="lock" class="q-mb-md" />
        <div class="text-h5 text-weight-bold q-mb-sm">Prístup do kanála je obmedzený</div>
        <div class="text-grey-5 q-mb-lg">
          Kanál <strong>#{{ channelName }}</strong> je súkromný alebo k nemu nemáš prístup. Nemáš oprávnenie na zobrazenie správ ani na odosielanie obsahu. Prístup ti môže udeliť iba správca kanála pozvánkou.
        </div>
        <q-btn
          color="primary"
          unelevated
          no-caps
          label="Prejsť na dostupný kanál"
          icon="arrow_back"
          @click="goToAccessibleChannel"
        />
      </div>
    </div>

    <template v-else>
      <!-- Info Banner (Not a member or Banned) -->
      <div v-if="!isMember && !isBanned" class="bg-grey-9 text-amber-4 q-px-md q-py-xs row items-center justify-between" style="border-bottom: 1px solid #1e1f22;">
        <div class="row items-center">
          <q-icon name="info" size="xs" class="q-mr-sm" />
          <span class="text-caption">Nie si členom tohto kanála. Ak chceš odosielať správy, napíš <strong>/join {{ channelName }}</strong></span>
        </div>
        <q-btn dense outline color="amber-4" size="sm" label="Pripojiť sa (/join)" @click="quickJoin" />
      </div>
      <div v-else-if="isBanned" class="bg-negative text-white q-px-md q-py-xs row items-center" style="border-bottom: 1px solid #1e1f22;">
        <q-icon name="block" size="xs" class="q-mr-sm" />
        <span class="text-caption">V tomto kanáli máš trvalý ban. Správy nemôžeš odosielať.</span>
      </div>

      <!-- Chat Messages Area -->
      <q-scroll-area ref="chatScroll" class="col q-pa-md bg-discord-main">
        <div class="column justify-end" style="min-height: 100%;">
          <div class="text-center q-my-xl">
            <q-avatar size="72px" color="grey-8" text-color="white" :icon="currentChannel?.type === 'private' ? 'lock' : 'tag'" class="q-mb-md" />
            <div class="text-h4 text-weight-bold text-white q-mb-sm">Vitaj v #{{ channelName }}!</div>
            <div class="text-grey-5">Toto je začiatok histórie tohto kanála. Príkazy zadávaj cez príkazový riadok dole.</div>
          </div>

          <!-- Messages -->
          <div v-for="msg in currentMessages" :key="msg.id" class="q-mb-md flex q-py-xs msg-hover" :class="{ 'system-msg-box': msg.isSystem }">
            <q-avatar size="40px" :color="msg.isSystem ? 'amber-9' : 'primary'" text-color="white" class="q-mr-md" :icon="msg.isSystem ? 'terminal' : undefined">
              <template v-if="!msg.isSystem">
                {{ msg.author.charAt(0).toUpperCase() }}
              </template>
            </q-avatar>
            <div class="col" style="min-width: 0;">
              <div class="flex items-baseline q-mb-xs">
                <span class="text-weight-bold q-mr-sm" :class="msg.isSystem ? 'text-amber-4' : 'text-white'">{{ msg.author }}</span>
                <span class="text-grey-5 text-caption">Dnes o {{ msg.time }}</span>
              </div>
              <div :class="msg.isSystem ? 'text-amber-2' : 'text-grey-3'" style="word-break: break-word; white-space: pre-line;">
                {{ msg.text }}
              </div>
            </div>
          </div>
        </div>
      </q-scroll-area>

      <!-- Message Input Area (Príkazový riadok) -->
      <div class="bg-discord-main q-px-md q-pt-xs q-pb-sm">
        <q-input
          v-model="newMessage"
          dense
          standout="bg-grey-9"
          bg-color="grey-9"
          dark
          rounded
          :placeholder="inputPlaceholder"
          class="full-width"
          @keyup.enter="sendMessage"
          @update:model-value="onInputUpdate"
        >
          <template #prepend>
            <q-btn flat round dense icon="terminal" color="amber-5" title="Príkazy terminálu (/help)" @click="showHelp" />
          </template>
          <template #append>
            <q-btn flat round dense icon="send" color="primary" @click="sendMessage" title="Odoslať správu / príkaz" />
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
    </template>
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { useChatStore, useAuthStore } from '@/stores/store';
import type { QScrollArea } from 'quasar';

interface ChannelItem {
  name: string;
  type: 'public' | 'private';
  admin: string;
  members: string[];
  invited: string[];
  banned: string[];
}

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

    currentUsername(): string {
      return this.authStore.currentUser || 'Používateľ';
    },

    channelInfo() {
      return this.chatStore.findChannelByName(this.channelName);
    },

    currentChannel() {
      return this.channelInfo ? this.channelInfo.channel : null;
    },

    hasAccess(): boolean {
      if (!this.currentChannel) return false;
      return this.chatStore.hasChannelAccess(this.currentChannel, this.currentUsername);
    },

    isMember(): boolean {
      return this.chatStore.isMember(this.channelName, this.currentUsername);
    },

    isBanned(): boolean {
      return this.chatStore.isBanned(this.channelName, this.currentUsername);
    },

    inputPlaceholder(): string {
      if (this.isBanned) {
        return `V kanáli #${this.channelName} máš trvalý ban`;
      }
      if (!this.isMember) {
        return `Nie si členom. Zadaj /join ${this.channelName} alebo príkaz...`;
      }
      return `Napíš správu alebo príkaz (/help) do #${this.channelName}`;
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
      // Do not broadcast typing if typing a command
      if (text.startsWith('/')) {
        this.stopTyping();
        return;
      }
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

    goToAccessibleChannel() {
      const server = this.chatStore.currentServer;
      const accessibleChannels = (server?.channels || []).filter((c: ChannelItem) =>
        this.chatStore.hasChannelAccess(c, this.currentUsername)
      );
      const nextChannel = accessibleChannels[0]?.name || server?.channels[0]?.name || 'všeobecný';
      void this.$router.push('/' + nextChannel);
    },

    showHelp() {
      const res = this.chatStore.executeCommand(this.channelName, '/help');
      this.chatStore.addSystemMessage(this.channelName, res.message);
    },

    quickJoin() {
      if (!this.hasAccess) return;
      const res = this.chatStore.executeCommand(this.channelName, `/join ${this.channelName}`);
      this.chatStore.addSystemMessage(this.channelName, res.message);
      if (res.redirectUrl) {
        void this.$router.push(res.redirectUrl);
      }
    },

    sendMessage() {
      if (!this.hasAccess) return;
      const text = this.newMessage.trim();
      if (!text) return;

      this.stopTyping();

      // Príkaz terminálu
      if (text.startsWith('/')) {
        const res = this.chatStore.executeCommand(this.channelName, text);
        this.chatStore.addSystemMessage(this.channelName, res.message);
        this.newMessage = '';
        if (res.redirectUrl) {
          void this.$router.push(res.redirectUrl);
        }
        return;
      }

      // Bežná správa v kanáli
      this.chatStore.sendMessage(this.channelName, text);
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

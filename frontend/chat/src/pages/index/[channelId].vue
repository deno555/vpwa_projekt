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
      <q-btn
        flat
        round
        dense
        :icon="notificationsEnabled ? 'notifications_active' : 'notifications'"
        :color="notificationsEnabled ? 'amber-5' : 'grey-5'"
        class="q-mr-sm"
        :title="notificationsEnabled ? 'Desktop notifikácie sú aktívne' : 'Povoliť desktopové notifikácie a pingy'"
        @click="toggleDesktopNotifications"
      />
      <q-btn flat round dense icon="push_pin" color="grey-5" class="q-mr-sm" />
      <q-btn
        flat
        round
        dense
        icon="people_alt"
        :color="showMembers ? 'white' : 'grey-5'"
        :class="{ 'bg-grey-9': showMembers }"
        title="Používatelia s prístupom do kanála (/list)"
        @click="toggleMembers"
      />
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

      <!-- Main Chat Body with Optional Members Sidebar -->
      <div class="row no-wrap col" style="min-height: 0;">
        <!-- Left: Chat Messages Area + Input Area -->
        <div class="column col" style="min-height: 0;">
          <!-- Chat Messages Area -->
          <q-scroll-area ref="chatScroll" class="col q-pa-md bg-discord-main">
            <div class="column justify-end" style="min-height: 100%;">
              <div class="text-center q-my-xl">
                <q-avatar size="72px" color="grey-8" text-color="white" :icon="currentChannel?.type === 'private' ? 'lock' : 'tag'" class="q-mb-md" />
                <div class="text-h4 text-weight-bold text-white q-mb-sm">Vitaj v #{{ channelName }}!</div>
                <div class="text-grey-5">Toto je začiatok histórie tohto kanála. Príkazy zadávaj cez príkazový riadok dole.</div>
              </div>

              <!-- Messages -->
              <div
                v-for="msg in currentMessages"
                :key="msg.id"
                class="q-mb-sm flex q-py-xs msg-row"
                :class="{
                  'system-msg-box': msg.isSystem,
                  'msg-mentioned': isMessageMentioned(msg)
                }"
              >
                <q-avatar
                  size="40px"
                  :color="msg.isSystem ? 'amber-9' : isMessageMentioned(msg) ? 'amber-8' : 'primary'"
                  text-color="white"
                  class="q-mr-md msg-avatar"
                  :icon="msg.isSystem ? 'terminal' : undefined"
                >
                  <template v-if="!msg.isSystem">
                    {{ msg.author.charAt(0).toUpperCase() }}
                  </template>
                </q-avatar>
                <div class="col" style="min-width: 0;">
                  <div class="flex items-center q-mb-xs">
                    <span
                      class="text-weight-bold q-mr-sm author-name"
                      :class="msg.isSystem ? 'text-amber-4' : isMessageMentioned(msg) ? 'text-amber-3' : 'text-white'"
                      @click="insertMention(msg.author)"
                      :title="msg.isSystem ? undefined : `Klikni pre označenie @${msg.author}`"
                    >
                      {{ msg.author }}
                    </span>
                    <span class="text-grey-5 text-caption">Dnes o {{ msg.time }}</span>
                    <q-badge
                      v-if="isMessageMentioned(msg)"
                      color="amber-8"
                      text-color="black"
                      class="q-ml-sm text-weight-bold mention-badge"
                    >
                      @ping
                    </q-badge>
                  </div>
                  <div
                    :class="msg.isSystem ? 'text-amber-2' : 'text-grey-3'"
                    class="msg-content"
                    v-html="formatMessage(msg.text)"
                  />
                </div>
              </div>
            </div>
          </q-scroll-area>

          <!-- Message Input Area (Príkazový riadok) -->
          <div class="bg-discord-main q-px-md q-pt-xs q-pb-sm">
            <!-- Quick mention helper chips if user is typing '@' -->
            <div v-if="mentionSuggestions.length > 0" class="row items-center q-gutter-xs q-mb-xs q-px-xs">
              <span class="text-caption text-grey-5 q-mr-xs">Označiť:</span>
              <q-chip
                v-for="user in mentionSuggestions"
                :key="user"
                clickable
                dense
                size="sm"
                color="primary"
                text-color="white"
                icon="alternate_email"
                @click="applyMentionSuggestion(user)"
              >
                {{ user }}
              </q-chip>
            </div>

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
        </div>

        <!-- Right: Members Sidebar (Toggleable via people_alt or /list) -->
        <div
          v-if="showMembers"
          class="members-sidebar col-auto column"
          style="width: 240px; border-left: 1px solid #1e1f22; background-color: #2b2d31;"
        >
          <!-- Sidebar Header -->
          <div class="row items-center justify-between q-px-md q-pt-md q-pb-xs">
            <span class="text-overline text-grey-4" style="line-height: 1;">
              ČLENOVIA — {{ channelMembers.length }}
            </span>
            <q-btn flat round dense icon="close" size="xs" color="grey-5" @click="showMembers = false" title="Zatvoriť zoznam" />
          </div>

          <!-- Scroll Area for Members -->
          <q-scroll-area class="col" :horizontal-thumb-style="{ opacity: '0' }">
            <q-list dense class="q-py-xs">
              <!-- Správca -->
              <div v-if="channelAdmin" class="text-overline text-grey-5 q-px-md q-pt-xs" style="font-size: 10px;">
                SPRÁVCA
              </div>
              <q-item
                v-if="channelAdmin"
                clickable
                v-ripple
                class="member-item rounded-borders q-mx-xs q-mb-xs"
                @click="insertMention(channelAdmin)"
                :title="`Klikni pre označenie @${channelAdmin}`"
              >
                <q-item-section avatar style="min-width: 36px; padding-right: 8px;">
                  <q-avatar size="28px" color="amber-9" text-color="black" class="text-weight-bold">
                    {{ channelAdmin.charAt(0).toUpperCase() }}
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <div class="row items-center no-wrap">
                    <span class="text-weight-bold text-amber-3 ellipsis">{{ channelAdmin }}</span>
                    <q-icon name="stars" size="14px" color="amber-5" class="q-ml-xs" title="Správca kanála" />
                  </div>
                  <div class="text-caption text-grey-5" style="font-size: 11px;">
                    {{ channelAdmin === currentUsername ? 'Vy • Správca' : 'Správca' }}
                  </div>
                </q-item-section>
              </q-item>

              <!-- Ostatní členovia -->
              <div v-if="regularMembers.length > 0" class="text-overline text-grey-5 q-px-md q-pt-sm" style="font-size: 10px;">
                ČLENOVIA — {{ regularMembers.length }}
              </div>
              <q-item
                v-for="member in regularMembers"
                :key="member"
                clickable
                v-ripple
                class="member-item rounded-borders q-mx-xs q-mb-xs"
                @click="insertMention(member)"
                :title="`Klikni pre označenie @${member}`"
              >
                <q-item-section avatar style="min-width: 36px; padding-right: 8px;">
                  <q-avatar size="28px" color="primary" text-color="white" class="text-weight-bold">
                    {{ member.charAt(0).toUpperCase() }}
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <div class="row items-center no-wrap">
                    <span class="text-white ellipsis">{{ member }}</span>
                    <q-badge
                      v-if="member === currentUsername"
                      color="grey-8"
                      text-color="grey-4"
                      class="q-ml-xs text-weight-bold"
                      style="font-size: 9px;"
                    >
                      Vy
                    </q-badge>
                  </div>
                  <div class="text-caption text-grey-5" style="font-size: 11px;">
                    Člen
                  </div>
                </q-item-section>
              </q-item>

              <!-- Pozvaní do súkromného kanála (ak existujú) -->
              <template v-if="invitedMembers.length > 0">
                <div class="text-overline text-grey-5 q-px-md q-pt-sm" style="font-size: 10px;">
                  POZVANÍ — {{ invitedMembers.length }}
                </div>
                <q-item
                  v-for="member in invitedMembers"
                  :key="member"
                  class="member-item member-item--invited rounded-borders q-mx-xs q-mb-xs"
                >
                  <q-item-section avatar style="min-width: 36px; padding-right: 8px;">
                    <q-avatar size="28px" color="grey-8" text-color="grey-5">
                      {{ member.charAt(0).toUpperCase() }}
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <span class="text-grey-5 ellipsis">{{ member }}</span>
                    <div class="text-caption text-grey-6" style="font-size: 10px;">
                      Čaká na vstup
                    </div>
                  </q-item-section>
                </q-item>
              </template>
            </q-list>
          </q-scroll-area>

          <!-- Sidebar Footer info -->
          <div class="q-pa-sm text-caption text-grey-6 text-center" style="border-top: 1px solid #1e1f22; font-size: 11px;">
            <q-icon :name="currentChannel?.type === 'private' ? 'lock' : 'public'" size="xs" class="q-mr-xs" />
            {{ currentChannel?.type === 'private' ? 'Súkromný kanál' : 'Verejný kanál' }}
          </div>
        </div>
      </div>
    </template>
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { useChatStore, useAuthStore } from '@/stores/store';
import { isUserMentioned, renderMessageHtml, requestNotificationPermission } from '@/utils/notifications';
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
      notificationsEnabled: false,
      showMembers: false,
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

    channelMembers(): string[] {
      return Array.isArray(this.currentChannel?.members) ? this.currentChannel.members : [];
    },

    channelAdmin(): string {
      return this.currentChannel?.admin || '';
    },

    regularMembers(): string[] {
      const admin = this.channelAdmin;
      return this.channelMembers.filter((m) => m !== admin);
    },

    invitedMembers(): string[] {
      const invited = Array.isArray(this.currentChannel?.invited) ? this.currentChannel.invited : [];
      const members = this.channelMembers;
      return invited.filter((i) => !members.includes(i));
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

    mentionSuggestions(): string[] {
      const match = this.newMessage.match(/@([a-zA-Z0-9_áäčďéíĺľňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ-]*)$/);
      if (!match) return [];
      const query = (match[1] || '').toLowerCase();
      const members = this.currentChannel?.members || ['denis', 'jakub'];
      return members.filter((m) => m.toLowerCase().includes(query));
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

    if (typeof Notification !== 'undefined') {
      this.notificationsEnabled = Notification.permission === 'granted';
    }
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
        if (text.toLowerCase().trim() === '/list') {
          this.showMembers = true;
        }
        if (res.redirectUrl) {
          void this.$router.push(res.redirectUrl);
        }
        return;
      }

      // Bežná správa v kanáli
      this.chatStore.sendMessage(this.channelName, text);
      this.newMessage = '';
    },

    toggleMembers() {
      this.showMembers = !this.showMembers;
    },

    isMessageMentioned(msg: { text: string; isSystem?: boolean }): boolean {
      if (msg.isSystem) return false;
      const currentNick = this.authStore.currentUser;
      if (!currentNick) return false;
      return isUserMentioned(msg.text, currentNick);
    },

    formatMessage(text: string): string {
      return renderMessageHtml(text, this.authStore.currentUser);
    },

    insertMention(author: string) {
      if (!author || author === 'Systém') return;
      const current = this.newMessage ? this.newMessage.trim() + ' ' : '';
      this.newMessage = `${current}@${author} `;
    },

    applyMentionSuggestion(user: string) {
      this.newMessage = this.newMessage.replace(
        /@([a-zA-Z0-9_áäčďéíĺľňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ-]*)$/,
        `@${user} `,
      );
    },

    async toggleDesktopNotifications() {
      const granted = await requestNotificationPermission();
      this.notificationsEnabled = granted;
    },
  },
});
</script>

<style scoped>
.bg-discord-main {
  background-color: #313338;
}

.msg-row {
  border-radius: 4px;
  padding: 4px 8px;
  transition: background-color 0.12s ease, border-color 0.12s ease;
  position: relative;
}

.msg-row:hover {
  background-color: #2b2d31;
}

/* Discord-like yellow/gold mention highlight */
.msg-mentioned {
  background-color: rgba(250, 166, 26, 0.1) !important;
  border-left: 3px solid #f0b232;
  border-radius: 0 4px 4px 0;
}

.msg-mentioned:hover {
  background-color: rgba(250, 166, 26, 0.16) !important;
}

.author-name {
  cursor: pointer;
  transition: text-decoration 0.1s ease;
}

.author-name:hover {
  text-decoration: underline;
}

.mention-badge {
  font-size: 10px;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 4px;
}

.msg-content {
  word-break: break-word;
  white-space: pre-line;
  line-height: 1.45;
}

/* Styling for @mentions pills inside messages */
:deep(.mention-pill) {
  display: inline-block;
  padding: 1px 6px;
  margin: 0 2px;
  border-radius: 4px;
  background-color: rgba(88, 101, 242, 0.25);
  color: #c9cdfb;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: text;
}

:deep(.mention-pill:hover) {
  background-color: #5865f2;
  color: #ffffff;
}

/* Gold pill when it's @me */
:deep(.mention-pill--me) {
  background-color: rgba(250, 166, 26, 0.28);
  color: #ffe082;
  font-weight: 700;
}

:deep(.mention-pill--me:hover) {
  background-color: #f0b232;
  color: #1e1f22;
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

/* Members sidebar item hover */
.member-item {
  transition: background-color 0.15s ease;
  cursor: pointer;
}

.member-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.member-item--invited {
  opacity: 0.7;
}
</style>

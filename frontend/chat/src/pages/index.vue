<template>
  <q-layout view="lHh Lpr lFf" class="discord-bg text-white">
    <!-- Combined Left Sidebar (Servers + Channels) -->
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      :width="312"
      :breakpoint="500"
    >
     <div class="column no-wrap fit">
      <div class="row no-wrap col" style="min-height: 0;">
      <!-- Servers Column (72px) -->
      <div class="server-sidebar col-auto" style="width: 72px; height: 100%;">
        <q-scroll-area class="fit" :horizontal-thumb-style="{ opacity: '0' }">
          <div class="column items-center q-py-sm q-gutter-y-sm">
            <!-- Home / Direct Messages -->
            <div class="server-icon-wrapper">
              <q-btn round unelevated color="primary" icon="home" size="md" />
            </div>

            <q-separator dark class="q-mx-md" style="width: 32px" />

            <!-- Mock Servers -->
            <div
              class="server-icon-wrapper"
              :class="{ 'server-active': server.id === selectedServerId }"
              v-for="server in servers"
              :key="server.id"
            >
              <q-btn
                round
                unelevated
                :color="server.id === selectedServerId ? 'primary' : 'grey-8'"
                class="server-btn"
                size="md"
                :title="server.name"
                @click="selectServer(server.id)"
              >
                {{ server.name.charAt(0).toUpperCase() }}
              </q-btn>
            </div>
            
            <div class="server-icon-wrapper">
              <q-btn round unelevated text-color="green" color="grey-9" icon="add" size="md" />
            </div>
          </div>
        </q-scroll-area>
      </div>

      <!-- Channels Column (240px) -->
      <div class="channel-sidebar col" style="height: 100%;">
        <!-- Sidebar Header -->
        <div class="channel-header flex items-center justify-between q-px-md cursor-pointer">
          <div class="text-weight-bold ellipsis">{{ selectedServer.name }}</div>
          <q-icon name="expand_more" size="sm" />
        </div>

        <q-scroll-area style="height: calc(100% - 48px);" :horizontal-thumb-style="{ opacity: '0' }">
          <div class="q-pa-sm">
            <!-- Top section for invites -->
            <div v-if="invitedChannels.length > 0" class="q-mb-md">
              <div class="text-overline text-grey-5 q-px-sm" style="line-height: 1">POZVÁNKY</div>
              <q-list dense>
                <q-item 
                  v-for="channel in invitedChannels" 
                  :key="channel.id" 
                  clickable 
                  v-ripple
                  :to="'/' + channel.name"
                  exact
                  class="channel-item invite-highlight q-mt-xs rounded-borders"
                  active-class="text-white bg-grey-9"
                >
                  <q-item-section avatar style="min-width: 30px; padding-right: 0;">
                    <q-icon :name="channel.type === 'private' ? 'lock' : 'tag'" size="xs" color="primary" />
                  </q-item-section>
                  <q-item-section class="text-weight-bold text-primary">
                    {{ channel.name }}
                  </q-item-section>
                </q-item>
              </q-list>
            </div>

            <!-- Regular channels list -->
            <div class="flex items-center justify-between q-px-sm q-mt-sm q-mb-xs group-header">
              <div class="text-overline text-grey-5" style="line-height: 1">TEXTOVÉ KANÁLY</div>
              <q-btn flat round dense icon="add" size="xs" color="grey-5" class="add-btn" @click="createChannel" />
            </div>
            
            <q-list dense>
              <q-item 
                v-for="channel in regularChannels" 
                :key="channel.id" 
                clickable 
                v-ripple
                :to="'/' + channel.name"
                exact
                class="channel-item q-mb-xs rounded-borders text-grey-5"
                active-class="text-white bg-grey-9"
              >
                <q-item-section avatar style="min-width: 30px; padding-right: 0;">
                  <q-icon :name="channel.type === 'private' ? 'lock' : 'tag'" size="xs" />
                </q-item-section>
                <q-item-section>
                  {{ channel.name }}
                </q-item-section>
                
                <!-- Action buttons (Leave / Delete) shown on hover or active -->
                <q-item-section side class="channel-actions">
                  <div class="row q-gutter-xs">
                    <q-btn v-if="channel.isAdmin" flat round dense icon="delete" size="xs" color="negative" @click.prevent.stop="deleteChannel(channel.id)" title="Zmazať (Si správca)" />
                    <q-btn flat round dense icon="logout" size="xs" color="grey-4" @click.prevent.stop="leaveChannel(channel.id)" title="Opustiť" />
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-scroll-area>
      </div>
      </div>

      <!-- Status bar používateľa -->
      <div class="user-bar row no-wrap items-center q-px-sm">
        <div class="user-info row no-wrap items-center col cursor-pointer rounded-borders q-pa-xs">
          <div class="user-avatar-wrapper">
            <q-avatar size="32px" color="primary" text-color="white">
              {{ currentUser.username.charAt(0).toUpperCase() }}
            </q-avatar>
            <span class="status-dot" :style="{ backgroundColor: currentStatus.color }" />
          </div>
          <div class="col q-ml-sm" style="min-width: 0;">
            <div class="text-weight-bold ellipsis" style="font-size: 14px; line-height: 1.2;">
              {{ currentUser.username }}
            </div>
            <div class="text-grey-5 ellipsis" style="font-size: 12px; line-height: 1.2;">
              {{ currentStatus.label }}
            </div>
          </div>

          <q-menu anchor="top left" self="bottom left" :offset="[0, 8]" class="status-menu">
            <q-list dense style="min-width: 180px;">
              <q-item
                v-for="option in statusOptions"
                :key="option.value"
                clickable
                v-close-popup
                :active="option.value === currentUser.status"
                active-class="bg-grey-9"
                @click="setStatus(option.value)"
              >
                <q-item-section avatar style="min-width: 24px; padding-right: 0;">
                  <span class="status-dot status-dot--inline" :style="{ backgroundColor: option.color }" />
                </q-item-section>
                <q-item-section>{{ option.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>
      </div>
     </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const leftDrawerOpen = ref(true);

// --- Mock používateľ a jeho stav ---
type UserStatus = 'online' | 'dnd' | 'offline';

const statusOptions: { value: UserStatus; label: string; color: string }[] = [
  { value: 'online', label: 'Online', color: '#23a55a' },
  { value: 'dnd', label: 'Nerušiť', color: '#f23f43' },
  { value: 'offline', label: 'Offline', color: '#80848e' },
];

const currentUser = ref<{ username: string; status: UserStatus }>({
  username: 'denis',
  status: 'online',
});

const currentStatus = computed(
  () => statusOptions.find(o => o.value === currentUser.value.status) ?? statusOptions[0]!
);

function setStatus(status: UserStatus) {
  currentUser.value.status = status;
}

// --- Mock Channel Data pre 2. bod ---
interface Channel {
  id: number;
  name: string;
  type: 'public' | 'private';
  isInvited: boolean;
  isAdmin: boolean;
}

interface Server {
  id: number;
  name: string;
  channels: Channel[];
}

const servers = ref<Server[]>([
  {
    id: 1,
    name: 'Dev Tím',
    channels: [
      { id: 1, name: 'všeobecný', type: 'public', isInvited: false, isAdmin: false },
      { id: 2, name: 'tajný-vývoj', type: 'private', isInvited: false, isAdmin: true },
      { id: 3, name: 'nová-kampaň', type: 'public', isInvited: true, isAdmin: false }, // Pozvánka (topovaná a zvýraznená)
      { id: 4, name: 'off-topic', type: 'public', isInvited: false, isAdmin: true },
    ],
  },
  {
    id: 2,
    name: 'Škola',
    channels: [
      { id: 5, name: 'oznamy', type: 'public', isInvited: false, isAdmin: false },
      { id: 6, name: 'vpwa', type: 'public', isInvited: false, isAdmin: false },
      { id: 7, name: 'projekt-tím', type: 'private', isInvited: false, isAdmin: true },
    ],
  },
  {
    id: 3,
    name: 'Gaming',
    channels: [
      { id: 8, name: 'lobby', type: 'public', isInvited: false, isAdmin: true },
      { id: 9, name: 'turnaj', type: 'public', isInvited: true, isAdmin: false },
      { id: 10, name: 'clips', type: 'public', isInvited: false, isAdmin: false },
    ],
  },
  {
    id: 4,
    name: 'Muzika',
    channels: [
      { id: 11, name: 'odporúčania', type: 'public', isInvited: false, isAdmin: false },
      { id: 12, name: 'playlisty', type: 'public', isInvited: false, isAdmin: false },
    ],
  },
  {
    id: 5,
    name: 'Anime Klub',
    channels: [
      { id: 13, name: 'diskusia', type: 'public', isInvited: false, isAdmin: false },
      { id: 14, name: 'spoilery', type: 'private', isInvited: false, isAdmin: true },
    ],
  },
]);

const selectedServerId = ref(servers.value[0]!.id);
const selectedServer = computed(
  () => servers.value.find(s => s.id === selectedServerId.value) ?? servers.value[0]!
);

function selectServer(id: number) {
  selectedServerId.value = id;
}

// Computed vlastnosti pre rozdelenie zoznamu
const invitedChannels = computed(() => selectedServer.value.channels.filter(c => c.isInvited));
const regularChannels = computed(() => selectedServer.value.channels.filter(c => !c.isInvited));

// --- Akcie pre kanály ---
async function createChannel() {
  const name = prompt('Názov nového kanála:');
  if (!name) return;

  const isPrivate = confirm('Má byť kanál súkromný? (OK = Áno, Zrušiť = Nie)');
  
  const formattedName = name.toLowerCase().replace(/\s+/g, '-');

  selectedServer.value.channels.push({
    id: Date.now(),
    name: formattedName,
    type: isPrivate ? 'private' : 'public',
    isInvited: false,
    isAdmin: true // Vytvoril si ho, takže si správca
  });

  // Redirect to newly created channel
  await router.push('/' + formattedName);
}

function leaveChannel(id: number) {
  if (confirm('Naozaj chceš opustiť tento kanál?')) {
    removeChannel(id);
  }
}

function deleteChannel(id: number) {
  if (confirm('Naozaj chceš zmazať tento kanál? Ako správca ho vymažeš natrvalo.')) {
    removeChannel(id);
  }
}

function removeChannel(id: number) {
  const server = selectedServer.value;
  server.channels = server.channels.filter(c => c.id !== id);
}
</script>

<style scoped>
.server-sidebar {
  background-color: #1e1f22 !important;
  border-right: none;
}

.channel-sidebar {
  background-color: #2b2d31 !important;
  border-right: none;
}

.discord-bg {
  background-color: #313338;
}

/* Server Icons */
.server-icon-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  width: 100%;
}

.server-btn {
  transition: border-radius 0.2s ease, background-color 0.2s ease;
}

.server-btn:hover {
  border-radius: 16px;
  background-color: #5865F2 !important;
}

/* Aktívny server - zaoblený štvorec + indikátor vľavo */
.server-active .server-btn {
  border-radius: 16px;
}

.server-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 40px;
  border-radius: 0 4px 4px 0;
  background-color: #fff;
}

/* Channel Header */
.channel-header {
  height: 48px;
  border-bottom: 1px solid #1e1f22;
  transition: background-color 0.2s;
}

.channel-header:hover {
  background-color: #35373c;
}

/* Channel List Items */
.channel-item {
  min-height: 34px;
  padding: 0 8px;
  transition: background-color 0.1s;
}

.channel-item:hover {
  background-color: #35373c;
  color: #dbdee1 !important;
}

/* Zvýraznenie pre pozvánky */
.invite-highlight {
  background-color: rgba(88, 101, 242, 0.15);
  border: 1px solid rgba(88, 101, 242, 0.5);
}

.invite-highlight:hover {
  background-color: rgba(88, 101, 242, 0.25);
}

/* Channel Actions (Hide by default, show on hover) */
.channel-actions {
  opacity: 0;
  transition: opacity 0.1s;
}

.channel-item:hover .channel-actions {
  opacity: 1;
}

/* Add Channel Button */
.add-btn {
  opacity: 0.6;
}

.add-btn:hover {
  opacity: 1;
  color: #dbdee1 !important;
}

/* Status bar používateľa */
.user-bar {
  height: 56px;
  flex-shrink: 0;
  background-color: #232428;
}

.user-info {
  min-width: 0;
  transition: background-color 0.1s;
}

.user-info:hover {
  background-color: #35373c;
}

.user-avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.status-dot {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 3px solid #232428;
  box-sizing: content-box;
}

.status-dot--inline {
  position: static;
  display: inline-block;
  border: none;
}

</style>

<template>
  <div class="game-board">
    <!-- Top: Robot 2 (North) -->
    <div class="board-top">
      <OtherPlayer
        name="机器人2(北)"
        position="top"
        :hand-count="topPlayerHandCount"
        :hand-tiles="topPlayerHandTiles"
        :melds="topPlayerMelds"
        :discards="topPlayerDiscards"
        :matched-tile-ids="matchedTileIds"
        :ghost-type="ghostType"
        :ghost-value="ghostValue"
      />
    </div>

    <!-- Middle row: Left + Center + Right -->
    <div class="board-middle">
      <div class="board-left">
        <OtherPlayer
          name="机器人1(西)"
          position="left"
          :hand-count="leftPlayerHandCount"
          :hand-tiles="leftPlayerHandTiles"
          :melds="leftPlayerMelds"
          :discards="leftPlayerDiscards"
          :matched-tile-ids="matchedTileIds"
          :ghost-type="ghostType"
          :ghost-value="ghostValue"
        />
      </div>

      <div class="board-center">
        <DiscardPool :discard-entries="discardOrder" :matched-tile-ids="matchedTileIds" :wall-tiles="wallTiles" :current-player="currentPlayer" :ghost-type="ghostType" :ghost-value="ghostValue" />
        <div class="turn-info" v-if="turnText">{{ turnText }}</div>
      </div>

      <div class="board-right">
        <OtherPlayer
          name="机器人3(东)"
          position="right"
          :hand-count="rightPlayerHandCount"
          :hand-tiles="rightPlayerHandTiles"
          :melds="rightPlayerMelds"
          :discards="rightPlayerDiscards"
          :matched-tile-ids="matchedTileIds"
          :ghost-type="ghostType"
          :ghost-value="ghostValue"
        />
      </div>
    </div>

    <!-- Bottom: Player (South) -->
    <div class="board-bottom">
      <MeldArea :melds="playerMelds" :matched-tile-ids="matchedTileIds" :ghost-type="ghostType" :ghost-value="ghostValue" />
      <PlayerHand
        :tiles="playerHand"
        label="你的手牌"
        :selected-id="selectedTileId"
        :highlighted-tile-ids="highlightedTileIds"
        :ghost-type="ghostType"
        :ghost-value="ghostValue"
        @select="$emit('select-tile', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Tile, Meld, TileType, DiscardEntry } from '../engine/types';
import PlayerHand from './PlayerHand.vue';
import MeldArea from './MeldArea.vue';
import DiscardPool from './DiscardPool.vue';
import OtherPlayer from './OtherPlayer.vue';

const props = defineProps<{
  hands: Tile[][];
  melds: Meld[][];
  discards: Tile[][];
  discardOrder: DiscardEntry[];
  selectedTileId: number | null;
  highlightedTileIds: number[];
  matchedTileIds: number[];
  ghostType: TileType;
  ghostValue: number;
  ghostName: string;
  currentPlayer: number;
  phase: string;
  turnText: string;
  revealMode?: boolean;
  wallTiles?: Tile[];
}>();

defineEmits<{
  'select-tile': [tile: Tile];
}>();

const playerHand = computed(() => props.hands[0]);
const playerMelds = computed(() => props.melds[0]);

const leftPlayerHandCount = computed(() => props.hands[1].length);
const topPlayerHandCount = computed(() => props.hands[2].length);
const rightPlayerHandCount = computed(() => props.hands[3].length);

const leftPlayerHandTiles = computed(() => props.revealMode ? props.hands[1] : undefined);
const topPlayerHandTiles = computed(() => props.revealMode ? props.hands[2] : undefined);
const rightPlayerHandTiles = computed(() => props.revealMode ? props.hands[3] : undefined);

const leftPlayerMelds = computed(() => props.melds[1]);
const topPlayerMelds = computed(() => props.melds[2]);
const rightPlayerMelds = computed(() => props.melds[3]);

const leftPlayerDiscards = computed(() => props.discards[1]);
const topPlayerDiscards = computed(() => props.discards[2]);
const rightPlayerDiscards = computed(() => props.discards[3]);
</script>

<style scoped>
.game-board {
  position: relative;
  isolation: isolate;
  width: 100%;
  max-width: 1100px;
  min-height: 700px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  /* 绒布径向渐变：顶部偏亮模拟顶光，向边缘变深 */
  background: radial-gradient(ellipse at 50% 32%, var(--color-felt-hi) 0%, var(--color-felt-mid) 55%, var(--color-felt-deep) 100%);
  border-radius: var(--radius-lg);
  /* 双层木质内框 + 桌体浮起投影 */
  box-shadow:
    inset 0 0 0 6px #6b4423,
    inset 0 0 0 8px #4a2f18,
    var(--shadow-panel);
  overflow: hidden;
}

/* 极细噪点纹理（静态 data-URI，无外部资源） */
.game-board::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='120'%20height='120'%3E%3Cfilter%20id='n'%3E%3CfeTurbulence%20type='fractalNoise'%20baseFrequency='0.85'%20numOctaves='2'%20stitchTiles='stitch'/%3E%3CfeColorMatrix%20type='saturate'%20values='0'/%3E%3C/filter%3E%3Crect%20width='100%25'%20height='100%25'%20filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 120px 120px;
  opacity: 0.05;
  mix-blend-mode: overlay;
  pointer-events: none;
  z-index: -1;
}

/* 桌面中心柔光 */
.game-board::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 38%, rgba(255, 255, 255, 0.07), transparent 60%);
  pointer-events: none;
  z-index: -1;
}
.board-top {
  display: flex;
  justify-content: center;
}
.board-middle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
  gap: var(--space-6);
}
.board-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  flex: 1 1 auto;
}
.ghost-indicator {
  font-size: 14px;
  color: #ffd700;
  background: rgba(0,0,0,0.3);
  padding: 4px 12px;
  border-radius: 4px;
}
.turn-info {
  font-size: var(--font-md);
  color: var(--color-text-inverse);
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
}
.board-left, .board-right {
  display: flex;
  align-items: center;
}
.board-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

@media (max-width: 880px) {
  .game-board {
    padding: var(--space-2);
    min-height: 600px;
  }
  .board-middle {
    gap: var(--space-3);
  }
}
</style>

// scripts/simulate.ts
import { createGame, drawPhase, discardPhase, pengPhase, mingGangPhase, jiaGangPhase, checkReactions, passReaction } from '../src/engine/game';
import { isSelfHu } from '../src/engine/hu';
import { getTileName } from '../src/engine/tile';
import { robotDiscard, robotShouldPeng, robotShouldMingGang, robotShouldJiaGang } from '../src/robot/robot';
import { getJiaGangCandidates } from '../src/engine/meld';
import type { GameState } from '../src/engine/types';

function log(msg: string) {
  console.log(msg);
}

/** 机器人回合：摸牌→检查加杠→出牌 */
function robotTurn(game: GameState): GameState {
  let g = game;
  const player = g.currentPlayer;

  log(`--- [机器人${player}] 回合开始 ---`);

  // 摸牌
  if (g.phase !== 'draw') return g;
  g = drawPhase(g);
  if (g.phase === 'draw_end') {
    log(`[机器人${player}] 牌墙空，流局`);
    return g;
  }

  // 检查加杠
  if (robotShouldJiaGang(g.hands[player], g.melds[player])) {
    const candidates = getJiaGangCandidates(g.hands[player], g.melds[player]);
    if (candidates.length > 0) {
      const c = candidates[0];
      g = jiaGangPhase(g, c.type, c.value);
      log(`[机器人${player}] 加杠: ${getTileName({ type: c.type, value: c.value, id: -1 })}`);
      // 加杠后补了牌，需要出牌
      if (g.phase === 'discard') {
        const discard = robotDiscard(g.hands[player], g.ghostType, g.ghostValue);
        g = discardPhase(g, discard);
        log(`[机器人${player}] 加杠后出牌: ${getTileName(discard)}`);
      }
      return g;
    }
  }

  // 机器人不胡牌（设计决定），但可以记录
  if (isSelfHu(g.hands[player], g.ghostType, g.ghostValue)) {
    log(`[机器人${player}] (可自摸，但机器人不胡)`);
  }

  // 出牌
  const discard = robotDiscard(g.hands[player], g.ghostType, g.ghostValue);
  g = discardPhase(g, discard);
  log(`[机器人${player}] 出牌: ${getTileName(discard)}, 手牌${g.hands[player].length}张`);

  return g;
}

/** 处理反应阶段（机器人自动碰杠） */
function handleReactions(game: GameState): GameState {
  let g = game;
  if (g.phase !== 'reaction') return g;

  const reactors = checkReactions(g);

  for (const idx of reactors) {
    if (idx === 0) continue; // 跳过玩家
    const hand = g.hands[idx];
    const discard = g.lastDiscard!;

    // 优先明杠
    if (robotShouldMingGang(hand, discard)) {
      log(`[机器人${idx}] 明杠: ${getTileName(discard)}`);
      g = mingGangPhase(g, idx);
      // 杠后补牌→出牌
      if (g.phase === 'draw') {
        g = drawPhase(g);
        if (g.phase !== 'draw_end') {
          const newDiscard = robotDiscard(g.hands[idx], g.ghostType, g.ghostValue);
          g = discardPhase(g, newDiscard);
          log(`[机器人${idx}] 杠后出牌: ${getTileName(newDiscard)}`);
        }
      }
      return g;
    }

    // 碰牌
    if (robotShouldPeng(hand, discard)) {
      log(`[机器人${idx}] 碰: ${getTileName(discard)}`);
      g = pengPhase(g, idx);
      // 碰后出牌
      if (g.phase === 'discard') {
        const newDiscard = robotDiscard(g.hands[idx], g.ghostType, g.ghostValue);
        g = discardPhase(g, newDiscard);
        log(`[机器人${idx}] 碰后出牌: ${getTileName(newDiscard)}`);
      }
      return g;
    }
  }

  // 无人碰杠，过
  g = passReaction(g, 0);
  return g;
}

/** 玩家回合（简化：摸牌→自动丢第一张） */
function playerTurn(game: GameState): GameState {
  let g = game;

  log(`--- [你] 回合开始 ---`);

  if (g.phase !== 'draw') return g;
  g = drawPhase(g);
  if (g.phase === 'draw_end') {
    log('[你] 牌墙空，流局');
    return g;
  }

  // 检查自摸
  if (isSelfHu(g.hands[0], g.ghostType, g.ghostValue)) {
    log('[你] 自摸胡！');
    return { ...g, phase: 'hu', winner: 0 };
  }

  // 自动出第一张
  const discard = g.hands[0][0];
  g = discardPhase(g, discard);
  log(`[你] 打出: ${getTileName(discard)}, 手牌${g.hands[0].length}张`);

  return g;
}

// ====== 主流程 ======

function runSimulation() {
  log('=== 广东麻将训练助手 - 终端模拟对局 ===');
  log('');

  const game = createGame(0);
  log(`鬼牌指示: ${getTileName({ type: game.ghostType, value: game.ghostValue, id: -1 })}`);
  log(`牌墙剩余: ${game.wall.length} 张`);
  log('');

  // 打印4家手牌
  for (let i = 0; i < 4; i++) {
    const role = i === 0 ? '你(庄)' : `机器人${i}`;
    const hand = game.hands[i].map(t => getTileName(t)).join(' ');
    log(`${role} 手牌(${game.hands[i].length}张): ${hand}`);
  }
  log('');

  // 模拟对局
  let state = game;
  let turn = 0;
  const MAX_TURNS = 200;

  while (turn < MAX_TURNS) {
    if (state.phase === 'draw_end' || state.phase === 'hu') break;

    if (state.phase === 'reaction') {
      state = handleReactions(state);
    } else if (state.phase === 'draw') {
      if (state.currentPlayer === 0) {
        state = playerTurn(state);
      } else {
        state = robotTurn(state);
      }
    }

    turn++;
  }

  log('');
  log('=== 对局结束 ===');
  log(`总轮次: ${state.turnCount}`);
  log(`牌墙剩余: ${state.wall.length} 张`);
  if (state.winner === 0) {
    log('结果: 你胡了！');
  } else if (state.winner === -1 || state.phase === 'draw_end') {
    log('结果: 流局');
  }
  log(`你的最终手牌(${state.hands[0].length}张): ${state.hands[0].map(t => getTileName(t)).join(' ')}`);
  // 打印副露
  for (let i = 0; i < 4; i++) {
    if (state.melds[i].length > 0) {
      const meldStr = state.melds[i].map(m => {
        const names = m.tiles.map(t => getTileName(t)).join('');
        return `[${m.type}]${names}`;
      }).join(' ');
      const role = i === 0 ? '你' : `机器人${i}`;
      log(`${role} 副露: ${meldStr}`);
    }
  }
}

runSimulation();

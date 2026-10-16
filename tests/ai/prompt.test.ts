import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../../src/ai/prompt';

describe('buildSystemPrompt', () => {
  it('declares the Guangdong tui dao hu ruleset and self-draw-only win rule', () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain('推倒胡');
    expect(prompt).toContain('只能自摸胡');
    expect(prompt).toContain('不存在点炮');
    expect(prompt).toContain('不可能让其他玩家胡牌');
  });

  it('explicitly forbids defense/safety reasoning that does not exist in this ruleset', () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain('不存在');
    expect(prompt).toContain('防守');
  });

  it('declares the pure tui dao hu scoring rules', () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain('平胡基础 1 番');
    expect(prompt).toContain('大胡牌型分数 ×2');
    expect(prompt).toContain('无鬼硬胡');
    expect(prompt).toContain('杠上开花分数 ×2');
    expect(prompt).toContain('满鬼');
    expect(prompt).toContain('十三幺');
    expect(prompt).toContain('不存在任何其他牌型加番');
  });

  it('does not introduce deal-in concepts from other mahjong rules', () => {
    const prompt = buildSystemPrompt();

    expect(prompt).not.toContain('可能点炮');
    expect(prompt).not.toContain('炮弹');
    expect(prompt).not.toContain('被抢杠');
    expect(prompt).not.toContain('牌河安全性');
    expect(prompt).not.toContain('不安全');
  });
});

import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, describeHandStructure } from '../../src/ai/prompt';

describe('hand structure evidence', () => {
  it('lists real pairs and adjacent or gapped suited tiles, never a three-step gap', () => {
    const hand = [3,6,6,7,8].map((value,id) => ({type:'tong' as const,value,id}));
    const evidence = describeHandStructure(hand, 'jian', 1);
    expect(evidence).toContain('对子：六筒');
    expect(evidence).toContain('六筒、七筒');
    expect(evidence).toContain('六筒、八筒');
    expect(evidence).not.toContain('三筒、六筒');
  });
  it('excludes ghost tiles from natural structures and identifies overlapping groups', () => {
    const hand = [1,2,2,3].map((value,id) => ({type:'wan' as const,value,id}));
    const evidence = describeHandStructure(hand, 'wan', 2);
    expect(evidence).not.toContain('对子：二万');
    expect(evidence).not.toContain('一万、二万');
    expect(evidence).toContain('一万、三万');
    expect(evidence).toContain('可能重叠');
  });
  it('recognizes triplets and sequences without joining different suits', () => {
    const hand = [
      ...[3,3,3,4,5].map((value,id) => ({type:'tiao' as const,value,id})),
      {type:'tong' as const,value:6,id:6},
    ];
    const evidence = describeHandStructure(hand, 'jian', 1);
    expect(evidence).toContain('刻子：三条');
    expect(evidence).toContain('三条、四条、五条');
    expect(evidence).not.toContain('五条、六筒');
  });
});

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

  it('requires evidence for a preference between numerically tied candidates', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('向听数和进张种数相同');
    expect(prompt).toContain('不得仅凭风牌或箭牌身份');
    expect(prompt).toContain('说明并列');
  });
});

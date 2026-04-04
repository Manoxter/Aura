/**
 * setor-config.test.ts — Story 3.3 AC-6
 *
 * Testa que getFatorSetor() retorna o fator correto por setor,
 * e que alterar o fator (simulado) produz resultado diferente e previsível.
 */

import { describe, it, expect } from 'vitest';
import { getFatorSetor, getSetorConfig, getAllSetores } from './setor-config';

describe('getFatorSetor', () => {
  it('retorna 1.6 para construcao_civil', () => {
    expect(getFatorSetor('construcao_civil')).toBe(1.6);
  });

  it('retorna 1.2 para tecnologia', () => {
    expect(getFatorSetor('tecnologia')).toBe(1.2);
  });

  it('retorna 1.4 para infraestrutura', () => {
    expect(getFatorSetor('infraestrutura')).toBe(1.4);
  });

  it('retorna 1.0 para saude', () => {
    expect(getFatorSetor('saude')).toBe(1.0);
  });

  it('retorna 1.2 (geral) para setor desconhecido', () => {
    expect(getFatorSetor('setor_inexistente')).toBe(1.2);
  });

  it('retorna 1.2 para geral', () => {
    expect(getFatorSetor('geral')).toBe(1.2);
  });
});

describe('getSetorConfig', () => {
  it('retorna sigma_prior correto para construcao_civil', () => {
    const config = getSetorConfig('construcao_civil');
    expect(config.sigma_prior).toBe(0.22);
    expect(config.fator_atividade).toBe(1.6);
  });

  it('retorna sigma_prior correto para saude', () => {
    const config = getSetorConfig('saude');
    expect(config.sigma_prior).toBe(0.11);
  });

  it('fallback para geral quando setor desconhecido', () => {
    const config = getSetorConfig('xyz');
    expect(config.setor).toBe('geral');
    expect(config.fator_atividade).toBe(1.2);
  });
});

describe('AC-6: mudança de fator produz resultado previsível', () => {
  it('construcao_civil (1.6) > infraestrutura (1.4) > tecnologia (1.2) = geral (1.2) > saude (1.0)', () => {
    const construcao = getFatorSetor('construcao_civil');
    const infra = getFatorSetor('infraestrutura');
    const tech = getFatorSetor('tecnologia');
    const saude = getFatorSetor('saude');

    expect(construcao).toBeGreaterThan(infra);
    expect(infra).toBeGreaterThan(saude);
    expect(tech).toBeGreaterThan(saude);
  });

  it('Peso_i com construcao (1.6) é maior que com saude (1.0) para mesma posição', () => {
    // Peso_i = (i+1)/n × fator_atividade
    const n = 5;
    const i = 2; // terceira atividade

    const pesoConstrucao = ((i + 1) / n) * getFatorSetor('construcao_civil');
    const pesoSaude = ((i + 1) / n) * getFatorSetor('saude');

    expect(pesoConstrucao).toBeCloseTo(0.96, 5); // (3/5)*1.6
    expect(pesoSaude).toBeCloseTo(0.6, 5);       // (3/5)*1.0
    expect(pesoConstrucao).toBeGreaterThan(pesoSaude);
  });
});

describe('getAllSetores', () => {
  it('retorna exatamente 5 setores', () => {
    const setores = getAllSetores();
    expect(setores).toHaveLength(5);
  });

  it('todos os fatores estão no intervalo (0, 3]', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getAllSetores().forEach(({ setor, fator_atividade }) => {
      expect(fator_atividade).toBeGreaterThan(0);
      expect(fator_atividade).toBeLessThanOrEqual(3.0);
    });
  });

  it('todos os sigma_prior estão no intervalo (0, 1]', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getAllSetores().forEach(({ setor, sigma_prior }) => {
      expect(sigma_prior).toBeGreaterThan(0);
      expect(sigma_prior).toBeLessThanOrEqual(1.0);
    });
  });
});

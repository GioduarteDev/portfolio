import { useEffect, useRef } from "react";

import "./SanctuaryPortal.css";
import { montarPortal, type ControlePortal } from "./portalCena";

/**
 * PORTAL DO SANTUÁRIO
 *
 * Tela de entrada: a noite carrega enquanto a trepadeira sobe pelo portal-lua e,
 * em 100%, amanhece com os botões para entrar. Tem paisagem sonora de natureza,
 * rastro de estrelas no mouse/dedo e ondas com som de gota no clique/toque.
 *
 * - `progress` (0–1): progresso real. Sem ele, o portal anima sozinho.
 * - `startReady`: abre já amanhecido (usado pelo modo de depuração).
 * - `leaving`: some com fade depois que a pessoa entra.
 * - `onEnter(comSom)`: chamado quando a pessoa escolhe entrar.
 */

interface SanctuaryPortalProps {
  progress?: number;
  startReady?: boolean;
  /** Depois de entrar: o portal some com fade enquanto a caverna aparece. */
  leaving?: boolean;
  onEnter: (withAudio: boolean) => void;
}

function SanctuaryPortal({ progress, startReady = false, leaving = false, onEnter }: SanctuaryPortalProps) {
  const rootRef = useRef<HTMLElement>(null);
  const controlRef = useRef<ControlePortal | null>(null);
  const onEnterRef = useRef(onEnter);
  const usesRealProgress = progress !== undefined;

  useEffect(() => {
    onEnterRef.current = onEnter;
  }, [onEnter]);

  // Monta a cena uma única vez.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const control = montarPortal(root, {
      pronto: startReady,
      demo: !usesRealProgress,
      aoEntrar: (comSom) => onEnterRef.current(comSom),
    });
    controlRef.current = control;
    return () => {
      control.destruir();
      controlRef.current = null;
    };
  }, [startReady, usesRealProgress]);

  // Progresso real, quando informado.
  useEffect(() => {
    if (progress !== undefined) controlRef.current?.progresso(progress);
  }, [progress]);

  return (
    <section
      ref={rootRef}
      className={leaving ? "portal saindo" : "portal"}
      data-testid="visual-loader"
      aria-label="Portal do Santuário"
    >
      <svg
        data-p="cena"
        className="cena"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      />
      <canvas data-p="rastro" className="rastro" aria-hidden="true" />

      <div className="centro">
        <div className="coluna">
          <div data-p="astrolabio" className="astrolabio" aria-hidden="true">
            <svg data-p="astro" viewBox="0 0 400 400" />
            <div className="icone" />
          </div>

          <h1 className="nome">
            Giovanna <i>Duarte</i>
          </h1>

          <p className="estado" role="status" aria-live="polite">
            <span data-p="estado-txt">Preparando o santuário · </span>
            <span data-p="estado-num">
              <span data-p="pct" className="pct">0</span>%
            </span>
          </p>
          <p data-p="sussurro" className="sussurro" aria-hidden="true" />

          <div data-p="portas" className="portas">
            <button data-p="entrar-som" type="button" className="porta">
              ✦ Entrar com som
            </button>
            <button data-p="entrar-silencio" type="button" className="porta sutil">
              Entrar em silêncio
            </button>
          </div>
        </div>
      </div>

      <span className="canto esq topo">Engenharia de software</span>
      <span className="canto dir topo">Natureza · Água · Mistério</span>
      <span className="canto esq">Santuário · 2026</span>
      <span data-p="canto-dir" className="canto dir">GD-01 · φ 1.618</span>

      <button data-p="som" type="button" className="som" aria-pressed="false">
        <span className="barras" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span data-p="som-rotulo">Som desligado</span>
      </button>
    </section>
  );
}

export default SanctuaryPortal;

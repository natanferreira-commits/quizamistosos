"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { config } from "./config";
import { enviarEvento, marcarWhatsapp, salvarBilhete } from "./lib/sb";

// transforma *palavra* em destaque na cor
function Highlight({ text }) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("*") && p.endsWith("*") ? (
          <span className="hl" key={i}>
            {p.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function WhatsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

// Evento pro GA4, pro Supabase (funil do /admin) e opcionalmente pro Meta Pixel
function track(evento, params = {}, pixel = null) {
  enviarEvento(evento, params.etapa ?? null, params);
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", evento, { rodada: config.rodada.id || config.rodada.nome, ...params });
    }
  } catch (e) {}
  try {
    if (pixel && typeof window !== "undefined" && window.fbq) {
      window.fbq("track", pixel, params);
    }
  } catch (e) {}
}

// número curto do bilhete, sem caracteres ambíguos (0/O, 1/I)
function gerarCodigo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function nomeJogo(p) {
  if (p.jogo === null || p.jogo === undefined) return "Rodada";
  const j = config.rodada.jogos[p.jogo];
  return `${j.casa} x ${j.fora}`;
}

// (removido: agora o botão só valida no banco, sem redirect pro WhatsApp)

// ---------- contador ----------
function useCountdown(iso) {
  const alvo = useMemo(() => (iso ? new Date(iso).getTime() : null), [iso]);
  const [agora, setAgora] = useState(null);
  useEffect(() => {
    if (!alvo) return;
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [alvo]);
  if (!alvo || Number.isNaN(alvo) || agora === null) return null;
  const diff = Math.max(0, alvo - agora);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { encerrado: diff === 0, d, h, m, s };
}

function Countdown({ fallback = null }) {
  const c = useCountdown(config.rodada.encerramento);
  if (!c) return fallback;
  const pad = (n) => String(n).padStart(2, "0");
  return (
    <span className={`countdown${c.encerrado ? " encerrado" : ""}`}>
      <span className="countdown-label">{c.encerrado ? "Palpites encerrados" : "Palpites fecham em"}</span>
      {!c.encerrado && (
        <span className="countdown-num">
          {c.d > 0 && `${c.d}d `}
          {pad(c.h)}:{pad(c.m)}:{pad(c.s)}
        </span>
      )}
    </span>
  );
}

// ---------- blocos ----------
function Marquee() {
  const itens = [...config.marquee, ...config.marquee, ...config.marquee];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {itens.map((t, i) => (
          <span key={i}>
            {t}
            <i>•</i>
          </span>
        ))}
      </div>
    </div>
  );
}

function Header({ right, onHome }) {
  return (
    <header className="header">
      {onHome ? (
        <button className="brand brand-link" onClick={onHome} aria-label="Voltar ao início">
          {config.marca}
        </button>
      ) : (
        <span className="brand">{config.marca}</span>
      )}
      <span className="header-right">{right}</span>
    </header>
  );
}

function Aviso() {
  const { aviso } = config;
  return (
    <section className="aviso">
      <div className="aviso-titulo">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
        {aviso.titulo}
      </div>
      {aviso.linhas.map((l, i) => (
        <p key={i}>{l}</p>
      ))}
    </section>
  );
}

function Rodape() {
  return <p className="rodape">© {new Date().getFullYear()} {config.marca}. +18. Jogue com responsabilidade.</p>;
}

// partículas douradas flutuando (posições fixas pra não quebrar a hidratação)
const PARTICULAS = [
  [8, 62, 0, 7], [18, 78, 1.2, 9], [27, 55, 2.1, 8], [38, 84, 0.6, 10], [47, 70, 1.8, 7],
  [56, 88, 0.3, 9], [64, 58, 2.6, 8], [73, 80, 1.1, 10], [82, 66, 0.9, 7], [91, 76, 2.3, 9],
  [14, 40, 1.5, 11], [86, 44, 0.4, 11],
];
function Particulas() {
  return (
    <div className="particulas" aria-hidden="true">
      {PARTICULAS.map(([x, y, d, t], i) => (
        <span key={i} style={{ left: x + "%", top: y + "%", animationDelay: d + "s", animationDuration: t + "s" }} />
      ))}
    </div>
  );
}

const CONFETE = Array.from({ length: 26 }, (_, i) => ({
  x: (i * 37) % 100,
  d: (i % 7) * 0.12,
  t: 1.6 + (i % 5) * 0.25,
  r: (i * 53) % 360,
  c: i % 3 === 0 ? "#fff" : i % 3 === 1 ? "#f2c14e" : "#b8861f",
}));
function Confete() {
  return (
    <div className="confete" aria-hidden="true">
      {CONFETE.map((c, i) => (
        <span
          key={i}
          style={{
            left: c.x + "%",
            animationDelay: c.d + "s",
            animationDuration: c.t + "s",
            background: c.c,
            transform: "rotate(" + c.r + "deg)",
          }}
        />
      ))}
    </div>
  );
}

// número do bilhete "rolando" antes de fixar
function CodigoRolando({ codigo }) {
  const [txt, setTxt] = useState(codigo);
  useEffect(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let n = 0;
    const t = setInterval(() => {
      n++;
      if (n > 14) {
        clearInterval(t);
        setTxt(codigo);
        return;
      }
      setTxt(
        codigo
          .split("")
          .map((ch, i) => (i < Math.floor(n / 3) ? ch : chars[Math.floor(Math.random() * chars.length)]))
          .join("")
      );
    }, 55);
    return () => clearInterval(t);
  }, [codigo]);
  return <>#{txt}</>;
}

function StickyCta({ children, hint }) {
  return (
    <div className="sticky">
      <div className="sticky-inner">
        {children}
        {hint && <p className="sticky-hint">{hint}</p>}
      </div>
    </div>
  );
}

// ============= LANDING =============
function Landing({ onStart }) {
  const { landing, oferta, rodada } = config;
  const recorte = landing.heroModo === "recorte";
  const fotoStyle = landing.heroImage ? { backgroundImage: `url(${landing.heroImage})` } : undefined;
  const heroStyle = recorte ? undefined : fotoStyle;
  const c = useCountdown(rodada.encerramento);
  const encerrado = Boolean(c?.encerrado);
  return (
    <div className="page">
      <Marquee />
      <Header right={rodada.nome} />

      <section className={`hero-img${landing.heroImage ? " com-imagem" : ""}${recorte ? " recorte" : ""}${landing.heroBandeiras ? " com-bandeiras" : ""}`} style={heroStyle}>
        {recorte && landing.heroImage && <div className="hero-foto" style={fotoStyle} aria-hidden="true" />}
        <Particulas />
        {landing.heroBandeiras && (
          <div className="hero-bandeiras" aria-hidden="true">
            {rodada.jogos.flatMap((j, i) => [
              <img key={`c${i}`} src={j.escudoCasa} alt="" />,
              <img key={`f${i}`} src={j.escudoFora} alt="" />,
            ])}
          </div>
        )}
        <div className="hero-top">
          {landing.label.split("•").map((l, i) => (
            <span className={i === 0 ? "hero-top-titulo" : "hero-top-sub"} key={i}>
              {l.trim()}
            </span>
          ))}
        </div>
        <div className="wrap hero-copy">
          <h1>
            <Highlight text={landing.titulo} />
          </h1>
        </div>
      </section>

      <main className="wrap">
        <section className="oferta">
          <div className="oferta-valor">{oferta.valor}</div>
          <div className="oferta-regra">{oferta.regra}</div>
        </section>
        <p className="lead">{landing.subtitulo}</p>

        <section className="bloco">
          <h2 className="bloco-titulo">Como funciona</h2>
          <ol className="passos">
            {landing.comoFunciona.map((t, i) => (
              <li key={i}>
                <span className="passo-num">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
        </section>

        <Aviso />
        <Rodape />
      </main>

      <StickyCta hint={<Countdown fallback={landing.ctaHint} />}>
        <button
          className="btn"
          disabled={encerrado}
          onClick={() => {
            if (encerrado) return;
            track("cta_start");
            onStart();
          }}
        >
          {encerrado ? "Palpites encerrados" : (<>{landing.ctaLabel} <Arrow /></>)}
        </button>
      </StickyCta>
    </div>
  );
}

// ============= PALPITES =============
const AVANCO_MS = 320;

function Palpites({ onFinish, onHome }) {
  const { palpites, rodada } = config;
  const [idx, setIdx] = useState(0);
  const [escolhas, setEscolhas] = useState([]);
  const [selecionado, setSelecionado] = useState(null);

  const atual = palpites[idx];
  const total = palpites.length;
  const jogo = atual.jogo === null || atual.jogo === undefined ? null : rodada.jogos[atual.jogo];
  const bloqueado = selecionado !== null;

  function escolher(i) {
    if (bloqueado) return;
    setSelecionado(i);
    const novas = [...escolhas];
    novas[idx] = i;
    setEscolhas(novas);
    track("palpite", {
      etapa: idx + 1,
      jogo: jogo ? `${jogo.casa} x ${jogo.fora}` : "rodada",
      mercado: atual.mercado,
      escolha: atual.opcoes[i],
    });
    setTimeout(() => {
      if (idx + 1 >= total) {
        onFinish(novas);
      } else {
        setIdx(idx + 1);
        setSelecionado(null);
      }
    }, AVANCO_MS);
  }

  function voltar() {
    if (idx === 0 || bloqueado) return;
    setIdx(idx - 1);
    setSelecionado(null);
  }

  return (
    <div className="page">
      <Header right={`Palpite ${idx + 1} de ${total}`} onHome={onHome} />
      <div className="progress">
        <div className="progress-fill" style={{ width: `${((idx + (bloqueado ? 1 : 0)) / total) * 100}%` }} />
      </div>

      <main className="wrap palpite" key={idx}>
        <div className="fixture">
          {jogo ? (
            <>
              <div className="fixture-escudos">
                <div className="time">
                  {jogo.escudoCasa && <img src={jogo.escudoCasa} alt="" />}
                  <span>{jogo.casa}</span>
                </div>
                <em>x</em>
                <div className="time">
                  {jogo.escudoFora && <img src={jogo.escudoFora} alt="" />}
                  <span>{jogo.fora}</span>
                </div>
              </div>
              <div className="fixture-quando">{jogo.quando}</div>
            </>
          ) : (
            <>
              <div className="fixture-escudos rodada">
                {(atual.escudos || rodada.jogos.map((j) => j.escudoCasa)).map((src, i) => (
                  <img key={i} src={src} alt="" />
                ))}
              </div>
              <div className="fixture-times">
                <span>Rodada inteira</span>
              </div>
              <div className="fixture-quando">{rodada.nome}</div>
            </>
          )}
        </div>

        <span className="label">{atual.mercado}</span>
        <h2 className="pergunta">{atual.pergunta}</h2>

        <div className={`opcoes${atual.opcoes.length === 2 ? " duas" : ""}`}>
          {atual.opcoes.map((op, i) => (
            <button
              key={i}
              className={`opcao${selecionado === i ? " marcada" : ""}${bloqueado && selecionado !== i ? " apagada" : ""}`}
              style={{ animationDelay: 0.08 + i * 0.06 + "s" }}
              onClick={() => escolher(i)}
              disabled={bloqueado}
            >
              {op}
            </button>
          ))}
        </div>

        {idx > 0 && (
          <button className="voltar" onClick={voltar} disabled={bloqueado}>
            ← Voltar
          </button>
        )}
      </main>
    </div>
  );
}

// ============= LOADING =============
function Loading({ onDone, onHome }) {
  const [p, setP] = useState(0);
  const { etapas, label, segundos } = config.loading;
  const dur = Math.max(0.3, segundos) * 1000;
  const etapa = etapas[Math.min(etapas.length - 1, Math.floor((p / 100) * etapas.length))];

  // Ref pra onDone não invalidar o effect a cada render do pai
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const inicio = Date.now();
    let fim = null;
    const t = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - inicio) / dur) * 100);
      setP(pct);
      if (pct >= 100) {
        clearInterval(t);
        fim = setTimeout(() => onDoneRef.current && onDoneRef.current(), 200);
      }
    }, 40);
    return () => {
      clearInterval(t);
      if (fim) clearTimeout(fim);
    };
  }, [dur]);

  return (
    <div className="page">
      <Header right={label} onHome={onHome} />
      <main className="wrap centro">
        <span className="label">{label}</span>
        <h2 className="pergunta">{etapa}…</h2>
        <div className="progress solto">
          <div className="progress-fill" style={{ width: `${p}%` }} />
        </div>
      </main>
    </div>
  );
}

// ============= BILHETE =============
function Bilhete({ escolhas, codigo, onRefazer, onHome }) {
  const { bilhete, rodada, oferta } = config;

  useEffect(() => {
    track("bilhete_view", { codigo }, "ViewContent");
    salvarBilhete(
      codigo,
      config.palpites.map((pp, i) => ({ jogo: nomeJogo(pp), mercado: pp.mercado, escolha: pp.opcoes[escolhas[i]] }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  function validar() {
    track("whatsapp_click", { codigo }, "Lead");
    marcarWhatsapp(codigo);
  }

  return (
    <div className="page">
      <Header right={bilhete.label} onHome={onHome} />

      <Confete />
      <main className="wrap">
        <section className="hero compacto">
          <span className="label">{bilhete.label}</span>
          <h1>{bilhete.titulo}</h1>
          {bilhete.subtitulo && <p className="lead">{bilhete.subtitulo}</p>}
        </section>

        <section className="slip">
          <div className="slip-head">
            <div>
              <div className="slip-titulo">{bilhete.slipTitulo}</div>
              <div className="slip-sub">{rodada.nome}</div>
            </div>
            <div className="slip-num">
              <span>Bilhete</span>
              <CodigoRolando codigo={codigo} />
            </div>
          </div>
          <ul className="slip-lista">
            {config.palpites.map((p, i) => (
              <li key={i} style={{ animationDelay: 0.35 + i * 0.09 + "s" }}>
                <div className="slip-jogo">
                  {nomeJogo(p)} <span>· {p.mercado}</span>
                </div>
                <div className="slip-escolha">{p.opcoes[escolhas[i]]}</div>
              </li>
            ))}
          </ul>
          <div className="slip-foot">
            <span>Cravou os {config.palpites.length}</span>
            <strong>{oferta.valor} no Pix</strong>
          </div>
        </section>

        <button
          className="voltar centro-btn"
          onClick={() => {
            track("refazer", { codigo });
            onRefazer();
          }}
        >
          {bilhete.refazerLabel}
        </button>

        <Aviso />
        <Rodape />
      </main>

      <StickyCta hint={bilhete.ctaHint}>
        <a
          className="btn"
          href={bilhete.ctaLink}
          onClick={validar}
          target="_blank"
          rel="noopener noreferrer"
        >
          {bilhete.ctaLabel}
        </a>
      </StickyCta>
    </div>
  );
}

// ============= APP =============
export default function Home() {
  const [step, setStep] = useState("landing");
  const [escolhas, setEscolhas] = useState([]);
  const [codigo, setCodigo] = useState("");
  const c = useCountdown(config.rodada.encerramento);
  const encerrado = Boolean(c?.encerrado);

  useEffect(() => {
    enviarEvento("page_view");
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  // Bloqueio hard: se prazo passou e usuário tá em passo de criação, volta pra landing
  useEffect(() => {
    if (encerrado && (step === "palpites" || step === "loading")) {
      setStep("landing");
    }
  }, [encerrado, step]);

  function finish(novas) {
    if (encerrado) return;
    setEscolhas(novas);
    setCodigo(gerarCodigo());
    setStep(config.loading.segundos > 0 ? "loading" : "bilhete");
  }

  const goHome = () => setStep("landing");
  if (step === "palpites" && !encerrado) return <Palpites onFinish={finish} onHome={goHome} />;
  if (step === "loading" && !encerrado) return <Loading onDone={() => setStep("bilhete")} onHome={goHome} />;
  if (step === "bilhete")
    return <Bilhete escolhas={escolhas} codigo={codigo} onRefazer={() => setStep("palpites")} onHome={goHome} />;
  return <Landing onStart={() => setStep("palpites")} />;
}

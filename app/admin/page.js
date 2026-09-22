"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { config } from "../config";
import { configurado, rpc } from "../lib/sb";
import "./admin.css";

const fmt = (n) => (n ?? 0).toLocaleString("pt-BR");
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const fmtPct = (v) => `${String(v).replace(".", ",")}%`;

function dataHora(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ---------- login ----------
function Login({ onEntrar, erro, carregando }) {
  const [senha, setSenha] = useState("");
  return (
    <form
      className="adm-login"
      onSubmit={(e) => {
        e.preventDefault();
        onEntrar(senha);
      }}
    >
      <h1>Admin do bolão</h1>
      <p>Digite a senha definida no SQL do Supabase.</p>
      <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha" autoFocus />
      <button type="submit" disabled={!senha || carregando}>
        {carregando ? "Entrando…" : "Entrar"}
      </button>
      {erro && <div className="adm-erro">{erro}</div>}
    </form>
  );
}

// ---------- tile ----------
function Tile({ label, valor, sub, destaque }) {
  return (
    <div className={`adm-tile${destaque ? " destaque" : ""}`}>
      <div className="adm-tile-label">{label}</div>
      <div className="adm-tile-valor">{valor}</div>
      {sub && <div className="adm-tile-sub">{sub}</div>}
    </div>
  );
}

// ---------- funil ----------
function Funil({ etapas }) {
  const base = etapas[0]?.valor || 0;
  const max = Math.max(1, ...etapas.map((e) => e.valor));
  return (
    <div className="adm-funil" role="table" aria-label="Funil por etapa">
      <div className="adm-funil-head" role="row">
        <span role="columnheader">Etapa</span>
        <span role="columnheader" />
        <span role="columnheader">Sessões</span>
        <span role="columnheader">Do total</span>
        <span role="columnheader">Perda na etapa</span>
      </div>
      {etapas.map((e, i) => {
        const ant = i > 0 ? etapas[i - 1].valor : null;
        const perda = ant !== null && ant > 0 ? pct(ant - e.valor, ant) : null;
        const alta = perda !== null && perda >= 25;
        return (
          <div
            className="adm-funil-row"
            role="row"
            key={e.chave}
            title={`${e.nome}: ${fmt(e.valor)} sessões (${fmtPct(pct(e.valor, base))} do total)`}
          >
            <span className="adm-funil-nome" role="cell">
              {e.nome}
            </span>
            <span className="adm-funil-barra" role="cell">
              <span className="adm-funil-fill" style={{ width: `${(e.valor / max) * 100}%` }} />
            </span>
            <span className="adm-num" role="cell">
              {fmt(e.valor)}
            </span>
            <span className="adm-num mut" role="cell">
              {fmtPct(pct(e.valor, base))}
            </span>
            <span className={`adm-num${alta ? " alerta" : " mut"}`} role="cell">
              {perda === null ? "—" : `${alta ? "▲ " : ""}-${fmtPct(perda)}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------- bilhetes + gabarito ----------
function Bilhetes({ bilhetes, rodada }) {
  const [busca, setBusca] = useState("");
  const [soWhats, setSoWhats] = useState(false);
  const [aberto, setAberto] = useState(null);
  const chaveGab = `bolao_gabarito_${rodada || "todas"}`;
  const [gabarito, setGabarito] = useState({});

  useEffect(() => {
    try {
      setGabarito(JSON.parse(localStorage.getItem(chaveGab) || "{}"));
    } catch (e) {
      setGabarito({});
    }
  }, [chaveGab]);

  function setResposta(i, v) {
    const g = { ...gabarito, [i]: v };
    if (!v) delete g[i];
    setGabarito(g);
    try {
      localStorage.setItem(chaveGab, JSON.stringify(g));
    } catch (e) {}
  }

  // perguntas: do config se for a rodada atual, senão deduz dos próprios bilhetes
  const perguntas = useMemo(() => {
    if (rodada && rodada === (config.rodada.id || config.rodada.nome)) {
      return config.palpites.map((p) => {
        const j = p.jogo === null || p.jogo === undefined ? null : config.rodada.jogos[p.jogo];
        return { jogo: j ? `${j.casa} x ${j.fora}` : "Rodada", mercado: p.mercado, opcoes: p.opcoes };
      });
    }
    const mapa = [];
    bilhetes.forEach((b) =>
      (b.palpites || []).forEach((p, i) => {
        mapa[i] = mapa[i] || { jogo: p.jogo, mercado: p.mercado, opcoes: [] };
        if (p.escolha && !mapa[i].opcoes.includes(p.escolha)) mapa[i].opcoes.push(p.escolha);
      })
    );
    return mapa;
  }, [bilhetes, rodada]);

  const respondidas = Object.keys(gabarito).length;

  const linhas = useMemo(() => {
    const q = busca.trim().replace(/^#/, "").toUpperCase();
    return bilhetes
      .filter((b) => (!q || b.codigo.includes(q)) && (!soWhats || b.clicou_whatsapp))
      .map((b) => {
        let acertos = 0;
        (b.palpites || []).forEach((p, i) => {
          if (gabarito[i] && p.escolha === gabarito[i]) acertos++;
        });
        return { ...b, acertos };
      })
      .sort((a, b) =>
        respondidas ? b.acertos - a.acertos || new Date(a.criado_em) - new Date(b.criado_em) : new Date(b.criado_em) - new Date(a.criado_em)
      );
  }, [bilhetes, busca, soWhats, gabarito, respondidas]);

  const gabaritaram = respondidas > 0 ? linhas.filter((l) => l.acertos === respondidas).length : 0;

  return (
    <section className="adm-card">
      <h2>Bilhetes</h2>

      <details className="adm-gabarito">
        <summary>
          Gabarito {respondidas > 0 ? `(${respondidas} de ${perguntas.length} marcados)` : "(marque os resultados pra ranquear os bilhetes)"}
        </summary>
        <div className="adm-gab-grid">
          {perguntas.map((p, i) => (
            <label key={i}>
              <span>
                {i + 1}. {p.jogo} · {p.mercado}
              </span>
              <select value={gabarito[i] || ""} onChange={(e) => setResposta(i, e.target.value)}>
                <option value="">— sem resultado —</option>
                {p.opcoes.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <p className="adm-nota">O gabarito fica salvo só neste navegador.</p>
      </details>

      <div className="adm-filtros">
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo # do bilhete" />
        <label className="adm-check">
          <input type="checkbox" checked={soWhats} onChange={(e) => setSoWhats(e.target.checked)} />
          Só quem clicou no WhatsApp
        </label>
        <span className="adm-nota">
          {fmt(linhas.length)} bilhetes
          {respondidas > 0 && ` · ${fmt(gabaritaram)} com ${respondidas}/${respondidas}`}
        </span>
      </div>

      <div className="adm-tabela-wrap">
        <table className="adm-tabela">
          <thead>
            <tr>
              <th>Bilhete</th>
              <th>Criado</th>
              <th>WhatsApp</th>
              <th className="dir">Acertos</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {linhas.slice(0, 500).map((b) => (
              <FragmentoBilhete
                key={b.codigo}
                b={b}
                aberto={aberto === b.codigo}
                onToggle={() => setAberto(aberto === b.codigo ? null : b.codigo)}
                gabarito={gabarito}
                respondidas={respondidas}
              />
            ))}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={5} className="adm-vazio">
                  Nenhum bilhete encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {linhas.length > 500 && <p className="adm-nota">Mostrando os 500 primeiros. Use a busca pra achar um bilhete específico.</p>}
    </section>
  );
}

function FragmentoBilhete({ b, aberto, onToggle, gabarito, respondidas }) {
  return (
    <>
      <tr className={aberto ? "aberta" : ""}>
        <td className="adm-codigo">#{b.codigo}</td>
        <td>{dataHora(b.criado_em)}</td>
        <td>{b.clicou_whatsapp ? "✓ clicou" : "— não clicou"}</td>
        <td className="dir adm-num">{respondidas ? `${b.acertos}/${respondidas}` : "—"}</td>
        <td className="dir">
          <button className="adm-link" onClick={onToggle}>
            {aberto ? "Fechar" : "Ver palpites"}
          </button>
        </td>
      </tr>
      {aberto && (
        <tr className="adm-detalhe">
          <td colSpan={5}>
            <ul>
              {(b.palpites || []).map((p, i) => {
                const g = gabarito[i];
                const status = !g ? "" : p.escolha === g ? "✓ acertou" : "✕ errou";
                return (
                  <li key={i}>
                    <span className="mut">
                      {i + 1}. {p.jogo} · {p.mercado}
                    </span>
                    <strong>{p.escolha}</strong>
                    <span className={`adm-status${status.startsWith("✓") ? " ok" : status ? " nok" : ""}`}>{status}</span>
                  </li>
                );
              })}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

// ---------- página ----------
export default function Admin() {
  const [senha, setSenha] = useState("");
  const [rodada, setRodada] = useState(config.rodada.id || config.rodada.nome);
  const [resumo, setResumo] = useState(null);
  const [bilhetes, setBilhetes] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [auto, setAuto] = useState(true);
  const [atualizado, setAtualizado] = useState(null);

  const carregar = useCallback(
    async (s, r) => {
      setCarregando(true);
      setErro("");
      try {
        const p_rodada = r === "__todas" ? null : r;
        const [res, bil] = await Promise.all([
          rpc("admin_resumo", { p_senha: s, p_rodada }),
          rpc("admin_bilhetes", { p_senha: s, p_rodada }),
        ]);
        setResumo(res);
        setBilhetes(bil || []);
        setSenha(s);
        setAtualizado(new Date());
        try {
          sessionStorage.setItem("bolao_admin", s);
        } catch (e) {}
      } catch (e) {
        setErro(e.message);
        if (/senha/i.test(e.message)) {
          setSenha("");
          try {
            sessionStorage.removeItem("bolao_admin");
          } catch (er) {}
        }
      } finally {
        setCarregando(false);
      }
    },
    []
  );

  // reentra se já tinha logado nesta aba
  useEffect(() => {
    try {
      const s = sessionStorage.getItem("bolao_admin");
      if (s) carregar(s, rodada);
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-atualização
  useEffect(() => {
    if (!senha || !auto) return;
    const t = setInterval(() => carregar(senha, rodada), 30000);
    return () => clearInterval(t);
  }, [senha, auto, rodada, carregar]);

  const etapas = useMemo(() => {
    if (!resumo) return [];
    const ev = resumo.eventos || [];
    const sess = (evento, etapa = null) => {
      const e = ev.find((x) => x.evento === evento && (etapa === null ? true : x.etapa === etapa));
      return e ? e.sessoes : 0;
    };
    const maxEtapa = Math.max(0, ...ev.filter((x) => x.evento === "palpite").map((x) => x.etapa || 0));
    const nPalpites =
      rodada === (config.rodada.id || config.rodada.nome) ? Math.max(config.palpites.length, maxEtapa) : maxEtapa;
    const lista = [
      { chave: "pv", nome: "Abriu a página", valor: sess("page_view") },
      { chave: "cta", nome: "Clicou em começar", valor: sess("cta_start") },
    ];
    for (let i = 1; i <= nPalpites; i++) lista.push({ chave: `p${i}`, nome: `Respondeu o palpite ${i}`, valor: sess("palpite", i) });
    lista.push({ chave: "bil", nome: "Chegou no bilhete", valor: sess("bilhete_view") });
    lista.push({ chave: "wa", nome: "Clicou no WhatsApp", valor: sess("whatsapp_click") });
    return lista;
  }, [resumo, rodada]);

  if (!configurado()) {
    return (
      <main className="adm">
        <div className="adm-login">
          <h1>Admin do bolão</h1>
          <p>
            O Supabase ainda não está configurado. Preencha <code>supabase.url</code> e <code>supabase.anonKey</code> em{" "}
            <code>app/config.js</code>.
          </p>
        </div>
      </main>
    );
  }

  if (!senha || !resumo) {
    return (
      <main className="adm">
        <Login onEntrar={(s) => carregar(s, rodada)} erro={erro} carregando={carregando} />
      </main>
    );
  }

  const visitas = etapas[0]?.valor || 0;
  const comecou = etapas[1]?.valor || 0;
  const whats = etapas[etapas.length - 1]?.valor || 0;
  const rodadas = Array.from(new Set([config.rodada.id || config.rodada.nome, ...(resumo.rodadas || [])]));

  return (
    <main className="adm">
      <header className="adm-top">
        <div>
          <h1>Admin do bolão</h1>
          <p className="adm-nota">
            {config.marca} · atualizado {atualizado ? atualizado.toLocaleTimeString("pt-BR") : "—"} · último evento{" "}
            {dataHora(resumo.ultimo_evento)}
          </p>
        </div>
        <div className="adm-filtros">
          <label>
            Rodada
            <select
              value={rodada}
              onChange={(e) => {
                setRodada(e.target.value);
                carregar(senha, e.target.value);
              }}
            >
              {rodadas.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="__todas">Todas</option>
            </select>
          </label>
          <label className="adm-check">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            Atualizar a cada 30s
          </label>
          <button onClick={() => carregar(senha, rodada)} disabled={carregando}>
            {carregando ? "Atualizando…" : "Atualizar"}
          </button>
        </div>
      </header>

      {erro && <div className="adm-erro">{erro}</div>}

      <section className="adm-tiles">
        <Tile destaque label="Cliques no WhatsApp" valor={fmt(whats)} sub={`${fmtPct(pct(whats, visitas))} de quem abriu a página`} />
        <Tile label="Visitantes únicos" valor={fmt(resumo.visitantes)} sub={`${fmt(visitas)} sessões`} />
        <Tile label="Começaram o bolão" valor={fmt(comecou)} sub={`${fmtPct(pct(comecou, visitas))} das sessões`} />
        <Tile
          label="Bilhetes gerados"
          valor={fmt(resumo.bilhetes_total)}
          sub={`${fmt(resumo.bilhetes_whatsapp)} com clique no WhatsApp`}
        />
      </section>

      <section className="adm-card">
        <h2>Onde as pessoas desistem</h2>
        <p className="adm-nota">Sessões únicas que chegaram em cada etapa. Perda de 25% ou mais numa etapa aparece marcada com ▲.</p>
        <Funil etapas={etapas} />
      </section>

      <section className="adm-card">
        <h2>Por dia</h2>
        <div className="adm-tabela-wrap">
          <table className="adm-tabela">
            <thead>
              <tr>
                <th>Dia</th>
                <th className="dir">Sessões</th>
                <th className="dir">Começaram</th>
                <th className="dir">Bilhetes</th>
                <th className="dir">WhatsApp</th>
                <th className="dir">Visita → WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {(resumo.por_dia || []).map((d) => (
                <tr key={d.dia}>
                  <td>{new Date(d.dia + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}</td>
                  <td className="dir adm-num">{fmt(d.visitas)}</td>
                  <td className="dir adm-num">{fmt(d.comecou)}</td>
                  <td className="dir adm-num">{fmt(d.bilhetes)}</td>
                  <td className="dir adm-num">{fmt(d.whatsapp)}</td>
                  <td className="dir adm-num mut">{fmtPct(pct(d.whatsapp, d.visitas))}</td>
                </tr>
              ))}
              {(resumo.por_dia || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="adm-vazio">
                    Sem dados ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Bilhetes bilhetes={bilhetes} rodada={rodada === "__todas" ? null : rodada} />
    </main>
  );
}

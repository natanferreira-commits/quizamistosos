// ============================================================
//  Supabase via REST (sem SDK). Se config.supabase estiver vazio, nada é enviado.
// ============================================================
import { config } from "../config";

function ativo() {
  const s = config.supabase || {};
  return Boolean(s.url && s.anonKey && typeof window !== "undefined");
}

function headers(extra) {
  const { anonKey } = config.supabase;
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "Content-Type": "application/json",
    ...(extra || {}),
  };
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function lerOuCriar(storage, chave) {
  try {
    let v = storage.getItem(chave);
    if (!v) {
      v = uid();
      storage.setItem(chave, v);
    }
    return v;
  } catch (e) {
    return "anon";
  }
}
export const visitanteId = () => lerOuCriar(window.localStorage, "bolao_visitante");
export const sessaoId = () => lerOuCriar(window.sessionStorage, "bolao_sessao");

const rodadaId = () => config.rodada.id || config.rodada.nome;

// ---------- escrita (página pública) ----------
export function enviarEvento(evento, etapa = null, meta = null) {
  if (!ativo()) return;
  try {
    fetch(`${config.supabase.url}/rest/v1/eventos`, {
      method: "POST",
      keepalive: true,
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({
        rodada: rodadaId(),
        evento,
        etapa,
        visitante: visitanteId(),
        sessao: sessaoId(),
        meta,
      }),
    }).catch(() => {});
  } catch (e) {}
}

export function salvarBilhete(codigo, palpites) {
  if (!ativo()) return;
  try {
    fetch(`${config.supabase.url}/rest/v1/bilhetes`, {
      method: "POST",
      keepalive: true,
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({
        codigo,
        rodada: rodadaId(),
        visitante: visitanteId(),
        sessao: sessaoId(),
        palpites,
      }),
    }).catch(() => {});
  } catch (e) {}
}

export function marcarWhatsapp(codigo) {
  if (!ativo()) return;
  try {
    fetch(`${config.supabase.url}/rest/v1/rpc/marcar_whatsapp`, {
      method: "POST",
      keepalive: true,
      headers: headers(),
      body: JSON.stringify({ p_codigo: codigo }),
    }).catch(() => {});
  } catch (e) {}
}

// ---------- leitura (admin) ----------
export function configurado() {
  const s = config.supabase || {};
  return Boolean(s.url && s.anonKey);
}

export async function rpc(nome, args) {
  if (!configurado()) throw new Error("Supabase não configurado em app/config.js");
  const r = await fetch(`${config.supabase.url}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(args || {}),
  });
  if (!r.ok) {
    const txt = await r.text();
    if (/senha invalida/i.test(txt)) throw new Error("Senha inválida");
    throw new Error(`Erro ${r.status}: ${txt.slice(0, 160)}`);
  }
  return r.json();
}

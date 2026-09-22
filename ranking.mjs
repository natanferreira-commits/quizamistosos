// Puxa bilhetes do Supabase e ranqueia por acertos usando o gabarito abaixo.
// USO: node ranking.mjs SENHA_DO_ADMIN

const SUPABASE_URL = "https://nhquytiuzezckqmbevif.supabase.co";
const ANON_KEY = "sb_publishable_CAgOTV9H6Z-z4qvimwV3Kg_ZSudeqrt";
const RODADA = "amistosos-fifa-set26";

// Gabarito na ordem dos 10 palpites do config.js
// PREENCHER com as respostas certas DEPOIS que os jogos rolarem (quinta 24/09)
const GABARITO = {
  0: null,  // Palestina x Nova Zelândia — Resultado ("Palestina" | "Empate" | "Nova Zelândia")
  1: null,  // Palestina x Nova Zelândia — Total de gols ("0 ou 1" | "2 ou 3" | "4 ou mais")
  2: null,  // Japão x Uruguai — Resultado ("Japão" | "Empate" | "Uruguai")
  3: null,  // Japão x Uruguai — Ambas marcam ("Sim" | "Não")
  4: null,  // Coreia do Sul x Equador — Resultado ("Coreia do Sul" | "Empate" | "Equador")
  5: null,  // Coreia do Sul x Equador — Gol no 1º tempo ("Sim" | "Não")
  6: null,  // China x Maldivas — Resultado ("China" | "Empate" | "Maldivas")
  7: null,  // China x Maldivas — Gols da China ("0 a 2" | "3 ou 4" | "5 ou mais")
  8: null,  // Uzbequistão x Irã — Resultado ("Uzbequistão" | "Empate" | "Irã")
  9: null,  // Uzbequistão x Irã — Ambas marcam ("Sim" | "Não")
};

const SENHA = process.argv[2];
if (!SENHA) {
  console.error("USO: node ranking.mjs SENHA_DO_ADMIN");
  process.exit(1);
}

async function main() {
  console.log(`Puxando bilhetes da rodada '${RODADA}'...`);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_bilhetes`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_senha: SENHA, p_rodada: RODADA }),
  });
  if (!r.ok) {
    const txt = await r.text();
    console.error(`Erro ${r.status}: ${txt}`);
    process.exit(1);
  }
  const bilhetes = await r.json();
  console.log(`Total de bilhetes: ${bilhetes.length}`);
  console.log();

  const total = Object.keys(GABARITO).length;
  const gabaritoPronto = Object.values(GABARITO).every((v) => v !== null);

  if (!gabaritoPronto) {
    console.log("⚠️  GABARITO AINDA NÃO PREENCHIDO — só mostrando lista de bilhetes.");
    console.log("    Preenche o objeto GABARITO no topo do arquivo com as respostas certas depois dos jogos.");
    console.log();
    console.log("Últimos 20 bilhetes:");
    bilhetes.slice(0, 20).forEach((b) => {
      const whats = b.clicou_whatsapp ? "✓" : "✕";
      console.log(`  #${b.codigo} · ${whats} zap · ${new Date(b.criado_em).toLocaleString("pt-BR")}`);
    });
    return;
  }

  // Prazo de elegibilidade: 1º jogo (Palestina x Nova Zelândia) é 24/09 às 06h30
  const PRAZO = new Date("2026-09-24T06:30:00-03:00");
  const eleg = (b) => new Date(b.criado_em) < PRAZO && b.clicou_whatsapp;

  const ranked = bilhetes.map((b) => {
    let acertos = 0;
    (b.palpites || []).forEach((p, i) => {
      const correta = GABARITO[i];
      if (p.escolha === correta) acertos++;
    });
    return { ...b, acertos };
  }).sort((a, b) => b.acertos - a.acertos || new Date(a.criado_em) - new Date(b.criado_em));

  // Distribuição de acertos (TODOS bilhetes)
  console.log("=== DISTRIBUIÇÃO DE ACERTOS (todos os bilhetes) ===");
  const dist = {};
  ranked.forEach((b) => { dist[b.acertos] = (dist[b.acertos] || 0) + 1; });
  for (let i = total; i >= 0; i--) {
    if (dist[i]) console.log(`  ${String(i).padStart(2)}/${total} → ${dist[i]} bilhete(s)`);
  }
  console.log();

  // ELEGÍVEIS
  const elegiveis = ranked.filter(eleg);
  console.log(`=== FILTRO OFICIAL: criado ANTES de 06h30 de 24/09 E clicou no WhatsApp ===`);
  console.log(`  Elegíveis: ${elegiveis.length} bilhetes (de ${bilhetes.length} totais)`);
  console.log();

  console.log("=== DISTRIBUIÇÃO DE ACERTOS (só elegíveis) ===");
  const distE = {};
  elegiveis.forEach((b) => { distE[b.acertos] = (distE[b.acertos] || 0) + 1; });
  for (let i = total; i >= 0; i--) {
    if (distE[i]) console.log(`  ${String(i).padStart(2)}/${total} → ${distE[i]} bilhete(s)`);
  }
  console.log();

  const cravaramEleg = elegiveis.filter((b) => b.acertos === total);
  console.log(`=== GANHADOR(ES) ELEGÍVEIS — ${cravaramEleg.length} bilhete(s) ===`);
  if (cravaramEleg.length === 0) {
    console.log("  NINGUÉM elegível cravou os 10.");
    console.log();
    console.log("  Melhores elegíveis:");
    elegiveis.slice(0, 10).forEach((b) => {
      console.log(`    #${b.codigo} · ${b.acertos}/${total} · ${new Date(b.criado_em).toLocaleString("pt-BR")}`);
    });
  } else {
    cravaramEleg.forEach((b) => {
      console.log(`  #${b.codigo} · ${new Date(b.criado_em).toLocaleString("pt-BR")}`);
    });
  }
  console.log();

  const cravaramNaoEleg = ranked.filter((b) => b.acertos === total && !eleg(b));
  if (cravaramNaoEleg.length > 0) {
    console.log(`=== 10/10 NÃO ELEGÍVEIS (criados após 06h30 OU sem clique no zap) ===`);
    cravaramNaoEleg.forEach((b) => {
      const motivo = new Date(b.criado_em) >= PRAZO ? "criado após 06h30" : "não clicou no zap";
      console.log(`  #${b.codigo} · ${new Date(b.criado_em).toLocaleString("pt-BR")} · MOTIVO: ${motivo}`);
    });
    console.log();
  }

  console.log(`(Total geral: ${bilhetes.length} bilhetes · ${bilhetes.filter(b => b.clicou_whatsapp).length} com clique · ${elegiveis.length} elegíveis)`);
}

main().catch((e) => { console.error(e); process.exit(1); });

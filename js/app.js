/* app.js — fluxo principal do protótipo */

const state = {
  sessao: null, // { perfil, ano, faculdadeId? }
  tab: "DASHBOARD" // DASHBOARD | ACTIVIDADES | RELATORIOS
};

const $ = (id) => document.getElementById(id);

function init(){
  // se não houver DB, cria automaticamente (primeira execução)
  if (!localStorage.getItem(DB_KEY)) DB.reset();

  fillFaculdadesSelect();
  wireEvents();
  onPerfilChange();
}

function fillFaculdadesSelect(){
  const facs = DB.listFaculdades();
  const sel = $("faculdade");
  sel.innerHTML = facs.map(f => `<option value="${f.id}">${f.nome}</option>`).join("");
}

function wireEvents(){
  $("perfil").addEventListener("change", onPerfilChange);
  $("btnEntrar").addEventListener("click", onEntrar);
  $("btnReset").addEventListener("click", () => {
    DB.reset();
    render();
    toast("Demo reposta com dados de exemplo.");
  });
  $("btnExport").addEventListener("click", () => {
    downloadJSON("sigac_export.json", DB.export());
  });
}

function onPerfilChange(){
  const perfil = $("perfil").value;
  $("faculdadeField").style.display = (perfil === "FACULDADE") ? "block" : "none";
}

function onEntrar(){
  const perfil = $("perfil").value;
  const ano = Number($("ano").value || 2026);

  if (perfil === "FACULDADE"){
    const faculdadeId = $("faculdade").value;
    state.sessao = { perfil, ano, faculdadeId };
    $("statusSessao").textContent = `Sessão: Faculdade (${faculdadeNome(faculdadeId)}) — ${ano}`;
  } else {
    state.sessao = { perfil, ano };
    $("statusSessao").textContent = `Sessão: Direcção Científica — ${ano}`;
  }

  state.tab = "DASHBOARD";
  render();
}

function faculdadeNome(id){
  return DB.listFaculdades().find(f => f.id === id)?.nome || id;
}

function toast(msg){
  // minimalista (sem libs)
  const n = el(`<div class="callout" style="position:fixed;right:16px;bottom:16px;max-width:420px;z-index:99;">
    <div class="callout__title">Notificação</div>
    <div class="callout__text">${msg}</div>
  </div>`);
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 2200);
}

function setHeader(title, subtitle){
  $("areaTitulo").textContent = title;
  $("areaSubtitulo").textContent = subtitle;
}

function render(){
  const root = $("app");
  root.innerHTML = "";

  if (!state.sessao){
    setHeader("Área do Sistema", "Inicie sessão para ver os módulos disponíveis.");
    root.appendChild(el(`
      <div class="empty">
        <div class="empty__icon">📘</div>
        <div class="empty__title">Pronto para a demonstração</div>
        <div class="empty__text">
          Seleccione o perfil e clique em <b>Entrar</b>.
        </div>
      </div>
    `));
    return;
  }

  const tabs = el(`
    <div class="tabs">
      <div class="tab ${state.tab==="DASHBOARD"?"tab--active":""}" data-tab="DASHBOARD">Visão Geral</div>
      <div class="tab ${state.tab==="ACTIVIDADES"?"tab--active":""}" data-tab="ACTIVIDADES">Actividades</div>
      <div class="tab ${state.tab==="RELATORIOS"?"tab--active":""}" data-tab="RELATORIOS">Relatórios</div>
    </div>
  `);
  tabs.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => {
    state.tab = t.dataset.tab;
    render();
  }));
  root.appendChild(tabs);

  if (state.sessao.perfil === "FACULDADE"){
    setHeader("Módulo da Faculdade", "Registo e submissão de actividades anuais com evidências.");
    renderFaculdade(root);
  } else {
    setHeader("Direcção Científica", "Monitoria, validação e consolidação de relatórios institucionais.");
    renderDireccao(root);
  }
}

function renderFaculdade(root){
  const { ano, faculdadeId } = state.sessao;
  const actividades = DB.listActividades({ ano, faculdadeId });
  const k = calcKPIs(actividades);

  root.appendChild(el(`
    <div class="kpis">
      <div class="kpi"><div class="kpi__label">Total</div><div class="kpi__value">${k.total}</div></div>
      <div class="kpi"><div class="kpi__label">Pendentes</div><div class="kpi__value">${k.pend}</div></div>
      <div class="kpi"><div class="kpi__label">Validadas</div><div class="kpi__value">${k.val}</div></div>
      <div class="kpi"><div class="kpi__label">Rejeitadas</div><div class="kpi__value">${k.rej}</div></div>
    </div>
  `));

  if (state.tab === "DASHBOARD"){
    root.appendChild(el(`
      <div class="callout">
        <div class="callout__title">Como a faculdade usa o sistema</div>
        <div class="callout__text">
          Ao longo do ano, a faculdade regista actividades (pesquisa, extensão, eventos, publicações, pós-graduação, etc.),
          anexa evidências (links/Drive), e submete para validação. No fim, o relatório anual é gerado automaticamente.
        </div>
      </div>
    `));
  }

  if (state.tab === "ACTIVIDADES"){
    root.appendChild(renderFormNovaActividade({ ano, faculdadeId }));
    root.appendChild(renderTabelaActividades(actividades, { modo: "FACULDADE" }));
  }

  if (state.tab === "RELATORIOS"){
    root.appendChild(renderRelatorios({ ano, filtroFaculdadeId: faculdadeId }));
  }
}

function renderDireccao(root){
  const { ano } = state.sessao;
  const actividades = DB.listActividades({ ano });
  const k = calcKPIs(actividades);

  root.appendChild(el(`
    <div class="kpis">
      <div class="kpi"><div class="kpi__label">Total (todas as faculdades)</div><div class="kpi__value">${k.total}</div></div>
      <div class="kpi"><div class="kpi__label">Pendentes</div><div class="kpi__value">${k.pend}</div></div>
      <div class="kpi"><div class="kpi__label">Validadas</div><div class="kpi__value">${k.val}</div></div>
      <div class="kpi"><div class="kpi__label">Rejeitadas</div><div class="kpi__value">${k.rej}</div></div>
    </div>
  `));

  if (state.tab === "DASHBOARD"){
    const byF = groupByFaculdade(actividades);
    const facs = DB.listFaculdades();

    const rows = facs.map(f => {
      const list = byF.get(f.id) || [];
      const kk = calcKPIs(list);
      return `
        <tr>
          <td><b>${f.nome}</b></td>
          <td>${kk.total}</td>
          <td>${kk.pend}</td>
          <td>${kk.val}</td>
          <td>${kk.rej}</td>
        </tr>
      `;
    }).join("");

    root.appendChild(el(`
      <div class="callout" style="margin-bottom:12px;">
        <div class="callout__title">Monitoria institucional</div>
        <div class="callout__text">
          Aqui a Direcção Científica acompanha o estado das submissões por faculdade, identifica atrasos e valida conteúdos.
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Faculdade</th>
            <th>Total</th>
            <th>Pendentes</th>
            <th>Validadas</th>
            <th>Rejeitadas</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `));
  }

  if (state.tab === "ACTIVIDADES"){
    root.appendChild(el(`
      <div class="callout" style="margin-bottom:12px;">
        <div class="callout__title">Validação</div>
        <div class="callout__text">
          Para cada actividade, a Direcção Científica pode <b>validar</b> ou <b>rejeitar</b>, registando observações.
        </div>
      </div>
    `));
    root.appendChild(renderTabelaActividades(actividades, { modo: "DIRECCAO" }));
  }

  if (state.tab === "RELATORIOS"){
    root.appendChild(renderRelatorios({ ano }));
  }
}

function renderFormNovaActividade({ ano, faculdadeId }){
  const wrap = el(`
    <div class="callout" style="margin-bottom:12px;">
      <div class="callout__title">Nova actividade</div>
      <div class="callout__text">
        Registe actividades ao longo do ano. Inclua evidências (links) para facilitar a validação e auditoria.
      </div>

      <div style="margin-top:12px;" class="grid">
        <div class="grid" style="grid-template-columns: 1fr 1fr; gap:12px;">
          <div class="field">
            <label class="label">Categoria</label>
            <select class="input" id="cat">
              <option>Pesquisa</option>
              <option>Extensão</option>
              <option>Inovação</option>
              <option>Evento Científico</option>
              <option>Publicação Científica</option>
              <option>Pós-graduação</option>
              <option>Cooperação</option>
              <option>Formação</option>
            </select>
          </div>
          <div class="field">
            <label class="label">Período</label>
            <select class="input" id="per">
              <option value="T1">T1</option>
              <option value="T2">T2</option>
              <option value="T3">T3</option>
              <option value="T4">T4</option>
              <option value="ANUAL">ANUAL</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label class="label">Título</label>
          <input class="input" id="tit" placeholder="Ex.: Seminário sobre Governação Electrónica" />
        </div>

        <div class="field">
          <label class="label">Descrição (opcional)</label>
          <textarea class="input" id="desc" rows="3" placeholder="Breve resumo, resultados, participantes, etc."></textarea>
        </div>

        <div class="grid" style="grid-template-columns: 1fr 1fr; gap:12px;">
          <div class="field">
            <label class="label">Data de início (opcional)</label>
            <input class="input" id="di" type="date" />
          </div>
          <div class="field">
            <label class="label">Data de fim (opcional)</label>
            <input class="input" id="df" type="date" />
          </div>
        </div>

        <div class="field">
          <label class="label">Evidências (links) — um por linha</label>
          <textarea class="input" id="ev" rows="2" placeholder="https://drive.google.com/...\nhttps://exemplo.edu/..."></textarea>
        </div>

        <div class="row">
          <button class="btn btn--primary" id="btnCriar">Guardar actividade</button>
          <button class="btn btn--danger" id="btnLimpar">Limpar</button>
          <span class="hint">A actividade entra como <b>Pendente</b> para validação.</span>
        </div>
      </div>
    </div>
  `);

  wrap.querySelector("#btnCriar").addEventListener("click", () => {
    const cat = wrap.querySelector("#cat").value;
    const per = wrap.querySelector("#per").value;
    const tit = wrap.querySelector("#tit").value.trim();
    const desc = wrap.querySelector("#desc").value.trim();
    const di = wrap.querySelector("#di").value;
    const df = wrap.querySelector("#df").value;
    const ev = wrap.querySelector("#ev").value.split("\n").map(x => x.trim()).filter(Boolean);

    if (!tit){
      toast("Preencha o título da actividade.");
      return;
    }

    DB.addActividade({
      ano,
      faculdadeId,
      categoria: cat,
      periodo: per,
      titulo: tit,
      descricao: desc,
      dataInicio: di,
      dataFim: df,
      evidencias: ev,
      estado: "Submetida"
    });

    toast("Actividade guardada e submetida para validação.");
    render();
  });

  wrap.querySelector("#btnLimpar").addEventListener("click", () => {
    wrap.querySelector("#tit").value = "";
    wrap.querySelector("#desc").value = "";
    wrap.querySelector("#di").value = "";
    wrap.querySelector("#df").value = "";
    wrap.querySelector("#ev").value = "";
  });

  return wrap;
}

function renderTabelaActividades(actividades, { modo }){
  if (!actividades.length){
    return el(`
      <div class="empty">
        <div class="empty__icon">🗂️</div>
        <div class="empty__title">Sem registos</div>
        <div class="empty__text">Ainda não existem actividades registadas para os critérios seleccionados.</div>
      </div>
    `);
  }

  const rows = actividades.map(a => `
    <tr>
      <td>
        <b>${a.titulo}</b><br/>
        <span class="muted">${a.categoria} • ${a.periodo} • ${faculdadeNome(a.faculdadeId)}</span><br/>
        <span class="muted">Início: ${fmtDate(a.dataInicio)} • Fim: ${fmtDate(a.dataFim)}</span>
      </td>
      <td>${badgeEstadoValidacao(a.validacao?.estado)}</td>
      <td>
        <div class="muted">${(a.descricao || "—").slice(0, 180)}${(a.descricao||"").length>180?"…":""}</div>
        ${a.evidencias?.length ? `<div style="margin-top:8px;">${a.evidencias.map((u,i)=>`<div><a href="${u}" target="_blank" rel="noopener">Evidência ${i+1}</a></div>`).join("")}</div>` : `<div class="muted" style="margin-top:6px;">Sem evidências</div>`}
      </td>
      <td style="white-space:nowrap;">
        ${modo === "DIRECCAO" ? `
          <button class="btn btn--good" data-act="validar" data-id="${a.id}">Validar</button>
          <button class="btn btn--danger" data-act="rejeitar" data-id="${a.id}" style="margin-left:6px;">Rejeitar</button>
        ` : `
          <button class="btn btn--danger" data-act="apagar" data-id="${a.id}">Apagar</button>
        `}
      </td>
    </tr>
    ${a.validacao?.comentario ? `
      <tr>
        <td colspan="4" style="background: rgba(0,0,0,.10);">
          <span class="muted"><b>Observação:</b> ${a.validacao.comentario}</span>
        </td>
      </tr>
    ` : ``}
  `).join("");

  const table = el(`
    <table class="table">
      <thead>
        <tr>
          <th>Actividade</th>
          <th>Validação</th>
          <th>Descrição & evidências</th>
          <th>Acções</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `);

  table.querySelectorAll("button[data-act]").forEach(btn => {
    btn.addEventListener("click", () => {
      const act = btn.dataset.act;
      const id = btn.dataset.id;

      if (act === "apagar"){
        DB.deleteActividade(id);
        toast("Registo removido.");
        render();
        return;
      }

      if (act === "validar" || act === "rejeitar"){
        const comentario = prompt("Comentário (opcional) para registo/auditoria:", "");
        const estado = (act === "validar") ? "Validada" : "Rejeitada";
        DB.updateValidacao({ id, estado, comentario: comentario || "" });
        toast(`Actividade ${estado.toLowerCase()}.`);
        render();
      }
    });
  });

  return table;
}

function renderRelatorios({ ano, filtroFaculdadeId } = {}){
  const box = el(`
    <div class="callout" style="margin-bottom:12px;">
      <div class="callout__title">Relatórios</div>
      <div class="callout__text">
        Gere relatórios por período (T1–T4) e anual. No sistema real, isto alimentaria PDFs oficiais e dashboards.
      </div>

      <div class="grid" style="grid-template-columns: 1fr 1fr 1fr; gap:12px; margin-top:12px;">
        <div class="field">
          <label class="label">Período</label>
          <select class="input" id="relPeriodo">
            <option value="T1">T1</option>
            <option value="T2">T2</option>
            <option value="T3">T3</option>
            <option value="T4">T4</option>
            <option value="ANUAL" selected>ANUAL</option>
          </select>
        </div>
        <div class="field">
          <label class="label">Filtro de validação</label>
          <select class="input" id="relVal">
            <option value="TODOS" selected>Todos</option>
            <option value="Pendente">Pendentes</option>
            <option value="Validada">Validadas</option>
            <option value="Rejeitada">Rejeitadas</option>
          </select>
        </div>
        <div class="field">
          <label class="label">Acção</label>
          <button class="btn btn--primary" id="btnGerarRel">Gerar relatório (HTML)</button>
        </div>
      </div>
    </div>
  `);

  box.querySelector("#btnGerarRel").addEventListener("click", () => {
    const periodo = box.querySelector("#relPeriodo").value;
    const val = box.querySelector("#relVal").value;

    let acts = DB.listActividades({ ano, faculdadeId: filtroFaculdadeId });
    if (periodo !== "ANUAL") acts = acts.filter(a => a.periodo === periodo);
    if (val !== "TODOS") acts = acts.filter(a => (a.validacao?.estado || "Pendente") === val);

    const html = buildRelatorioHTML({ ano, periodo, filtroFaculdadeId, acts });
    downloadHTML(`relatorio_${ano}_${periodo}.html`, html);
    toast("Relatório gerado (ficheiro HTML descarregado).");
  });

  return box;
}

function buildRelatorioHTML({ ano, periodo, filtroFaculdadeId, acts }){
  const tituloInst = "Universidade — Direcção Científica";
  const tituloRel = `Relatório ${periodo === "ANUAL" ? "Anual" : "Periódico"} de Actividades Científicas`;
  const subt = filtroFaculdadeId ? `Faculdade: ${faculdadeNome(filtroFaculdadeId)}` : "Consolidação institucional (todas as faculdades)";
  const k = calcKPIs(acts);

  const rows = acts.map(a => `
    <tr>
      <td><b>${a.titulo}</b><br/><span style="color:#555">${a.categoria} • ${a.periodo} • ${faculdadeNome(a.faculdadeId)}</span></td>
      <td>${a.dataInicio || "—"}</td>
      <td>${a.dataFim || "—"}</td>
      <td>${a.validacao?.estado || "Pendente"}</td>
      <td>${(a.evidencias||[]).join("<br/>") || "—"}</td>
    </tr>
  `).join("");

  return `
<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${tituloRel} — ${ano}</title>
<style>
  body{ font-family: Arial, sans-serif; margin: 28px; color:#111; }
  .h1{ font-size: 18px; font-weight: 800; }
  .h2{ font-size: 14px; color:#333; margin-top:6px; }
  .meta{ margin-top: 10px; color:#444; }
  .kpis{ display:flex; gap:10px; margin: 14px 0 10px; flex-wrap:wrap; }
  .kpi{ border:1px solid #ddd; border-radius:10px; padding:10px 12px; min-width:140px; }
  .kpi small{ color:#666; display:block; }
  .kpi b{ font-size: 18px; }
  table{ width:100%; border-collapse:collapse; margin-top:10px; }
  th,td{ border-bottom:1px solid #e5e5e5; padding:10px; vertical-align:top; font-size: 13px; }
  th{ text-align:left; color:#333; background:#f7f7f7; }
  .foot{ margin-top: 18px; color:#555; font-size: 12px; }
</style>
</head>
<body>
  <div class="h1">${tituloInst}</div>
  <div class="h1">${tituloRel} — ${ano}</div>
  <div class="h2">${subt}</div>
  <div class="meta">Gerado automaticamente pelo SIGAC (protótipo) — ${new Date().toLocaleString("pt-PT")}</div>

  <div class="kpis">
    <div class="kpi"><small>Total</small><b>${k.total}</b></div>
    <div class="kpi"><small>Pendentes</small><b>${k.pend}</b></div>
    <div class="kpi"><small>Validadas</small><b>${k.val}</b></div>
    <div class="kpi"><small>Rejeitadas</small><b>${k.rej}</b></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Actividade</th>
        <th>Início</th>
        <th>Fim</th>
        <th>Validação</th>
        <th>Evidências</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="5">Sem registos para os critérios seleccionados.</td></tr>`}
    </tbody>
  </table>

  <div class="foot">
    Nota: No sistema final, este relatório seria exportado para PDF com cabeçalho institucional, assinaturas e numeração.
  </div>
</body>
</html>
  `.trim();
}

document.addEventListener("DOMContentLoaded", init);

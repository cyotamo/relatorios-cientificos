/* app.js — fluxo principal do protótipo */

const state = {
  sessao: null, // { perfil, ano, faculdadeId? }
  tab: "PLANIFICACAO", // PLANIFICACAO | PLANIFICADAS | EXECUTADAS | CANCELADAS | NAO_EXECUTADAS | RELATORIO
  filtrosDireccao: {
    ano: "",
    faculdadeId: "TODAS",
    categoria: "TODAS",
    periodo: "TODOS",
    pesquisa: ""
  }
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
    state.tab = "PLANIFICACAO";
  }

  if (perfil === "DIRECCAO"){
    state.sessao = { perfil, ano };
    state.tab = "PLANIFICADAS";
    state.filtrosDireccao = {
      ano: String(ano),
      faculdadeId: "TODAS",
      categoria: "TODAS",
      periodo: "TODOS",
      pesquisa: ""
    };
    $("statusSessao").textContent = `Sessão: Direcção Científica — ${ano}`;
  }

  render();
}

function faculdadeNome(id){
  return DB.listFaculdades().find(f => f.id === id)?.nome || id;
}

function estadoLabel(estado){
  switch (estado){
    case "Planificada": return "Planificada";
    case "Executada": return "Executada";
    case "Cancelada": return "Cancelada";
    case "NaoExecutada": return "Não executada";
    default: return "Planificada";
  }
}

function getCategorias(){
  return [
    "Pesquisa",
    "Extensão",
    "Inovação",
    "Evento Científico",
    "Publicação Científica",
    "Pós-graduação",
    "Cooperação",
    "Formação"
  ];
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
      ${state.sessao.perfil === "FACULDADE" ? `
        <div class="tab ${state.tab==="PLANIFICACAO"?"tab--active":""}" data-tab="PLANIFICACAO">Planificação</div>
      ` : ""}
      <div class="tab ${state.tab==="PLANIFICADAS"?"tab--active":""}" data-tab="PLANIFICADAS">Planificadas</div>
      <div class="tab ${state.tab==="EXECUTADAS"?"tab--active":""}" data-tab="EXECUTADAS">Executadas</div>
      <div class="tab ${state.tab==="CANCELADAS"?"tab--active":""}" data-tab="CANCELADAS">Canceladas</div>
      <div class="tab ${state.tab==="NAO_EXECUTADAS"?"tab--active":""}" data-tab="NAO_EXECUTADAS">Não executadas</div>
      <div class="tab ${state.tab==="RELATORIO"?"tab--active":""}" data-tab="RELATORIO">Relatório</div>
    </div>
  `);
  tabs.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => {
    state.tab = t.dataset.tab;
    render();
  }));
  root.appendChild(tabs);

  if (state.sessao.perfil === "DIRECCAO" && state.tab === "PLANIFICACAO"){
    state.tab = "PLANIFICADAS";
  }

  setHeader(tabTitle(state.tab), tabSubtitle(state.tab, state.sessao.perfil));

  if (state.sessao.perfil === "DIRECCAO"){
    renderDireccao(root);
  }else{
    renderFaculdade(root);
  }
}

function tabTitle(tab){
  switch (tab){
    case "PLANIFICACAO": return "Planificação";
    case "PLANIFICADAS": return "Planificadas";
    case "EXECUTADAS": return "Executadas";
    case "CANCELADAS": return "Canceladas";
    case "NAO_EXECUTADAS": return "Não executadas";
    case "RELATORIO": return "Relatório";
    default: return "Planificação";
  }
}

function tabSubtitle(tab, perfil){
  switch (tab){
    case "PLANIFICACAO":
      return "Registo de actividades anuais e calendarização.";
    case "PLANIFICADAS":
      return perfil === "DIRECCAO"
        ? "Monitoria institucional das actividades planificadas por faculdade."
        : "Gestão do plano: definir data de execução, cancelar ou reprogramar.";
    case "EXECUTADAS":
      return perfil === "DIRECCAO"
        ? "Consulta consolidada das actividades executadas."
        : "Registo de evidências e histórico de execução.";
    case "RELATORIO":
      return perfil === "DIRECCAO"
        ? "Relatórios institucionais consolidados por período e estado."
        : "Relatórios periódicos e anual por estado e por categoria.";
    case "CANCELADAS":
      return perfil === "DIRECCAO"
        ? "Consulta das actividades canceladas (todas as faculdades)."
        : "Histórico de actividades canceladas e opção de reabrir.";
    case "NAO_EXECUTADAS":
      return perfil === "DIRECCAO"
        ? "Monitoria de actividades não executadas (todas as faculdades)."
        : "Actividades não realizadas e opção de replanificar.";
    default:
      return "Registo de actividades anuais e calendarização.";
  }
}

function renderFaculdade(root){
  const { ano, faculdadeId } = state.sessao;
  const actividades = DB.listActividades({ ano, faculdadeId });
  const k = calcKPIs(actividades);

  root.appendChild(el(`
    <div class="kpis kpis--five">
      <div class="kpi"><div class="kpi__label">Total</div><div class="kpi__value">${k.total}</div></div>
      <div class="kpi"><div class="kpi__label">Planificadas</div><div class="kpi__value">${k.planificadas}</div></div>
      <div class="kpi"><div class="kpi__label">Executadas</div><div class="kpi__value">${k.executadas}</div></div>
      <div class="kpi"><div class="kpi__label">Não executadas</div><div class="kpi__value">${k.naoExecutadas}</div></div>
      <div class="kpi"><div class="kpi__label">Canceladas</div><div class="kpi__value">${k.canceladas}</div></div>
    </div>
  `));

  if (state.tab === "PLANIFICACAO"){
    root.appendChild(renderFormNovaActividade({ ano, faculdadeId }));
  }

  if (state.tab === "PLANIFICADAS"){
    const list = actividades.filter(a => a.estadoExecucao === "Planificada");
    root.appendChild(renderTabelaPlanificadas(list));
  }

  if (state.tab === "EXECUTADAS"){
    const list = actividades.filter(a => a.estadoExecucao === "Executada");
    root.appendChild(renderTabelaExecutadas(list));
  }

  if (state.tab === "CANCELADAS"){
    const list = actividades.filter(a => a.estadoExecucao === "Cancelada");
    root.appendChild(renderTabelaCanceladas(list));
  }

  if (state.tab === "NAO_EXECUTADAS"){
    const list = actividades.filter(a => a.estadoExecucao === "NaoExecutada");
    root.appendChild(renderTabelaNaoExecutadas(list));
  }

  if (state.tab === "RELATORIO"){
    root.appendChild(renderRelatorios({ ano, filtroFaculdadeId: faculdadeId, modoDireccao: false }));
  }
}

function renderDireccao(root){
  const anoBase = Number(state.filtrosDireccao.ano || state.sessao.ano);
  const actividadesAno = DB.listActividades({ ano: anoBase });
  const k = calcKPIs(actividadesAno);
  const totalParaExec = k.planificadas + k.executadas + k.naoExecutadas;
  const percentExecucao = totalParaExec ? ((k.executadas / totalParaExec) * 100).toFixed(1) : "0.0";

  root.appendChild(el(`
    <div class="monitoria">
      <div class="monitoria__header">
        <div>
          <div class="monitoria__title">Monitoria Institucional</div>
          <div class="monitoria__subtitle">Indicadores consolidados por ano lectivo.</div>
        </div>
        <div class="field monitoria__year">
          <label class="label">Ano</label>
          <input class="input" id="monitoriaAno" type="number" min="2000" max="2100" value="${anoBase}" />
        </div>
      </div>
      <div class="kpis kpis--monitoria">
        <div class="kpi"><div class="kpi__label">Total</div><div class="kpi__value">${k.total}</div></div>
        <div class="kpi"><div class="kpi__label">Executadas</div><div class="kpi__value">${k.executadas}</div></div>
        <div class="kpi"><div class="kpi__label">Não executadas</div><div class="kpi__value">${k.naoExecutadas}</div></div>
        <div class="kpi"><div class="kpi__label">Canceladas</div><div class="kpi__value">${k.canceladas}</div></div>
        <div class="kpi"><div class="kpi__label">Taxa de execução</div><div class="kpi__value">${percentExecucao}%</div></div>
      </div>
    </div>
  `));

  const resumo = renderResumoFaculdades(actividadesAno);
  root.appendChild(resumo);

  root.querySelector("#monitoriaAno").addEventListener("change", () => {
    state.filtrosDireccao.ano = root.querySelector("#monitoriaAno").value;
    render();
  });

  if (state.tab === "RELATORIO"){
    root.appendChild(renderRelatorios({ ano: anoBase, modoDireccao: true }));
    return;
  }

  const filtros = renderFiltrosDireccao({ ano: anoBase });
  root.appendChild(filtros);
  root.appendChild(renderTabelaDireccao());

  filtros.querySelectorAll("input, select").forEach(input => {
    input.addEventListener("change", () => {
      state.filtrosDireccao = {
        ano: filtros.querySelector("#filtroAno").value,
        faculdadeId: filtros.querySelector("#filtroFaculdade").value,
        categoria: filtros.querySelector("#filtroCategoria").value,
        periodo: filtros.querySelector("#filtroPeriodo").value,
        pesquisa: filtros.querySelector("#filtroPesquisa").value.trim()
      };
      render();
    });
  });
}

function renderResumoFaculdades(actividades){
  const facs = DB.listFaculdades();
  const map = groupByFaculdade(actividades);
  const rows = facs.map(f => {
    const acts = map.get(f.id) || [];
    const k = calcKPIs(acts);
    const totalParaExec = k.planificadas + k.executadas + k.naoExecutadas;
    const taxa = totalParaExec ? ((k.executadas / totalParaExec) * 100).toFixed(1) : "0.0";
    return `
      <tr>
        <td><b>${f.nome}</b></td>
        <td>${k.total}</td>
        <td>${k.executadas}</td>
        <td>${k.naoExecutadas}</td>
        <td>${k.canceladas}</td>
        <td>${taxa}%</td>
      </tr>
    `;
  }).join("");

  return el(`
    <div class="section">
      <div class="section__title">Resumo por faculdade</div>
      <table class="table">
        <thead>
          <tr>
            <th>Faculdade</th>
            <th>Total</th>
            <th>Executadas</th>
            <th>Não executadas</th>
            <th>Canceladas</th>
            <th>Taxa de execução</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="6">Sem registos no período seleccionado.</td></tr>`}
        </tbody>
      </table>
    </div>
  `);
}

function renderFiltrosDireccao({ ano }){
  const facs = DB.listFaculdades();
  const categorias = getCategorias();
  const f = state.filtrosDireccao;

  return el(`
    <div class="section section--filters">
      <div class="section__title">Tabela detalhada (actividades)</div>
      <div class="grid" style="grid-template-columns: repeat(5, 1fr); gap:12px; margin-top:12px;">
        <div class="field">
          <label class="label">Ano</label>
          <input class="input" id="filtroAno" type="number" min="2000" max="2100" value="${ano}" />
        </div>
        <div class="field">
          <label class="label">Faculdade</label>
          <select class="input" id="filtroFaculdade">
            <option value="TODAS">Todas</option>
            ${facs.map(fac => `<option value="${fac.id}" ${fac.id === f.faculdadeId ? "selected" : ""}>${fac.nome}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label class="label">Categoria</label>
          <select class="input" id="filtroCategoria">
            <option value="TODAS">Todas</option>
            ${categorias.map(cat => `<option ${cat === f.categoria ? "selected" : ""}>${cat}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label class="label">Período</label>
          <select class="input" id="filtroPeriodo">
            <option value="TODOS">Todos</option>
            <option value="T1" ${f.periodo === "T1" ? "selected" : ""}>T1</option>
            <option value="T2" ${f.periodo === "T2" ? "selected" : ""}>T2</option>
            <option value="T3" ${f.periodo === "T3" ? "selected" : ""}>T3</option>
            <option value="T4" ${f.periodo === "T4" ? "selected" : ""}>T4</option>
            <option value="ANUAL" ${f.periodo === "ANUAL" ? "selected" : ""}>ANUAL</option>
          </select>
        </div>
        <div class="field">
          <label class="label">Pesquisar título</label>
          <input class="input" id="filtroPesquisa" placeholder="Ex.: conferência, jornada, artigo..." value="${f.pesquisa}" />
        </div>
      </div>
    </div>
  `);
}

function renderTabelaDireccao(){
  const filtros = state.filtrosDireccao;
  const ano = Number(filtros.ano || state.sessao.ano);
  let list = DB.listActividades({ ano });

  if (filtros.faculdadeId !== "TODAS"){
    list = list.filter(a => a.faculdadeId === filtros.faculdadeId);
  }
  if (filtros.categoria !== "TODAS"){
    list = list.filter(a => a.categoria === filtros.categoria);
  }
  if (filtros.periodo !== "TODOS"){
    list = list.filter(a => a.periodo === filtros.periodo);
  }
  if (filtros.pesquisa){
    const q = filtros.pesquisa.toLowerCase();
    list = list.filter(a => a.titulo.toLowerCase().includes(q));
  }

  if (state.tab === "PLANIFICADAS"){
    list = list.filter(a => a.estadoExecucao === "Planificada");
  }
  if (state.tab === "EXECUTADAS"){
    list = list.filter(a => a.estadoExecucao === "Executada");
  }
  if (state.tab === "CANCELADAS"){
    list = list.filter(a => a.estadoExecucao === "Cancelada");
  }
  if (state.tab === "NAO_EXECUTADAS"){
    list = list.filter(a => a.estadoExecucao === "NaoExecutada");
  }

  if (!list.length){
    return renderEmpty();
  }

  const rows = list.map(a => `
    <tr>
      <td><b>${faculdadeNome(a.faculdadeId)}</b></td>
      <td>
        <b>${a.titulo}</b><br/>
        <span class="muted">${a.categoria} • ${a.periodo}</span>
      </td>
      <td>${fmtDate(a.dataExecucao)}</td>
      <td>${(a.evidencias || []).length ? (a.evidencias || []).map(ev => `<a href="${ev}" target="_blank" rel="noopener">${ev}</a>`).join("<br/>") : "—"}</td>
      <td>${badgeEstadoExecucao(a.estadoExecucao)}</td>
    </tr>
  `).join("");

  const table = el(`
    <table class="table">
      <thead>
        <tr>
          <th>Faculdade</th>
          <th>Actividade</th>
          <th>Data de execução</th>
          <th>Evidências</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `);

  return table;
}

function renderFormNovaActividade({ ano, faculdadeId }){
  const wrap = el(`
    <div class="callout" style="margin-bottom:12px;">
      <div class="callout__title">Nova actividade</div>
      <div class="callout__text">
        Registe actividades ao longo do ano. Inclua evidências (links) para consolidar a memória institucional.
      </div>

      <div style="margin-top:12px;" class="grid">
        <div class="grid" style="grid-template-columns: 1fr 1fr; gap:12px;">
          <div class="field">
            <label class="label">Categoria</label>
            <select class="input" id="cat">
              ${getCategorias().map(cat => `<option>${cat}</option>`).join("")}
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
          <span class="hint">A actividade entra como <b>Planificada</b>.</span>
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
      estadoExecucao: "Planificada",
      dataExecucao: ""
    });

    toast("Actividade guardada como planificada.");
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

function renderTabelaPlanificadas(actividades){
  if (!actividades.length){
    return renderEmpty();
  }

  const rows = actividades.map(a => `
    <tr>
      <td>
        <b>${a.titulo}</b><br/>
        <span class="muted">${a.categoria} • ${a.periodo}</span><br/>
        <span class="muted">Início: ${fmtDate(a.dataInicio)} • Fim: ${fmtDate(a.dataFim)}</span>
      </td>
      <td>
        <input class="input" type="date" value="${a.dataExecucao || ""}" data-role="dataExecucao" data-id="${a.id}" />
      </td>
      <td>${badgeEstadoExecucao(a.estadoExecucao)}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn--good" data-act="executada" data-id="${a.id}">Executada</button>
        <button class="btn btn--warn" data-act="naoExecutada" data-id="${a.id}" style="margin-left:6px;">Não executada</button>
        <button class="btn btn--danger" data-act="cancelada" data-id="${a.id}" style="margin-left:6px;">Cancelar</button>
      </td>
    </tr>
  `).join("");

  const table = el(`
    <table class="table">
      <thead>
        <tr>
          <th>Actividade</th>
          <th>Data de execução</th>
          <th>Estado</th>
          <th>Acções</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `);

  table.querySelectorAll("input[data-role='dataExecucao']").forEach(input => {
    input.addEventListener("change", () => {
      DB.updateDataExecucao({ id: input.dataset.id, dataExecucao: input.value });
      toast("Data de execução actualizada.");
    });
  });

  table.querySelectorAll("button[data-act]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const act = btn.dataset.act;
      if (act === "executada"){
        DB.updateEstadoExecucao({ id, estadoExecucao: "Executada" });
        toast("Actividade marcada como executada.");
      }
      if (act === "naoExecutada"){
        DB.updateEstadoExecucao({ id, estadoExecucao: "NaoExecutada" });
        toast("Actividade marcada como não executada.");
      }
      if (act === "cancelada"){
        DB.updateEstadoExecucao({ id, estadoExecucao: "Cancelada" });
        toast("Actividade cancelada.");
      }
      render();
    });
  });

  return table;
}

function renderTabelaExecutadas(actividades){
  if (!actividades.length){
    return renderEmpty();
  }

  const rows = actividades.map(a => `
    <tr>
      <td>
        <b>${a.titulo}</b><br/>
        <span class="muted">${a.categoria} • ${a.periodo}</span>
      </td>
      <td>${fmtDate(a.dataExecucao)}</td>
      <td>
        <textarea class="input" rows="2" data-role="evidencias" data-id="${a.id}">${(a.evidencias || []).join("\n")}</textarea>
      </td>
      <td style="white-space:nowrap;">
        <button class="btn btn--primary" data-act="guardarEvidencias" data-id="${a.id}">Guardar evidências</button>
        <button class="btn btn--ghost" data-act="replanificar" data-id="${a.id}" style="margin-left:6px;">Reverter</button>
      </td>
    </tr>
  `).join("");

  const table = el(`
    <table class="table">
      <thead>
        <tr>
          <th>Actividade</th>
          <th>Data de execução</th>
          <th>Evidências</th>
          <th>Acções</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `);

  table.querySelectorAll("button[data-act]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const act = btn.dataset.act;

      if (act === "guardarEvidencias"){
        const textarea = table.querySelector(`textarea[data-role='evidencias'][data-id='${id}']`);
        const evidencias = textarea.value.split("\n").map(x => x.trim()).filter(Boolean);
        DB.setEvidencias({ id, evidencias });
        toast("Evidências actualizadas.");
      }

      if (act === "replanificar"){
        DB.updateEstadoExecucao({ id, estadoExecucao: "Planificada" });
        toast("Actividade replanificada.");
        render();
      }
    });
  });

  return table;
}

function renderTabelaCanceladas(actividades){
  if (!actividades.length){
    return renderEmpty();
  }

  const rows = actividades.map(a => `
    <tr>
      <td>
        <b>${a.titulo}</b><br/>
        <span class="muted">${a.categoria} • ${a.periodo}</span>
      </td>
      <td>${fmtDate(a.dataExecucao)}</td>
      <td>${badgeEstadoExecucao(a.estadoExecucao)}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn--ghost" data-act="reabrir" data-id="${a.id}">Reabrir</button>
      </td>
    </tr>
  `).join("");

  const table = el(`
    <table class="table">
      <thead>
        <tr>
          <th>Actividade</th>
          <th>Data de execução</th>
          <th>Estado</th>
          <th>Acções</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `);

  table.querySelectorAll("button[data-act='reabrir']").forEach(btn => {
    btn.addEventListener("click", () => {
      DB.updateEstadoExecucao({ id: btn.dataset.id, estadoExecucao: "Planificada" });
      toast("Actividade reaberta para planificação.");
      render();
    });
  });

  return table;
}

function renderTabelaNaoExecutadas(actividades){
  if (!actividades.length){
    return renderEmpty();
  }

  const rows = actividades.map(a => `
    <tr>
      <td>
        <b>${a.titulo}</b><br/>
        <span class="muted">${a.categoria} • ${a.periodo}</span>
      </td>
      <td>${fmtDate(a.dataExecucao)}</td>
      <td>${badgeEstadoExecucao(a.estadoExecucao)}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn--ghost" data-act="replanificar" data-id="${a.id}">Replanificar</button>
      </td>
    </tr>
  `).join("");

  const table = el(`
    <table class="table">
      <thead>
        <tr>
          <th>Actividade</th>
          <th>Data de execução</th>
          <th>Estado</th>
          <th>Acções</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `);

  table.querySelectorAll("button[data-act='replanificar']").forEach(btn => {
    btn.addEventListener("click", () => {
      DB.updateEstadoExecucao({ id: btn.dataset.id, estadoExecucao: "Planificada" });
      toast("Actividade replanificada.");
      render();
    });
  });

  return table;
}

function renderEmpty(){
  return el(`
    <div class="empty">
      <div class="empty__icon">🗂️</div>
      <div class="empty__title">Sem registos</div>
      <div class="empty__text">Ainda não existem actividades registadas para os critérios seleccionados.</div>
    </div>
  `);
}

function renderRelatorios({ ano, filtroFaculdadeId, modoDireccao } = {}){
  const facs = DB.listFaculdades();
  const categorias = getCategorias();
  const box = el(`
    <div class="callout" style="margin-bottom:12px;">
      <div class="callout__title">Relatórios</div>
      <div class="callout__text">
        Gere relatórios por período (T1–T4) e anual, com recorte por estado e categoria.
      </div>

      <div class="grid" style="grid-template-columns: repeat(${modoDireccao ? 6 : 5}, 1fr); gap:12px; margin-top:12px;">
        <div class="field">
          <label class="label">Ano</label>
          <input class="input" id="relAno" type="number" min="2000" max="2100" value="${ano}" />
        </div>
        ${modoDireccao ? `
          <div class="field">
            <label class="label">Faculdade</label>
            <select class="input" id="relFaculdade">
              <option value="TODAS">Todas</option>
              ${facs.map(f => `<option value="${f.id}">${f.nome}</option>`).join("")}
            </select>
          </div>
        ` : ""}
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
          <label class="label">Categoria</label>
          <select class="input" id="relCategoria">
            <option value="TODAS" selected>Todas</option>
            ${categorias.map(cat => `<option>${cat}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label class="label">Estado</label>
          <select class="input" id="relEstado">
            <option value="TODOS" selected>Todos</option>
            <option value="Planificada">Planificadas</option>
            <option value="Executada">Executadas</option>
            <option value="Cancelada">Canceladas</option>
            <option value="NaoExecutada">Não executadas</option>
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
    const estado = box.querySelector("#relEstado").value;
    const categoria = box.querySelector("#relCategoria").value;
    const anoRel = Number(box.querySelector("#relAno").value || ano);
    const faculdadeRel = modoDireccao ? box.querySelector("#relFaculdade").value : filtroFaculdadeId;

    let acts = DB.listActividades({ ano: anoRel, faculdadeId: faculdadeRel !== "TODAS" ? faculdadeRel : undefined });
    if (periodo !== "ANUAL") acts = acts.filter(a => a.periodo === periodo);
    if (estado !== "TODOS") acts = acts.filter(a => a.estadoExecucao === estado);
    if (categoria !== "TODAS") acts = acts.filter(a => a.categoria === categoria);

    const html = buildRelatorioHTML({
      ano: anoRel,
      periodo,
      filtroFaculdadeId: faculdadeRel !== "TODAS" ? faculdadeRel : null,
      acts,
      estado,
      categoria
    });
    downloadHTML(`relatorio_${anoRel}_${periodo}.html`, html);
    toast("Relatório gerado (ficheiro HTML descarregado).");
  });

  return box;
}

function buildRelatorioHTML({ ano, periodo, filtroFaculdadeId, acts, estado, categoria }){
  const tituloInst = "Universidade — Direcção Científica";
  const tituloRel = `Relatório ${periodo === "ANUAL" ? "Anual" : "Periódico"} de Actividades Científicas`;
  const subt = filtroFaculdadeId ? `Faculdade: ${faculdadeNome(filtroFaculdadeId)}` : "Consolidação institucional (todas as faculdades)";
  const subtEstado = estado && estado !== "TODOS" ? `Estado: ${estadoLabel(estado)}` : "Estado: Todos";
  const subtCategoria = categoria && categoria !== "TODAS" ? `Categoria: ${categoria}` : "Categoria: Todas";
  const k = calcKPIs(acts);
  const totalParaExec = k.planificadas + k.executadas + k.naoExecutadas;
  const percentExecucao = totalParaExec ? ((k.executadas / totalParaExec) * 100).toFixed(1) : "0.0";

  const rows = acts.map(a => `
    <tr>
      <td><b>${a.titulo}</b><br/><span style="color:#555">${a.categoria} • ${a.periodo} • ${faculdadeNome(a.faculdadeId)}</span></td>
      <td>${a.dataInicio || "—"}</td>
      <td>${a.dataFim || "—"}</td>
      <td>${a.dataExecucao || "—"}</td>
      <td>${estadoLabel(a.estadoExecucao)}</td>
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
  <div class="h2">${subtEstado}</div>
  <div class="h2">${subtCategoria}</div>
  <div class="meta">Gerado automaticamente pelo SIGAC (protótipo) — ${new Date().toLocaleString("pt-PT")}</div>

  <div class="kpis">
    <div class="kpi"><small>Total</small><b>${k.total}</b></div>
    <div class="kpi"><small>Planificadas</small><b>${k.planificadas}</b></div>
    <div class="kpi"><small>Executadas</small><b>${k.executadas}</b></div>
    <div class="kpi"><small>Não executadas</small><b>${k.naoExecutadas}</b></div>
    <div class="kpi"><small>Canceladas</small><b>${k.canceladas}</b></div>
  </div>
  <div class="meta"><b>Percentagem de execução:</b> ${percentExecucao}%</div>

  <table>
    <thead>
      <tr>
        <th>Actividade</th>
        <th>Início</th>
        <th>Fim</th>
        <th>Execução</th>
        <th>Estado</th>
        <th>Evidências</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="6">Sem registos para os critérios seleccionados.</td></tr>`}
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

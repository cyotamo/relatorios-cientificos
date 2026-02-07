/* ui.js — helpers de UI (renderização e formatação) */

function el(html){
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function fmtDate(iso){
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-PT");
}

function badgeEstadoExecucao(estado){
  const e = (estado || "").toLowerCase();
  if (e === "executada") return `<span class="badge badge--good">✔ Executada</span>`;
  if (e === "cancelada") return `<span class="badge badge--bad">✖ Cancelada</span>`;
  if (e === "naoexecutada") return `<span class="badge badge--warn">⚠ Não executada</span>`;
  return `<span class="badge badge--info">📌 Planificada</span>`;
}

function calcKPIs(actividades){
  const total = actividades.length;
  const planificadas = actividades.filter(a => a.estadoExecucao === "Planificada").length;
  const executadas = actividades.filter(a => a.estadoExecucao === "Executada").length;
  const canceladas = actividades.filter(a => a.estadoExecucao === "Cancelada").length;
  const naoExecutadas = actividades.filter(a => a.estadoExecucao === "NaoExecutada").length;
  return { total, planificadas, executadas, canceladas, naoExecutadas };
}

function groupByFaculdade(actividades){
  const map = new Map();
  for (const a of actividades){
    const k = a.faculdadeId;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(a);
  }
  return map;
}

function downloadJSON(filename, obj){
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type:"application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadHTML(filename, html){
  const blob = new Blob([html], { type:"text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

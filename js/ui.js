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

function badgeEstadoValidacao(estado){
  const e = (estado || "").toLowerCase();
  if (e === "validada") return `<span class="badge badge--good">✔ Validada</span>`;
  if (e === "rejeitada") return `<span class="badge badge--bad">✖ Rejeitada</span>`;
  return `<span class="badge badge--warn">⏳ Pendente</span>`;
}

function calcKPIs(actividades){
  const total = actividades.length;
  const pend = actividades.filter(a => (a.validacao?.estado || "Pendente") === "Pendente").length;
  const val = actividades.filter(a => a.validacao?.estado === "Validada").length;
  const rej = actividades.filter(a => a.validacao?.estado === "Rejeitada").length;
  return { total, pend, val, rej };
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

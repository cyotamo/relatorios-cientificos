/* db.js — camada de dados (localStorage)
   Objectivo: manter simples, demonstrável e robusto. */

const DB_KEY = "SIGAC_DB_V1";

function nowISO(){
  return new Date().toISOString();
}

function uuid(){
  // suficiente para demo
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function defaultDB(){
  const faculdades = [
    { id: "F01", nome: "Faculdade de Ciências Económicas e Empresariais" },
    { id: "F02", nome: "Faculdade de Engenharia e Tecnologias" },
    { id: "F03", nome: "Faculdade de Ciências de Saúde" },
    { id: "F04", nome: "Faculdade de Ciências Agrárias" },
    { id: "F05", nome: "Faculdade de Educação e Humanidades" },
    { id: "F06", nome: "Faculdade de Direito e Governação" },
    { id: "F07", nome: "Faculdade de Ciências Naturais" },
    { id: "F08", nome: "Faculdade de Letras e Comunicação" },
    { id: "F09", nome: "Faculdade de Arquitectura e Planeamento" }
  ];

  // algumas actividades de exemplo para a demo
  const actividades = [
    {
      id: uuid(),
      ano: 2026,
      faculdadeId: "F01",
      categoria: "Publicação Científica",
      titulo: "Artigo em revista indexada — Economia Regional",
      descricao: "Publicação sobre determinantes de produtividade e cadeias logísticas.",
      periodo: "T1",
      dataInicio: "2026-02-01",
      dataFim: "2026-03-30",
      dataExecucao: "",
      evidencias: ["https://exemplo.edu/publicacao/123"],
      estadoExecucao: "Planificada",
      criadoEm: nowISO(),
      actualizadoEm: nowISO()
    },
    {
      id: uuid(),
      ano: 2026,
      faculdadeId: "F03",
      categoria: "Evento Científico",
      titulo: "Jornadas de Saúde Pública (edição anual)",
      descricao: "Sessões temáticas, posters e comunicações orais.",
      periodo: "T2",
      dataInicio: "2026-05-10",
      dataFim: "2026-05-12",
      dataExecucao: "",
      evidencias: ["https://exemplo.edu/eventos/jsp-2026"],
      estadoExecucao: "Planificada",
      criadoEm: nowISO(),
      actualizadoEm: nowISO()
    }
  ];

  return { faculdades, actividades };
}

function loadDB(){
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) return defaultDB();
  try{
    return JSON.parse(raw);
  }catch(e){
    return defaultDB();
  }
}

function saveDB(db){
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function resetDB(){
  const db = defaultDB();
  saveDB(db);
  return db;
}

// API de dados
const DB = {
  get(){
    return loadDB();
  },
  reset(){
    return resetDB();
  },
  export(){
    return loadDB();
  },

  listFaculdades(){
    return loadDB().faculdades;
  },

  listActividades({ ano, faculdadeId } = {}){
    const db = loadDB();
    return db.actividades
      .filter(a => (ano ? a.ano === Number(ano) : true))
      .filter(a => (faculdadeId ? a.faculdadeId === faculdadeId : true))
      .sort((a,b) => (a.actualizadoEm < b.actualizadoEm ? 1 : -1));
  },

  addActividade(payload){
    const db = loadDB();
    const actividade = {
      id: uuid(),
      ano: Number(payload.ano),
      faculdadeId: payload.faculdadeId,
      categoria: payload.categoria,
      titulo: payload.titulo,
      descricao: payload.descricao || "",
      periodo: payload.periodo,
      dataInicio: payload.dataInicio || "",
      dataFim: payload.dataFim || "",
      dataExecucao: payload.dataExecucao || "",
      evidencias: (payload.evidencias || []).filter(Boolean),
      estadoExecucao: payload.estadoExecucao || "Planificada",
      criadoEm: nowISO(),
      actualizadoEm: nowISO()
    };
    db.actividades.unshift(actividade);
    saveDB(db);
    return actividade;
  },

  updateEstadoExecucao({ id, estadoExecucao }){
    const db = loadDB();
    const idx = db.actividades.findIndex(a => a.id === id);
    if (idx < 0) throw new Error("Actividade não encontrada.");
    db.actividades[idx].estadoExecucao = estadoExecucao;
    db.actividades[idx].actualizadoEm = nowISO();
    saveDB(db);
    return db.actividades[idx];
  },

  updateDataExecucao({ id, dataExecucao }){
    const db = loadDB();
    const idx = db.actividades.findIndex(a => a.id === id);
    if (idx < 0) throw new Error("Actividade não encontrada.");
    db.actividades[idx].dataExecucao = dataExecucao || "";
    db.actividades[idx].actualizadoEm = nowISO();
    saveDB(db);
    return db.actividades[idx];
  },

  setEvidencias({ id, evidencias }){
    const db = loadDB();
    const idx = db.actividades.findIndex(a => a.id === id);
    if (idx < 0) throw new Error("Actividade não encontrada.");
    db.actividades[idx].evidencias = (evidencias || []).filter(Boolean);
    db.actividades[idx].actualizadoEm = nowISO();
    saveDB(db);
    return db.actividades[idx];
  },

  deleteActividade(id){
    const db = loadDB();
    db.actividades = db.actividades.filter(a => a.id !== id);
    saveDB(db);
  }
};

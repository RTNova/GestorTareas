// ============================================================
// PANEL PRINCIPAL
// Muestra: listas (izquierda) + tareas de la lista seleccionada (derecha)
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function Panel() {
  // ---- Estado general ----
  const [usuario,       setUsuario]       = useState(null);
  const [listas,        setListas]        = useState([]);
  const [listaActiva,   setListaActiva]   = useState(null);
  const [tareas,        setTareas]        = useState([]);
  const [filtroStatus,  setFiltroStatus]  = useState('all');     // all | pending | completed
  const [filtroPrio,    setFiltroPrio]    = useState('all');     // all | low | medium | high
  const [ordenPrio,     setOrdenPrio]     = useState('ninguno'); // ninguno | asc | desc
  const [recordatorios, setRecordatorios] = useState([]);

  // Formulario nueva lista
  const [nombreLista, setNombreLista] = useState('');

  // Formulario nueva tarea
  const [textoTarea,  setTextoTarea]  = useState('');
  const [prioTarea,   setPrioTarea]   = useState('medium');
  const [fechaRecord, setFechaRecord] = useState('');

  // Mensajes
  const [loadingTareas, setLoadingTareas] = useState(false);
  const [errorTareas,   setErrorTareas]   = useState('');
  const [errorListas,   setErrorListas]   = useState('');

  // useRef para guardar el intervalo y poder limpiarlo cuando el usuario salga
  const intervaloRef = useRef(null);

  const navigate = useNavigate();

  // ---- Al cargar la página ----
  useEffect(() => {
    cargarUsuario();
    cargarListas();

    // Comprobamos recordatorios nada más entrar
    comprobarRecordatorios();

    // Y luego cada 25 segundos
    intervaloRef.current = setInterval(comprobarRecordatorios, 25000);

    // Limpiamos el intervalo cuando el usuario sale del panel
    return () => clearInterval(intervaloRef.current);
  }, []);

  // ---- Recargar tareas cuando cambia la lista activa o el filtro de estado ----
  useEffect(() => {
    if (listaActiva) cargarTareas();
  }, [listaActiva, filtroStatus]);

  // ================================================================
  // USUARIO
  // ================================================================

  async function cargarUsuario() {
    try {
      const res = await api.get('/auth/me');
      setUsuario(res.data);
    } catch {
      cerrarSesion();
    }
  }

  function cerrarSesion() {
    clearInterval(intervaloRef.current); // paramos los recordatorios al salir
    localStorage.removeItem('token');
    navigate('/login');
  }

  // ================================================================
  // LISTAS
  // ================================================================

  async function cargarListas() {
    try {
      const res = await api.get('/lists');
      setListas(res.data);
    } catch {
      setErrorListas('Error al cargar las listas');
    }
  }

  async function crearLista() {
    if (!nombreLista.trim()) return;
    setErrorListas('');
    try {
      const res = await api.post('/lists', { name: nombreLista.trim() });
      setListas([...listas, res.data]);
      setNombreLista('');
    } catch (err) {
      setErrorListas(err.response?.data?.error || 'Error al crear lista');
    }
  }

  async function renombrarLista(lista) {
    const nuevoNombre = prompt('Nuevo nombre:', lista.name);
    if (!nuevoNombre || nuevoNombre === lista.name) return;
    try {
      const res = await api.patch(`/lists/${lista._id}`, { name: nuevoNombre });
      setListas(listas.map(l => l._id === lista._id ? res.data : l));
    } catch (err) {
      alert(err.response?.data?.error || 'Error al renombrar');
    }
  }

  async function borrarLista(lista) {
    if (!confirm(`¿Borrar la lista "${lista.name}" y todas sus tareas?`)) return;
    try {
      await api.delete(`/lists/${lista._id}`);
      setListas(listas.filter(l => l._id !== lista._id));
      if (listaActiva?._id === lista._id) {
        setListaActiva(null);
        setTareas([]);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Error al borrar lista');
    }
  }

  // ================================================================
  // TAREAS
  // ================================================================

  async function cargarTareas() {
    setLoadingTareas(true);
    setErrorTareas('');
    try {
      const res = await api.get(`/tasks?listId=${listaActiva._id}&status=${filtroStatus}`);
      setTareas(res.data);
    } catch {
      setErrorTareas('Error al cargar las tareas');
    } finally {
      setLoadingTareas(false);
    }
  }

  async function crearTarea(e) {
    e.preventDefault();
    if (!listaActiva) { alert('Selecciona una lista primero'); return; }
    if (!textoTarea.trim()) return;
    setErrorTareas('');
    try {
      const body = {
        listId:      listaActiva._id,
        text:        textoTarea.trim(),
        priority:    prioTarea,
        createdFrom: 'web-react',
      };
      if (fechaRecord) body.reminderAt = fechaRecord;

      const res = await api.post('/tasks', body);
      setTareas([res.data, ...tareas]);
      setTextoTarea('');
      setFechaRecord('');
      setPrioTarea('medium');
    } catch (err) {
      setErrorTareas(err.response?.data?.error || 'Error al crear tarea');
    }
  }

  async function toggleCompleted(tarea) {
    try {
      const res = await api.patch(`/tasks/${tarea._id}`, { completed: !tarea.completed });
      setTareas(tareas.map(t => t._id === tarea._id ? res.data : t));
    } catch {
      alert('Error al actualizar la tarea');
    }
  }

  async function cambiarPrioridad(tarea, nuevaPrioridad) {
    try {
      const res = await api.patch(`/tasks/${tarea._id}`, { priority: nuevaPrioridad });
      setTareas(tareas.map(t => t._id === tarea._id ? res.data : t));
    } catch {
      alert('Error al cambiar la prioridad');
    }
  }

  async function borrarTarea(tarea) {
    if (!confirm('¿Borrar esta tarea?')) return;
    try {
      await api.delete(`/tasks/${tarea._id}`);
      setTareas(tareas.filter(t => t._id !== tarea._id));
    } catch {
      alert('Error al borrar la tarea');
    }
  }

  // ================================================================
  // FILTRO Y ORDEN POR PRIORIDAD (se hace en el frontend, sin llamar al servidor)
  // ================================================================

  // Valor numérico para poder ordenar: high=3, medium=2, low=1
  const valorPrio = { high: 3, medium: 2, low: 1 };

  const tareasFiltradas = tareas
    // 1. Filtrar por prioridad si el usuario eligió una concreta
    .filter(t => filtroPrio === 'all' || t.priority === filtroPrio)
    // 2. Ordenar si el usuario eligió un orden
    .sort((a, b) => {
      if (ordenPrio === 'desc') return valorPrio[b.priority] - valorPrio[a.priority]; // mayor primero
      if (ordenPrio === 'asc')  return valorPrio[a.priority] - valorPrio[b.priority]; // menor primero
      return 0; // sin orden -> mantener el orden original
    });

  // ================================================================
  // RECORDATORIOS
  // Comprobamos cada 20-30 seg, mostramos aviso, y al pulsar
  // "Entendido" llama a mark-sent para que no vuelva a aparecer.
  // ================================================================

  async function comprobarRecordatorios() {
    if (!localStorage.getItem('token')) return; // si no hay sesión, no hacemos nada
    try {
      const res = await api.get('/reminders/pending');
      if (res.data.length > 0) {
        setRecordatorios(res.data);
      }
    } catch {
      // Silencioso
    }
  }

  // Llamamos a mark-sent por cada tarea del modal para que no vuelva a salir el mismo recordatorio
  async function marcarTodosVistos() {
    // Llamamos a mark-sent por cada tarea del modal
    for (const tarea of recordatorios) {
      try {
        await api.post(`/reminders/${tarea._id}/mark-sent`);
      } catch {
        // Si falla uno continuamos con los demás
      }
    }
    setRecordatorios([]); // cerramos el modal
  }

  // ================================================================
  // RENDERIZADO
  // ================================================================

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* Barra superior */}
      <div className="topbar">
        <strong>📋 Gestión de Tareas</strong>
        <span>👤 Bienvenido, {usuario?.name || '...'}</span>
        <button onClick={cerrarSesion}>Cerrar sesión</button>
      </div>

      {/* ---- Modal de recordatorios ----
          Aparece automáticamente cuando hay recordatorios vencidos.
          Lo mostramos y llamamos a marcarTodosVistos al cerrar. */}
      {recordatorios.length > 0 && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>⏰ Recordatorio pendiente</h3>
            <p style={{ marginBottom: '10px', fontSize: '13px', color: '#666' }}>
              Las siguientes tareas tienen un recordatorio vencido:
            </p>
            {recordatorios.map(t => (
              <p key={t._id}>📌 {t.text}</p>
            ))}
            <button onClick={marcarTodosVistos}>Entendido</button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="panel">

        {/* ---- Sidebar: LISTAS ---- */}
        <div className="sidebar">
          <h3>Mis listas</h3>

          <input
            type="text"
            placeholder="Nombre de la lista..."
            value={nombreLista}
            onChange={e => setNombreLista(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && crearLista()}
          />
          <button className="btn-add" onClick={crearLista}>+ Crear lista</button>

          {errorListas && <p className="msg-error">{errorListas}</p>}

          {listas.length === 0 && (
            <p style={{ fontSize: '12px', color: '#aaa' }}>No hay listas todavía</p>
          )}

          {listas.map(lista => (
            <div
              key={lista._id}
              className={`list-item ${listaActiva?._id === lista._id ? 'active' : ''}`}
              onClick={() => setListaActiva(lista)}
            >
              <span>📁 {lista.name}</span>
              <button className="btn-icon" title="Renombrar"
                onClick={ev => { ev.stopPropagation(); renombrarLista(lista); }}>
                ✏️
              </button>
              <button className="btn-icon" title="Borrar"
                onClick={ev => { ev.stopPropagation(); borrarLista(lista); }}>
                🗑️
              </button>
            </div>
          ))}
        </div>

        {/* ---- Zona de TAREAS ---- */}
        <div className="main-content">

          {!listaActiva ? (
            <p className="msg-empty">← Selecciona una lista para ver sus tareas</p>
          ) : (
            <>
              <h2>📁 Lista {listaActiva.name}</h2>

              {/* Formulario nueva tarea */}
              <form className="task-form" onSubmit={crearTarea}>
                <input
                  type="text"
                  placeholder="Nueva tarea..."
                  value={textoTarea}
                  onChange={e => setTextoTarea(e.target.value)}
                  required
                />

                {/* Selector de prioridad con etiqueta encima */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '11px', color: '#888' }}>Prioridad</label>
                  <select value={prioTarea} onChange={e => setPrioTarea(e.target.value)}>
                    <option value="low">🟢 Baja</option>
                    <option value="medium">🟡 Media</option>
                    <option value="high">🔴 Alta</option>
                  </select>
                </div>

                {/* Selector de fecha con etiqueta encima */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '11px', color: '#888' }}>Recordatorio (opcional)</label>
                  <input
                    type="datetime-local"
                    value={fechaRecord}
                    onChange={e => setFechaRecord(e.target.value)}
                  />
                </div>

                <button type="submit" style={{ alignSelf: 'flex-end' }}>Añadir</button>
              </form>

              {errorTareas && <p className="msg-error">{errorTareas}</p>}

              {/* ---- Filtros ---- */}
              <div className="filters">

                {/* Filtro por estado */}
                {['all', 'pending', 'completed'].map(f => (
                  <button
                    key={f}
                    className={filtroStatus === f ? 'active' : ''}
                    onClick={() => setFiltroStatus(f)}
                  >
                    {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Completadas'}
                  </button>
                ))}

                <span style={{ color: '#ccc', margin: '0 4px' }}>|</span>

                {/* Filtro por prioridad */}
                {[
                  { valor: 'all',    texto: 'Todas' },
                  { valor: 'high',   texto: '🔴 Alta' },
                  { valor: 'medium', texto: '🟡 Media' },
                  { valor: 'low',    texto: '🟢 Baja' },
                ].map(f => (
                  <button
                    key={f.valor}
                    className={filtroPrio === f.valor ? 'active' : ''}
                    onClick={() => setFiltroPrio(f.valor)}
                  >
                    {f.texto}
                  </button>
                ))}

                <span style={{ color: '#ccc', margin: '0 4px' }}>|</span>

                {/* Ordenar por prioridad */}
                <select
                  value={ordenPrio}
                  onChange={e => setOrdenPrio(e.target.value)}
                  style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }}
                >
                  <option value="ninguno">Sin ordenar</option>
                  <option value="desc">Mayor prioridad primero</option>
                  <option value="asc">Menor prioridad primero</option>
                </select>
              </div>

              {/* Lista de tareas */}
              {loadingTareas && <p className="msg-loading">Cargando...</p>}

              {!loadingTareas && tareasFiltradas.length === 0 && (
                <p className="msg-empty">No hay tareas disponibles, ¡buen trabajo!</p>
              )}

              {tareasFiltradas.map(tarea => (
                <div
                  key={tarea._id}
                  className={`task-card priority-${tarea.priority} ${tarea.completed ? 'completed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={tarea.completed}
                    onChange={() => toggleCompleted(tarea)}
                  />

                  <div className="task-info">
                    <div className="task-text">{tarea.text}</div>
                    <div className="task-meta">
                      <span className={`badge ${tarea.priority}`}>
                        {tarea.priority === 'low' ? 'Baja' : tarea.priority === 'medium' ? 'Media' : 'Alta'}
                      </span>
                      {tarea.reminderAt && (
                        <span>⏰ {new Date(tarea.reminderAt).toLocaleString('es-ES')}</span>
                      )}
                    </div>
                  </div>

                  <div className="task-actions">
                    <select
                      value={tarea.priority}
                      onChange={e => cambiarPrioridad(tarea, e.target.value)}
                      style={{ fontSize: '11px', padding: '3px' }}
                    >
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                    </select>
                    <button className="btn-delete" onClick={() => borrarTarea(tarea)}>
                      Borrar
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Panel;
// ============================================================
// PANEL PRINCIPAL
// Muestra: listas (izquierda) + tareas de la lista seleccionada (derecha)
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function Panel() {
  // ---- Estado general ----
  const [usuario,       setUsuario]       = useState(null);
  const [listas,        setListas]        = useState([]);
  const [listaActiva,   setListaActiva]   = useState(null);  // lista seleccionada
  const [tareas,        setTareas]        = useState([]);
  const [filtroStatus,  setFiltroStatus]  = useState('all'); // all | pending | completed
  const [recordatorios, setRecordatorios] = useState([]);    // recordatorios pendientes

  // Estado para formulario nueva lista
  const [nombreLista, setNombreLista] = useState('');

  // Estado para formulario nueva tarea
  const [textoTarea,    setTextoTarea]    = useState('');
  const [prioTarea,     setPrioTarea]     = useState('medium');
  const [fechaRecord,   setFechaRecord]   = useState('');

  // Mensajes
  const [loadingTareas,  setLoadingTareas]  = useState(false);
  const [errorTareas,    setErrorTareas]    = useState('');
  const [errorListas,    setErrorListas]    = useState('');

  const navigate = useNavigate();

  // ---- Al cargar, obtener datos del usuario y sus listas ----
  useEffect(() => {
    cargarUsuario();
    cargarListas();
  }, []);

  // ---- Cuando cambia la lista activa o el filtro, recargar tareas ----
  useEffect(() => {
    if (listaActiva) cargarTareas();
  }, [listaActiva, filtroStatus]);

  // ---- Comprobar recordatorios cada 25 segundos ----
  useEffect(() => {
    const intervalo = setInterval(comprobarRecordatorios, 25000);
    return () => clearInterval(intervalo); // limpiar al desmontar
  }, []);

  // ================================================================
  // FUNCIONES DE USUARIO
  // ================================================================

  async function cargarUsuario() {
    try {
      const res = await api.get('/auth/me');
      setUsuario(res.data);
    } catch {
      // Si falla (token inválido), mandar al login
      cerrarSesion();
    }
  }

  function cerrarSesion() {
    localStorage.removeItem('token');
    navigate('/login');
  }

  // ================================================================
  // FUNCIONES DE LISTAS
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
      // Actualizamos la lista en el estado local
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
      // Si era la activa, limpiar
      if (listaActiva?._id === lista._id) {
        setListaActiva(null);
        setTareas([]);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Error al borrar lista');
    }
  }

  // ================================================================
  // FUNCIONES DE TAREAS
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
      setTareas([res.data, ...tareas]); // añadir al principio
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
  // RECORDATORIOS
  // ================================================================

  const comprobarRecordatorios = useCallback(async () => {
    try {
      const res = await api.get('/reminders/pending');
      if (res.data.length > 0) {
        setRecordatorios(res.data);
      }
    } catch {
      // Silencioso: si falla no molestamos al usuario
    }
  }, []);

  async function marcarRecordatorioVisto(tareaId) {
    try {
      await api.post(`/reminders/${tareaId}/mark-sent`);
      // Quitamos ese recordatorio del modal
      setRecordatorios(recordatorios.filter(t => t._id !== tareaId));
    } catch {
      // Igualmente lo quitamos de la vista
      setRecordatorios(recordatorios.filter(t => t._id !== tareaId));
    }
  }

  // ================================================================
  // RENDERIZADO
  // ================================================================

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* Barra superior */}
      <div className="topbar">
        <strong>📋 Gestión de Tareas</strong>
        <span>👤 {usuario?.name || '...'}</span>
        <button onClick={cerrarSesion}>Cerrar sesión</button>
      </div>

      {/* Modal de recordatorios */}
      {recordatorios.length > 0 && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>⏰ Recordatorio</h3>
            {recordatorios.map(t => (
              <p key={t._id}>📌 {t.text}</p>
            ))}
            <button onClick={() => {
              // Marcar todos como vistos
              recordatorios.forEach(t => marcarRecordatorioVisto(t._id));
            }}>
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="panel">

        {/* ---- Sidebar: LISTAS ---- */}
        <div className="sidebar">
          <h3>Mis listas</h3>

          {/* Formulario nueva lista */}
          <input
            type="text"
            placeholder="Nombre de la lista..."
            value={nombreLista}
            onChange={e => setNombreLista(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && crearLista()}
          />
          <button className="btn-add" onClick={crearLista}>+ Crear lista</button>

          {errorListas && <p className="msg-error">{errorListas}</p>}

          {/* Lista de listas */}
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
              <h2>📁 {listaActiva.name}</h2>

              {/* Formulario nueva tarea */}
              <form className="task-form" onSubmit={crearTarea}>
                <input
                  type="text"
                  placeholder="Nueva tarea..."
                  value={textoTarea}
                  onChange={e => setTextoTarea(e.target.value)}
                  required
                />
                <select value={prioTarea} onChange={e => setPrioTarea(e.target.value)}>
                  <option value="low">🟢 Baja</option>
                  <option value="medium">🟡 Media</option>
                  <option value="high">🔴 Alta</option>
                </select>
                <input
                  type="datetime-local"
                  value={fechaRecord}
                  onChange={e => setFechaRecord(e.target.value)}
                  title="Recordatorio (opcional)"
                />
                <button type="submit">Añadir</button>
              </form>

              {errorTareas && <p className="msg-error">{errorTareas}</p>}

              {/* Filtros */}
              <div className="filters">
                {['all', 'pending', 'completed'].map(f => (
                  <button
                    key={f}
                    className={filtroStatus === f ? 'active' : ''}
                    onClick={() => setFiltroStatus(f)}
                  >
                    {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Completadas'}
                  </button>
                ))}
              </div>

              {/* Lista de tareas */}
              {loadingTareas && <p className="msg-loading">Cargando...</p>}

              {!loadingTareas && tareas.length === 0 && (
                <p className="msg-empty">No hay tareas en esta lista</p>
              )}

              {tareas.map(tarea => (
                <div
                  key={tarea._id}
                  className={`task-card priority-${tarea.priority} ${tarea.completed ? 'completed' : ''}`}
                >
                  {/* Checkbox para marcar completada */}
                  <input
                    type="checkbox"
                    checked={tarea.completed}
                    onChange={() => toggleCompleted(tarea)}
                  />

                  {/* Info de la tarea */}
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

                  {/* Acciones */}
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

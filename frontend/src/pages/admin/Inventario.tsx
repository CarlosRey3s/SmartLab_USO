import React, { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, Plus, MoreVertical, CheckCircle, ArrowUp, ArrowDown, Monitor, Bell, Package, CalendarClock, History } from 'lucide-react';
import '../../css/inventario.css';
import '../../css/usuarios.css';
import { AgregarItemModal } from '../../components/shared/AgregarItemModal';
import { ReportarItemModal } from '../../components/shared/ReportarItemModal';
import { inventarioService } from '../../services/inventario.service';
import { laboratoriosService } from '../../services/laboratorios.service';
import { alertasService } from '../../services/alertas.service';
import * as actividadesService from '../../services/actividades.service';
import { ConfirmModal } from '../../components/confirm-modal/ConfirmModal';
import { customToast } from '../../components/custom-toast/CustomToast';
import { useAuth } from '../../context/AuthContext';
import { isReadOnlyView } from '../../utils/roleGuard';
import * as XLSX from 'xlsx';

export interface InventoryItem {
  id: string | number;
  nombre: string;
  codigo_interno: string;
  categoria: string;
  laboratorio_id: string | number;
  laboratorio_nombre?: string;
  cantidad_actual: number;
  stock_minimo: number;
  ubicacion_fisica: string;
  unidad_medida: string;
  tipo_control: string;
  numero_cas?: string;
  imagen_url?: string;
}

export const InventarioView: React.FC = () => {
  const { user } = useAuth();
  const readOnly = user ? isReadOnlyView(user.rol as any) : false;
  const [activeTab, setActiveTab] = useState<'inventario' | 'reservas' | 'alertas'>('inventario');
  const [showHistorialReservas, setShowHistorialReservas] = useState(false);
  const [historialReservasList, setHistorialReservasList] = useState<any[]>([]);
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [alertasStartDate, setAlertasStartDate] = useState('');
  const [alertasEndDate, setAlertasEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | number | null>(null);
  const [reportStatusFilter, setReportStatusFilter] = useState('Todos los Estados');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editData, setEditData] = useState<InventoryItem | undefined>(undefined);
  
  // Estados para los filtros avanzados
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterLab, setFilterLab] = useState('');
  const [filterState, setFilterState] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Estado para modal de confirmación de eliminación
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | number | null>(null);

  // Estados para Modal de Reporte
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [itemToReport, setItemToReport] = useState<InventoryItem | null>(null);

  // Estados para Modal de Confirmación de Actividades
  const [isEntregarModalOpen, setIsEntregarModalOpen] = useState(false);
  const [actividadAEntregar, setActividadAEntregar] = useState<string | number | null>(null);
  
  const [isDevolverModalOpen, setIsDevolverModalOpen] = useState(false);
  const [actividadADevolver, setActividadADevolver] = useState<string | number | null>(null);

  // Ref para el dropdown de filtros
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    
    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen]);

  // Datos de la pestaña Inventario traídos de la base de datos
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [laboratoriosList, setLaboratoriosList] = useState<any[]>([]);
  const [reservasList, setReservasList] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);

  useEffect(() => {
    cargarInventario();
    cargarLaboratorios();
    cargarAlertas();
    cargarReservas();
  }, []);

  const cargarReservas = async () => {
    try {
      const data = await actividadesService.obtenerTodasSolicitudes();
      
      const ahora = new Date();
      
      // Filtramos las reservas
      const reservasEquipos = data.filter((r: any) => {
        // 1. Debe tener equipos
        if (!r.inventario || r.inventario.length === 0) return false;
        
        // 2. Ocultar completadas y rechazadas
        if (r.estado_reserva === 'completada' || r.estado_reserva === 'rechazada' || r.estado_reserva === 'cancelada') return false;

        // 3. Si ya se entregó el equipo, DEBE mostrarse para poder devolverlo, sin importar la hora
        if (r.estado_reserva === 'entregado') return true;

        // 4. Si está "aprobada" esperando entrega, solo aparece cuando falten 15 minutos o menos para empezar
        const inicio = new Date(r.fecha_hora_inicio);
        const margenInicio = new Date(inicio.getTime() - 15 * 60000); // 15 minutos de gracia
        
        return ahora >= margenInicio;
      });

      const historialEquipos = data.filter((r: any) => {
        return r.inventario && r.inventario.length > 0 && (r.estado_reserva === 'completada' || r.estado_reserva === 'rechazada' || r.estado_reserva === 'cancelada' || r.estado_reserva === 'entregado');
      });

      setReservasList(reservasEquipos);
      setHistorialReservasList(historialEquipos);
    } catch (error) {
      console.error("Error al cargar reservas:", error);
    }
  };

  const cargarLaboratorios = async () => {
    try {
      const result = await laboratoriosService.getLaboratorios();
      if (result && result.success && result.data) {
        setLaboratoriosList(result.data);
      } else if (result && (result as any).data) {
        setLaboratoriosList((result as any).data);
      }
    } catch (error) {
      console.error("Error al cargar laboratorios:", error);
    }
  };

  const cargarInventario = async () => {
    try {
      const result = await inventarioService.getInventario();
      if (result && result.status === 'success') {
        setItems(result.data);
      } else if (result && result.data) {
        setItems(result.data);
      }
    } catch (error) {
      console.error("Error al cargar inventario:", error);
    }
  };

  const cargarAlertas = async () => {
    try {
      const result = await alertasService.getAlertas();
      if (result && result.status === 'success') {
        setAlertas(result.data);
      } else if (result && result.data) {
        setAlertas(result.data);
      }
    } catch (error) {
      console.error("Error al cargar alertas:", error);
    }
  };

  const handleEntregarEquipos = (actividadId: string | number) => {
    setActividadAEntregar(actividadId);
    setIsEntregarModalOpen(true);
  };

  const confirmEntregar = async () => {
    if (!actividadAEntregar) return;
    try {
      await actividadesService.entregarEquipos(actividadAEntregar);
      customToast.success('Éxito', 'Equipos entregados con éxito, el inventario ha sido descontado.');
      cargarReservas();
      cargarInventario(); // Refrescar inventario físico
    } catch (error: any) {
      customToast.error('Error', error.message || 'Error al entregar los equipos');
    }
    setIsEntregarModalOpen(false);
    setActividadAEntregar(null);
  };

  const handleDevolverEquipos = (actividadId: string | number) => {
    setActividadADevolver(actividadId);
    setIsDevolverModalOpen(true);
  };

  const confirmDevolver = async () => {
    if (!actividadADevolver) return;
    // OJO: Podríamos enviar un reporteDano si lo integramos a un modal de devolución,
    // pero por simplicidad inicial lo enviamos vacío para devolver el stock normal.
    try {
      await actividadesService.devolverEquipos(actividadADevolver);
      customToast.success('Éxito', 'Equipos devueltos exitosamente, el inventario ha sido restablecido.');
      cargarReservas();
      cargarInventario();
    } catch (error: any) {
      customToast.error('Error', error.message || 'Error al devolver los equipos');
    }
    setIsDevolverModalOpen(false);
    setActividadADevolver(null);
  };

  const filteredHistorial = historialReservasList.filter(r => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const hasItemMatch = r.inventario?.some((i: any) => i.nombre?.toLowerCase().includes(term));
      const hasUserMatch = r.solicitante_nombre?.toLowerCase().includes(term) || r.solicitante_apellido?.toLowerCase().includes(term);
      if (!hasItemMatch && !hasUserMatch) return false;
    }

    if (historyStartDate && new Date(r.fecha_hora_inicio) < new Date(historyStartDate + 'T00:00:00')) return false;
    if (historyEndDate) {
      const end = new Date(historyEndDate + 'T23:59:59');
      if (new Date(r.fecha_hora_inicio) > end) return false;
    }
    return true;
  });

  const filteredReservasList = reservasList.filter(r => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const hasItemMatch = r.inventario?.some((i: any) => i.nombre?.toLowerCase().includes(term));
      const hasUserMatch = r.solicitante_nombre?.toLowerCase().includes(term) || r.solicitante_apellido?.toLowerCase().includes(term);
      if (!hasItemMatch && !hasUserMatch) return false;
    }
    return true;
  });

  const exportToExcel = () => {
    if (filteredHistorial.length === 0) {
      customToast.info('Aviso', 'No hay datos para exportar en este rango de fechas');
      return;
    }

    const excelData = filteredHistorial.map(r => ({
      'ID Reserva': r.id,
      'Solicitante': `${r.solicitante_nombre} ${r.solicitante_apellido}`,
      'Rol': r.solicitante_rol,
      'Fecha Inicio': new Date(r.fecha_hora_inicio).toLocaleString(),
      'Fecha Fin': new Date(r.fecha_hora_fin).toLocaleString(),
      'Estado': r.estado_reserva.toUpperCase(),
      'Equipos': r.inventario?.map((i: any) => `${i.cantidad}x ${i.nombre}`).join(', ') || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial_Prestamos");
    XLSX.writeFile(workbook, "Historial_Prestamos.xlsx");
  };

  const filteredAlertas = alertas.filter((alerta) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const hasItemMatch = alerta.item_nombre?.toLowerCase().includes(term) || alerta.item_codigo_interno?.toLowerCase().includes(term) || alerta.item_codigo?.toLowerCase().includes(term);
      if (!hasItemMatch) return false;
    }

    // Filtro por estado
    let validState = true;
    if (reportStatusFilter !== 'Todos los Estados') {
      validState = alerta.estado?.toLowerCase() === reportStatusFilter.toLowerCase();
    }
    
    // Filtro por fecha
    let validDate = true;
    if (alertasStartDate && new Date(alerta.fecha_reporte) < new Date(alertasStartDate + 'T00:00:00')) {
      validDate = false;
    }
    if (alertasEndDate) {
      const end = new Date(alertasEndDate + 'T23:59:59');
      if (new Date(alerta.fecha_reporte) > end) {
        validDate = false;
      }
    }

    return validState && validDate;
  });

  const exportAlertasToExcel = () => {
    if (filteredAlertas.length === 0) {
      customToast.info('Aviso', 'No hay alertas para exportar en este rango de fechas');
      return;
    }

    const excelData = filteredAlertas.map(a => ({
      'ID': a.id,
      'Ítem Afectado': `${a.item_nombre} (${a.item_codigo_interno})`,
      'Laboratorio': a.laboratorio_nombre,
      'Problema': a.tipo_problema,
      'Descripción': a.descripcion,
      'Cantidad': a.cantidad_afectada,
      'Reportado Por': a.reportado_por_nombre ? `${a.reportado_por_nombre} ${a.reportado_por_apellido}` : 'Sistema Automático',
      'Fecha Reporte': new Date(a.fecha_reporte).toLocaleString(),
      'Estado': a.estado,
      'Fecha Resolución': a.fecha_resolucion ? new Date(a.fecha_resolucion).toLocaleString() : 'N/A',
      'Resuelto Por': a.resuelto_por_nombre ? `${a.resuelto_por_nombre} ${a.resuelto_por_apellido}` : 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Alertas_Incidencias");
    XLSX.writeFile(workbook, "Alertas_Incidencias.xlsx");
  };

  // Resto de métodos...

  const handleDataChange = () => {
    cargarInventario();
    cargarAlertas();
  };

  const handleEdit = (item: InventoryItem) => {
    setEditData(item);
    setIsAddModalOpen(true);
    setActiveMenu(null);
  };

  const handleReport = (item: InventoryItem) => {
    setItemToReport(item);
    setIsReportModalOpen(true);
    setActiveMenu(null);
  };

  const handleDelete = (id: string | number) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
    setActiveMenu(null);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await inventarioService.eliminarItem(itemToDelete);
      customToast.success("Ítem eliminado", "El ítem se ha eliminado exitosamente");
      cargarInventario();
    } catch (error: any) {
      console.error('Error al eliminar:', error);
      customToast.error("Error", error.message || 'Error al eliminar el ítem');
    }
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const openAddModal = () => {
    setEditData(undefined);
    setIsAddModalOpen(true);
  };

  // Filtrar laboratorios por rol
  const laboratoriosDelUsuario = user?.rol === 'coordinador'
    ? laboratoriosList.filter(lab => lab.coordinador_id === user.id)
    : laboratoriosList;

  // Filtrar items por rol
  const itemsDelUsuario = user?.rol === 'coordinador'
    ? items.filter(item => {
        const lab = laboratoriosList.find(l => l.id === item.laboratorio_id);
        return lab && lab.coordinador_id === user.id;
      })
    : items;

  // Computar valores únicos de laboratorios sumando todos los espacios reales de la BD (ya filtrados)
  const uniqueLabs = Array.from(new Set([
    ...laboratoriosDelUsuario.map(lab => lab.nombre),
    ...itemsDelUsuario.map(item => item.laboratorio_nombre || `Lab ID: ${item.laboratorio_id}`)
  ]));

  // Filtrar items
  const filteredItems = itemsDelUsuario.filter(item => {
    // 1. Search term
    const searchMatch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.codigo_interno.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Lab filter
    const labName = item.laboratorio_nombre || `Lab ID: ${item.laboratorio_id}`;
    const labMatch = filterLab ? labName === filterLab : true;
    
    // 3. State filter
    let estadoActual = 'Disponible';
    if (item.cantidad_actual === 0) estadoActual = 'Agotado';
    else if (item.cantidad_actual <= item.stock_minimo) estadoActual = 'Bajo Stock';
    
    const stateMatch = filterState ? estadoActual === filterState : true;

    return searchMatch && labMatch && stateMatch;
  }).sort((a, b) => {
    if (sortOrder === 'asc') {
      return Number(a.id) - Number(b.id);
    } else {
      return Number(b.id) - Number(a.id);
    }
  });

  // Funciones para manejar estados de alertas
  const cambiarEstadoAlerta = async (id: number | string, estado: string) => {
    const res = await alertasService.updateAlertaStatus(id, estado);
    if (res && res.status === 'success') {
      customToast.success(`Alerta marcada como ${estado}`);
      cargarAlertas(); // Recargar la tabla
    } else {
      customToast.error("No se pudo actualizar el estado de la alerta");
    }
  };

  const getReportStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'disponible': return 'badge-success';
      case 'agotado': return 'badge-danger';
      case 'bajo_stock': return 'badge-warning';
      case 'en_revision': return 'badge-warning';
      case 'pendiente': return 'badge-danger';
      case 'resuelto': return 'badge-success';
      case 'descartado': return 'badge-info';
      default: return 'badge-info';
    }
  };

  return (
    <div className="inventario-container">


      {/* ================= HEADER IDÉNTICO AL DE REPORTE Y COMENTARIOS ================= */}
      <div className="reports-header">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'inventario' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventario')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Package size={18} />
            Inventario
          </button>
          <button 
            className={`tab ${activeTab === 'reservas' ? 'active' : ''}`}
            onClick={() => setActiveTab('reservas')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <CalendarClock size={18} />
            Reservas de Equipos
          </button>
          <button 
            className={`tab ${activeTab === 'alertas' ? 'active' : ''}`}
            onClick={() => setActiveTab('alertas')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Bell size={18} />
            Alertas e Incidencias
          </button>
        </div>
      </div>

      {/* ================= CONTROLES / FILTROS DINÁMICOS ================= */}
      <div className="inventario-controls">
        <div className="search-inventory">
          <Search className="search-inventory-icon" size={16} />
          <input 
            type="text" 
            placeholder="Buscar en el Inventario" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>

          
          <div style={{ position: 'relative' }} ref={filterRef}>
            {activeTab === 'inventario' && (
              <button className="btn-filter" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                <SlidersHorizontal size={16} />
                <span>Filtros</span>
              </button>
            )}

            {activeTab === 'reservas' && (
              <button 
                className="btn-filter" 
                onClick={() => setShowHistorialReservas(!showHistorialReservas)}
                style={showHistorialReservas ? { background: '#3b82f6', color: 'white', borderColor: '#3b82f6' } : {}}
              >
                <History size={16} />
                <span>{showHistorialReservas ? "Ver Activas" : "Historial"}</span>
              </button>
            )}

          {isFilterOpen && activeTab === 'inventario' && (
            <div className="filter-dropdown-menu">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Filtros</span>
                <button 
                  onClick={() => { setFilterLab(''); setFilterState(''); setSortOrder('asc'); setIsFilterOpen(false); }}
                  style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Limpiar
                </button>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Por Laboratorio</label>
                <select value={filterLab} onChange={(e) => setFilterLab(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}>
                  <option value="">Todos</option>
                  {uniqueLabs.map(lab => (
                    <option key={lab} value={lab}>{lab}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Por Estado</label>
                <select value={filterState} onChange={(e) => setFilterState(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}>
                  <option value="">Todos</option>
                  <option value="Disponible">Disponible</option>
                  <option value="Bajo Stock">Bajo Stock</option>
                  <option value="Agotado">Agotado</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Ordenar por ID</label>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}>
                  <option value="asc">Ascendente</option>
                  <option value="desc">Descendente</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {activeTab === 'inventario' ? (
          !readOnly && (
            <button className="btn-add-item" onClick={openAddModal}>
              <Plus size={16} />
              <span>Item</span>
            </button>
          )
        ) : activeTab === 'reservas' && showHistorialReservas ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="date" 
              value={historyStartDate}
              onChange={(e) => setHistoryStartDate(e.target.value)}
              style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}
              title="Fecha Inicio"
            />
            <span style={{ color: '#64748b' }}>-</span>
            <input 
              type="date" 
              value={historyEndDate}
              onChange={(e) => setHistoryEndDate(e.target.value)}
              style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}
              title="Fecha Fin"
            />
            <button 
              onClick={exportToExcel}
              style={{ 
                padding: '6px 16px', 
                background: '#a78b8a', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Exportar Excel
            </button>
          </div>
        ) : activeTab === 'alertas' ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="date" 
              value={alertasStartDate}
              onChange={(e) => setAlertasStartDate(e.target.value)}
              style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}
              title="Fecha Inicio"
            />
            <span style={{ color: '#64748b' }}>-</span>
            <input 
              type="date" 
              value={alertasEndDate}
              onChange={(e) => setAlertasEndDate(e.target.value)}
              style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}
              title="Fecha Fin"
            />
            <select 
              className="select-report-status"
              value={reportStatusFilter}
              onChange={(e) => setReportStatusFilter(e.target.value)}
              style={{ margin: 0 }}
            >
              <option value="Todos los Estados">Todos los Estados</option>
              <option value="Pendiente">Pendiente</option>
              <option value="en_revision">En Revisión</option>
              <option value="Resuelto">Resuelto</option>
            </select>
            <button 
              onClick={exportAlertasToExcel}
              style={{ 
                padding: '6px 16px', 
                background: '#a78b8a', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Exportar Excel
            </button>
          </div>
        ) : null}
        </div>
      </div>

      {/* ================= CONTENIDO DE TABLAS DINÁMICAS ================= */}
      
      {/* VISTA 1: TABLA DE INVENTARIO */}
      {activeTab === 'inventario' && (
        <div className="table-container inventory-table-container" style={{ overflow: 'visible' }}>
          <table className="users-table">
            <thead>
              <tr>
                <th>Id</th>
                <th>nombre</th>
                <th>codigo</th>
                <th>categoria</th>
                <th>laboratorio</th>
                <th>Stock</th>
                <th>Ubicacion</th>
                <th>Estado</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="no-reports-cell">
                    No hay ítems en el inventario que coincidan con los filtros
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>#{item.id}</td>
                    <td className="item-name-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {item.imagen_url ? (
                          <div className="item-thumbnail-container">
                            <img src={`http://localhost:4000${item.imagen_url}`} alt={item.nombre} className="item-thumbnail" />
                            <div className="item-image-preview-tooltip">
                              <img src={`http://localhost:4000${item.imagen_url}`} alt={item.nombre} />
                            </div>
                          </div>
                        ) : (
                          <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                            <Monitor size={18} />
                          </div>
                        )}
                        <span style={{ fontWeight: 500 }}>{item.nombre}</span>
                      </div>
                    </td>
                    <td>{item.codigo_interno}</td>
                    <td>{item.categoria}</td>
                    <td>{item.laboratorio_nombre || `Lab ID: ${item.laboratorio_id}`}</td>
                    <td>{item.cantidad_actual} {item.unidad_medida}</td>
                    <td>{item.ubicacion_fisica || 'N/A'}</td>
                    <td>
                      {item.cantidad_actual > item.stock_minimo ? 'Disponible' : (item.cantidad_actual === 0 ? 'Agotado' : 'Bajo Stock')}
                    </td>
                    <td>
                      {!readOnly && (
                      <div className="action-menu-container">
                        <button 
                          className="action-button"
                          onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
                        >
                          <MoreVertical size={18} />
                        </button>
                        
                        {activeMenu === item.id && (
                          <div className="actions-dropdown">
                            <button className="dropdown-item" onClick={() => handleEdit(item)}>Editar</button>
                            <button className="dropdown-item" onClick={() => handleReport(item)}>Reportar Problema</button>
                            <button className="dropdown-item delete" onClick={() => handleDelete(item.id)}>Eliminar</button>
                          </div>
                        )}
                      </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= TARJETAS PARA MÓVIL ================= */}
{activeTab === "inventario" && (
  <div className="inventory-cards">

    {filteredItems.length === 0 ? (
      <div className="inventory-card empty">
        No hay ítems en el inventario que coincidan con los filtros
      </div>
    ) : (
      filteredItems.map((item) => (
        <div className="inventory-card" key={item.id}>

          <div className="card-header">

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {item.imagen_url ? (
                <img src={`http://localhost:4000${item.imagen_url}`} alt={item.nombre} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
              ) : (
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  <Monitor size={24} />
                </div>
              )}
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>{item.nombre}</h3>
                <span style={{ fontSize: '13px', color: '#64748b' }}>{item.codigo_interno}</span>
              </div>
            </div>

            {!readOnly && (
            <div className="action-menu-container">

              <button
                className="action-button"
                onClick={() =>
                  setActiveMenu(activeMenu === item.id ? null : item.id)
                }
              >
                <MoreVertical size={18}/>
              </button>

              {activeMenu === item.id && (
                <div className="actions-dropdown">
                  <button
                    className="dropdown-item"
                    onClick={() => handleEdit(item)}
                  >
                    Editar
                  </button>

                  <button
                    className="dropdown-item"
                    onClick={() => handleReport(item)}
                  >
                    Reportar Problema
                  </button>

                  <button
                    className="dropdown-item delete"
                    onClick={() => handleDelete(item.id)}
                  >
                    Eliminar
                  </button>
                </div>
              )}

            </div>
            )}

          </div>

          <div className="card-info">

            <div>
              <span>Categoría</span>
              <strong>{item.categoria}</strong>
            </div>

            <div>
              <span>Stock</span>
              <strong>{item.cantidad_actual} {item.unidad_medida}</strong>
            </div>

            <div>
              <span>Ubicación</span>
              <strong>{item.ubicacion_fisica || "N/A"}</strong>
            </div>

            <div>
              <span>Laboratorio</span>
              <strong>{item.laboratorio_nombre || `Lab ${item.laboratorio_id}`}</strong>
            </div>

            <div className="estado-item">
              <span>Estado</span>

              <strong>
                {item.cantidad_actual > item.stock_minimo
                  ? "🟢 Disponible"
                  : item.cantidad_actual === 0
                  ? "🔴 Agotado"
                  : "🟡 Bajo Stock"}
              </strong>
            </div>

          </div>

        </div>
      ))
    )}

  </div>
)}

      {/* VISTA 2: TABLA DE RESERVAS (PRÉSTAMOS) */}
      {activeTab === 'reservas' && (
        <div className="table-container" style={{ overflow: 'visible' }}>
          <table className="users-table">
            <thead>
              <tr>
                <th>ID RESERVA</th>
                <th>SOLICITANTE</th>
                <th>EQUIPOS SOLICITADOS</th>
                <th>HORARIO</th>
                <th>ESTADO</th>
                <th>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {(showHistorialReservas ? filteredHistorial : filteredReservasList).length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                    {showHistorialReservas ? "No hay historial de préstamos" : "No hay reservas de equipos actualmente"}
                  </td>
                </tr>
              ) : (
                (showHistorialReservas ? filteredHistorial : filteredReservasList).map((reserva) => (
                  <tr key={reserva.id}>
                    <td>#{reserva.id}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '500' }}>{reserva.solicitante_nombre} {reserva.solicitante_apellido}</span>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>{reserva.solicitante_rol}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {reserva.inventario.map((item: any) => (
                          <span key={item.id} style={{ fontSize: '13px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {item.cantidad}x {item.nombre}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px' }}>{new Date(reserva.fecha_hora_inicio).toLocaleDateString()}</span>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>
                          {new Date(reserva.fecha_hora_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(reserva.fecha_hora_fin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${reserva.estado_reserva === 'aprobada' ? 'active' : reserva.estado_reserva === 'entregado' ? 'pending' : reserva.estado_reserva === 'completada' ? 'active' : 'inactive'}`}>
                        {reserva.estado_reserva.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {reserva.estado_reserva === 'aprobada' && (
                          <button 
                            style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                            onClick={() => handleEntregarEquipos(reserva.actividad_id)}
                          >
                            Entregar Equipos
                          </button>
                        )}
                        {reserva.estado_reserva === 'entregado' && (
                          <button 
                            style={{ padding: '6px 12px', background: '#10b981', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                            onClick={() => handleDevolverEquipos(reserva.actividad_id)}
                          >
                            Marcar Devuelto
                          </button>
                        )}
                        {(reserva.estado_reserva !== 'aprobada' && reserva.estado_reserva !== 'entregado') && (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>Sin acción</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VISTA 2: TABLA DE ALERTAS DE DAÑOS/INCIDENCIAS */}
      {activeTab === 'alertas' && (
        <div className="table-container" style={{ overflow: 'visible' }}>
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>ÍTEM AFECTADO</th>
                <th>PROBLEMA</th>
                <th>CANT.</th>
                <th>REPORTADO POR</th>
                <th>FECHA</th>
                <th>ESTADO</th>
                <th>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlertas.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>No hay alertas para mostrar</td>
                </tr>
              ) : (
                filteredAlertas.map((reporte) => (
                  <tr key={reporte.id}>
                    <td>#{reporte.id}</td>
                    <td>
                      <div className="item-cell" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="item-info" style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="item-name" style={{ fontWeight: '500' }}>{reporte.item_nombre || 'Desconocido'}</span>
                          <span className="item-code" style={{ fontSize: '12px', color: '#64748B' }}>Cód: {reporte.item_codigo || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong>{reporte.tipo_problema}</strong>
                        <span style={{ fontSize: '12px', color: '#64748B', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={reporte.descripcion}>
                          {reporte.descripcion}
                        </span>
                      </div>
                    </td>
                    <td><span style={{ fontWeight: 'bold' }}>{reporte.cantidad_afectada || 0}</span></td>
                    <td>{reporte.usuario_nombre ? `${reporte.usuario_nombre} ${reporte.usuario_apellido}` : 'Sistema Automático'}</td>
                    <td>{new Date(reporte.fecha_reporte).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${getReportStatusBadgeClass(reporte.estado)}`}>
                        {reporte.estado.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {reporte.estado === 'pendiente' && !readOnly && (
                        <button 
                          onClick={() => cambiarEstadoAlerta(reporte.id, 'en_revision')}
                          style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', marginBottom: '4px', width: '100%', justifyContent: 'center' }}
                        >
                          En Revisión
                        </button>
                      )}
                      {(reporte.estado === 'pendiente' || reporte.estado === 'en_revision') && !readOnly && (
                        <button 
                          onClick={() => cambiarEstadoAlerta(reporte.id, 'resuelto')}
                          style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', width: '100%', justifyContent: 'center' }}
                        >
                          <CheckCircle size={14} /> Resolver
                        </button>
                      )}
                      {(reporte.estado === 'resuelto' || reporte.estado === 'descartado') && (
                        <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', justifyContent: 'center' }}>
                          <CheckCircle size={14} /> Completado
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <AgregarItemModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={handleDataChange}
        editData={editData}
      />

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        title="Eliminar ítem del inventario"
        message="¿Estás seguro de que deseas eliminar este ítem del inventario? Esta acción no se puede deshacer y borrará permanentemente sus datos."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
      />

      <ConfirmModal 
        isOpen={isEntregarModalOpen}
        title="Confirmar Entrega"
        message="¿Confirmas la entrega de estos equipos al estudiante?"
        confirmText="Entregar"
        cancelText="Cancelar"
        type="info"
        onConfirm={confirmEntregar}
        onCancel={() => {
          setIsEntregarModalOpen(false);
          setActividadAEntregar(null);
        }}
      />

      <ConfirmModal 
        isOpen={isDevolverModalOpen}
        title="Confirmar Devolución"
        message="¿Confirmas que recibiste los equipos de vuelta? Si hubo daños, puedes reportarlos después desde el módulo de alertas o inventario."
        confirmText="Devolver"
        cancelText="Cancelar"
        type="info"
        onConfirm={confirmDevolver}
        onCancel={() => {
          setIsDevolverModalOpen(false);
          setActividadADevolver(null);
        }}
      />

      <ReportarItemModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSuccess={handleDataChange}
        item={itemToReport}
      />
    </div>
  );
};
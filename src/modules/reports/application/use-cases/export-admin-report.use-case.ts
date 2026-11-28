import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import PDFDocument = require('pdfkit');
import {
  FiltroReporteEps,
  GetAdminDashboardUseCase,
} from './get-admin-dashboard.use-case';

@Injectable()
export class ExportAdminReportUseCase {
  constructor(
    private readonly getAdminDashboardUseCase: GetAdminDashboardUseCase,
  ) {}

  async generarExcel(filtros?: FiltroReporteEps): Promise<Buffer> {
    const data = await this.getAdminDashboardUseCase.execute(filtros);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FarmaSync EPS';
    workbook.created = new Date();

    // Hoja 1: Resumen Ejecutivo
    const wsResumen = workbook.addWorksheet('Resumen EPS');
    wsResumen.columns = [
      { header: 'Indicador', key: 'indicador', width: 36 },
      { header: 'Valor', key: 'valor', width: 22 },
    ];
    wsResumen.getRow(1).font = { bold: true };
    wsResumen.addRows([
      { indicador: 'Sedes Activas', valor: data.indicadores.sedesRegistradas },
      {
        indicador: 'Farmacéuticos Activos',
        valor: data.indicadores.farmaceuticosActivos,
      },
      {
        indicador: 'Total de Reservas (Demanda)',
        valor: data.indicadores.reservasTotales,
      },
      {
        indicador: 'Reservas Entregadas',
        valor: data.efectividad.reservasEntregadas,
      },
      {
        indicador: 'Reservas No Efectuadas',
        valor: data.efectividad.reservasNoEfectuadas,
      },
      {
        indicador: 'Reservas En Proceso / Pendientes',
        valor: data.efectividad.reservasPendientes,
      },
      {
        indicador: 'Efectividad de Reservas (%)',
        valor: `${data.efectividad.porcentajeEfectividad}%`,
      },
      {
        indicador: 'Medicamentos Agotados (Stock 0)',
        valor: data.indicadores.medicamentosAgotados,
      },
      {
        indicador: 'Total Medicamentos en Alerta (<= 15)',
        valor: data.indicadores.medicamentosEnAlerta,
      },
    ]);

    // Hoja 2: Demanda por Fecha y Sede
    const wsDemanda = workbook.addWorksheet('Demanda');
    wsDemanda.columns = [
      { header: 'Fecha', key: 'fecha', width: 16 },
      { header: 'ID Sede', key: 'sedeId', width: 12 },
      { header: 'Sede', key: 'sedeNombre', width: 32 },
      { header: 'Solicitudes', key: 'cantidadSolicitudes', width: 16 },
    ];
    wsDemanda.getRow(1).font = { bold: true };
    wsDemanda.addRows(data.demanda);

    // Hoja 3: Desabastecimiento por Sede
    const wsDesabastecimiento = workbook.addWorksheet(
      'Desabastecimiento por Sede',
    );
    wsDesabastecimiento.columns = [
      { header: 'ID Sede', key: 'sedeId', width: 12 },
      { header: 'Sede', key: 'sedeNombre', width: 32 },
      { header: 'Ciudad', key: 'ciudad', width: 20 },
      { header: 'Agotados (0)', key: 'medicamentosAgotados', width: 16 },
      { header: 'Stock Bajo (1-15)', key: 'medicamentosStockBajo', width: 18 },
      { header: 'Total Alertas', key: 'totalEnAlerta', width: 16 },
    ];
    wsDesabastecimiento.getRow(1).font = { bold: true };
    wsDesabastecimiento.addRows(data.desabastecimientoPorSede);

    // Hoja 4: Detalle de Alertas de Stock
    const wsAlertas = workbook.addWorksheet('Detalle Alertas Stock');
    wsAlertas.columns = [
      { header: 'Medicamento', key: 'medicamento', width: 36 },
      { header: 'Sede', key: 'sedeNombre', width: 30 },
      { header: 'Ciudad', key: 'ciudad', width: 18 },
      { header: 'Unidades', key: 'unidadesDisponibles', width: 14 },
      { header: 'Nivel', key: 'nivel', width: 14 },
    ];
    wsAlertas.getRow(1).font = { bold: true };
    wsAlertas.addRows(data.alertasStock);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generarPdf(filtros?: FiltroReporteEps): Promise<Buffer> {
    const data = await this.getAdminDashboardUseCase.execute(filtros);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Encabezado
      doc
        .fontSize(18)
        .fillColor('#0B1F5C')
        .text('FarmaSync · Reporte Ejecutivo Administrador EPS', {
          align: 'left',
        });
      doc
        .fontSize(10)
        .fillColor('#475569')
        .text(
          `Generado: ${new Date().toLocaleString('es-CO')} | Filtro Sede: ${
            filtros?.sedeId ?? 'Todas'
          } | Rango: ${filtros?.fechaInicio ?? 'Inicio'} a ${
            filtros?.fechaFin ?? 'Actual'
          }`,
        );
      doc.moveDown(1.2);

      // Sección 1: Indicadores de Efectividad y Demanda
      doc
        .fontSize(13)
        .fillColor('#0755D8')
        .text('1. Efectividad de Reservas y Demanda Global');
      doc.moveDown(0.4);
      doc.fontSize(10).fillColor('#1E293B');
      doc.text(`• Total de reservas registradas: ${data.efectividad.totalReservas}`);
      doc.text(`• Reservas entregadas: ${data.efectividad.reservasEntregadas}`);
      doc.text(
        `• Reservas no efectuadas (canceladas/expiradas/rechazadas): ${data.efectividad.reservasNoEfectuadas}`,
      );
      doc.text(
        `• Reservas pendientes o en proceso: ${data.efectividad.reservasPendientes}`,
      );
      doc.text(
        `• Tasa de efectividad: ${data.efectividad.porcentajeEfectividad}%`,
      );
      doc.moveDown(1);

      // Sección 2: Desabastecimiento por Sede
      doc
        .fontSize(13)
        .fillColor('#0755D8')
        .text('2. Desabastecimiento por Sede');
      doc.moveDown(0.4);
      doc.fontSize(10).fillColor('#1E293B');

      if (data.desabastecimientoPorSede.length === 0) {
        doc.text('No se registran sedes para los filtros seleccionados.');
      } else {
        for (const sede of data.desabastecimientoPorSede) {
          doc.text(
            `• ${sede.sedeNombre} (${sede.ciudad}): ${sede.medicamentosAgotados} agotados | ${sede.medicamentosStockBajo} stock bajo | ${sede.totalEnAlerta} alertas totales`,
          );
        }
      }
      doc.moveDown(1);

      // Sección 3: Demanda por Fecha y Sede
      doc
        .fontSize(13)
        .fillColor('#0755D8')
        .text('3. Comportamiento de Demanda por Sede');
      doc.moveDown(0.4);
      doc.fontSize(10).fillColor('#1E293B');

      if (data.demanda.length === 0) {
        doc.text('Sin solicitudes registradas en el periodo.');
      } else {
        for (const item of data.demanda.slice(0, 35)) {
          doc.text(
            `• ${item.fecha} — ${item.sedeNombre}: ${item.cantidadSolicitudes} solicitud(es)`,
          );
        }
      }
      doc.moveDown(1);

      // Sección 4: Medicamentos en Alerta Crítica / Baja
      doc
        .fontSize(13)
        .fillColor('#0755D8')
        .text('4. Medicamentos en Desabastecimiento / Alerta');
      doc.moveDown(0.4);
      doc.fontSize(10).fillColor('#1E293B');

      if (data.alertasStock.length === 0) {
        doc.text('No hay medicamentos en desabastecimiento o alerta.');
      } else {
        for (const alerta of data.alertasStock.slice(0, 35)) {
          doc.text(
            `• [${alerta.nivel}] ${alerta.medicamento} — ${alerta.sedeNombre}: ${alerta.unidadesDisponibles} und.`,
          );
        }
      }

      doc.end();
    });
  }
}
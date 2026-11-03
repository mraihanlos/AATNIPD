import * as XLSX from 'xlsx';
import { InspectionRecord, NetworkLeakageRecord } from '../types/index.ts';

/**
 * Exports inspection records directly into an Excel (.xlsx) file with styled column widths.
 */
export function exportInspectionsToExcel(
  records: InspectionRecord[],
  filename = `Laporan_Inspeksi_Tekanan_Pipa_${new Date().toISOString().split('T')[0]}.xlsx`
) {
  const headers = [
    'ID Inspeksi',
    'Tanggal',
    'Jam (WIB)',
    'PC Area',
    'Lokasi Titik',
    'Tekanan (Bar)',
    'Tekanan (PSI)',
    'Status',
    'Petugas Lapangan',
    'ID Petugas',
    'Latitude',
    'Longitude',
    'Akurasi GPS (m)',
    'Foto Watermark Tag',
    'Catatan Kondisi',
  ];

  const rows = records.map((r) => [
    r.id,
    r.date,
    r.time,
    r.pcAreaId,
    r.locationTitle,
    Number(r.pressureBar.toFixed(2)),
    Number(r.pressurePsi.toFixed(2)),
    r.statusLabel,
    r.inspectorName,
    r.inspectorId,
    Number(r.latitude.toFixed(6)),
    Number(r.longitude.toFixed(6)),
    Number(r.gpsAccuracyMeters.toFixed(1)),
    r.photoTag || '-',
    r.notes || '-',
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set appropriate column widths for clean readability in Excel
  worksheet['!cols'] = [
    { wch: 18 }, // ID Inspeksi
    { wch: 14 }, // Tanggal
    { wch: 12 }, // Jam (WIB)
    { wch: 12 }, // PC Area
    { wch: 32 }, // Lokasi Titik
    { wch: 15 }, // Tekanan (Bar)
    { wch: 15 }, // Tekanan (PSI)
    { wch: 18 }, // Status
    { wch: 22 }, // Petugas Lapangan
    { wch: 16 }, // ID Petugas
    { wch: 14 }, // Latitude
    { wch: 14 }, // Longitude
    { wch: 16 }, // Akurasi GPS (m)
    { wch: 24 }, // Foto Tag
    { wch: 32 }, // Catatan
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Inspeksi SCADA');

  const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, safeFilename);
}

/**
 * Exports network pipe leakage and repair logs directly into an Excel (.xlsx) file.
 */
export function exportLeakagesToExcel(
  records: NetworkLeakageRecord[],
  filename = `Log_Kebocoran_Pipa_AETRA_${new Date().toISOString().split('T')[0]}.xlsx`
) {
  const headers = [
    'ID Kebocoran',
    'Tanggal Pemeriksaan',
    'Tanggal Perbaikan',
    'Waktu Perbaikan',
    'PC Area',
    'Lokasi Detail',
    'Tipe Pipa',
    'Status',
    'Petugas Pelapor',
    'Hasil Pemeriksaan',
    'Tindakan Perbaikan',
    'Material Digunakan',
    'Latitude',
    'Longitude',
  ];

  const rows = records.map((r) => {
    let pcArea = r.pcAreaId;
    if (!pcArea && r.leakLocationDetail) {
      const match = r.leakLocationDetail.match(/PC\s*([1-5])/i);
      if (match) pcArea = `PC ${match[1]}`;
    }
    return [
      r.id,
      r.inspectionDate || '-',
      r.repairDate || '-',
      `${r.repairStartTime || '--:--'} - ${r.repairEndTime || '--:--'}`,
      pcArea || 'PC 1',
      r.leakLocationDetail || '-',
      r.pipeType || '-',
      r.status || 'Selesai',
      r.reporterInspector || r.createdBy || '-',
      r.physicalInspectionResult || '-',
      r.repairActionTaken || '-',
      r.materialsUsed?.map((m) => `${m.materialName} (${m.quantity} ${m.unit})`).join('; ') || '-',
      r.latitude ?? '',
      r.longitude ?? '',
    ];
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  worksheet['!cols'] = [
    { wch: 18 }, // ID Kebocoran
    { wch: 18 }, // Tgl Pemeriksaan
    { wch: 18 }, // Tgl Perbaikan
    { wch: 16 }, // Waktu Perbaikan
    { wch: 12 }, // PC Area
    { wch: 32 }, // Lokasi Detail
    { wch: 14 }, // Tipe Pipa
    { wch: 14 }, // Status
    { wch: 22 }, // Petugas Pelapor
    { wch: 28 }, // Hasil Pemeriksaan
    { wch: 28 }, // Tindakan Perbaikan
    { wch: 34 }, // Material Digunakan
    { wch: 14 }, // Latitude
    { wch: 14 }, // Longitude
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Log Kebocoran & Perbaikan');

  const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, safeFilename);
}

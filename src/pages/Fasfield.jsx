import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import {
  Container, Row, Col, Card, Button, Form
} from 'react-bootstrap';
import {
  Trash, FileEarmarkText, FilePdf, FileExcel, PlusCircle
} from 'react-bootstrap-icons';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

const Fastfield = () => {
  const [reportData, setReportData] = useState([
    { id: '1', label: 'Judul Laporan', type: 'text', value: '' },
    { id: '3', label: 'Tanggal', type: 'date', value: '' },
    { id: 'desc-1', label: 'Deskripsi', type: 'textarea', value: '' },
    { id: 'foto-1', label: 'Foto', type: 'file', files: [], previews: [] },
  ]);

  const handleInputChange = (id, value) => {
    setReportData(prev => prev.map(field =>
      field.id === id ? { ...field, value } : field
    ));
  };

  const handleFileChange = (id, files) => {
    const fileArray = Array.from(files);
    const previewsPromises = fileArray.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ file, preview: reader.result });
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previewsPromises).then(results => {
      setReportData(prev => prev.map(field =>
        field.id === id ? {
          ...field,
          files: results.map(r => r.file),
          previews: results.map(r => r.preview)
        } : field
      ));
    });
  };

  const addDescAndPhoto = () => {
    const nextIndex = Math.floor(reportData.filter(f => f.type === 'textarea').length + 1);
    setReportData(prev => [
      ...prev,
      { id: `desc-${nextIndex}`, label: 'Deskripsi', type: 'textarea', value: '' },
      { id: `foto-${nextIndex}`, label: 'Foto', type: 'file', files: [], previews: [] }
    ]);
  };

  const handleReset = () => {
    setReportData([
      { id: '1', label: 'Judul Laporan', type: 'text', value: '' },
      { id: '3', label: 'Tanggal', type: 'date', value: '' },
      { id: 'desc-1', label: 'Deskripsi', type: 'textarea', value: '' },
      { id: 'foto-1', label: 'Foto', type: 'file', files: [], previews: [] },
    ]);
  };

  const handleExportPDF = () => {
    const input = document.getElementById('report-preview');
    if (!input) return;

    html2canvas(input, { scale: 2 }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let position = 0;
      let heightLeft = pdfHeight;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save('laporan.pdf');
    });
  };

  const handleExportExcel = () => {
    const data = reportData.map(field => ({
      Label: field.label,
      Value: field.type === 'file'
        ? `${field.files?.length || 0} file`
        : field.value
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan');
    XLSX.writeFile(workbook, 'laporan.xlsx');
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="mb-0">
              <FileEarmarkText className="me-2" /> Laporan
            </h1>
            <div>
              <Button variant="danger" className="me-2" onClick={handleReset}>
                <Trash className="me-1" /> Reset
              </Button>
              <Button variant="success" className="me-2" onClick={handleExportPDF}>
                <FilePdf className="me-1" /> Export PDF
              </Button>
              <Button variant="primary" onClick={handleExportExcel}>
                <FileExcel className="me-1" /> Export Excel
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>Isi Laporan</Card.Header>
            <Card.Body>
              {reportData.map((field) => (
                <Form.Group key={field.id} className="mb-3">
                  <Form.Label>{field.label}</Form.Label>
                  {field.type === 'text' && (
                    <Form.Control
                      type="text"
                      value={field.value}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                  )}
                  {field.type === 'date' && (
                    <Form.Control
                      type="date"
                      value={field.value}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                  )}
                  {field.type === 'textarea' && (
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={field.value}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                  )}
                  {field.type === 'file' && (
                    <>
                      <Form.Control
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileChange(field.id, e.target.files)}
                      />
                      <div className="mt-2 d-flex flex-wrap gap-2">
                        {field.previews && field.previews.map((src, idx) => (
                          <img
                            key={idx}
                            src={src}
                            alt={`Preview ${idx}`}
                            className="img-fluid rounded"
                            style={{ maxWidth: '100%', maxHeight: '400px' }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </Form.Group>
              ))}
              <Button variant="outline-primary" onClick={addDescAndPhoto}>
                <PlusCircle className="me-2" /> Tambah Deskripsi + Foto
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>Preview Laporan</Card.Header>
            <Card.Body id="report-preview">
              {reportData.map((field) => (
                <div key={field.id} className="mb-3">
                  <strong>{field.label}</strong>
                  <div>
                    {field.type === 'file' && field.previews.length > 0 ? (
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        {field.previews.map((src, idx) => (
                          <img
                            key={idx}
                            src={src}
                            alt={`Uploaded ${idx}`}
                            className="img-fluid rounded"
                            style={{ maxWidth: '120px', maxHeight: '120px' }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div>{field.value || '-'}</div>
                    )}
                  </div>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Fastfield;

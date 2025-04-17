import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Form } from 'react-bootstrap';
import { Trash, FileEarmarkText, FilePdf, FileExcel } from 'react-bootstrap-icons';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import logo from '../assets/logo-jlm.JPEG'; 

const Fastfield = () => {
  const cableOptions = [12, 24, 48, 96, 144, 288];

  const [report, setReport] = useState({
    projectName: '',
    ringId: '',
    segment: '',
    date: '',
    inspector: '',
    aerials: [
      {
        id: 1,
        typeCable: '',
        qtyCable: '',
        spanPole: '',
        gpsLat: '',
        gpsLong: '',
        poleId: '',
        poleSize: '',
        poleCondition: '',
        suspensionCondition: '',
        deadEndCondition: '',
        slackSupportCondition: '',
        cableCondition: '',
        odpId: '',
        odpCover: '',
        odpInside: '',
        closureCondition: '',
        closureStatus: '',
        photos: []
      }
    ]
  });

  const handleChange = (field, value) => {
    setReport(prev => ({ ...prev, [field]: value }));
  };

  const handleAerialChange = (idx, field, value) => {
    const newAerials = [...report.aerials];
    newAerials[idx][field] = value;
    setReport(prev => ({ ...prev, aerials: newAerials }));
  };

  const handleFileUpload = (idx, files) => {
    const previews = Array.from(files).map(file => {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ file, preview: reader.result });
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previews).then(results => {
      navigator.geolocation.getCurrentPosition(position => {
        const newAerials = [...report.aerials];
        newAerials[idx].photos = results;
        newAerials[idx].gpsLat = position.coords.latitude;
        newAerials[idx].gpsLong = position.coords.longitude;

        setReport(prev => ({ ...prev, aerials: newAerials }));
      }, error => {
        console.error("Error getting GPS:", error);
        alert("Tidak dapat mengambil GPS.");
      });
    });
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('report-preview');
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a3');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 20;

    const logoImg = new Image();
    logoImg.src = logo;
    await new Promise(resolve => logoImg.onload = resolve);
    pdf.addImage(logoImg, 'JPEG', 10, 5, 30, 15);

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pageHeight;

    report.aerials.forEach((aerial, idx) => {
      if (idx > 0) {
        pdf.setLineWidth(0.5);
        pdf.setDrawColor(0, 0, 0);
        const lineY = position + imgHeight + 10;
        pdf.line(10, lineY, pdfWidth - 10, lineY);
        position = lineY + 5;
      }

      if (heightLeft > 0) {
        pdf.addPage();
        position = 0;
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    });

    pdf.save('laporan.pdf');
  };

  const handleExportExcel = () => {
    const rows = report.aerials.map((aerial, index) => ({
      Section: `Aerial #${index + 1}`,
      TypeCable: aerial.typeCable,
      QtyCable: aerial.qtyCable,
      SpanPole: aerial.spanPole,
      GPS: `Lat: ${aerial.gpsLat}, Long: ${aerial.gpsLong}`,
      PoleID: aerial.poleId,
      PoleSize: aerial.poleSize,
      PoleCondition: aerial.poleCondition,
      CableCondition: aerial.cableCondition,
      ClosureCondition: aerial.closureCondition,
    }));

    const worksheet = XLSX.utils.json_to_sheet([{
      ProjectName: report.projectName,
      RingID: report.ringId,
      Segment: report.segment,
      Date: report.date,
      Inspector: report.inspector
    }, {}, ...rows]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan');
    XLSX.writeFile(workbook, 'laporan.xlsx');
  };

  const handleReset = () => {
    setReport({
      projectName: '',
      ringId: '',
      segment: '',
      date: '',
      inspector: '',
      aerials: [{
        id: 1,
        typeCable: '',
        qtyCable: '',
        spanPole: '',
        gpsLat: '',
        gpsLong: '',
        poleId: '',
        poleSize: '',
        poleCondition: '',
        suspensionCondition: '',
        deadEndCondition: '',
        slackSupportCondition: '',
        cableCondition: '',
        odpId: '',
        odpCover: '',
        odpInside: '',
        closureCondition: '',
        closureStatus: '',
        photos: []
      }]
    });
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="mb-0">
              <FileEarmarkText className="me-2" /> Laporan Inspeksi
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
            <Card.Header>Informasi Umum</Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Nama Proyek</Form.Label>
                <Form.Control value={report.projectName} onChange={(e) => handleChange('projectName', e.target.value)} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>RING ID</Form.Label>
                <Form.Control value={report.ringId} onChange={(e) => handleChange('ringId', e.target.value)} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Segment</Form.Label>
                <Form.Control value={report.segment} onChange={(e) => handleChange('segment', e.target.value)} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Tanggal</Form.Label>
                <Form.Control type="date" value={report.date} onChange={(e) => handleChange('date', e.target.value)} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Inspector</Form.Label>
                <Form.Control value={report.inspector} onChange={(e) => handleChange('inspector', e.target.value)} />
              </Form.Group>
            </Card.Body>
          </Card>

          {report.aerials.map((a, idx) => (
            <Card key={a.id} className="mb-4">
              <Card.Header>Aerial Inspection #{idx + 1}</Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label>Type Cable</Form.Label>
                  <Form.Select value={a.typeCable} onChange={(e) => handleAerialChange(idx, 'typeCable', e.target.value)}>
                    <option value="">Pilih</option>
                    {cableOptions.map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {['qtyCable', 'spanPole', 'gpsLat', 'gpsLong', 'poleId', 'poleSize', 'poleCondition', 'suspensionCondition', 'deadEndCondition', 'slackSupportCondition', 'cableCondition', 'odpId', 'odpCover', 'odpInside', 'closureCondition', 'closureStatus'].map(field => (
                  <Form.Group key={field} className="mb-3">
                    <Form.Label>{field.replace(/([A-Z])/g, ' $1')}</Form.Label>
                    <Form.Control
                      value={a[field]}
                      onChange={(e) => handleAerialChange(idx, field, e.target.value)}
                    />
                  </Form.Group>
                ))}

                <Form.Group className="mb-3">
                  <Form.Label>Foto Dokumentasi</Form.Label>
                  <Form.Control type="file" multiple accept="image/*" capture="camera" onChange={(e) => handleFileUpload(idx, e.target.files)} />
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {a.photos && a.photos.map((p, i) => (
                      <img key={i} src={p.preview} alt={`Foto ${i}`} style={{ width: '100px', borderRadius: '6px' }} />
                    ))}
                  </div>
                </Form.Group>
              </Card.Body>
            </Card>
          ))}
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>Preview Laporan</Card.Header>
            <Card.Body id="report-preview">
              <img src={logo} alt="Logo JLM" style={{ width: '120px', marginBottom: '10px' }} />
              <h5>Informasi Umum</h5>
              <p><strong>Nama Proyek:</strong> {report.projectName}</p>
              <p><strong>RING ID:</strong> {report.ringId}</p>
              <p><strong>Segment:</strong> {report.segment}</p>
              <p><strong>Tanggal:</strong> {report.date}</p>
              <p><strong>Inspector:</strong> {report.inspector}</p>

              {report.aerials.map((a, i) => (
                <div key={i} className="mt-4">
                  <h6>Aerial #{i + 1}</h6>
                  {Object.entries(a).map(([key, val]) => (
                    key !== 'photos' && <p key={key}><strong>{key.replace(/([A-Z])/g, ' $1')}:</strong> {val}</p>
                  ))}
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {a.photos && a.photos.map((p, i) => (
                      <img key={i} src={p.preview} alt={`Preview ${i}`} style={{ width: '120px' }} />
                    ))}
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

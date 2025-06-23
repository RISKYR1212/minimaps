// Fastfield – versi final lengkap (foto per‑kondisi)
import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Form } from 'react-bootstrap';
import { Trash, FileEarmarkText, FilePdf, FileExcel } from 'react-bootstrap-icons';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import logo from '../assets/logo-jlm.jpeg';

/* --------------------------------- DATA --------------------------------- */
const cableOptions = [12, 24, 48, 96, 144, 288];

const aerialFields = [
  { key: 'qtyCable', label: 'Qty Cable' },
  { key: 'spanPole', label: 'Span Pole' },
  { key: 'poleId', label: 'Pole ID' },
  { key: 'poleSize', label: 'Pole Size' },
  { key: 'poleCondition', label: 'Pole Condition', photo: true },
  { key: 'suspensionCondition', label: 'Suspension Condition', photo: true },
  { key: 'deadEndCondition', label: 'Dead End Condition', photo: true },
  { key: 'slackSupportCondition', label: 'Slack Support Condition', photo: true },
  { key: 'cableCondition', label: 'Cable Condition', photo: true },
  { key: 'odpId', label: 'ODP ID' },
  { key: 'odpCover', label: 'ODP Cover' },
  { key: 'odpInside', label: 'ODP Inside' },
  { key: 'closureCondition', label: 'Closure Condition', photo: true },
  { key: 'closureStatus', label: 'Closure Status', photo: true }
];

const buildInitialAerial = (id = 1) => {
  const base = { id, typeCable: '', gpsLat: '', gpsLong: '', photos: [] };
  aerialFields.forEach(f => {
    base[f.key] = '';
    if (f.photo) base[`${f.key}Photos`] = [];
  });
  return base;
};

/* ------------------------------- COMPONENT ------------------------------ */
const Fastfield = () => {
  const [report, setReport] = useState({
    projectName: '',
    ringId: '',
    segment: '',
    date: '',
    inspector: '',
    aerials: [buildInitialAerial()]
  });

  /* ------------------------------ HANDLERS ------------------------------ */
  const handleChange = (field, value) => setReport(prev => ({ ...prev, [field]: value }));

  const handleAerialChange = (idx, field, value) => {
    setReport(prev => {
      const aerials = [...prev.aerials];
      aerials[idx][field] = value;
      return { ...prev, aerials };
    });
  };

  const fileArrayFromInput = files => Array.from(files).map(file => new Promise(res => {
    const reader = new FileReader();
    reader.onloadend = () => res({ file, preview: reader.result });
    reader.readAsDataURL(file);
  }));

  const handleFieldPhotoUpload = (idx, photoField, files) => {
    Promise.all(fileArrayFromInput(files)).then(results => {
      setReport(prev => {
        const aerials = [...prev.aerials];
        aerials[idx][photoField] = results;
        return { ...prev, aerials };
      });
    });
  };

  const handleGeneralPhotoUpload = (idx, files) => {
    Promise.all(fileArrayFromInput(files)).then(results => {
      navigator.geolocation.getCurrentPosition(pos => {
        setReport(prev => {
          const aerials = [...prev.aerials];
          aerials[idx].photos = results;
          aerials[idx].gpsLat = pos.coords.latitude;
          aerials[idx].gpsLong = pos.coords.longitude;
          return { ...prev, aerials };
        });
      }, () => alert('Gagal mengambil GPS'));
    });
  };

  /* ------------------------------ EXPORT ------------------------------ */
  const handleExportPDF = async () => {
    const el = document.getElementById('report-preview');
    const canvas = await html2canvas(el, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a3');

    const logoImg = new Image();
    logoImg.src = logo;
    await new Promise(r => (logoImg.onload = r));
    pdf.addImage(logoImg, 'JPEG', 10, 5, 30, 15);
    pdf.addImage(imgData, 'PNG', 0, 25, pdf.internal.pageSize.getWidth());
    pdf.save('laporan.pdf');
  };

  const handleExportExcel = () => {
    const rows = report.aerials.map((a, i) => ({
      Section: `Aerial #${i + 1}`,
      TypeCable: a.typeCable,
      GPS: `Lat ${a.gpsLat}, Long ${a.gpsLong}`,
      ...aerialFields.reduce((acc, f) => ({ ...acc, [f.label.replace(/ /g, '')]: a[f.key] }), {})
    }));

    const ws = XLSX.utils.json_to_sheet([
      { ProjectName: report.projectName, RingID: report.ringId, Segment: report.segment, Date: report.date, Inspector: report.inspector },
      {},
      ...rows
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
    XLSX.writeFile(wb, 'laporan.xlsx');
  };

  const handleReset = () => setReport({ projectName: '', ringId: '', segment: '', date: '', inspector: '', aerials: [buildInitialAerial()] });

  /* -------------------------------- RENDER ------------------------------ */
  return (
    <Container fluid className="py-4">
      {/* HEADER */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="mb-0"><FileEarmarkText className="me-2" /> Laporan Inspeksi</h1>
            <div>
              <Button variant="danger" className="me-2" onClick={handleReset}><Trash /> Reset</Button>
              <Button variant="success" className="me-2" onClick={handleExportPDF}><FilePdf /> PDF</Button>
              <Button variant="primary" onClick={handleExportExcel}><FileExcel /> Excel</Button>
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        {/* ------------- FORM SIDE ------------- */}
        <Col md={6}>
          {/* Informasi Umum */}
          <Card className="mb-4">
            <Card.Header>Informasi Umum</Card.Header>
            <Card.Body>
              {['projectName', 'ringId', 'segment', 'date', 'inspector'].map(f => (
                <Form.Group className="mb-3" key={f}>
                  <Form.Label>{f.toUpperCase()}</Form.Label>
                  <Form.Control type={f === 'date' ? 'date' : 'text'} placeholder={`Masukkan ${f}`} value={report[f]} onChange={e => handleChange(f, e.target.value)} />
                </Form.Group>
              ))}
            </Card.Body>
          </Card>

          {/* Aerial Inspections */}
          {report.aerials.map((a, idx) => (
            <Card key={a.id} className="mb-4">
              <Card.Header>Aerial Inspection #{idx + 1}</Card.Header>
              <Card.Body>
                {/* Type Cable */}
                <Form.Group className="mb-3">
                  <Form.Label>Type Cable</Form.Label>
                  <Form.Select value={a.typeCable} onChange={e => handleAerialChange(idx, 'typeCable', e.target.value)}>
                    <option value="">Pilih</option>
                    {cableOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </Form.Select>
                </Form.Group>

                {/* Dynamic Fields */}
                {aerialFields.map(({ key, label, photo }) => (
                  <div key={key} className="mb-3">
                    <Form.Group className="mb-2">
                      <Form.Label>{label}</Form.Label>
                      <Form.Control placeholder={`Masukkan ${label}`} value={a[key]} onChange={e => handleAerialChange(idx, key, e.target.value)} />
                    </Form.Group>
                    {photo && (
                      <Form.Group>
                        <Form.Label>Foto {label}</Form.Label>
                        <Form.Control type="file" multiple accept="image/*" capture="camera" onChange={e => handleFieldPhotoUpload(idx, `${key}Photos`, e.target.files)} />
                        <div className="d-flex flex-wrap gap-2 mt-2">
                          {(a[`${key}Photos`] || []).map((p, i) => (
                            <img key={i} src={p.preview} alt={`${key}${i}`} style={{ width: '100px', borderRadius: '6px' }} />
                          ))}
                        </div>
                      </Form.Group>
                    )}
                  </div>
                ))}

                {/* General Photos */}
                <Form.Group className="mb-3">
                  <Form.Label>Foto Umum / Wide</Form.Label>
                  <Form.Control type="file" multiple accept="image/*" capture="camera" onChange={e => handleGeneralPhotoUpload(idx, e.target.files)} />
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {(a.photos || []).map((p, i) => (
                      <img key={i} src={p.preview} alt={`gen${i}`} style={{ width: '100px', borderRadius: '6px' }} />
                    ))}
                  </div>
                </Form.Group>
              </Card.Body>
            </Card>
          ))}
        </Col>

        {/* ------------- PREVIEW SIDE ------------- */}
        <Col md={6}>
          <Card>
            <Card.Header>Preview Laporan</Card.Header>
            <Card.Body id="report-preview">
              <img src={logo} alt="Logo" style={{ width: '110px', marginBottom: '10px' }} />
              <h5>Informasi Umum</h5>
              {['projectName', 'ringId', 'segment', 'date', 'inspector'].map(k => (
                <p key={k}><strong>{k.toUpperCase()}:</strong> {report[k]}</p>
              ))}

              {report.aerials.map((a, i) => (
                <div key={i} className="mt-4">
                  <h6>Aerial #{i + 1}</h6>
                  <p><strong>Type Cable:</strong> {a.typeCable}</p>
                  <p><strong>GPS:</strong> {a.gpsLat && `${a.gpsLat}, ${a.gpsLong}`}</p>
                  {aerialFields.map(({ key, label }) => (
                    <p key={key}><strong>{label}:</strong> {a[key]}</p>
                  ))}
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {/* Foto per kondisi */}
                    {aerialFields.filter(f => f.photo).flatMap(({ key }) => (
                      (a[`${key}Photos`] || []).map((p, idx) => (
                        <img key={`${key}${idx}`} src={p.preview} alt={`${key}${idx}`} style={{ width: '80px', borderRadius: '6px' }} />
                      ))
                    ))}
                    {/* Foto umum */}
                    {(a.photos || []).map((p, idx) => (
                      <img key={`gen${idx}`} src={p.preview} alt={`gen${idx}`} style={{ width: '80px', borderRadius: '6px' }} />
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

// Fastfield – COMPLETE copy-paste version (photo support for Type Cable & Qty Cable)
import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
} from "react-bootstrap";
import {
  Trash,
  FileEarmarkText,
  FilePdf,
  FileExcel,
} from "react-bootstrap-icons";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import logo from "../assets/logo-jlm.jpeg";

/* ------------------------------------------------------------------
 * MASTER DATA
 * ----------------------------------------------------------------*/
const cableOptions = [12, 24, 48, 96, 144, 288];

const aerialFields = [
  { key: "qtyCable", label: "Qty Cable", photo: true },
  { key: "spanPole", label: "Span Pole" },
  { key: "poleId", label: "Pole ID" },
  { key: "poleSize", label: "Pole Size" },
  { key: "poleCondition", label: "Pole Condition", photo: true },
  { key: "suspensionCondition", label: "Suspension Condition", photo: true },
  { key: "deadEndCondition", label: "Dead End Condition", photo: true },
  { key: "slackSupportCondition", label: "Slack Support Condition", photo: true },
  { key: "cableCondition", label: "Cable Condition", photo: true },
  { key: "odpId", label: "ODP ID" },
  { key: "odpCover", label: "ODP Cover" },
  { key: "odpInside", label: "ODP Inside" },
  { key: "closureCondition", label: "Closure Condition", photo: true },
  { key: "closureStatus", label: "Closure Status", photo: true },
];

const buildAerial = (id = 1) => {
  const aerial = {
    id,
    typeCable: "",
    typeCablePhotos: [],
    gpsLat: "",
    gpsLong: "",
    photos: [],
  };
  aerialFields.forEach((f) => {
    aerial[f.key] = "";
    if (f.photo) aerial[`${f.key}Photos`] = [];
  });
  return aerial;
};

const Fastfield = () => {
  const [report, setReport] = useState({
    projectName: "",
    ringId: "",
    segment: "",
    date: "",
    inspector: "",
    aerials: [buildAerial()],
  });

  /* ----------------------- HELPERS ----------------------- */
  const handleChange = (field, value) =>
    setReport((prev) => ({ ...prev, [field]: value }));

  const handleAerialChange = (idx, field, value) =>
    setReport((prev) => {
      const aerials = [...prev.aerials];
      aerials[idx][field] = value;
      return { ...prev, aerials };
    });

  const filesToPreviews = (files) =>
    Array.from(files).map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve({ file, preview: reader.result });
          reader.readAsDataURL(file);
        })
    );

  const uploadPhotos = (idx, field, files) => {
    Promise.all(filesToPreviews(files)).then((list) =>
      setReport((prev) => {
        const aerials = [...prev.aerials];
        aerials[idx][field] = [...aerials[idx][field], ...list];
        return { ...prev, aerials };
      })
    );
  };

  const uploadGeneral = (idx, files) => {
    Promise.all(filesToPreviews(files)).then((list) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setReport((prev) => {
            const aerials = [...prev.aerials];
            aerials[idx].photos = [...aerials[idx].photos, ...list];
            aerials[idx].gpsLat = pos.coords.latitude.toFixed(6);
            aerials[idx].gpsLong = pos.coords.longitude.toFixed(6);
            return { ...prev, aerials };
          }),
        (err) => {
          console.error("GPS Error:", err);
          setReport((prev) => {
            const aerials = [...prev.aerials];
            aerials[idx].photos = [...aerials[idx].photos, ...list];
            return { ...prev, aerials };
          });
        }
      );
    });
  };

  const addAerial = () => 
    setReport(prev => ({
      ...prev,
      aerials: [...prev.aerials, buildAerial(prev.aerials.length + 1)]
    }));

  const removeAerial = (idx) => {
    if (report.aerials.length <= 1) return;
    setReport(prev => ({
      ...prev,
      aerials: prev.aerials.filter((_, i) => i !== idx)
    }));
  };

  /* ----------------------- EXPORTERS ----------------------- */
  const exportPDF = async () => {
    const el = document.getElementById("report-preview");
    if (!el) return;
    const canvas = await html2canvas(el, { scale: 2 });
    const pdf = new jsPDF("p", "mm", "a3");
    const lg = new Image();
    lg.src = logo;
    await new Promise((res) => (lg.onload = res));
    pdf.addImage(lg, "JPEG", 10, 5, 30, 15);
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      25,
      pdf.internal.pageSize.getWidth(),
      pdf.internal.pageSize.getHeight() - 25
    );
    pdf.save("laporan.pdf");
  };

  const exportExcel = () => {
    const rows = report.aerials.flatMap((a, i) => [
      {
        Section: `Aerial #${i + 1}`,
        TypeCable: a.typeCable,
        QtyCable: a.qtyCable,
        GPS: a.gpsLat ? `Lat ${a.gpsLat}, Long ${a.gpsLong}` : "No GPS",
        ...aerialFields.reduce(
          (acc, f) => ({ 
            ...acc, 
            [f.label.replace(/ /g, "")]: a[f.key],
            [`${f.label.replace(/ /g, "")}Photos`]: f.photo ? a[`${f.key}Photos`]?.length || 0 : ""
          }),
          {}
        ),
        GeneralPhotos: a.photos.length,
        TypeCablePhotos: a.typeCablePhotos.length
      }
    ]);

    const ws = XLSX.utils.json_to_sheet([
      {
        ProjectName: report.projectName,
        RingID: report.ringId,
        Segment: report.segment,
        Date: report.date,
        Inspector: report.inspector,
      },
      {},
      ...rows,
    ]);
    
    // Auto-size columns
    const wscols = [
      { wch: 15 }, // Section
      { wch: 10 }, // TypeCable
      { wch: 10 }, // QtyCable
      { wch: 30 }, // GPS
      ...aerialFields.map(() => ({ wch: 20 })), // Other fields
      { wch: 15 }, // Photos columns
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, "laporan.xlsx");
  };

  const reset = () =>
    setReport({
      projectName: "",
      ringId: "",
      segment: "",
      date: "",
      inspector: "",
      aerials: [buildAerial()],
    });

  /* ----------------------- RENDER ----------------------- */
  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="mb-0">
              <FileEarmarkText className="me-2" /> Laporan Inspeksi
            </h1>
            <div>
              <Button variant="danger" className="me-2" onClick={reset}>
                <Trash /> Reset
              </Button>
              <Button variant="success" className="me-2" onClick={exportPDF}>
                <FilePdf /> PDF
              </Button>
              <Button variant="primary" onClick={exportExcel}>
                <FileExcel /> Excel
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        {/* -------- FORM SIDE -------- */}
        <Col md={6}>
          {/* Informasi Umum */}
          <Card className="mb-4">
            <Card.Header>Informasi Umum</Card.Header>
            <Card.Body>
              {["projectName", "ringId", "segment", "date", "inspector"].map(
                (field) => (
                  <Form.Group className="mb-3" key={field}>
                    <Form.Label>{field.replace(/([A-Z])/g, ' $1').toUpperCase()}</Form.Label>
                    <Form.Control
                      type={field === "date" ? "date" : "text"}
                      value={report[field]}
                      placeholder={`Masukkan ${field.replace(/([A-Z])/g, ' $1')}`}
                      onChange={(e) => handleChange(field, e.target.value)}
                    />
                  </Form.Group>
                )
              )}
            </Card.Body>
          </Card>

          {/* Aerial Inspections */}
          {report.aerials.map((a, idx) => (
            <Card key={a.id} className="mb-4">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <span>Aerial Inspection #{idx + 1}</span>
                <div>
                  <Button 
                    variant="outline-danger" 
                    size="sm" 
                    onClick={() => removeAerial(idx)}
                    disabled={report.aerials.length <= 1}
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                {/* Type Cable */}
                <Form.Group className="mb-3">
                  <Form.Label>Type Cable</Form.Label>
                  <Form.Select
                    value={a.typeCable}
                    onChange={(e) =>
                      handleAerialChange(idx, "typeCable", e.target.value)
                    }
                  >
                    <option value="">Pilih</option>
                    {cableOptions.map((c) => (
                      <option key={c} value={c}>{c} Core</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                {/* Foto Type Cable */}
                <Form.Group className="mb-3">
                  <Form.Label>Foto Type Cable</Form.Label>
                  <Form.Control
                    type="file"
                    multiple
                    accept="image/*"
                    capture="camera"
                    onChange={(e) =>
                      uploadPhotos(idx, "typeCablePhotos", e.target.files)
                    }
                  />
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {a.typeCablePhotos.map((p, i) => (
                      <div key={i} className="position-relative">
                        <img
                          src={p.preview}
                          alt="tc"
                          style={{ width: "100px", borderRadius: "6px" }}
                        />
                        <Button 
                          variant="danger" 
                          size="sm" 
                          className="position-absolute top-0 end-0"
                          onClick={() => {
                            setReport(prev => {
                              const aerials = [...prev.aerials];
                              aerials[idx].typeCablePhotos = aerials[idx].typeCablePhotos.filter((_, j) => j !== i);
                              return { ...prev, aerials };
                            });
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </Form.Group>

                {/* Dynamic fields */}
                {aerialFields.map(({ key, label, photo }) => (
                  <div key={key} className="mb-3">
                    <Form.Group className="mb-2">
                      <Form.Label>{label}</Form.Label>
                      <Form.Control
                        value={a[key]}
                        placeholder={`Masukkan ${label}`}
                        onChange={(e) =>
                          handleAerialChange(idx, key, e.target.value)
                        }
                      />
                    </Form.Group>
                    {photo && (
                      <Form.Group>
                        <Form.Label>Foto {label}</Form.Label>
                        <Form.Control
                          type="file"
                          multiple
                          capture="camera"
                          accept="image/*"
                          onChange={(e) =>
                            uploadPhotos(idx, `${key}Photos`, e.target.files)
                          }
                        />
                        <div className="d-flex flex-wrap gap-2 mt-2">
                          {a[`${key}Photos`].map((p, i) => (
                            <div key={i} className="position-relative">
                              <img
                                src={p.preview}
                                alt="f"
                                style={{ width: "100px", borderRadius: "6px" }}
                              />
                              <Button 
                                variant="danger" 
                                size="sm" 
                                className="position-absolute top-0 end-0"
                                onClick={() => {
                                  setReport(prev => {
                                    const aerials = [...prev.aerials];
                                    aerials[idx][`${key}Photos`] = aerials[idx][`${key}Photos`].filter((_, j) => j !== i);
                                    return { ...prev, aerials };
                                  });
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      </Form.Group>
                    )}
                  </div>
                ))}

                {/* General Photos */}
                <Form.Group className="mb-3">
                  <Form.Label>Foto Umum / Wide</Form.Label>
                  <Form.Control
                    type="file"
                    multiple
                    capture="camera"
                    accept="image/*"
                    onChange={(e) => uploadGeneral(idx, e.target.files)}
                  />
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {a.photos.map((p, i) => (
                      <div key={i} className="position-relative">
                        <img
                          src={p.preview}
                          alt="g"
                          style={{ width: "100px", borderRadius: "6px" }}
                        />
                        <Button 
                          variant="danger" 
                          size="sm" 
                          className="position-absolute top-0 end-0"
                          onClick={() => {
                            setReport(prev => {
                              const aerials = [...prev.aerials];
                              aerials[idx].photos = aerials[idx].photos.filter((_, j) => j !== i);
                              return { ...prev, aerials };
                            });
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </Form.Group>
              </Card.Body>
            </Card>
          ))}

          <Button variant="primary" onClick={addAerial} className="mb-4">
            Tambah Aerial Inspection
          </Button>
        </Col>

        {/* -------- PREVIEW SIDE -------- */}
        <Col md={6}>
          <Card>
            <Card.Header>Preview Laporan</Card.Header>
            <Card.Body id="report-preview" style={{ backgroundColor: '#f8f9fa' }}>
              <img
                src={logo}
                alt="Logo"
                style={{ width: "110px", marginBottom: "10px" }}
              />
              <h5>Informasi Umum</h5>
              {["projectName", "ringId", "segment", "date", "inspector"].map(
                (k) => (
                  <p key={k}>
                    <strong>{k.replace(/([A-Z])/g, ' $1').toUpperCase()}:</strong> {report[k] || "-"}
                  </p>
                )
              )}

              {report.aerials.map((a, i) => (
                <div key={i} className="mt-4 p-3 bg-white rounded">
                  <h6>Aerial #{i + 1}</h6>
                  <p><strong>Type Cable:</strong> {a.typeCable || "-"}</p>
                  <p><strong>GPS:</strong> {a.gpsLat ? `${a.gpsLat}, ${a.gpsLong}` : "No GPS data"}</p>
                  
                  {aerialFields.map(({ key, label }) => (
                    <p key={key}><strong>{label}:</strong> {a[key] || "-"}</p>
                  ))}

                  <div className="mt-3">
                    <strong>Type Cable Photos:</strong>
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {a.typeCablePhotos.map((p, idx) => (
                        <img
                          key={`tc${idx}`}
                          src={p.preview}
                          alt={`tc${idx}`}
                          style={{ width: "80px", borderRadius: "6px" }}
                        />
                      ))}
                    </div>
                  </div>

                  {aerialFields.filter(f => f.photo).map(({ key, label }) => (
                    a[`${key}Photos`]?.length > 0 && (
                      <div key={`photos-${key}`} className="mt-3">
                        <strong>{label} Photos:</strong>
                        <div className="d-flex flex-wrap gap-2 mt-2">
                          {a[`${key}Photos`].map((p, idx) => (
                            <img
                              key={`${key}${idx}`}
                              src={p.preview}
                              alt={`${key}${idx}`}
                              style={{ width: "80px", borderRadius: "6px" }}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  ))}

                  {a.photos.length > 0 && (
                    <div className="mt-3">
                      <strong>General Photos:</strong>
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        {a.photos.map((p, idx) => (
                          <img
                            key={`gen${idx}`}
                            src={p.preview}
                            alt={`gen${idx}`}
                            style={{ width: "80px", borderRadius: "6px" }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
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
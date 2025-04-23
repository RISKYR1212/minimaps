import React, { useState } from 'react';
import { Form, Button, Table, Container, Row, Col } from 'react-bootstrap';

const Osp = () => {
  const initialForm = {
    Tanggal: '',
    'Bulan / Tahun': '',
    Hari: '',
    Starttime: '',
    Endtime: '',
    Duration: '',
    'Start Action (FOC)': '',
    Finish: '',
    'Deskripsi Gangguan': '',
    'Service Impact': '',
    'Klasifikasi Gangguan': '',
    'Root Cause': '',
    Action: '',
    Location: '',
    'Titik Lokasi': '',
    Segment: '',
    'Additional Material -1': '',
    'Additional Material -2': '',
    'Additional Material -3': '',
    PIC: '',
    'Team': '',
  };

  const [formData, setFormData] = useState(initialForm);
  const [entries, setEntries] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAdd = () => {
    setEntries([...entries, { ...formData }]);
    setFormData(initialForm);
  };

  const headers = Object.keys(initialForm);

  return (
    <Container className="my-4">
      <h3 className="mb-4">Formulir Laporan Gangguan OSP (Outside Plant)</h3>

      <Form>
        <Row>
          {headers.map((field, idx) => (
            <Col md={4} key={idx} className="mb-3">
              <Form.Group>
                <Form.Label>{field}</Form.Label>
                <Form.Control
                  type="text"
                  name={field}
                  value={formData[field]}
                  onChange={handleChange}
                  placeholder={`Isi ${field}`}
                />
              </Form.Group>
            </Col>
          ))}
        </Row>
        <Button variant="primary" onClick={handleAdd} className="mt-2">
          Tambah ke Laporan
        </Button>
      </Form>

      {entries.length > 0 && (
        <>
          <h5 className="mt-5 mb-3">Data Laporan:</h5>
          <Table striped bordered hover responsive size="sm">
            <thead className="table-dark">
              <tr>
                {headers.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={idx}>
                  {headers.map((h, j) => (
                    <td key={j}>{entry[h]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </Container>
  );
};

export default Osp;

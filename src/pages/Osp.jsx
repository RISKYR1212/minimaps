/* eslint-disable camelcase */
import axios from "axios";
import React, { useState, useEffect } from "react";
import {
  Container, Row, Col, Form, Button, Table, Card
} from "react-bootstrap";
import { X, PencilSquare } from "react-bootstrap-icons";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import "dayjs/locale/id";

dayjs.extend(duration); dayjs.locale("id");

const endpoint  = import.meta.env.VITE_GAS_ENDPOINT;
const LOCAL_KEY = "osp_form_cache";

const fmtDate = d => (d ? dayjs(d).format("DD MMMM YYYY") : "");
const fmtTime = t => {
  const d = dayjs(t, "HH:mm");
  return d.isValid() ? d.format("HH:mm") : t;
};
const dt        = (tgl,jam)=> tgl && jam ? dayjs(`${tgl}T${jam}`) : null;
const durasi    = (m,s)=>{
  if(!m||!s||!m.isValid()||!s.isValid()) return "";
  const diff = s.diff(m); if(diff<=0) return "";
  const d = dayjs.duration(diff); return `${d.hours()} jam ${d.minutes()} menit`;
};

const empty={
  tanggal:"", hari:"", bulan_tahun:"",
  start_user:"",  end_user:"",  hasil_durasi_user:"",
  start_ticket:"",end_ticket:"",hasil_durasi_ticket:"",
  selisih_start:"",
  problem:"", action:"", material_terpakai:"", pic:"", nomor_ticket:"",
  latlong:"", latlong2: ""
};

const FIELDS_TO_SEND=[
  "tanggal","hari","bulan_tahun",
  "start_user","end_user","hasil_durasi_user",
  "start_ticket","end_ticket","hasil_durasi_ticket",
  "problem","action","material_terpakai","pic","nomor_ticket",
  "latlong","latlong2","selisih_start"
];

function Osp(){
  const [form,setForm]     = useState(empty);
  const [rows,setRows]     = useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]   = useState("");
  const [useTicket,setUseTicket]=useState(false);
  const [editIndex,setEditIndex]=useState(null);
  const [editForm,setEditForm]=useState({});

  useEffect(()=>{
    fetchData();
    const saved=localStorage.getItem(LOCAL_KEY);
    if(saved){ try{ setForm({...form,...JSON.parse(saved)});}catch{} }
  },[]);

  useEffect(()=> localStorage.setItem(LOCAL_KEY,JSON.stringify(form)), [form]);

  const fetchData=async()=>{
    try{
      const {data}=await axios.get(`${endpoint}?mode=read`);
      setRows(data.records||[]);
    }catch(e){
      console.error(e); setError("Gagal memuat data");
    }
  };

  const update=({target:{name,value}})=>{
    setForm(prev=>{
      const n={...prev,[name]:value};
      if(name==="tanggal"){
        const d=new Date(value);
        n.hari        = d.toLocaleDateString("id-ID",{weekday:"long"});
        n.bulan_tahun = d.toLocaleDateString("id-ID",{month:"long",year:"numeric"});
      }
      const tgl=n.tanggal;
      const mU=dt(tgl,n.start_user); const sU=dt(tgl,n.end_user);
      const mT=dt(tgl,n.start_ticket); const sT=dt(tgl,n.end_ticket);
      n.hasil_durasi_user   = durasi(mU,sU);
      n.hasil_durasi_ticket = durasi(mT,sT);
      n.selisih_start       = durasi(mU,mT);
      return n;
    });
  };

  const geo=(field)=>{
    if(!navigator.geolocation) return alert("Geolocation tak didukung");
    navigator.geolocation.getCurrentPosition(
      ({coords})=> setForm(p=>({...p,[field]:`${coords.latitude},${coords.longitude}`})),
      ()=>alert("Izin lokasi ditolak")
    );
  };

  const send=async(data, isEdit = false, index = null)=>{
    const body = new URLSearchParams();
    if(isEdit && index !== null){
      body.append("mode", "edit");
      body.append("index", index);
    }
    FIELDS_TO_SEND.forEach(k => body.append(k, data[k] ?? ""));
    const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
    const j=await r.json(); if(!j.ok) throw new Error(j.message||"GAS error");
  };

  const submit=async e=>{
    e.preventDefault();
    const data={...form,
      ...(useTicket?{}:{
        start_ticket:"",end_ticket:"",
        hasil_durasi_ticket:"",selisih_start:""
      })
    };
    setLoading(true); setError("");
    try{
      await send(data);
      setForm(empty); localStorage.removeItem(LOCAL_KEY); fetchData();
    }catch(e){setError(e.message);}finally{setLoading(false);}
  };

  const delLocal=i=>{
    if(!confirm("Hapus baris ini dari tampilan?")) return;
    setRows(r=>r.filter((_,idx)=>idx!==i));
  };

  const startEdit = (index) => {
    setEditIndex(index);
    setEditForm(rows[index]);
  };

  const updateEditField = ({ target: { name, value } }) => {
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const saveEdit = async () => {
    try {
      const indexSheet = editIndex + 2;
      await send(editForm, true, indexSheet);
      setEditIndex(null);
      setEditForm({});
      fetchData();
    } catch (err) {
      alert("Gagal menyimpan: " + err.message);
    }
  };

  const cancelEdit = () => {
    setEditIndex(null);
    setEditForm({});
  };

  return (
    <Container className="py-4">
      <h4 className="mb-3">Gangguan / Durasi OSP</h4>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Form Input */}
      <Card className="p-4 shadow-sm mb-4">
        <Form onSubmit={submit}>
          <Row className="mb-3">
            <Col md={6}><Form.Label>Tanggal</Form.Label><Form.Control type="date" name="tanggal" value={form.tanggal} onChange={update} required/></Col>
            <Col md={6}><Form.Label>Hari</Form.Label><Form.Control value={form.hari} readOnly/></Col>
            <Col md={6} className="mt-3"><Form.Label>Bulan/Tahun</Form.Label><Form.Control value={form.bulan_tahun} readOnly/></Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}><Form.Label>User Start</Form.Label><Form.Control type="time" name="start_user" value={form.start_user} onChange={update}/></Col>
            <Col md={6}><Form.Label>User End</Form.Label><Form.Control type="time" name="end_user" value={form.end_user} onChange={update}/></Col>
            <Col md={6} className="mt-3"><Form.Label>Durasi User</Form.Label><Form.Control value={form.hasil_durasi_user} readOnly/></Col>
          </Row>

          <Row className="mb-3"><Col>
            <Form.Check type="switch" label="Gunakan waktu Ticket" checked={useTicket} onChange={e=>setUseTicket(e.target.checked)}/>
          </Col></Row>

          {useTicket && (
            <Row className="mb-3">
              <Col md={6}><Form.Label>Ticket Start</Form.Label><Form.Control type="time" name="start_ticket" value={form.start_ticket} onChange={update}/></Col>
              <Col md={6}><Form.Label>Ticket End</Form.Label><Form.Control type="time" name="end_ticket" value={form.end_ticket} onChange={update}/></Col>
              <Col md={6} className="mt-3"><Form.Label>Durasi Ticket</Form.Label><Form.Control value={form.hasil_durasi_ticket} readOnly/></Col>
              <Col md={6} className="mt-3"><Form.Label>Selisih Start</Form.Label><Form.Control value={form.selisih_start} readOnly/></Col>
            </Row>
          )}

          <Row className="mb-3">
            <Col md={6}><Form.Label>Problem</Form.Label><Form.Control name="problem" value={form.problem} onChange={update}/></Col>
            <Col md={6}><Form.Label>Action</Form.Label><Form.Control name="action" value={form.action} onChange={update}/></Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}><Form.Label>Material Terpakai</Form.Label><Form.Control name="material_terpakai" value={form.material_terpakai} onChange={update}/></Col>
            <Col md={6}><Form.Label>PIC</Form.Label><Form.Control name="pic" value={form.pic} onChange={update}/></Col>
            <Col md={6} className="mt-3"><Form.Label>Nomor Ticket</Form.Label><Form.Control name="nomor_ticket" value={form.nomor_ticket} onChange={update}/></Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}><Form.Label>Upload Foto 1</Form.Label><Form.Control type="file" accept="image/*" onChange={e=>e.target.files.length && geo("latlong")}/></Col>
            <Col md={6}><Form.Label>Lat,Long 1</Form.Label><Form.Control value={form.latlong} readOnly/></Col>
          </Row>
          <Row className="mb-3">
            <Col md={6}><Form.Label>Upload Foto 2</Form.Label><Form.Control type="file" accept="image/*" onChange={e=>e.target.files.length && geo("latlong2")}/></Col>
            <Col md={6}><Form.Label>Lat,Long 2</Form.Label><Form.Control value={form.latlong2} readOnly/></Col>
          </Row>

          <Row><Col md={3}><Button type="submit" className="w-100" disabled={loading}>{loading ? "Mengirim…" : "Tambah"}</Button></Col></Row>
        </Form>
      </Card>

      {/* Tabel */}
      <Table striped bordered hover size="sm" responsive>
        <thead><tr>{["No","Tanggal","User Start","User End","Durasi User","Ticket Start","Ticket End","Durasi Ticket","Problem","Action","PIC","Nomor Ticket",""].map(h=><th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r,i)=>(
          <tr key={i}>
            <td>{i+1}</td>
            <td>{editIndex === i ? <Form.Control name="tanggal" type="date" value={editForm.tanggal || ''} onChange={updateEditField}/> : fmtDate(r.tanggal)}</td>
            <td>{editIndex === i ? <Form.Control name="start_user" type="time" value={editForm.start_user || ''} onChange={updateEditField}/> : fmtTime(r.start_user)}</td>
            <td>{editIndex === i ? <Form.Control name="end_user" type="time" value={editForm.end_user || ''} onChange={updateEditField}/> : fmtTime(r.end_user)}</td>
            <td>{editIndex === i ? editForm.hasil_durasi_user : r.hasil_durasi_user}</td>
            <td>{editIndex === i ? <Form.Control name="start_ticket" type="time" value={editForm.start_ticket || ''} onChange={updateEditField}/> : fmtTime(r.start_ticket)}</td>
            <td>{editIndex === i ? <Form.Control name="end_ticket" type="time" value={editForm.end_ticket || ''} onChange={updateEditField}/> : fmtTime(r.end_ticket)}</td>
            <td>{editIndex === i ? editForm.hasil_durasi_ticket : r.hasil_durasi_ticket}</td>
            <td>{editIndex === i ? <Form.Control name="problem" value={editForm.problem || ''} onChange={updateEditField}/> : r.problem}</td>
            <td>{editIndex === i ? <Form.Control name="action" value={editForm.action || ''} onChange={updateEditField}/> : r.action}</td>
            <td>{editIndex === i ? <Form.Control name="pic" value={editForm.pic || ''} onChange={updateEditField}/> : r.pic}</td>
            <td>{editIndex === i ? <Form.Control name="nomor_ticket" value={editForm.nomor_ticket || ''} onChange={updateEditField}/> : r.nomor_ticket}</td>
            <td className="text-center">
              {editIndex === i ? (
                <>
                  <Button variant="success" size="sm" onClick={saveEdit} className="me-1">✔️</Button>
                  <Button variant="secondary" size="sm" onClick={cancelEdit}>✖️</Button>
                </>
              ) : (
                <>
                  <Button variant="outline-primary" size="sm" className="me-1" onClick={() => startEdit(i)}><PencilSquare /></Button>
                  <Button variant="outline-danger" size="sm" onClick={()=>delLocal(i)}><X /></Button>
                </>
              )}
            </td>
          </tr>
        ))}</tbody>
      </Table>
    </Container>
  );
}

export default Osp;
